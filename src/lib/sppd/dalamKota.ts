import type { ISppd } from "@/models";

function normalizeLabel(value: string, prefix: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const pattern = new RegExp(`^${prefix}\\s+`, "i");
  return pattern.test(trimmed) ? trimmed : `${prefix} ${trimmed}`;
}

function stripDalamKotaSuffix(value: string) {
  return value.replace(/,\s*Kota Dumai,\s*Riau\s*$/i, "").trim();
}

export function parseDaftarTujuanDalamKota(lokasiTujuan: string) {
  const cleaned = stripDalamKotaSuffix(lokasiTujuan);
  if (!cleaned) {
    return [];
  }

  return cleaned
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function ambilDaftarTujuanDalamKota(
  sppd: Pick<
    ISppd,
    | "jenis_perjalanan"
    | "lokasi_tujuan"
    | "lokasi_tujuan_kecamatan_nama_list"
    | "lokasi_tujuan_kelurahan_nama_list"
    | "lokasi_tujuan_custom_dalam_kota"
  >,
) {
  if (sppd.jenis_perjalanan !== "Dalam_Kota") {
    return [];
  }

  const kecamatan = (sppd.lokasi_tujuan_kecamatan_nama_list ?? [])
    .map((item) => normalizeLabel(item, "Kecamatan"))
    .filter(Boolean);
  const kelurahan = (sppd.lokasi_tujuan_kelurahan_nama_list ?? [])
    .map((item) => normalizeLabel(item, "Kelurahan"))
    .filter(Boolean);
  const custom = (sppd.lokasi_tujuan_custom_dalam_kota ?? [])
    .map((item) => item.trim())
    .filter(Boolean);

  const tersimpan = [...kecamatan, ...kelurahan, ...custom];
  if (tersimpan.length > 0) {
    return tersimpan;
  }

  return parseDaftarTujuanDalamKota(sppd.lokasi_tujuan);
}
