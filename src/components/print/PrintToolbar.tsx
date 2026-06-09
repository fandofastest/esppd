"use client";

export function PrintToolbar({ label }: { label: string }) {
  return (
    <div className="no-print mb-4 flex justify-end">
      <button className="btn-primary" type="button" onClick={() => window.print()}>
        {label}
      </button>
    </div>
  );
}
