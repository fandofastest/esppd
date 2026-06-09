import Link from "next/link";

interface WorkflowStep {
  title: string;
  description: string;
  state: "completed" | "current" | "pending";
  href?: string;
}

interface SppdWorkflowStepperProps {
  steps: WorkflowStep[];
}

export function SppdWorkflowStepper({ steps }: SppdWorkflowStepperProps) {
  return (
    <section className="card p-5">
      <p className="text-sm font-medium text-[#798195]">Progress Tahapan SPPD</p>
      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        {steps.map((step, index) => {
          const isCompleted = step.state === "completed";
          const isCurrent = step.state === "current";
          const className = `rounded-[18px] border p-4 transition ${
            isCompleted
              ? "border-[#cfead8] bg-[#edf8ef]"
              : isCurrent
                ? "border-[#ffd4d1] bg-[#fff1ef]"
                : "border-[#e7ebf2] bg-[#fbfcfe]"
          } ${
            step.href
              ? "cursor-pointer hover:border-[#cfd6e4] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e2342d] focus-visible:ring-offset-2"
              : ""
          }`;
          const content = (
            <>
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    isCompleted
                      ? "bg-[#2b8e5c] text-white"
                      : isCurrent
                        ? "bg-[#e2342d] text-white"
                        : "bg-[#d9deea] text-[#556070]"
                  }`}
                >
                  {index + 1}
                </div>
                <p className="text-sm font-bold text-[#252c38]">{step.title}</p>
              </div>
              <p className="mt-3 text-sm text-[#667085]">{step.description}</p>
              {step.href ? (
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#98a0b2]">
                  Klik untuk buka tahap
                </p>
              ) : null}
            </>
          );

          if (step.href) {
            return (
              <Link key={`${step.title}-${index}`} href={step.href} className={className}>
                {content}
              </Link>
            );
          }

          return (
            <div key={`${step.title}-${index}`} className={className}>
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
