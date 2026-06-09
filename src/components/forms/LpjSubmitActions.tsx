"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { FormActionButton } from "@/components/forms/FormActionButton";
import type { JenisPerjalanan } from "@/models";

interface LpjSubmitActionsProps {
  jenisPerjalanan: JenisPerjalanan;
  existingScanVisumCount: number;
  existingScanDprCount: number;
  existingTransportProofCount: number;
  existingBuktiHotelCount: number;
  existingFotoKtpCount: number;
  existingDocumentationCount: number;
}

function parseNumber(value: FormDataEntryValue | null) {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

export function LpjSubmitActions({
  jenisPerjalanan,
  existingScanVisumCount,
  existingScanDprCount,
  existingTransportProofCount,
  existingBuktiHotelCount,
  existingFotoKtpCount,
  existingDocumentationCount,
}: LpjSubmitActionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [message, setMessage] = useState("Lengkapi dokumen wajib agar LPJ bisa dikirim.");
  const [selectedFiles, setSelectedFiles] = useState({
    scan_visum_files: 0,
    scan_dpr_files: 0,
    nota_bukti_files: 0,
    bukti_hotel_files: 0,
    foto_ktp_files: 0,
    dokumentasi_files: 0,
  });
  const [pendingStageIndex, setPendingStageIndex] = useState(0);
  const { pending } = useFormStatus();

  const summary = useMemo(
    () => ({
      existingScanVisumCount,
      existingScanDprCount,
      existingTransportProofCount,
      existingBuktiHotelCount,
      existingFotoKtpCount,
      existingDocumentationCount,
    }),
    [
      existingBuktiHotelCount,
      existingDocumentationCount,
      existingFotoKtpCount,
      existingScanDprCount,
      existingScanVisumCount,
      existingTransportProofCount,
    ],
  );

  const selectedFileSummary = useMemo(
    () => [
      { label: "Scan Visum", count: selectedFiles.scan_visum_files },
      { label: "Scan DPR", count: selectedFiles.scan_dpr_files },
      { label: "Bukti Transport", count: selectedFiles.nota_bukti_files },
      { label: "Bukti Hotel", count: selectedFiles.bukti_hotel_files },
      { label: "Foto KTP", count: selectedFiles.foto_ktp_files },
      { label: "Dokumentasi", count: selectedFiles.dokumentasi_files },
    ],
    [selectedFiles],
  );
  const totalNewFiles = useMemo(
    () => selectedFileSummary.reduce((total, item) => total + item.count, 0),
    [selectedFileSummary],
  );
  const pendingStages = useMemo(() => {
    const uploadLabel =
      totalNewFiles > 0
        ? `Mengunggah ${totalNewFiles} berkas baru satu per satu`
        : "Tidak ada berkas baru, lanjut ke penyimpanan LPJ";

    return [
      "Menyiapkan data LPJ",
      uploadLabel,
      "Menyimpan realisasi dan perhitungan LPJ",
      "Menyelesaikan proses dan menunggu halaman diperbarui",
    ];
  }, [totalNewFiles]);

  useEffect(() => {
    const form = containerRef.current?.closest("form");
    if (!form) {
      return;
    }

    const inputFileCount = (name: string) => {
      const input = form.querySelector<HTMLInputElement>(`input[name="${name}"]`);
      return input?.files?.length ?? 0;
    };

    const evaluate = () => {
      const formData = new FormData(form);
      const missing: string[] = [];
      const nextSelectedFiles = {
        scan_visum_files: inputFileCount("scan_visum_files"),
        scan_dpr_files: inputFileCount("scan_dpr_files"),
        nota_bukti_files: inputFileCount("nota_bukti_files"),
        bukti_hotel_files: inputFileCount("bukti_hotel_files"),
        foto_ktp_files: inputFileCount("foto_ktp_files"),
        dokumentasi_files: inputFileCount("dokumentasi_files"),
      };

      setSelectedFiles(nextSelectedFiles);

      const scanVisumReady =
        summary.existingScanVisumCount > 0 || nextSelectedFiles.scan_visum_files > 0;
      const scanDprReady =
        summary.existingScanDprCount > 0 || nextSelectedFiles.scan_dpr_files > 0;
      if (!scanVisumReady) {
        missing.push("scan visum");
      }
      if (!scanDprReady) {
        missing.push("scan DPR");
      }

      const transportRiil = parseNumber(formData.get("transport_riil"));
      const transportReady =
        jenisPerjalanan === "Dalam_Kota" ||
        transportRiil <= 0 ||
        summary.existingTransportProofCount > 0 ||
        nextSelectedFiles.nota_bukti_files > 0;
      if (!transportReady) {
        missing.push("bukti transport");
      }

      const documentationReady = summary.existingDocumentationCount > 0 || nextSelectedFiles.dokumentasi_files > 0;
      if (!documentationReady) {
        missing.push("dokumentasi kegiatan");
      }

      const statusHotel =
        jenisPerjalanan === "Dalam_Kota"
          ? "Dalam_Kota_Tanpa_Hotel"
          : String(formData.get("status_hotel") ?? "Menggunakan_Hotel");
      const hotelRiilInput = parseNumber(formData.get("hotel_riil_input"));

      if (
        jenisPerjalanan !== "Dalam_Kota" &&
        statusHotel === "Menggunakan_Hotel" &&
        !(summary.existingBuktiHotelCount > 0 || nextSelectedFiles.bukti_hotel_files > 0)
      ) {
        missing.push("bukti hotel");
      }

      if (
        jenisPerjalanan !== "Dalam_Kota" &&
        statusHotel === "Tanpa_Hotel_30_Persen" &&
        !(summary.existingFotoKtpCount > 0 || nextSelectedFiles.foto_ktp_files > 0)
      ) {
        missing.push("foto KTP");
      }

      const valid = missing.length === 0 && form.checkValidity();
      setIsComplete(valid);
      setMessage(
        valid
          ? "Semua data wajib sudah lengkap. LPJ siap dikirim."
          : `Lengkapi: ${missing.join(", ")}.`,
      );
    };

    evaluate();
    form.addEventListener("input", evaluate);
    form.addEventListener("change", evaluate);

    return () => {
      form.removeEventListener("input", evaluate);
      form.removeEventListener("change", evaluate);
    };
  }, [jenisPerjalanan, summary]);

  useEffect(() => {
    if (!pending) {
      setPendingStageIndex(0);
      return;
    }

    setPendingStageIndex(0);
    const interval = window.setInterval(() => {
      setPendingStageIndex((current) =>
        current >= pendingStages.length - 1 ? current : current + 1,
      );
    }, 1800);

    return () => window.clearInterval(interval);
  }, [pending, pendingStages.length]);

  return (
    <div ref={containerRef} className="space-y-3">
      <div
        className={`rounded-[16px] px-4 py-3 text-sm ${
          pending
            ? "bg-[#fff7e8] text-[#9a6700]"
            : isComplete
              ? "bg-[#edf8ef] text-[#2b8e5c]"
              : "bg-[#f7f8fc] text-[#6b7280]"
        }`}
      >
        {pending ? (
          <div className="space-y-2">
            <p className="font-semibold">Sedang memproses LPJ. Mohon tunggu...</p>
            <p>{pendingStages[pendingStageIndex]}</p>
            <p className="text-xs opacity-80">
              {totalNewFiles > 0
                ? `${totalNewFiles} berkas baru sedang diproses secara berurutan.`
                : "Tidak ada berkas baru yang diunggah pada pengiriman ini."}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-white/60">
              <div
                className="h-full rounded-full bg-[#f59e0b] transition-all duration-500"
                style={{
                  width: `${((pendingStageIndex + 1) / pendingStages.length) * 100}%`,
                }}
              />
            </div>
          </div>
        ) : (
          message
        )}
      </div>
      {!pending && totalNewFiles > 0 ? (
        <div className="rounded-[16px] border border-[#e8ebf1] bg-white px-4 py-3 text-sm text-[#4c5567]">
          <p className="font-semibold text-[#252c38]">
            Berkas baru yang akan diunggah: {totalNewFiles}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedFileSummary
              .filter((item) => item.count > 0)
              .map((item) => (
                <span
                  key={item.label}
                  className="rounded-full bg-[#f7f8fc] px-3 py-1 text-xs font-semibold text-[#5b6578]"
                >
                  {item.label}: {item.count}
                </span>
              ))}
          </div>
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
        <FormActionButton
          className="btn-primary w-full"
          label="Kirim Realisasi (LPJ)"
          pendingLabel="Mengunggah dan Menyimpan..."
          disabled={!isComplete}
        />
        <button className="btn-secondary w-full" type="button" disabled={pending}>
          Simpan Draft
        </button>
      </div>
      {pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#252c38]/50 px-4">
          <div className="w-full max-w-lg rounded-[24px] bg-white p-6 shadow-xl">
            <p className="text-sm font-medium text-[#798195]">Upload LPJ Sedang Berjalan</p>
            <h3 className="mt-1 text-xl font-bold text-[#252c38]">
              {pendingStages[pendingStageIndex]}
            </h3>
            <p className="mt-2 text-sm text-[#667085]">
              {totalNewFiles > 0
                ? `Sistem sedang mengunggah ${totalNewFiles} berkas baru satu per satu lalu menyimpan realisasi LPJ.`
                : "Sistem sedang menyimpan realisasi LPJ tanpa unggahan berkas baru."}
            </p>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#eef1f6]">
              <div
                className="h-full rounded-full bg-[#e2342d] transition-all duration-500"
                style={{
                  width: `${((pendingStageIndex + 1) / pendingStages.length) * 100}%`,
                }}
              />
            </div>
            <div className="mt-5 space-y-2 text-sm">
              {pendingStages.map((stage, index) => (
                <div key={stage} className="flex items-center gap-3">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      index <= pendingStageIndex ? "bg-[#e2342d]" : "bg-[#d9deea]"
                    }`}
                  />
                  <span
                    className={
                      index === pendingStageIndex
                        ? "font-semibold text-[#252c38]"
                        : "text-[#7d8598]"
                    }
                  >
                    {stage}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
