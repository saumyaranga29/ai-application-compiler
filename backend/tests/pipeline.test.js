import test from "node:test";
import assert from "node:assert";
import { runCompilationPipeline } from "../pipeline.js";
import { validateSchema } from "../validator.js";

test("Pipeline - Mock Generator compilation succeeds and outputs compliant schema", async () => {
  // Triggers offline mock generator because no API key is specified (or dummy key is used)
  const prompt = "Build a CRM with login, contacts, dashboard, role-based access, and premium plan. Admins can view analytics, sales agents can edit contacts.";
  
  const result = await runCompilationPipeline(prompt);
  
  assert.strictEqual(result.status, "success");
  assert.ok(result.finalConfig);
  assert.ok(result.steps.length > 0);
  
  // Verify it passes validation
  const validation = validateSchema(result.finalConfig);
  assert.strictEqual(validation.valid, true);
  assert.strictEqual(validation.errors.length, 0);
});

test("Pipeline - Correctly handles vague / edge case prompts through fallback simulator", async () => {
  const prompt = "A listing booking app with a table only.";
  const result = await runCompilationPipeline(prompt);
  
  assert.strictEqual(result.status, "success");
  assert.ok(result.finalConfig);
  
  const validation = validateSchema(result.finalConfig);
  assert.strictEqual(validation.valid, true);
});
