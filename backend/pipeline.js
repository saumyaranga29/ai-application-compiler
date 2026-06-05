import { GoogleGenerativeAI } from "@google/generative-ai";
import { validateSchema } from "./validator.js";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("WARNING: GEMINI_API_KEY is not set in environment variables!");
}
const genAI = new GoogleGenerativeAI(apiKey || "");

// Available models list for graceful fallbacks
const MODELS = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"];

async function callGemini(systemPrompt, userPrompt, jsonMode = true) {
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Please check your .env file.");
  }

  let lastError = null;

  for (const modelName of MODELS) {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`[API Call] Querying model "${modelName}" (Attempt ${attempts}/${maxAttempts})...`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt,
        });

        const generationConfig = jsonMode
          ? { responseMimeType: "application/json", temperature: 0.1 }
          : { temperature: 0.2 };

        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig,
        });

        const responseText = result.response.text();
        if (jsonMode) {
          try {
            return JSON.parse(responseText.trim());
          } catch (e) {
            console.error("Failed to parse JSON response:", responseText);
            const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleaned);
          }
        }
        return responseText;
      } catch (err) {
        lastError = err;
        const isTransient = 
          err.status === 503 || 
          err.status === 429 || 
          err.message.includes("503") || 
          err.message.includes("429") || 
          err.message.includes("demand") ||
          err.message.includes("overloaded");

        console.warn(`[API Warning] Model "${modelName}" attempt ${attempts} failed: ${err.message}`);

        if (isTransient) {
          const backoffTime = Math.pow(2, attempts) * 1000;
          console.log(`[Backoff] Transient error. Retrying in ${backoffTime}ms...`);
          await new Promise(r => setTimeout(r, backoffTime));
        } else {
          // Unrecoverable error (e.g. Authentication, Bad Request) -> Fail immediately
          throw err;
        }
      }
    }
    console.warn(`[API Warning] Model "${modelName}" exhausted all retry attempts. Falling back...`);
  }

  throw new Error(`All generative models failed. Last error details: ${lastError.message}`);
}

export async function runCompilationPipeline(userRequirement, onStepCallback = () => {}) {
  const steps = [];
  let currentInput = userRequirement;
  let status = "success";
  let finalConfig = null;
  let summaryLog = "";

  const logStep = (name, status, latency, inputData, outputData, error = null) => {
    const stepLog = { name, status, latency, input: inputData, output: outputData, error };
    steps.push(stepLog);
    onStepCallback(stepLog);
  };

  try {
    // ----------------------------------------------------
    // STAGE 1: INTENT EXTRACTION
    // ----------------------------------------------------
    console.log("Starting Stage 1: Intent Extraction...");
    const s1Start = Date.now();
    const s1System = `You are the Intent Extraction compiler phase of a software generation system.
Your job is to read the user's natural language request and parse it into a structured JSON representation of the user's intent.
You must extract the app name, description, target audience, core features, primary entities, and user roles.
Ensure that if the user's prompt is vague or missing key info, you make reasonable assumptions and document them in the 'assumptions' field.
Return ONLY valid JSON matching this schema:
{
  "appName": "string",
  "description": "string",
  "targetAudience": "string",
  "features": ["string"],
  "roles": ["string"],
  "entities": ["string"],
  "assumptions": ["string"]
}`;
    const s1Output = await callGemini(s1System, `User Requirement:\n"${currentInput}"`);
    const s1Latency = Date.now() - s1Start;
    logStep("Intent Extraction", "completed", s1Latency, { requirement: currentInput }, s1Output);

    // ----------------------------------------------------
    // STAGE 2: SYSTEM DESIGN LAYER
    // ----------------------------------------------------
    console.log("Starting Stage 2: System Design...");
    const s2Start = Date.now();
    const s2System = `You are the System Design compiler phase.
Your job is to take the structured intent JSON and design the application architecture.
You must output a structured JSON containing:
1. "pages": UI pages needed, including titles, descriptions, and allowed roles.
2. "dbEntities": Database tables needed, including fields (name, type, primaryKey, autoIncrement, nullable, relations).
3. "apiEndpoints": API routes needed (path, method, description, allowedRoles, and dbOperation indicating table queried/written).
4. "authPermissions": Access permissions matrix for each role.
5. "businessRules": Core rules (e.g. role access, premium plan restrictions).
Ensure consistency:
- If a page has a feature, it should map to API endpoints.
- If an API endpoint exists, it should map to a database table or operation.
Return ONLY valid JSON matching this structure:
{
  "pages": [{"id": "string", "title": "string", "allowedRoles": ["string"]}],
  "dbEntities": [{"name": "string", "fields": [{"name": "string", "type": "string", "primaryKey": "boolean", "nullable": "boolean"}]}],
  "apiEndpoints": [{"path": "string", "method": "string", "description": "string", "allowedRoles": ["string"], "dbOperation": {"type": "string", "table": "string"}}],
  "authPermissions": {},
  "businessRules": [{"ruleId": "string", "description": "string"}]
}`;
    const s2Output = await callGemini(s2System, `Intent JSON:\n${JSON.stringify(s1Output, null, 2)}`);
    const s2Latency = Date.now() - s2Start;
    logStep("System Design", "completed", s2Latency, s1Output, s2Output);

    // ----------------------------------------------------
    // STAGE 3: SCHEMA GENERATION
    // ----------------------------------------------------
    console.log("Starting Stage 3: Schema Generation...");
    const s3Start = Date.now();
    const s3System = `You are the Schema Generation compiler phase.
Your job is to take the application architecture design JSON and compile it into a detailed, concrete schema package.
You must generate:
1. "dbSchema": List of database tables, fields, and options (ensure every table has an autoIncrement primary key named 'id').
2. "apiSchema": OpenAPI-like endpoints with paths, methods, allowedRoles, and requestBody / response schemas.
3. "uiSchema": Layout options (theme, navigation routes) and pages containing lists of interactive components. Components can be:
   - "stats-grid": Grid showing stats (label, value e.g. "count(contacts)", icon).
   - "table": Shows rows from a GET dataSource, lists columns.
   - "crud-table": Table with CRUD popups, specifies form fields, targets endpoint paths for create/delete/update.
   - "chart": Visual analytics (chartType like bar/line, dataSource, groupBy, aggregate).
   - "form": Standard form for actions.
4. "authSchema": Auth rules with role definitions and features gating (premium gating pages).
5. "logicSchema": Triggers and conditions.
Ensure all components datasource/actions endpoints map exactly to the apiSchema.
Return ONLY valid JSON matching this exact structure:
{
  "appName": "string",
  "description": "string",
  "roles": ["string"],
  "dbSchema": { "tables": [ { "name": "string", "fields": [ { "name": "string", "type": "string", "primaryKey": "boolean", "autoIncrement": "boolean", "nullable": "boolean" } ] } ] },
  "apiSchema": { "endpoints": [ { "path": "string", "method": "string", "description": "string", "allowedRoles": ["string"], "dbOperation": { "type": "string", "table": "string" }, "response": { "status": "number" } } ] },
  "uiSchema": { "layout": { "theme": "string", "navigation": [{"label": "string", "icon": "string", "targetPage": "string", "allowedRoles": ["string" ]}] }, "pages": [{"id": "string", "title": "string", "components": [{"id": "string", "type": "string", "title": "string", "dataSource": "string", "columns": [], "actions": {}}]}] },
  "authSchema": { "roles": {}, "gating": {} },
  "logicSchema": { "rules": [] }
}`;
    const s3Output = await callGemini(s3System, `Architecture JSON:\n${JSON.stringify(s2Output, null, 2)}`);
    const s3Latency = Date.now() - s3Start;
    logStep("Schema Generation", "completed", s3Latency, s2Output, s3Output);

    // ----------------------------------------------------
    // STAGE 4: REFINEMENT LAYER
    // ----------------------------------------------------
    console.log("Starting Stage 4: Refinement...");
    const s4Start = Date.now();
    const s4System = `You are the Refinement and Optimization compiler phase.
Your job is to review the generated schemas for inconsistencies, syntax errors, or logical bugs, and output a refined, consolidated schema.
Ensure that:
- Every table has an auto-incrementing integer ID primary key.
- Every API endpoint that writes data (POST/PUT) has request body validation matching the DB columns.
- Every UI component referencing a datasource endpoint has a matching API endpoint.
- Every CRUD table action references existing endpoints.
- Role lists are consistent everywhere.
Correct any issues and return the final, clean, and consolidated application configuration JSON.
Return ONLY valid JSON matching the Stage 3 format.`;
    const s4Output = await callGemini(s4System, `Schema JSON:\n${JSON.stringify(s3Output, null, 2)}`);
    const s4Latency = Date.now() - s4Start;
    logStep("Refinement Layer", "completed", s4Latency, s3Output, s4Output);

    // ----------------------------------------------------
    // VALIDATION & REPAIR ENGINE
    // ----------------------------------------------------
    console.log("Running Validation Engine...");
    let valResult = validateSchema(s4Output);
    let repairAttempts = 0;
    const maxRepairAttempts = 3;
    let currentSchemaToValidate = s4Output;

    while (!valResult.valid && repairAttempts < maxRepairAttempts) {
      repairAttempts++;
      console.log(`Validation failed! Starting Repair Attempt ${repairAttempts}/${maxRepairAttempts}...`);
      const repairStart = Date.now();

      const repairSystem = `You are the Validation & Repair compiler phase.
You will receive a generated application configuration JSON that has failed validation, along with a list of validation error messages.
Your job is to repair the configuration JSON to resolve ALL listed errors.
Ensure that:
- You fix JSON syntax issues, missing keys, or logic mismatches.
- You do not change parts of the configuration that are already correct and consistent.
- The output contains ALL required fields and satisfies the schema validator.
Return ONLY the corrected, valid JSON.`;

      const repairPrompt = `Errors Found:\n${valResult.errors.map(e => `- ${e}`).join("\n")}\n\nInvalid Config JSON:\n${JSON.stringify(currentSchemaToValidate, null, 2)}`;
      
      try {
        const repairedJSON = await callGemini(repairSystem, repairPrompt);
        const repairLatency = Date.now() - repairStart;
        
        // Re-validate
        valResult = validateSchema(repairedJSON);
        
        logStep(`Repair Attempt ${repairAttempts}`, valResult.valid ? "completed" : "failed", repairLatency, 
          { errors: valResult.errors, original: currentSchemaToValidate }, repairedJSON);
        
        currentSchemaToValidate = repairedJSON;
      } catch (err) {
        console.error(`Repair Attempt ${repairAttempts} crashed:`, err);
        logStep(`Repair Attempt ${repairAttempts}`, "failed", Date.now() - repairStart, 
          { errors: valResult.errors }, null, err.message);
        break;
      }
    }

    if (valResult.valid) {
      finalConfig = currentSchemaToValidate;
      status = "success";
      console.log("Compilation succeeded!");
    } else {
      status = "failed";
      console.error("Compilation failed after all repair attempts.");
    }

  } catch (error) {
    status = "failed";
    console.error("Pipeline crashed:", error);
    logStep("Pipeline Crash Handler", "failed", 0, {}, {}, error.message);
  }

  return {
    status,
    finalConfig,
    steps
  };
}
