import { z } from "zod";

export const prePerjalananSchema = z.object({
  nomor_st: z.string().min(5, "Nomor ST wajib diisi."),
  tanggal_st: z.coerce.date(),
  maksud_perjalanan: z.string().min(5, "Maksud perjalanan wajib diisi."),
  mata_anggaran: z.string().min(1, "Mata anggaran wajib dipilih."),
  jenis_perjalanan: z.enum(["Dalam_Kota", "Luar_Kota"]),
  dalam_kota_lebih_8_jam: z.boolean().default(false),
  lokasi_asal: z.string().min(2).default("Dumai, Riau"),
  lokasi_asal_provinsi_kode: z.string().min(1, "Provinsi asal wajib dipilih."),
  lokasi_asal_provinsi_nama: z.string().min(1, "Provinsi asal wajib dipilih."),
  lokasi_asal_kota_kode: z.string().min(1, "Kota asal wajib dipilih."),
  lokasi_asal_kota_nama: z.string().min(1, "Kota asal wajib dipilih."),
  lokasi_tujuan: z.string().min(3, "Lokasi tujuan wajib dipilih."),
  lokasi_tujuan_provinsi_kode: z.string().default(""),
  lokasi_tujuan_provinsi_nama: z.string().default(""),
  lokasi_tujuan_kota_kode: z.string().default(""),
  lokasi_tujuan_kota_nama: z.string().default(""),
  lokasi_tujuan_kecamatan_kode: z.string().default(""),
  lokasi_tujuan_kecamatan_nama: z.string().default(""),
  lokasi_tujuan_kecamatan_kode_list: z.array(z.string().min(1)).default([]),
  lokasi_tujuan_kecamatan_nama_list: z.array(z.string().min(1)).default([]),
  lokasi_tujuan_kelurahan_kode_list: z.array(z.string().min(1)).default([]),
  lokasi_tujuan_kelurahan_nama_list: z.array(z.string().min(1)).default([]),
  lokasi_tujuan_custom_dalam_kota: z.array(z.string().min(1)).default([]),
  tanggal_mulai: z.coerce.date(),
  tanggal_selesai: z.coerce.date(),
  pelaksana: z.array(z.string().min(1)).min(1, "Minimal satu pelaksana wajib dipilih."),
  uang_muka_dp: z
    .array(
      z.object({
        pegawai_id: z.string().min(1),
        nominal: z.coerce.number().min(0),
      }),
    )
    .default([]),
}).superRefine((input, ctx) => {
  if (input.jenis_perjalanan === "Dalam_Kota") {
    if (
      input.lokasi_tujuan_kecamatan_kode_list.length === 0 &&
      input.lokasi_tujuan_kelurahan_kode_list.length === 0 &&
      input.lokasi_tujuan_custom_dalam_kota.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimal satu tujuan dalam kota wajib dipilih dari kecamatan, kelurahan, atau custom.",
        path: ["lokasi_tujuan_kecamatan_kode_list"],
      });
    }

    if (
      input.lokasi_tujuan_kecamatan_nama_list.length === 0 &&
      input.lokasi_tujuan_kelurahan_nama_list.length === 0 &&
      input.lokasi_tujuan_custom_dalam_kota.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimal satu tujuan dalam kota wajib dipilih dari kecamatan, kelurahan, atau custom.",
        path: ["lokasi_tujuan_kecamatan_nama_list"],
      });
    }
  }

  if (input.jenis_perjalanan === "Luar_Kota") {
    if (!input.lokasi_tujuan_kota_kode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Kota atau kabupaten tujuan wajib dipilih untuk perjalanan dinas luar kota.",
        path: ["lokasi_tujuan_kota_kode"],
      });
    }

    if (!input.lokasi_tujuan_provinsi_nama) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provinsi tujuan wajib tersedia.",
        path: ["lokasi_tujuan_provinsi_nama"],
      });
    }
  }
});

export const pascaPerjalananSchema = z.object({
  sppd_id: z.string().min(1),
  pegawai_id: z.string().min(1),
  dalam_kota_lebih_8_jam: z.boolean().default(false),
  status_hotel: z.enum([
    "Menggunakan_Hotel",
    "Tanpa_Hotel_30_Persen",
    "Dalam_Kota_Tanpa_Hotel",
  ]),
  uang_harian_riil: z.coerce.number().min(0),
  transport_riil: z.coerce.number().min(0),
  hotel_riil_input: z.coerce.number().min(0).optional(),
  alamat_menginap_tanpa_hotel: z.string().optional(),
  berkas_lpj: z.object({
    scan_visum: z.array(z.string()).default([]),
    scan_dpr: z.array(z.string()).default([]),
    foto_ktp: z.array(z.string()).default([]),
    bukti_hotel: z.array(z.string()).default([]),
    dokumentasi: z.array(z.string()).default([]),
    nota_bukti: z.array(z.string()).default([]),
  }),
}).superRefine((input, ctx) => {
  if (input.berkas_lpj.scan_visum.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Scan visum wajib diunggah.",
      path: ["berkas_lpj", "scan_visum"],
    });
  }

  if (input.berkas_lpj.scan_dpr.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Scan DPR wajib diunggah.",
      path: ["berkas_lpj", "scan_dpr"],
    });
  }

  if (
    input.status_hotel !== "Dalam_Kota_Tanpa_Hotel" &&
    input.transport_riil > 0 &&
    input.berkas_lpj.nota_bukti.length === 0
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Bukti transport wajib diunggah jika transport riil diisi.",
      path: ["berkas_lpj", "nota_bukti"],
    });
  }

  if (
    input.status_hotel === "Menggunakan_Hotel" &&
    input.berkas_lpj.bukti_hotel.length === 0
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Bukti hotel wajib diunggah jika memakai hotel.",
      path: ["berkas_lpj", "bukti_hotel"],
    });
  }

  if (
    input.status_hotel === "Tanpa_Hotel_30_Persen" &&
    input.berkas_lpj.foto_ktp.length === 0
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Foto KTP wajib diunggah jika tanpa hotel / 30%.",
      path: ["berkas_lpj", "foto_ktp"],
    });
  }
});

export type PrePerjalananInput = z.infer<typeof prePerjalananSchema>;
export type PascaPerjalananInput = z.infer<typeof pascaPerjalananSchema>;
