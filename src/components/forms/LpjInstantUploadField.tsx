"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { uploadLpjStoredFileAction } from "@/actions/sppd.actions";
import { DeleteLpjFileButton } from "@/components/forms/DeleteLpjFileButton";

type LpjFileField =
  | "scan_visum"
  | "scan_dpr"
  | "foto_ktp"
  | "bukti_hotel"
  | "dokumentasi"
  | "nota_bukti";

interface LpjInstantUploadFieldProps {
  sppdId: string;
  pegawaiId: string;
  field: LpjFileField;
  label: string;
  inputName: string;
  accept: string;
  helpText: string;
  emptyText: string;
  uploadedFiles?: Array<{
    value: string;
    previewUrl?: string;
  }>;
  required?: boolean;
  multiple?: boolean;
  isComplete?: boolean;
}

export function LpjInstantUploadField({
  sppdId,
  pegawaiId,
  field,
  label,
  inputName,
  accept,
  helpText,
  emptyText,
  uploadedFiles = [],
  required = false,
  multiple = true,
  isComplete = false,
}: LpjInstantUploadFieldProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, fileName: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.size > 0);
    if (files.length === 0) {
      return;
    }

    setIsUploading(true);
    setMessage("");
    setError("");

    let hasUploaded = false;

    try {
      for (const [index, file] of files.entries()) {
        setProgress({
          current: index + 1,
          total: files.length,
          fileName: file.name,
        });

        const formData = new FormData();
        formData.append("sppd_id", sppdId);
        formData.append("pegawai_id", pegawaiId);
        formData.append("field", field);
        formData.append("file", file);

        const result = await uploadLpjStoredFileAction(formData);
        if (!result.success) {
          throw new Error(result.message);
        }

        hasUploaded = true;
        setMessage(result.message);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload berkas gagal.");
    } finally {
      setIsUploading(false);
      setProgress({ current: 0, total: 0, fileName: "" });

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      if (hasUploaded) {
        router.refresh();
      }
    }
  }

  return (
    <div
      className={`rounded-[18px] border p-4 ${
        isComplete ? "border-[#cfead8] bg-[#edf8ef]" : "border-[#e8ebf1] bg-[#f7f8fc]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-[#252c38]">{label}</p>
          <p className="mt-1 text-xs text-[#7d8598]">{helpText}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
            isComplete ? "bg-[#2b8e5c] text-white" : "bg-white text-[#7d8598]"
          }`}
        >
          {isComplete ? "Lengkap" : "Belum Lengkap"}
        </span>
      </div>

      <div className="mt-4">
        <input
          ref={inputRef}
          className="input"
          type="file"
          name={inputName}
          accept={accept}
          multiple={multiple}
          required={required}
          disabled={isUploading}
          onChange={handleUpload}
        />
      </div>

      {isUploading ? (
        <div className="mt-3 rounded-[14px] bg-[#fff7e8] px-3 py-3 text-sm text-[#9a6700]">
          <p className="font-semibold">
            Mengunggah {progress.current} / {progress.total}
          </p>
          <p className="mt-1 break-all">{progress.fileName}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
            <div
              className="h-full rounded-full bg-[#f59e0b] transition-all duration-300"
              style={{
                width:
                  progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : "0%",
              }}
            />
          </div>
        </div>
      ) : null}
      {message ? (
        <div className="mt-3 rounded-[14px] bg-[#edf8ef] px-3 py-2 text-sm text-[#2b8e5c]">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mt-3 rounded-[14px] bg-[#fff1ef] px-3 py-2 text-sm text-[#d9544d]">
          {error}
        </div>
      ) : null}

      <div className="mt-4 space-y-2 border-t border-[#dfe4ee] pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#8a92a5]">
          File Terunggah
        </p>
        {uploadedFiles.length ? (
          uploadedFiles.map((item, index) => (
            <div
              key={`${field}-${item.value}-${index}`}
              className="flex items-start justify-between gap-3 rounded-[14px] bg-white px-3 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium text-[#252c38]">
                  {label} {index + 1}
                </p>
                {item.previewUrl ? (
                  <a
                    className="mt-1 inline-block break-all font-semibold text-[#e2342d] underline"
                    href={item.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Preview Berkas
                  </a>
                ) : (
                  <p className="mt-1 break-all text-[#5b6578]">{item.value}</p>
                )}
              </div>
              <DeleteLpjFileButton
                sppdId={sppdId}
                pegawaiId={pegawaiId}
                field={field}
                value={item.value}
              />
            </div>
          ))
        ) : (
          <p className="text-sm text-[#7d8598]">{emptyText}</p>
        )}
      </div>
    </div>
  );
}
