import { Types } from "mongoose";

import { connectMongoDB } from "@/lib/db/mongoose";
import {
  type IPegawai,
  PegawaiModel,
  SbmPenginapanModel,
  SbmTransportRiauModel,
  SbmUangHarianModel,
  type StatusHotel,
} from "@/models";

const TARIF_TRANSPORT_DALAM_KOTA_PER_HARI = 170_000;

export type KategoriPenginapan =
  | "tarif_eselon_1"
  | "tarif_eselon_2"
  | "tarif_eselon_3_gol_iv"
  | "tarif_eselon_4_gol_iii_ii_i";

export interface RincianEstimasiPegawai {
  pegawaiId: string;
  namaPegawai: string;
  jabatan: string;
  pangkatGolongan: string;
  uangHarian: number;
  transport: number;
  hotel: number;
  total: number;
  hotelMaksPerMalam: number;
  uangHarianPerHari: number;
}

export interface RincianRampung {
  statusRampung: "Kurang_Bayar" | "Lebih_Bayar" | "Pas";
  nominalSelisihRampung: number;
  hotelRiil: number;
  totalRealisasi: number;
}

export function hitungJumlahHari(tanggalMulai: Date | string, tanggalSelesai: Date | string) {
  const mulai = new Date(tanggalMulai);
  const selesai = new Date(tanggalSelesai);

  mulai.setHours(0, 0, 0, 0);
  selesai.setHours(0, 0, 0, 0);

  const selisih = selesai.getTime() - mulai.getTime();
  const jumlahHari = Math.floor(selisih / (1000 * 60 * 60 * 24)) + 1;

  if (jumlahHari < 1) {
    throw new Error("Tanggal selesai tidak boleh lebih awal dari tanggal mulai.");
  }

  return jumlahHari;
}

export function ekstrakProvinsi(lokasiTujuan: string) {
  const bagian = lokasiTujuan
    .split(/[-,]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return bagian[0] ?? lokasiTujuan.trim();
}

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buatLabelLokasi(kota: string, provinsi: string) {
  const kotaTrim = kota.trim();
  const provinsiTrim = provinsi.trim();

  return [kotaTrim, provinsiTrim].filter(Boolean).join(", ");
}

function buatKandidatNamaTransport(namaWilayah: string) {
  const nama = namaWilayah.trim();
  const upper = nama.toUpperCase();
  const tanpaPrefix = upper
    .replace(/^KOTA\s+/, "")
    .replace(/^KABUPATEN\s+/, "")
    .trim();

  return Array.from(
    new Set(
      [nama, tanpaPrefix, `Kota ${tanpaPrefix}`, `Kab. ${tanpaPrefix}`, `Kabupaten ${tanpaPrefix}`]
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function tentukanKategoriPenginapan(pegawai: Pick<IPegawai, "jabatan" | "pangkat_golongan">) {
  const jabatan = pegawai.jabatan.toLowerCase();
  const pangkat = pegawai.pangkat_golongan.toLowerCase();

  if (jabatan.includes("ketua") || jabatan.includes("komisioner nasional")) {
    return "tarif_eselon_1" as const;
  }

  if (jabatan.includes("sekretaris") || jabatan.includes("kepala")) {
    return "tarif_eselon_2" as const;
  }

  if (/\biv\b|iv\/|iii\/d|iv\//i.test(pangkat)) {
    return "tarif_eselon_3_gol_iv" as const;
  }

  return "tarif_eselon_4_gol_iii_ii_i" as const;
}

function tentukanJenisUangHarian(params: {
  jenisPerjalanan?: "Dalam_Kota" | "Luar_Kota";
  dalamKotaLebih8Jam?: boolean;
  lokasiTujuan: string;
  provinsi: string;
}) {
  if (params.jenisPerjalanan === "Dalam_Kota") {
    if (!params.dalamKotaLebih8Jam) {
      return null;
    }

    return "dalam_kota_lebih_8jam" as const;
  }

  const tujuan = params.lokasiTujuan.toLowerCase();
  const prov = params.provinsi.toLowerCase();

  if (tujuan.includes("diklat")) {
    return "diklat" as const;
  }

  if (prov.includes("riau") && tujuan.includes("dumai")) {
    return "dalam_kota_lebih_8jam" as const;
  }

  return "luar_kota" as const;
}

function tentukanProvinsiTujuan(params: {
  jenisPerjalanan?: "Dalam_Kota" | "Luar_Kota";
  provinsiTujuan?: string;
  lokasiTujuan: string;
}) {
  if (params.jenisPerjalanan === "Dalam_Kota") {
    return "Riau";
  }

  return (params.provinsiTujuan ?? ekstrakProvinsi(params.lokasiTujuan)).trim();
}

export async function hitungEstimasiPerPegawai(params: {
  pegawaiId: string | Types.ObjectId;
  jenisPerjalanan?: "Dalam_Kota" | "Luar_Kota";
  dalamKotaLebih8Jam?: boolean;
  lokasiTujuan: string;
  tanggalMulai: Date | string;
  tanggalSelesai: Date | string;
  lokasiAsal?: string;
  provinsiTujuan?: string;
  kotaAsal?: string;
  kotaTujuan?: string;
}) {
  await connectMongoDB();

  const jumlahHari = hitungJumlahHari(params.tanggalMulai, params.tanggalSelesai);
  const provinsi = tentukanProvinsiTujuan({
    jenisPerjalanan: params.jenisPerjalanan,
    provinsiTujuan: params.provinsiTujuan,
    lokasiTujuan: params.lokasiTujuan,
  });
  const kotaAsal = (params.kotaAsal ?? params.lokasiAsal ?? "").trim();
  const kotaTujuan = (params.kotaTujuan ?? params.lokasiTujuan ?? "").trim();
  const labelTujuan = buatLabelLokasi(kotaTujuan, provinsi);

  const pegawai = await PegawaiModel.findById(params.pegawaiId).lean<IPegawai | null>();
  if (!pegawai) {
    throw new Error("Pegawai tidak ditemukan.");
  }

  const sbmUangHarian = await SbmUangHarianModel.findOne({
    provinsi: new RegExp(`^${provinsi}$`, "i"),
  }).lean();

  if (!sbmUangHarian) {
    throw new Error(`SBM uang harian untuk provinsi ${provinsi} belum tersedia.`);
  }

  const jenisUangHarian = tentukanJenisUangHarian({
    jenisPerjalanan: params.jenisPerjalanan,
    dalamKotaLebih8Jam: params.dalamKotaLebih8Jam,
    lokasiTujuan: labelTujuan,
    provinsi,
  });
  const tarifUangHarian = jenisUangHarian ? (sbmUangHarian[jenisUangHarian] ?? 0) : 0;

  const sbmPenginapan = await SbmPenginapanModel.findOne({
    provinsi: new RegExp(`^${provinsi}$`, "i"),
  }).lean();

  if (!sbmPenginapan) {
    throw new Error(`SBM penginapan untuk provinsi ${provinsi} belum tersedia.`);
  }

  const kategoriPenginapan = tentukanKategoriPenginapan(pegawai);
  const hotelMaksPerMalam = sbmPenginapan[kategoriPenginapan] ?? 0;
  const jumlahMalam = Math.max(jumlahHari - 1, 0);

  let tarifTransport = 0;
  if (params.jenisPerjalanan === "Dalam_Kota") {
    tarifTransport = TARIF_TRANSPORT_DALAM_KOTA_PER_HARI * jumlahHari;
  } else if (provinsi.toLowerCase().includes("riau")) {
    const kandidatAsal = buatKandidatNamaTransport(kotaAsal || "Dumai");
    const kandidatTujuan = buatKandidatNamaTransport(kotaTujuan);
    const dataTransport = await SbmTransportRiauModel.findOne({
      asal: {
        $in: kandidatAsal.map((item) => new RegExp(`^${escapeRegex(item)}$`, "i")),
      },
      tujuan: {
        $in: kandidatTujuan.map((item) => new RegExp(`^${escapeRegex(item)}$`, "i")),
      },
    }).lean();

    tarifTransport = dataTransport?.tarif ?? 0;
  }

  const uangHarian = tarifUangHarian * jumlahHari;
  const hotel = params.jenisPerjalanan === "Dalam_Kota" ? 0 : hotelMaksPerMalam * jumlahMalam;
  const total = uangHarian + tarifTransport + hotel;

  return {
    jumlahHari,
    provinsi,
    kategoriPenginapan,
    rincian: {
      pegawaiId: String(pegawai._id),
      namaPegawai: pegawai.nama,
      jabatan: pegawai.jabatan,
      pangkatGolongan: pegawai.pangkat_golongan,
      uangHarian,
      transport: tarifTransport,
      hotel,
      total,
      hotelMaksPerMalam,
      uangHarianPerHari: tarifUangHarian,
    } satisfies RincianEstimasiPegawai,
  };
}

export function hitungHotelRiil(params: {
  statusHotel: StatusHotel;
  hotelInputRiil?: number;
  hotelMaksPerMalam: number;
  jumlahHari: number;
}) {
  const jumlahMalam = Math.max(params.jumlahHari - 1, 0);

  if (params.statusHotel === "Tanpa_Hotel_30_Persen") {
    return Math.round(params.hotelMaksPerMalam * jumlahMalam * 0.3);
  }

  if (params.statusHotel === "Dalam_Kota_Tanpa_Hotel") {
    return 0;
  }

  return params.hotelInputRiil ?? 0;
}

export function hitungRampungLpj(params: {
  uangHarianRiil: number;
  transportRiil: number;
  hotelInputRiil?: number;
  hotelMaksPerMalam: number;
  jumlahHari: number;
  statusHotel: StatusHotel;
  uangMukaDp: number;
}): RincianRampung {
  const hotelRiil = hitungHotelRiil({
    statusHotel: params.statusHotel,
    hotelInputRiil: params.hotelInputRiil,
    hotelMaksPerMalam: params.hotelMaksPerMalam,
    jumlahHari: params.jumlahHari,
  });

  const totalRealisasi = params.uangHarianRiil + params.transportRiil + hotelRiil;
  const sisa = totalRealisasi - params.uangMukaDp;

  if (sisa > 0) {
    return {
      statusRampung: "Kurang_Bayar",
      nominalSelisihRampung: sisa,
      hotelRiil,
      totalRealisasi,
    };
  }

  if (sisa < 0) {
    return {
      statusRampung: "Lebih_Bayar",
      nominalSelisihRampung: Math.abs(sisa),
      hotelRiil,
      totalRealisasi,
    };
  }

  return {
    statusRampung: "Pas",
    nominalSelisihRampung: 0,
    hotelRiil,
    totalRealisasi,
  };
}
