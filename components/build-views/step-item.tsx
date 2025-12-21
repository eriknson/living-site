"use client";

import { TextShimmer } from "@/components/ui/text-shimmer";
import { Step, getCompletedLabel, formatDuration } from "@/lib/step-types";

interface StepItemProps {
  step: Step;
}

export function StepItem({ step }: StepItemProps) {
  const isActive = !step.completedAt;
  const duration = formatDuration(step.startedAt, step.completedAt);

  // Active state - shimmer label + detail lines below
  if (isActive) {
    return (
      <div className="py-1">
        {/* Label row with duration */}
        <div className="flex items-baseline justify-between gap-4">
          <TextShimmer className="text-[15px]">
            {step.label}
          </TextShimmer>
          <span className="text-[15px] text-zinc-400 tabular-nums shrink-0">
            {duration}
          </span>
        </div>
        
        {/* Detail lines */}
        {step.details.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {step.details.map((detail, i) => (
              <p 
                key={i} 
                className="text-[15px] text-zinc-500 truncate"
                title={detail}
              >
                {detail}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Complete state - gray label with duration
  return (
    <div className="py-1">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[15px] text-zinc-400">
          {getCompletedLabel(step)}
        </span>
        <span className="text-[15px] text-zinc-400 tabular-nums shrink-0">
          {duration}
        </span>
      </div>
    </div>
  );
}
