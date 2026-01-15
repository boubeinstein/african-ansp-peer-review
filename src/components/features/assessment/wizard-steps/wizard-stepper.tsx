"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

export interface WizardStep {
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
}

interface WizardStepperProps {
  currentStep: number;
  totalSteps: number;
  steps: WizardStep[];
}

export function WizardStepper({ currentStep, totalSteps, steps }: WizardStepperProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => (
          <li key={index} className="relative flex-1">
            <div className="flex flex-col items-center">
              {/* Step indicator */}
              <div className="relative flex items-center justify-center">
                {step.isCompleted ? (
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  >
                    <Check className="h-5 w-5" />
                  </motion.div>
                ) : step.isActive ? (
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-background"
                  >
                    <span className="text-sm font-semibold text-primary">
                      {index + 1}
                    </span>
                  </motion.div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-muted bg-background">
                    <span className="text-sm font-medium text-muted-foreground">
                      {index + 1}
                    </span>
                  </div>
                )}
              </div>

              {/* Step labels */}
              <div className="mt-3 text-center">
                <span
                  className={cn(
                    "text-sm font-medium",
                    step.isActive
                      ? "text-primary"
                      : step.isCompleted
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block text-xs",
                    step.isActive || step.isCompleted
                      ? "text-muted-foreground"
                      : "text-muted-foreground/60"
                  )}
                >
                  {step.description}
                </span>
              </div>
            </div>

            {/* Connecting line */}
            {index < totalSteps - 1 && (
              <div
                className="absolute left-[calc(50%+20px)] right-[calc(-50%+20px)] top-5 h-0.5"
                aria-hidden="true"
              >
                <div className="h-full w-full bg-muted">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{
                      width: step.isCompleted ? "100%" : "0%",
                    }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-primary"
                  />
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>

      {/* Mobile progress bar */}
      <div className="mt-4 sm:hidden">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="font-medium text-primary">{steps[currentStep - 1]?.title}</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
            transition={{ duration: 0.3 }}
            className="h-full bg-primary"
          />
        </div>
      </div>
    </nav>
  );
}
