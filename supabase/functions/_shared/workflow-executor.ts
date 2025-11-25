// Workflow Execution Engine
// Handles multi-step workflow execution with parallel processing and error recovery

import type { WorkflowPlan, WorkflowStep } from './workflow-planner.ts';
import { mapInputsFromPreviousSteps } from './workflow-planner.ts';

export interface WorkflowExecution {
  id: string;
  plan: WorkflowPlan;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  currentStep: number;
  stepResults: Record<number, any>;
  errors: Record<number, string>;
  startedAt: Date;
  completedAt?: Date;
}

export interface ExecutionProgress {
  workflowId: string;
  currentStep: number;
  totalSteps: number;
  stepResults: Record<number, any>;
  status: 'running' | 'completed' | 'failed';
  message: string;
}

/**
 * Execute a workflow plan step by step
 */
export async function executeWorkflow(
  plan: WorkflowPlan,
  toolExecutor: (toolName: string, params: any) => Promise<any>,
  onProgress?: (progress: ExecutionProgress) => void
): Promise<WorkflowExecution> {
  
  const execution: WorkflowExecution = {
    id: crypto.randomUUID(),
    plan,
    status: 'running',
    currentStep: 0,
    stepResults: {},
    errors: {},
    startedAt: new Date()
  };

  console.log(`[Workflow Executor] Starting workflow: ${plan.goal}`);
  console.log(`[Workflow Executor] ${plan.steps.length} steps to execute`);

  try {
    // Group steps by dependency level for parallel execution
    const executionGroups = groupStepsForParallelExecution(plan.steps);
    
    for (const group of executionGroups) {
      console.log(`[Workflow Executor] Executing group of ${group.length} steps`);
      
      // Execute all steps in this group in parallel
      const groupPromises = group.map(step => 
        executeStep(step, execution.stepResults, toolExecutor, execution)
      );
      
      const groupResults = await Promise.allSettled(groupPromises);
      
      // Process results
      for (let i = 0; i < group.length; i++) {
        const step = group[i];
        const result = groupResults[i];
        
        execution.currentStep = step.stepNumber;
        
        if (result.status === 'fulfilled') {
          execution.stepResults[step.stepNumber] = result.value;
          console.log(`[Workflow Executor] Step ${step.stepNumber} completed successfully`);
          
          // Report progress
          if (onProgress) {
            onProgress({
              workflowId: execution.id,
              currentStep: step.stepNumber,
              totalSteps: plan.steps.length,
              stepResults: execution.stepResults,
              status: 'running',
              message: `Completed: ${step.purpose}`
            });
          }
        } else {
          execution.errors[step.stepNumber] = result.reason?.message || 'Unknown error';
          console.error(`[Workflow Executor] Step ${step.stepNumber} failed:`, result.reason);
          
          // Check if this is a critical step (has dependents)
          const hasDependents = plan.steps.some(s => 
            s.dependsOn?.includes(step.stepNumber)
          );
          
          if (hasDependents) {
            throw new Error(`Critical step ${step.stepNumber} failed: ${execution.errors[step.stepNumber]}`);
          }
        }
      }
    }
    
    execution.status = 'completed';
    execution.completedAt = new Date();
    
    console.log(`[Workflow Executor] Workflow completed successfully`);
    console.log(`[Workflow Executor] Duration: ${execution.completedAt.getTime() - execution.startedAt.getTime()}ms`);
    
    if (onProgress) {
      onProgress({
        workflowId: execution.id,
        currentStep: plan.steps.length,
        totalSteps: plan.steps.length,
        stepResults: execution.stepResults,
        status: 'completed',
        message: 'Workflow completed successfully'
      });
    }
    
  } catch (error) {
    execution.status = 'failed';
    execution.completedAt = new Date();
    console.error('[Workflow Executor] Workflow failed:', error);
    
    if (onProgress) {
      onProgress({
        workflowId: execution.id,
        currentStep: execution.currentStep,
        totalSteps: plan.steps.length,
        stepResults: execution.stepResults,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Workflow failed'
      });
    }
  }
  
  return execution;
}

/**
 * Execute a single workflow step
 */
async function executeStep(
  step: WorkflowStep,
  previousResults: Record<number, any>,
  toolExecutor: (toolName: string, params: any) => Promise<any>,
  execution: WorkflowExecution
): Promise<any> {
  console.log(`[Workflow Executor] Executing step ${step.stepNumber}: ${step.action}`);
  console.log(`[Workflow Executor] Purpose: ${step.purpose}`);
  
  // Map inputs from previous steps
  const mappedParams = mapInputsFromPreviousSteps(
    step.parameters,
    step.inputMapping,
    previousResults
  );
  
  console.log(`[Workflow Executor] Calling tool: ${step.action}`);
  
  // Execute the tool
  try {
    const result = await toolExecutor(step.action, mappedParams);
    return result;
  } catch (error) {
    console.error(`[Workflow Executor] Step ${step.stepNumber} error:`, error);
    throw error;
  }
}

/**
 * Group steps by dependency level for parallel execution
 * Steps without dependencies or with satisfied dependencies can run in parallel
 */
function groupStepsForParallelExecution(steps: WorkflowStep[]): WorkflowStep[][] {
  const groups: WorkflowStep[][] = [];
  const processed = new Set<number>();
  
  while (processed.size < steps.length) {
    const currentGroup: WorkflowStep[] = [];
    
    for (const step of steps) {
      if (processed.has(step.stepNumber)) continue;
      
      // Check if all dependencies are satisfied
      const dependenciesSatisfied = !step.dependsOn || 
        step.dependsOn.every(dep => processed.has(dep));
      
      if (dependenciesSatisfied && step.canRunInParallel) {
        currentGroup.push(step);
        processed.add(step.stepNumber);
      } else if (dependenciesSatisfied) {
        // Sequential step - must be in its own group
        if (currentGroup.length === 0) {
          currentGroup.push(step);
          processed.add(step.stepNumber);
        }
        break; // Stop adding to this group
      }
    }
    
    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    } else {
      // No progress made - circular dependency
      throw new Error('Circular dependency detected in workflow');
    }
  }
  
  return groups;
}

/**
 * Pause a running workflow
 */
export function pauseWorkflow(execution: WorkflowExecution): void {
  if (execution.status === 'running') {
    execution.status = 'paused';
    console.log(`[Workflow Executor] Workflow paused at step ${execution.currentStep}`);
  }
}

/**
 * Resume a paused workflow
 */
export async function resumeWorkflow(
  execution: WorkflowExecution,
  toolExecutor: (toolName: string, params: any) => Promise<any>,
  onProgress?: (progress: ExecutionProgress) => void
): Promise<WorkflowExecution> {
  if (execution.status !== 'paused') {
    throw new Error('Can only resume paused workflows');
  }
  
  console.log(`[Workflow Executor] Resuming workflow from step ${execution.currentStep}`);
  
  // Find remaining steps
  const remainingSteps = execution.plan.steps.filter(
    step => !execution.stepResults[step.stepNumber]
  );
  
  // Create a new plan with remaining steps
  const resumedPlan: WorkflowPlan = {
    ...execution.plan,
    steps: remainingSteps
  };
  
  // Continue execution
  return executeWorkflow(resumedPlan, toolExecutor, onProgress);
}
