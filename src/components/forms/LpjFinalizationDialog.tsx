"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { finalizeSppdAfterLpjAction } from "@/actions/sppd.actions";

interface LpjFinalizationItem {
  pegawaiId: string;
  nama: string;
  jabatan: string;
  estimasiAwal: number;
  panjarAwal: number;
  realisasiAkhir: number;
  selisih: number;
  statusRampung: string;
}

interface LpjFinalizationDialogProps {
  sppdId: string;
  nomorSt: string;
  statusSppd: string;
  items: LpjFinalizationItem[];
  disabled?: boolean;
  disabledMessage?: string;
}

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function LpjFinalizationDialog({
  sppdId,
  nomorSt,
  statusSppd,
  items,
  disabled = false,
  disabledMessage = "",
}: LpjFinalizationDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const totals = useMemo(
    () => ({
      estimasiAwal: items.reduce((sum, item) => sum + item.estimasiAwal, 0),
      panjarAwal: items.reduce((sum, item) => sum + item.panjarAwal, 0),
      realisasiAkhir: items.reduce((sum, item) => sum + item.realisasiAkhir, 0),
      selisih: items.reduce((sum, item) => sum + item.selisih, 0),
    }),
    [items],
  );
  const totalKurangBayar = useMemo(
    () =>
      items
        .filter((item) => item.statusRampung === "Kurang_Bayar")
        .reduce((sum, item) => sum + item.selisih, 0),
    [items],
  );
  const [nominalPelunasan, setNominalPelunasan] = useState(totalKurangBayar);

  useEffect(() => {
    setNominalPelunasan(totalKurangBayar);
  }, [totalKurangBayar]);

  function handleFinalize() {
    setMessage("");
    startTransition(async () => {
      const result = await finalizeSppdAfterLpjAction({
        sppdId,
        nominalPelunasan,
      });
      setMessage(result.message);
      if (result.success) {
        setOpen(false);
        router.replace(
          `/sppd/${sppdId}/lpj?status=success&message=${encodeURIComponent(
            "Perjalanan dinas sudah diselesaikan.",
          )}`,
        );
      }
    });
  }

  return (
    <>
      <button
        className="btn-primary w-full"
        type="button"
        disabled={statusSppd === "Selesai" || disabled}
        onClick={() => setOpen(true)}
      >
        {statusSppd === "Selesai"
          ? "Perjalanan Sudah Selesai"
          : disabled
            ? "Lengkapi Semua Pelaksana"
            : "Tinjau & Selesaikan Perjalanan"}
      </button>
      {statusSppd !== "Selesai" && disabledMessage ? (
        <p className="mt-2 text-sm text-[#7d8598]">{disabledMessage}</p>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#252c38]/40 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-[24px] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#798195]">Finalisasi Perjalanan Dinas</p>
                <h3 className="mt-1 text-xl font-bold text-[#252c38]">{nomorSt}</h3>
                <p className="mt-2 text-sm text-[#6b7280]">
                  Tinjau rangkuman dari estimasi awal sampai realisasi akhir sebelum perjalanan
                  dinas ditutup.
                </p>
              </div>
              <button className="btn-secondary" type="button" onClick={() => setOpen(false)}>
                Tutup
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              <div className="rounded-[16px] bg-[#f7f8fc] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8a92a5]">Estimasi Awal</p>
                <p className="mt-2 font-bold text-[#252c38]">{formatRupiah(totals.estimasiAwal)}</p>
              </div>
              <div className="rounded-[16px] bg-[#f7f8fc] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8a92a5]">Panjar Awal</p>
                <p className="mt-2 font-bold text-[#252c38]">{formatRupiah(totals.panjarAwal)}</p>
              </div>
              <div className="rounded-[16px] bg-[#f7f8fc] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8a92a5]">Realisasi Akhir</p>
                <p className="mt-2 font-bold text-[#252c38]">{formatRupiah(totals.realisasiAkhir)}</p>
              </div>
              <div className="rounded-[16px] bg-[#f7f8fc] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8a92a5]">Selisih</p>
                <p className="mt-2 font-bold text-[#252c38]">{formatRupiah(totals.selisih)}</p>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto rounded-[18px] border border-[#e8ebf1]">
              <table className="min-w-full text-sm">
                <thead className="bg-[#fbfbfd] text-left text-[12px] font-semibold uppercase tracking-wide text-[#98a0b2]">
                  <tr>
                    <th className="px-4 py-3">Pelaksana</th>
                    <th className="px-4 py-3">Estimasi</th>
                    <th className="px-4 py-3">Panjar</th>
                    <th className="px-4 py-3">Realisasi</th>
                    <th className="px-4 py-3">Selisih</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.pegawaiId} className="border-t border-[#eef1f6]">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#252c38]">{item.nama}</p>
                        <p className="text-xs text-[#7d8598]">{item.jabatan}</p>
                      </td>
                      <td className="px-4 py-3">{formatRupiah(item.estimasiAwal)}</td>
                      <td className="px-4 py-3">{formatRupiah(item.panjarAwal)}</td>
                      <td className="px-4 py-3">{formatRupiah(item.realisasiAkhir)}</td>
                      <td className="px-4 py-3">{formatRupiah(item.selisih)}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-[#2b8e5c]">{item.statusRampung}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalKurangBayar > 0 ? (
              <div className="mt-5 rounded-[18px] border border-[#ffd7d3] bg-[#fff1ef] p-4">
                <p className="text-sm font-semibold text-[#d9544d]">Keterangan Kurang Bayar</p>
                <p className="mt-2 text-sm text-[#6b7280]">
                  Total kekurangan pembayaran dari seluruh pelaksana adalah{" "}
                  <span className="font-semibold text-[#252c38]">
                    {formatRupiah(totalKurangBayar)}
                  </span>
                  . Masukkan jumlah pelunasan sebelum perjalanan dinas diselesaikan.
                </p>
                <div className="mt-4 max-w-sm">
                  <label className="text-sm font-semibold text-[#252c38]">Jumlah Pelunasan</label>
                  <input
                    className="input mt-2"
                    type="number"
                    min={0}
                    value={nominalPelunasan}
                    onChange={(event) => setNominalPelunasan(Number(event.target.value ?? 0))}
                  />
                </div>
              </div>
            ) : null}

            {message ? (
              <div className="mt-5 rounded-[16px] bg-[#f7f8fc] px-4 py-3 text-sm text-[#4c5567]">
                {message}
              </div>
            ) : null}

            <div className="mt-5 flex justify-end gap-3">
              <button className="btn-secondary" type="button" disabled={isPending} onClick={() => setOpen(false)}>
                Kembali
              </button>
              <button
                className="btn-primary"
                type="button"
                disabled={
                  isPending ||
                  statusSppd === "Selesai" ||
                  (totalKurangBayar > 0 && nominalPelunasan <= 0)
                }
                onClick={handleFinalize}
              >
                {isPending
                  ? "Menyelesaikan..."
                  : totalKurangBayar > 0
                    ? "Selesaikan Pelunasan"
                    : "Selesai"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
