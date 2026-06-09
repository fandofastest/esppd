"use client";

import { useFormStatus } from "react-dom";

interface FormActionButtonProps {
  label: string;
  pendingLabel: string;
  className: string;
  disabled?: boolean;
}

export function FormActionButton({
  label,
  pendingLabel,
  className,
  disabled = false,
}: FormActionButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button className={className} type="submit" disabled={pending || disabled}>
      <span className="inline-flex items-center justify-center gap-2">
        {pending ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        <span>{pending ? pendingLabel : label}</span>
      </span>
    </button>
  );
}
