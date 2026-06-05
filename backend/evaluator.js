import { runCompilationPipeline } from "./pipeline.js";
import { evaluationDataset } from "./dataset.js";
import { validateSchema } from "./validator.js";

// Keep track of test runs in memory
let evaluationReport = {
  summary: {
    totalRuns: 0,
    successCount: 0,
    failCount: 0,
    averageLatencyMs: 0,
    averageRetries: 0,
    totalCostUSD: 0,
    failureBreakdown: {
      json_syntax: 0,
      missing_keys: 0,
      schema_mismatch: 0,
      other: 0
    }
  },
  results: []
};

// Simple token estimation
function estimateTokens(text) {
  // Rough approximation: 1 token ~= 4 characters for English text/JSON
  return Math.ceil((text || "").length / 4);
}

function calculateCostUSD(inputTokens, outputTokens) {
  // Rates for gemini-2.5-flash:
  // Input: $0.075 / 1M tokens -> 0.000000075 per token
  // Output: $0.30 / 1M tokens -> 0.00000030 per token
  const inputRate = 0.075 / 1000000;
  const outputRate = 0.30 / 1000000;
  return (inputTokens * inputRate) + (outputTokens * outputRate);
}

export function getEvaluationReport() {
  return evaluationReport;
}

export async function runSingleEvaluation(testCaseId) {
  const testCase = evaluationDataset.find(tc => tc.id === testCaseId);
  if (!testCase) throw new Error("Test case not found");

  const startTime = Date.now();
  console.log(`Running evaluation for: ${testCase.name}`);
  
  let stepsLog = [];
  const pipelineResult = await runCompilationPipeline(testCase.prompt, (step) => {
    stepsLog.push(step);
  });

  const latency = Date.now() - startTime;
  const success = pipelineResult.status === "success";

  // Calculate tokens & costs
  let inputTokens = 0;
  let outputTokens = 0;

  for (const s of pipelineResult.steps) {
    inputTokens += estimateTokens(JSON.stringify(s.input));
    outputTokens += estimateTokens(JSON.stringify(s.output));
  }

  const cost = calculateCostUSD(inputTokens, outputTokens);
  const retries = pipelineResult.steps.filter(s => s.name.startsWith("Repair Attempt")).length;

  // Classify failure types if failed
  let failureType = null;
  if (!success) {
    const finalStep = pipelineResult.steps[pipelineResult.steps.length - 1];
    const errors = finalStep.error || (finalStep.output && validateSchema(finalStep.output).errors) || [];
    const errorStr = JSON.stringify(errors).toLowerCase();

    if (errorStr.includes("syntax") || errorStr.includes("parse")) {
      failureType = "json_syntax";
    } else if (errorStr.includes("missing")) {
      failureType = "missing_keys";
    } else if (errorStr.includes("mismatch") || errorStr.includes("undefined") || errorStr.includes("datasource")) {
      failureType = "schema_mismatch";
    } else {
      failureType = "other";
    }
  }

  const resultItem = {
    testCaseId: testCase.id,
    name: testCase.name,
    type: testCase.type,
    prompt: testCase.prompt,
    success,
    latency,
    retries,
    cost,
    failureType,
    errors: pipelineResult.steps[pipelineResult.steps.length - 1]?.error || 
            (pipelineResult.finalConfig ? [] : validateSchema(pipelineResult.steps[pipelineResult.steps.length - 1]?.output).errors),
    outputConfig: pipelineResult.finalConfig,
    steps: pipelineResult.steps
  };

  // Add to report list
  evaluationReport.results = evaluationReport.results.filter(r => r.testCaseId !== testCaseId);
  evaluationReport.results.push(resultItem);

  // Recalculate summary metrics
  updateSummary();

  return resultItem;
}

export async function runFullEvaluationSuite(onProgress = () => {}) {
  console.log("Starting full evaluation suite...");
  evaluationReport.results = [];
  
  for (let i = 0; i < evaluationDataset.length; i++) {
    const tc = evaluationDataset[i];
    try {
      const result = await runSingleEvaluation(tc.id);
      onProgress(i + 1, evaluationDataset.length, result);
    } catch (err) {
      console.error(`Error in evaluation for ${tc.name}:`, err);
    }
  }

  updateSummary();
  console.log("Full evaluation suite completed!");
  return evaluationReport;
}

function updateSummary() {
  const results = evaluationReport.results;
  const count = results.length;
  if (count === 0) return;

  const successCount = results.filter(r => r.success).length;
  const failCount = count - successCount;
  const totalLatency = results.reduce((acc, r) => acc + r.latency, 0);
  const totalRetries = results.reduce((acc, r) => acc + r.retries, 0);
  const totalCost = results.reduce((acc, r) => acc + r.cost, 0);

  const breakdown = { json_syntax: 0, missing_keys: 0, schema_mismatch: 0, other: 0 };
  for (const r of results) {
    if (!r.success && r.failureType) {
      breakdown[r.failureType] = (breakdown[r.failureType] || 0) + 1;
    }
  }

  evaluationReport.summary = {
    totalRuns: count,
    successCount,
    failCount,
    averageLatencyMs: Math.round(totalLatency / count),
    averageRetries: Number((totalRetries / count).toFixed(2)),
    totalCostUSD: Number(totalCost.toFixed(5)),
    failureBreakdown: breakdown
  };
}
