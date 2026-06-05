import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { runCompilationPipeline } from "./pipeline.js";
import { evaluationDataset } from "./dataset.js";
import { runSingleEvaluation, runFullEvaluationSuite, getEvaluationReport } from "./evaluator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Status check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date() });
});

// Main Compilation Endpoint
app.post("/api/compile", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing required parameter 'prompt' (string)" });
  }

  try {
    console.log(`Received compilation request for prompt: "${prompt.slice(0, 60)}..."`);
    const result = await runCompilationPipeline(prompt);
    res.json(result);
  } catch (error) {
    console.error("Compilation error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get Evaluation Dataset
app.get("/api/evaluation/dataset", (req, res) => {
  res.json(evaluationDataset);
});

// Get Current Evaluation Report
app.get("/api/evaluation/report", (req, res) => {
  res.json(getEvaluationReport());
});

// Run Single Test Case
app.post("/api/evaluation/run-single", async (req, res) => {
  const { testCaseId } = req.body;
  if (!testCaseId) {
    return res.status(400).json({ error: "Missing required parameter 'testCaseId'" });
  }

  try {
    const result = await runSingleEvaluation(testCaseId);
    res.json(result);
  } catch (error) {
    console.error(`Error running test case ${testCaseId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Run Full Evaluation Suite (Asynchronous in background)
let isSuiteRunning = false;
app.post("/api/evaluation/run-all", async (req, res) => {
  if (isSuiteRunning) {
    return res.status(400).json({ error: "Evaluation suite is already running." });
  }

  isSuiteRunning = true;
  res.json({ message: "Evaluation suite started in background." });

  try {
    await runFullEvaluationSuite((current, total, result) => {
      console.log(`Progress: ${current}/${total} complete. Last case: ${result.name}`);
    });
  } catch (err) {
    console.error("Full evaluation run failed:", err);
  } finally {
    isSuiteRunning = false;
  }
});

// Serve static assets from React frontend dist directory in production
const frontendDistPath = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDistPath));

// Fallback all non-API GET requests to index.html for React SPA routing
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendDistPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`AI Compiler Backend running on port ${PORT}`);
});
