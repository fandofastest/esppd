"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteLpjStoredFileAction } from "@/actions/sppd.actions";

type LpjFileField =
  | "scan_visum"
  | "scan_dpr"
  | "foto_ktp"
  | "bukti_hotel"
  | "dokumentasi"
  | "nota_bukti";

interface DeleteLpjFileButtonProps {
  sppdId: string;
  pegawaiId: string;
  field: LpjFileField;
  value: string;
  label?: string;
}

export function DeleteLpjFileButton({
  sppdId,
  pegawaiId,
  field,
  value,
  label = "Hapus",
}: DeleteLpjFileButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError("");
    startTransition(async () => {
      const result = await deleteLpjStoredFileAction({
        sppdId,
        pegawaiId,
        field,
        value,
      });

      if (!result.success) {
        setError(result.message);
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        className="text-sm font-semibold text-[#d9544d]"
        type="button"
        onClick={() => setOpen(true)}
      >
        {label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#252c38]/40 px-4">
          <div className="w-full max-w-md rounded-[20px] bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-[#252c38]">Konfirmasi Hapus</h3>
            <p className="mt-2 text-sm text-[#6b7280]">
              Berkas ini akan dihapus dari LPJ. Lanjutkan?
            </p>
            {error ? <p className="mt-3 text-sm text-[#d9544d]">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-3">
              <button
                className="btn-secondary"
                type="button"
                disabled={isPending}
                onClick={() => setOpen(false)}
              >
                Batal
              </button>
              <button
                className="btn-primary"
                type="button"
                disabled={isPending}
                onClick={handleDelete}
              >
                {isPending ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
