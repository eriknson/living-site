"use client";

import { Step } from "@/lib/step-types";
import { StepItem } from "./step-item";

interface StepListProps {
  steps: Step[];
}

export function StepList({ steps }: StepListProps) {
  if (steps.length === 0) {
    return (
      <div className="text-[15px] text-zinc-400">
        Waiting for agent...
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {steps.map((step) => (
        <StepItem key={step.id} step={step} />
      ))}
    </div>
  );
}
