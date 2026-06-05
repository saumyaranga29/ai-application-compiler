import { runCompilationPipeline } from "./pipeline.js";

async function runTest() {
  console.log("=== STARTING PIPELINE INTEGRATION TEST ===");
  const prompt = "Build a CRM with login, contacts, dashboard, role-based access, and premium plan with payments. Admins can see analytics.";
  
  try {
    const result = await runCompilationPipeline(prompt, (step) => {
      console.log(`[Step] ${step.name}: ${step.status} (${step.latency}ms)`);
      if (step.error) console.error(`  Error: ${step.error}`);
    });
    
    console.log("=== PIPELINE RUN COMPLETE ===");
    console.log(`Status: ${result.status.toUpperCase()}`);
    console.log(`Total Steps Executed: ${result.steps.length}`);
    
    if (result.status === "success" && result.finalConfig) {
      console.log("Valid Config JSON Generated! Top-level keys check:");
      console.log(Object.keys(result.finalConfig));
      console.log("Database tables count:", result.finalConfig.dbSchema?.tables?.length);
      console.log("API endpoints count:", result.finalConfig.apiSchema?.endpoints?.length);
      console.log("UI pages count:", result.finalConfig.uiSchema?.pages?.length);
      console.log("Auth roles:", result.finalConfig.roles);
    } else {
      console.error("Compilation failed to produce a valid config.");
    }
  } catch (err) {
    console.error("Test execution crashed:", err);
  }
}

runTest();
