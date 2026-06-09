"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface DocumentPreviewButtonProps {
  finalValue: string;
  previewHref: string;
  previewLabel: string;
  printLabel: string;
  className?: string;
  modalTitle?: string;
  initialOpen?: boolean;
}

function isExternalUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export function DocumentPreviewButton({
  finalValue,
  previewHref,
  previewLabel,
  printLabel,
  className = "btn-secondary",
  modalTitle,
  initialOpen = false,
}: DocumentPreviewButtonProps) {
  const hasFinalDocument = finalValue.trim().length > 0;
  const hasDirectFinalUrl = isExternalUrl(finalValue);
  const documentHref = hasDirectFinalUrl ? finalValue : previewHref;
  const [open, setOpen] = useState(initialOpen && hasFinalDocument);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (initialOpen && hasFinalDocument) {
      setOpen(true);
    }
  }, [hasFinalDocument, initialOpen]);

  function handlePrint() {
    try {
      iframeRef.current?.contentWindow?.focus();
      iframeRef.current?.contentWindow?.print();
    } catch {
      window.open(documentHref, "_blank", "noopener,noreferrer");
    }
  }

  if (!hasFinalDocument) {
    return (
      <Link className={className} href={previewHref}>
        {previewLabel}
      </Link>
    );
  }

  return (
    <>
      <button className={className} type="button" onClick={() => setOpen(true)}>
        {printLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#252c38]/40 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-[24px] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#798195]">Preview Dokumen Final</p>
                <h3 className="mt-1 text-xl font-bold text-[#252c38]">
                  {modalTitle || printLabel}
                </h3>
                <p className="mt-2 text-sm text-[#6b7280]">
                  Periksa dokumen final terlebih dahulu, lalu gunakan tombol cetak jika sudah sesuai.
                </p>
              </div>
              <button className="btn-secondary" type="button" onClick={() => setOpen(false)}>
                Tutup
              </button>
            </div>

            <div className="mt-5 overflow-hidden rounded-[20px] border border-[#e8ebf1] bg-[#f7f8fc]">
              <iframe
                ref={iframeRef}
                title={modalTitle || printLabel}
                src={documentHref}
                className="h-[70vh] w-full bg-white"
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <Link className="btn-secondary" href={documentHref} target="_blank" rel="noreferrer">
                Buka Tab Baru
              </Link>
              {hasDirectFinalUrl ? (
                <button className="btn-primary" type="button" onClick={handlePrint}>
                  {printLabel}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
