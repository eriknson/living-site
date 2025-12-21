/**
 * Step Types for Dynamic Loading UX
 *
 * Steps are built dynamically from agent events - no pre-defined phases.
 * Labels are derived deterministically from event type and data.
 */

export type StepType = "init" | "thinking" | "reading" | "writing" | "context";

export interface Step {
  id: string;
  type: StepType;
  label: string; // "Thinking", "Reading brief.json", etc.
  details: string[]; // Human-readable detail lines shown below active step
  startedAt: number;
  completedAt?: number;
  expanded: boolean;
}

interface DerivedStep {
  type: StepType;
  label: string;
  detail?: string; // Human-readable detail to add
}

/**
 * Extract filename from a path
 */
function getFilename(path?: string): string {
  if (!path) return "file";
  return path.split("/").pop() || path;
}

/**
 * Create human-readable detail from tool call
 */
function getToolDetail(
  toolCall: Record<string, unknown>
): string | undefined {
  const toolKeys = Object.keys(toolCall);

  for (const key of toolKeys) {
    const call = toolCall[key] as { args?: { path?: string } } | undefined;
    const path = call?.args?.path;

    if (path) {
      const filename = getFilename(path);
      if (key.includes("read") || key.includes("Read")) {
        return `Reading ${filename}`;
      }
      if (key.includes("write") || key.includes("Write")) {
        return `Writing to ${filename}`;
      }
    }
  }

  return undefined;
}

/**
 * Derive step type and label from an agent event
 */
export function deriveStep(
  event: Record<string, unknown> | null,
  rawData: string
): DerivedStep | null {
  // Non-JSON spawn events
  if (!event) {
    if (rawData.startsWith("$") || rawData.includes("[spawn]")) {
      return { type: "init", label: "Initialized agent via Cursor CLI" };
    }
    if (rawData.includes("Connecting")) {
      return { type: "init", label: "Connecting to agent" };
    }
    return null;
  }

  // System initialization
  if (event.type === "system") {
    return { type: "context", label: "Retrieved context" };
  }

  // Thinking/reasoning
  if (event.type === "thinking" || event.type === "assistant") {
    let thought: string | undefined;

    // Try to extract thought text
    const message = event.message as
      | { content?: Array<{ text?: string }> }
      | undefined;
    if (message?.content) {
      const textContent = message.content.find((c) => c.text);
      if (textContent?.text) {
        // Take first sentence or first 60 chars
        const text = textContent.text;
        const firstSentence = text.split(/[.!?]/)[0];
        thought =
          firstSentence.length > 60
            ? firstSentence.slice(0, 60) + "..."
            : firstSentence;
      }
    }

    return { type: "thinking", label: "Thinking", detail: thought };
  }

  // Tool calls
  if (event.type === "tool_call" && event.tool_call) {
    const toolCall = event.tool_call as Record<string, unknown>;
    const toolKeys = Object.keys(toolCall);
    const detail = getToolDetail(toolCall);

    for (const key of toolKeys) {
      if (key === "readToolCall" || key.includes("read") || key.includes("Read")) {
        const readCall = toolCall[key] as { args?: { path?: string } } | undefined;
        const path = readCall?.args?.path;
        const filename = getFilename(path);
        
        // Create descriptive labels based on what's being read
        let label = `Reading ${filename}`;
        if (filename.includes("brief") || filename.includes("identity")) {
          label = "Read context and activity data";
        } else if (filename.includes("bio") || filename.includes("about")) {
          label = "Read bio and experience";
        }
        
        return { type: "reading", label, detail };
      }

      if (key === "writeToolCall" || key.includes("write") || key.includes("Write")) {
        const writeCall = toolCall[key] as { args?: { path?: string } } | undefined;
        const path = writeCall?.args?.path;
        const filename = getFilename(path);
        
        let label = "Building website";
        if (filename.includes("html")) {
          label = "Building website";
        }
        
        return { type: "writing", label, detail };
      }
    }

    // Generic tool call
    const toolName = toolKeys[0]?.replace(/ToolCall$/, "") || "tool";
    return { type: "writing", label: `Using ${toolName}`, detail };
  }

  return null;
}

/**
 * Process an event and update the steps array
 * Groups consecutive events of the same type into one step
 */
export function processEvent(
  steps: Step[],
  derived: DerivedStep
): Step[] {
  const now = Date.now();
  const currentStep = steps[steps.length - 1];

  // Same type and not completed? Extend current step with new detail
  if (
    currentStep &&
    currentStep.type === derived.type &&
    !currentStep.completedAt
  ) {
    return steps.map((s, i) =>
      i === steps.length - 1
        ? {
            ...s,
            // Add detail if it's new and not duplicate
            details: derived.detail && !s.details.includes(derived.detail)
              ? [...s.details.slice(-4), derived.detail] // Keep last 5
              : s.details,
          }
        : s
    );
  }

  // Different type - complete previous step and start new one
  const updated =
    currentStep && !currentStep.completedAt
      ? steps.map((s, i) =>
          i === steps.length - 1 ? { ...s, completedAt: now } : s
        )
      : steps;

  // Add new step
  return [
    ...updated,
    {
      id: `step-${now}-${Math.random().toString(36).slice(2, 6)}`,
      type: derived.type,
      label: derived.label,
      details: derived.detail ? [derived.detail] : [],
      startedAt: now,
      expanded: false,
    },
  ];
}

/**
 * Format duration in seconds
 */
export function formatDuration(
  startedAt: number,
  completedAt?: number
): string {
  const end = completedAt || Date.now();
  const seconds = Math.round((end - startedAt) / 1000);
  return `${seconds}s`;
}

/**
 * Get completed label for a step (past tense)
 */
export function getCompletedLabel(step: Step): string {
  switch (step.type) {
    case "init":
      return step.label; // Already past tense
    case "context":
      return step.label;
    case "thinking":
      return "Thought";
    case "reading":
      return step.label.replace("Reading", "Read");
    case "writing":
      if (step.label === "Building website") {
        return "Built website";
      }
      return step.label.replace("Writing", "Wrote").replace("Building", "Built");
    default:
      return step.label;
  }
}
