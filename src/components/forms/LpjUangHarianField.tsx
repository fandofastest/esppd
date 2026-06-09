"use client";

import { useMemo, useState } from "react";

import type { JenisPerjalanan } from "@/models";

interface LpjUangHarianFieldProps {
  jenisPerjalanan: JenisPerjalanan;
  initialDalamKotaLebih8Jam: boolean;
  initialUangHarianRiil: number;
  uangHarianDalamKotaLebih8Jam: number;
}

export function LpjUangHarianField({
  jenisPerjalanan,
  initialDalamKotaLebih8Jam,
  initialUangHarianRiil,
  uangHarianDalamKotaLebih8Jam,
}: LpjUangHarianFieldProps) {
  const [dalamKotaLebih8Jam, setDalamKotaLebih8Jam] = useState(initialDalamKotaLebih8Jam);

  const uangHarianRiil = useMemo(() => {
    if (jenisPerjalanan !== "Dalam_Kota") {
      return initialUangHarianRiil;
    }

    return dalamKotaLebih8Jam ? uangHarianDalamKotaLebih8Jam : 0;
  }, [dalamKotaLebih8Jam, initialUangHarianRiil, jenisPerjalanan, uangHarianDalamKotaLebih8Jam]);

  return (
    <div className="space-y-3">
      {jenisPerjalanan === "Dalam_Kota" ? (
        <label className="flex items-start gap-3 rounded-[16px] border border-[#e7eaf1] bg-[#f9fafc] p-4 text-sm text-[#556072]">
          <input
            className="mt-1 h-4 w-4 accent-[#e2342d]"
            type="checkbox"
            checked={dalamKotaLebih8Jam}
            onChange={(event) => setDalamKotaLebih8Jam(event.target.checked)}
          />
          <span>
            <span className="block font-semibold text-[#252c38]">Lebih dari 8 jam</span>
            <span className="mt-1 block text-xs text-[#7d8598]">
              Jika dicentang, uang harian dalam kota akan ditambahkan pada realisasi LPJ.
            </span>
          </span>
        </label>
      ) : null}

      <input type="hidden" name="dalam_kota_lebih_8_jam" value={dalamKotaLebih8Jam ? "1" : "0"} />
      <div>
        <label className="label">Uang Harian Riil</label>
        <input className="input" type="number" min={0} name="uang_harian_riil" value={uangHarianRiil} readOnly />
        <p className="mt-2 text-xs text-[#7d8598]">
          {jenisPerjalanan === "Dalam_Kota"
            ? "Nilai otomatis mengikuti checklist lebih dari 8 jam pada LPJ."
            : "Mengikuti nilai SBM saat pengajuan dan tidak dapat diubah pada LPJ."}
        </p>
      </div>
    </div>
  );
}
