"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/db/mongoose";
import { ambilTemplateDokumenSppd, buatTemplateDokumenDefault } from "@/lib/documents/sppd";
import { hitungEstimasiPerPegawai, hitungRampungLpj } from "@/lib/finance/sppd";
import { formatTanggal } from "@/lib/format";
import {
  buildStoredUploadDetail,
  buildStoredUploadValue,
  uploadIntegrationFile,
} from "@/lib/integrations/uploads";
import { createSimplePdfBuffer } from "@/lib/pdf/simplePdf";
import {
  gabungkanPengaturanGlobal,
  tentukanPenandatanganSuratTugas,
  tentukanPenandatanganVisum,
} from "@/lib/settings/global";
import { ambilDaftarTujuanDalamKota } from "@/lib/sppd/dalamKota";
import {
  pascaPerjalananSchema,
  prePerjalananSchema,
  type PascaPerjalananInput,
  type PrePerjalananInput,
} from "@/lib/validations/sppd";
import { KeuanganSppdModel, PegawaiModel, PengaturanGlobalModel, SppdModel } from "@/models";

type FinalDocumentType = "surat_tugas" | "visum";

function isNextRedirectError(
  error: unknown,
): error is Error & {
  digest?: string;
} {
  return (
    error instanceof Error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

function ambilNominalDp(input: PrePerjalananInput, pegawaiId: string) {
  return input.uang_muka_dp.find((item) => item.pegawai_id === pegawaiId)?.nominal ?? 0;
}

function isSelectedFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

function parseExistingStringArray(value: FormDataEntryValue | null) {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function uniqStrings(values: string[]) {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

function normalizeStoredUploadDetails(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const entry = item as Record<string, unknown>;
      const archiveRaw =
        typeof entry.archive === "object" && entry.archive !== null
          ? (entry.archive as Record<string, unknown>)
          : {};

      return {
        value: String(entry.value ?? "").trim(),
        uploadId: String(entry.uploadId ?? "").trim(),
        fileName: String(entry.fileName ?? "").trim(),
        url: String(entry.url ?? "").trim(),
        reference: String(entry.reference ?? "").trim(),
        createdAt: String(entry.createdAt ?? "").trim(),
        mimeType: String(entry.mimeType ?? "").trim(),
        archive: {
          archiveId: String(archiveRaw.archiveId ?? "").trim(),
          archiveNumber: String(archiveRaw.archiveNumber ?? "").trim(),
          originalName: String(archiveRaw.originalName ?? "").trim(),
        },
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item?.value));
}

function uniqUploadDetails(
  values: Array<ReturnType<typeof buildStoredUploadDetail>>,
) {
  const map = new Map<string, ReturnType<typeof buildStoredUploadDetail>>();
  values.forEach((item) => {
    if (item.value.trim()) {
      map.set(item.value, item);
    }
  });
  return [...map.values()];
}

function ensureBerkasLpjDetail(record: {
  berkas_lpj_detail?: Record<LpjFileField, ReturnType<typeof buildStoredUploadDetail>[]>;
}) {
  if (!record.berkas_lpj_detail) {
    record.berkas_lpj_detail = {
      scan_visum: [],
      scan_dpr: [],
      foto_ktp: [],
      bukti_hotel: [],
      dokumentasi: [],
      nota_bukti: [],
    };
  }

  return record.berkas_lpj_detail;
}

function sanitizeFilename(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "-");
}

function isFinalDocReady(value: unknown) {
  return String(value ?? "").trim().length > 0;
}

function buildSuratTugasPdfLines(params: {
  nomorSt: string;
  tanggalSt: string;
  maksudPerjalanan: string;
  lokasiAsal: string;
  lokasiTujuan: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  pelaksana: { nama: string; jabatan: string }[];
  pembuka: string;
  isi: string;
  penutup: string;
  pejabatJabatan: string;
  pejabatNama: string;
  pejabatNip?: string;
}) {
  return [
    "SURAT TUGAS",
    `Nomor: ${params.nomorSt}`,
    `Tanggal: ${params.tanggalSt}`,
    "",
    "Pembuka",
    params.pembuka,
    "",
    "Dasar",
    params.isi,
    "",
    "Pelaksana",
    ...params.pelaksana.flatMap((item, index) => [
      `${index + 1}. ${item.nama}`,
      `   Jabatan: ${item.jabatan}`,
    ]),
    "",
    "Untuk",
    `Melaksanakan tugas untuk ${params.maksudPerjalanan} dengan rute ${params.lokasiAsal} ke ${params.lokasiTujuan} pada tanggal ${params.tanggalMulai} s.d. ${params.tanggalSelesai}.`,
    params.penutup,
    "",
    "Penandatangan",
    params.pejabatJabatan,
    params.pejabatNama || "(belum diatur)",
    params.pejabatNip ? `NIP. ${params.pejabatNip}` : "",
  ];
}

function buildVisumPdfLines(params: {
  judul: string;
  nomorSt: string;
  tanggalSt: string;
  lokasiAsal: string;
  lokasiTujuan: string;
  daftarTujuanDalamKota?: string[];
  tanggalMulai: string;
  tanggalSelesai: string;
  pelaksana: string[];
  pengantar: string;
  catatan: string;
  penutup: string;
  pejabatJabatan: string;
  pejabatNama: string;
  pejabatNip: string;
  mataAnggaran?: string;
}) {
  const daftarTujuanDalamKota = params.daftarTujuanDalamKota ?? [];
  const rincianRuteDalamKota =
    daftarTujuanDalamKota.length > 0
      ? [
          "",
          "Rincian Tujuan Dalam Kota",
          ...daftarTujuanDalamKota.flatMap((item, index) => {
            const asal = index === 0 ? params.lokasiAsal : daftarTujuanDalamKota[index - 1] ?? params.lokasiAsal;
            return [
              `${index + 1}. Berangkat dari: ${asal}`,
              `   Tiba di: ${item}`,
            ];
          }),
          `${daftarTujuanDalamKota.length + 1}. Kembali ke: ${params.lokasiAsal}`,
        ]
      : [];

  return [
    params.judul.toUpperCase(),
    `Lampiran SPPD Tanggal: ${params.tanggalSt}`,
    `Nomor: ${params.nomorSt}`,
    "",
    "Pelaksana",
    ...params.pelaksana.map((nama, index) => `${index + 1}. ${nama}`),
    "",
    "Rute Perjalanan",
    `Berangkat dari: ${params.lokasiAsal}`,
    `Tujuan: ${params.lokasiTujuan}`,
    `Tanggal berangkat: ${params.tanggalMulai}`,
    `Tanggal kembali: ${params.tanggalSelesai}`,
    `Mata Anggaran: ${params.mataAnggaran || "524111"}`,
    ...rincianRuteDalamKota,
    "",
    "Pengantar",
    params.pengantar,
    "",
    "Catatan",
    params.catatan,
    "",
    "Penutup",
    params.penutup,
    "",
    "Pejabat Pemeriksa",
    params.pejabatJabatan,
    params.pejabatNama || "(belum diatur)",
    params.pejabatNip ? `NIP. ${params.pejabatNip}` : "",
  ];
}

function normalizeStoredFiles(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }

  const single = String(value ?? "").trim();
  return single ? [single] : [];
}

function isLpjRecordComplete(record: {
  jenis_perjalanan?: string;
  status_hotel?: string;
  berkas_lpj?: {
    scan_visum?: unknown;
    scan_dpr?: unknown;
    bukti_hotel?: unknown;
    foto_ktp?: unknown;
    nota_bukti?: unknown;
    dokumentasi?: unknown;
  };
  realisasi_akhir?: {
    transport_riil?: number;
  };
}) {
  const visum = normalizeStoredFiles(record.berkas_lpj?.scan_visum);
  const dpr = normalizeStoredFiles(record.berkas_lpj?.scan_dpr);
  const buktiHotel = normalizeStoredFiles(record.berkas_lpj?.bukti_hotel);
  const fotoKtp = normalizeStoredFiles(record.berkas_lpj?.foto_ktp);
  const notaBukti = normalizeStoredFiles(record.berkas_lpj?.nota_bukti);
  const dokumentasi = normalizeStoredFiles(record.berkas_lpj?.dokumentasi);
  const transportRiil = Number(record.realisasi_akhir?.transport_riil ?? 0);
  const adalahDalamKota =
    record.jenis_perjalanan === "Dalam_Kota" || record.status_hotel === "Dalam_Kota_Tanpa_Hotel";

  if (visum.length === 0 || dpr.length === 0) {
    return false;
  }

  if (!adalahDalamKota && transportRiil > 0 && notaBukti.length === 0) {
    return false;
  }

  if (!adalahDalamKota && record.status_hotel === "Menggunakan_Hotel" && buktiHotel.length === 0) {
    return false;
  }

  if (!adalahDalamKota && record.status_hotel === "Tanpa_Hotel_30_Persen" && fotoKtp.length === 0) {
    return false;
  }

  if (dokumentasi.length === 0) {
    return false;
  }

  return true;
}

async function uploadOptionalFile(
  file: FormDataEntryValue | null,
  params: Parameters<typeof uploadIntegrationFile>[0],
) {
  if (!isSelectedFile(file)) {
    return null;
  }

  const result = await uploadIntegrationFile({
    ...params,
    file,
  });

  return buildStoredUploadValue(result);
}

async function uploadManyOptionalFiles(
  entries: FormDataEntryValue[],
  buildParams: (file: File, index: number) => Omit<Parameters<typeof uploadIntegrationFile>[0], "file">,
) {
  const files = entries.filter((value): value is File => isSelectedFile(value));
  return uploadManyFilesSequentially(files, buildParams);
}

async function uploadManyFilesSequentially(
  files: File[],
  buildParams: (file: File, index: number) => Omit<Parameters<typeof uploadIntegrationFile>[0], "file">,
) {
  const results: string[] = [];

  for (const [index, file] of files.entries()) {
    const result = await uploadIntegrationFile({
      ...buildParams(file, index),
      file,
    });
    results.push(buildStoredUploadValue(result));
  }

  return results;
}

export async function hitungEstimasiPrePerjalananAction(rawInput: PrePerjalananInput) {
  await requireRole(["Admin", "Operator"]);
  const input = prePerjalananSchema.parse(rawInput);

  const hasil = await Promise.all(
    input.pelaksana.map((pegawaiId) =>
      hitungEstimasiPerPegawai({
        pegawaiId,
        jenisPerjalanan: input.jenis_perjalanan,
        dalamKotaLebih8Jam: input.dalam_kota_lebih_8_jam,
        lokasiAsal: input.lokasi_asal,
        lokasiTujuan: input.lokasi_tujuan,
        provinsiTujuan: input.lokasi_tujuan_provinsi_nama,
        kotaAsal: input.lokasi_asal_kota_nama,
        kotaTujuan: input.lokasi_tujuan_kota_nama,
        tanggalMulai: input.tanggal_mulai,
        tanggalSelesai: input.tanggal_selesai,
      }),
    ),
  );

  return {
    jumlah_hari: hasil[0]?.jumlahHari ?? 1,
    provinsi: hasil[0]?.provinsi ?? "",
    rincian_per_pegawai: hasil.map((item) => ({
      ...item.rincian,
      uangMukaDp: ambilNominalDp(input, item.rincian.pegawaiId),
    })),
    total_estimasi_tim: hasil.reduce((total, item) => total + item.rincian.total, 0),
    total_dp_tim: hasil.reduce(
      (total, item) => total + ambilNominalDp(input, item.rincian.pegawaiId),
      0,
    ),
  };
}

export async function buatPengajuanSppdAction(rawInput: PrePerjalananInput) {
  await requireRole(["Admin", "Operator"]);
  const input = prePerjalananSchema.parse(rawInput);
  await connectMongoDB();

  const preview = await hitungEstimasiPrePerjalananAction(input);

  const sppd = await SppdModel.create({
    nomor_st: input.nomor_st,
    tanggal_st: input.tanggal_st,
    maksud_perjalanan: input.maksud_perjalanan,
    mata_anggaran: input.mata_anggaran,
    jenis_perjalanan: input.jenis_perjalanan,
    dalam_kota_lebih_8_jam: input.dalam_kota_lebih_8_jam,
    lokasi_asal: input.lokasi_asal,
    lokasi_tujuan: input.lokasi_tujuan,
    lokasi_asal_provinsi_kode: input.lokasi_asal_provinsi_kode,
    lokasi_asal_provinsi_nama: input.lokasi_asal_provinsi_nama,
    lokasi_asal_kota_kode: input.lokasi_asal_kota_kode,
    lokasi_asal_kota_nama: input.lokasi_asal_kota_nama,
    lokasi_tujuan_provinsi_kode: input.lokasi_tujuan_provinsi_kode,
    lokasi_tujuan_provinsi_nama: input.lokasi_tujuan_provinsi_nama,
    lokasi_tujuan_kota_kode: input.lokasi_tujuan_kota_kode,
    lokasi_tujuan_kota_nama: input.lokasi_tujuan_kota_nama,
    lokasi_tujuan_kecamatan_kode: input.lokasi_tujuan_kecamatan_kode,
    lokasi_tujuan_kecamatan_nama: input.lokasi_tujuan_kecamatan_nama,
    lokasi_tujuan_kecamatan_kode_list: input.lokasi_tujuan_kecamatan_kode_list,
    lokasi_tujuan_kecamatan_nama_list: input.lokasi_tujuan_kecamatan_nama_list,
    lokasi_tujuan_kelurahan_kode_list: input.lokasi_tujuan_kelurahan_kode_list,
    lokasi_tujuan_kelurahan_nama_list: input.lokasi_tujuan_kelurahan_nama_list,
    lokasi_tujuan_custom_dalam_kota: input.lokasi_tujuan_custom_dalam_kota,
    tanggal_mulai: input.tanggal_mulai,
    tanggal_selesai: input.tanggal_selesai,
    jumlah_hari: preview.jumlah_hari,
    pelaksana: input.pelaksana,
    status: "Draft",
    dokumen_template: buatTemplateDokumenDefault({
      jenisPerjalanan: input.jenis_perjalanan,
      maksudPerjalanan: input.maksud_perjalanan,
    }),
  });

  await KeuanganSppdModel.insertMany(
    preview.rincian_per_pegawai.map((item) => ({
      sppd_id: sppd._id,
      pegawai_id: item.pegawaiId,
      estimasi_awal: {
        uang_harian: item.uangHarian,
        transport: item.transport,
        hotel: item.hotel,
        total: item.total,
      },
      uang_muka_dp: item.uangMukaDp,
      realisasi_akhir: {
        uang_harian: 0,
        transport_riil: 0,
        hotel_riil: 0,
        total: 0,
      },
      status_hotel:
        input.jenis_perjalanan === "Dalam_Kota" ? "Dalam_Kota_Tanpa_Hotel" : "Menggunakan_Hotel",
      berkas_lpj: {
        scan_visum: [],
        scan_dpr: [],
        foto_ktp: [],
        bukti_hotel: [],
        dokumentasi: [],
        nota_bukti: [],
      },
      status_rampung: "Pas",
      nominal_selisih_rampung: 0,
    })),
  );

  revalidatePath("/");
  revalidatePath("/sppd");
  revalidatePath("/sppd/baru");
  revalidatePath(`/sppd/${String(sppd._id)}`);

  return {
    success: true,
    sppdId: String(sppd._id),
    message: "Draft SPPD dan estimasi keuangan berhasil dibuat.",
  };
}

export async function simpanTemplateDokumenAction(formData: FormData) {
  await requireRole(["Admin", "Operator"]);
  await connectMongoDB();

  const sppdId = String(formData.get("sppd_id") ?? "");
  const jabatanPenandatangan = String(formData.get("st_pejabat_jabatan") ?? "").trim();
  const pengaturanGlobalRaw = await PengaturanGlobalModel.findOne({ key: "global" }).lean();
  const pengaturanGlobal = gabungkanPengaturanGlobal(pengaturanGlobalRaw);
  const namaPenandatangan =
    jabatanPenandatangan === "Ketua KPU Kota Dumai"
      ? pengaturanGlobal.ketua_nama
      : pengaturanGlobal.sekretaris_nama;

  await SppdModel.findByIdAndUpdate(sppdId, {
    $set: {
      "dokumen_template.surat_tugas.pembuka": String(formData.get("st_pembuka") ?? "").trim(),
      "dokumen_template.surat_tugas.isi": String(formData.get("st_isi") ?? "").trim(),
      "dokumen_template.surat_tugas.penutup": String(formData.get("st_penutup") ?? "").trim(),
      "dokumen_template.surat_tugas.pejabat_jabatan": jabatanPenandatangan,
      "dokumen_template.surat_tugas.pejabat_nama": namaPenandatangan,
      "dokumen_template.visum.pengantar": String(formData.get("visum_pengantar") ?? "").trim(),
      "dokumen_template.visum.catatan": String(formData.get("visum_catatan") ?? "").trim(),
      "dokumen_template.visum.penutup": String(formData.get("visum_penutup") ?? "").trim(),
    },
  });

  revalidatePath("/");
  revalidatePath("/sppd");
  revalidatePath(`/sppd/${sppdId}`);
  revalidatePath(`/sppd/${sppdId}/lpj`);
  revalidatePath(`/print/surat-tugas/${sppdId}`);
  revalidatePath(`/print/visum/${sppdId}`);
  redirect(`/sppd/${sppdId}?status=success&message=Isi+dokumen+berhasil+disimpan.`);
}

export async function generateFinalDokumenSppdAction(formData: FormData) {
  await requireRole(["Admin", "Operator"]);
  await connectMongoDB();

  const sppdId = String(formData.get("sppd_id") ?? "");
  const documentType = String(formData.get("document_type") ?? "") as FinalDocumentType;

  try {
    const sppd = await SppdModel.findById(sppdId).lean();
    if (!sppd) {
      throw new Error("Data SPPD tidak ditemukan.");
    }

    const [pegawai, pengaturanGlobalRaw] = await Promise.all([
      PegawaiModel.find({ _id: { $in: sppd.pelaksana } }).lean(),
      PengaturanGlobalModel.findOne({ key: "global" }).lean(),
    ]);

    const pengaturanGlobal = gabungkanPengaturanGlobal(pengaturanGlobalRaw);
    const templateDokumen = ambilTemplateDokumenSppd(sppd);
    const fileLabel = documentType === "surat_tugas" ? "Surat Tugas" : "Visum";
    const fileSlug = documentType === "surat_tugas" ? "surat-tugas" : "visum";
    const pdfBuffer =
      documentType === "surat_tugas"
        ? createSimplePdfBuffer(
            `Surat Tugas ${sppd.nomor_st}`,
            buildSuratTugasPdfLines({
              nomorSt: sppd.nomor_st,
              tanggalSt: formatTanggal(sppd.tanggal_st),
              maksudPerjalanan: sppd.maksud_perjalanan,
              lokasiAsal: sppd.lokasi_asal,
              lokasiTujuan: sppd.lokasi_tujuan,
              tanggalMulai: formatTanggal(sppd.tanggal_mulai),
              tanggalSelesai: formatTanggal(sppd.tanggal_selesai),
              pelaksana: pegawai.map((item) => ({
                nama: item.nama,
                jabatan: item.jabatan,
              })),
              pembuka: templateDokumen.surat_tugas.pembuka,
              isi: templateDokumen.surat_tugas.isi,
              penutup: templateDokumen.surat_tugas.penutup,
              pejabatJabatan: tentukanPenandatanganSuratTugas(sppd, pengaturanGlobal).jabatan,
              pejabatNama: tentukanPenandatanganSuratTugas(sppd, pengaturanGlobal).nama,
              pejabatNip: tentukanPenandatanganSuratTugas(sppd, pengaturanGlobal).nip,
            }),
          )
        : createSimplePdfBuffer(
            `Visum ${sppd.nomor_st}`,
            buildVisumPdfLines({
              judul:
                sppd.jenis_perjalanan === "Dalam_Kota"
                  ? "Lembar Visum Perjalanan Dinas Dalam Kota"
                  : "Lembar Visum Perjalanan Dinas Luar Kota",
              nomorSt: sppd.nomor_st,
              tanggalSt: formatTanggal(sppd.tanggal_st),
              lokasiAsal: sppd.lokasi_asal,
              lokasiTujuan: sppd.lokasi_tujuan,
              daftarTujuanDalamKota: ambilDaftarTujuanDalamKota(sppd),
              tanggalMulai: formatTanggal(sppd.tanggal_mulai),
              tanggalSelesai: formatTanggal(sppd.tanggal_selesai),
              pelaksana: pegawai.map((item) => item.nama),
              pengantar: templateDokumen.visum.pengantar,
              catatan: templateDokumen.visum.catatan,
              penutup: templateDokumen.visum.penutup,
              pejabatJabatan: tentukanPenandatanganVisum(pengaturanGlobal).jabatan,
              pejabatNama: tentukanPenandatanganVisum(pengaturanGlobal).nama,
              pejabatNip: tentukanPenandatanganVisum(pengaturanGlobal).nip,
              mataAnggaran: sppd.mata_anggaran,
            }),
          );

    const fileName = `${sanitizeFilename(fileSlug)}-${sanitizeFilename(sppd.nomor_st)}.pdf`;
    const pdfFile = new File([pdfBuffer], fileName, { type: "application/pdf" });
    const uploadRecord = await uploadIntegrationFile({
      file: pdfFile,
      sourceType: "api",
      sourceId: `${sppdId}:${fileSlug}:final`,
      sourceName: `Dokumen Final SPPD ${sppd.nomor_st}`,
      title: `${fileLabel} Final ${sppd.nomor_st}`,
      description: `${fileLabel} final perjalanan dinas yang sudah digenerate dari aplikasi`,
      tags: ["sppd", "dokumen_final", fileSlug, sppdId],
    });
    const storedValue = buildStoredUploadValue(uploadRecord);

    const existingFinal = {
      surat_tugas: sppd.dokumen_final?.surat_tugas ?? "",
      visum: sppd.dokumen_final?.visum ?? "",
    };
    const nextFinal = {
      ...existingFinal,
      [documentType]: storedValue,
    };
    const nextStatus =
      isFinalDocReady(nextFinal.surat_tugas) && isFinalDocReady(nextFinal.visum)
        ? "Berjalan"
        : sppd.status;

    await SppdModel.findByIdAndUpdate(sppdId, {
      $set: {
        [`dokumen_final.${documentType}`]: storedValue,
        [`dokumen_final.${documentType}_generated_at`]: new Date(),
        status: nextStatus,
      },
    });

    revalidatePath("/");
    revalidatePath("/sppd");
    revalidatePath(`/sppd/${sppdId}`);
    revalidatePath(`/sppd/${sppdId}/lpj`);
    revalidatePath(`/print/surat-tugas/${sppdId}`);
    revalidatePath(`/print/visum/${sppdId}`);

    redirect(
      `/sppd/${sppdId}?status=success&open_document=${documentType}&message=${encodeURIComponent(
        `${fileLabel} final berhasil digenerate dan diupload.`,
      )}`,
    );
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : "Gagal mengenerate dokumen final SPPD.";
    redirect(`/sppd/${sppdId}?status=error&message=${encodeURIComponent(message)}`);
  }
}

export async function prosesRampungLpjAction(rawInput: PascaPerjalananInput) {
  await requireRole(["Admin", "Operator"]);
  const input = pascaPerjalananSchema.parse(rawInput);
  await connectMongoDB();

  const sppd = await SppdModel.findById(input.sppd_id).lean();
  if (!sppd) {
    throw new Error("Data SPPD tidak ditemukan.");
  }

  const keuangan = await KeuanganSppdModel.findOne({
    sppd_id: input.sppd_id,
    pegawai_id: input.pegawai_id,
  }).lean();

  if (!keuangan) {
    throw new Error("Data keuangan SPPD per pegawai tidak ditemukan.");
  }

  const estimasi = await hitungEstimasiPerPegawai({
    pegawaiId: input.pegawai_id,
    jenisPerjalanan: sppd.jenis_perjalanan,
    dalamKotaLebih8Jam:
      sppd.jenis_perjalanan === "Dalam_Kota" ? input.dalam_kota_lebih_8_jam : undefined,
    lokasiAsal: sppd.lokasi_asal,
    lokasiTujuan: sppd.lokasi_tujuan,
    provinsiTujuan: sppd.lokasi_tujuan_provinsi_nama,
    kotaAsal: sppd.lokasi_asal_kota_nama,
    kotaTujuan: sppd.lokasi_tujuan_kota_nama,
    tanggalMulai: sppd.tanggal_mulai,
    tanggalSelesai: sppd.tanggal_selesai,
  });

  const statusHotel =
    sppd.jenis_perjalanan === "Dalam_Kota"
      ? "Dalam_Kota_Tanpa_Hotel"
      : input.status_hotel === "Dalam_Kota_Tanpa_Hotel"
        ? "Menggunakan_Hotel"
        : input.status_hotel;
  const transportRiil =
    sppd.jenis_perjalanan === "Dalam_Kota" ? estimasi.rincian.transport : input.transport_riil;
  const uangHarianRiil =
    sppd.jenis_perjalanan === "Dalam_Kota"
      ? estimasi.rincian.uangHarian
      : keuangan.estimasi_awal.uang_harian;

  const hasilRampung = hitungRampungLpj({
    uangHarianRiil,
    transportRiil,
    hotelInputRiil: sppd.jenis_perjalanan === "Dalam_Kota" ? 0 : input.hotel_riil_input,
    hotelMaksPerMalam: estimasi.rincian.hotelMaksPerMalam,
    jumlahHari: sppd.jumlah_hari,
    statusHotel,
    uangMukaDp: keuangan.uang_muka_dp,
  });

  await KeuanganSppdModel.updateOne(
    {
      _id: keuangan._id,
    },
    {
      $set: {
        dalam_kota_lebih_8_jam:
          sppd.jenis_perjalanan === "Dalam_Kota" ? input.dalam_kota_lebih_8_jam : false,
        status_hotel: statusHotel,
        alamat_menginap_tanpa_hotel:
          sppd.jenis_perjalanan === "Dalam_Kota" ? "" : input.alamat_menginap_tanpa_hotel ?? "",
        berkas_lpj:
          sppd.jenis_perjalanan === "Dalam_Kota"
            ? {
                ...input.berkas_lpj,
                foto_ktp: [],
                bukti_hotel: [],
                nota_bukti: [],
              }
            : input.berkas_lpj,
        realisasi_akhir: {
          uang_harian: uangHarianRiil,
          transport_riil: transportRiil,
          hotel_riil: hasilRampung.hotelRiil,
          total: hasilRampung.totalRealisasi,
        },
        status_rampung: hasilRampung.statusRampung,
        nominal_selisih_rampung: hasilRampung.nominalSelisihRampung,
      },
    },
  );

  await SppdModel.updateOne(
    { _id: sppd._id },
    {
      $set: {
        status: "LPJ_Diproses",
      },
    },
  );

  revalidatePath("/");
  revalidatePath("/sppd");
  revalidatePath(`/sppd/${input.sppd_id}`);
  revalidatePath(`/sppd/${input.sppd_id}/lpj`);

  return {
    success: true,
    status_rampung: hasilRampung.statusRampung,
    nominal_selisih_rampung: hasilRampung.nominalSelisihRampung,
    hotel_riil: hasilRampung.hotelRiil,
    total_realisasi: hasilRampung.totalRealisasi,
  };
}

type LpjFileField =
  | "scan_visum"
  | "scan_dpr"
  | "foto_ktp"
  | "bukti_hotel"
  | "dokumentasi"
  | "nota_bukti";

function isLpjFileField(value: string): value is LpjFileField {
  return [
    "scan_visum",
    "scan_dpr",
    "foto_ktp",
    "bukti_hotel",
    "dokumentasi",
    "nota_bukti",
  ].includes(value);
}

function buildLpjUploadParams(args: {
  sppdId: string;
  pegawaiId: string;
  field: LpjFileField;
  file: File;
  index: number;
}) {
  const sourceId = `${args.sppdId}:${args.pegawaiId}`;
  const sourceName = `LPJ SPPD ${sourceId}`;
  const uploadTags = ["sppd", "lpj", args.sppdId, args.pegawaiId];

  switch (args.field) {
    case "scan_visum":
      return {
        file: args.file,
        sourceType: "api",
        sourceId,
        sourceName,
        title: `Scan Visum ${args.index + 1}`,
        description: "Dokumen scan visum LPJ SPPD",
        tags: [...uploadTags, "scan_visum"],
      };
    case "scan_dpr":
      return {
        file: args.file,
        sourceType: "api",
        sourceId,
        sourceName,
        title: `Scan DPR ${args.index + 1}`,
        description: "Dokumen scan DPR LPJ SPPD",
        tags: [...uploadTags, "scan_dpr"],
      };
    case "bukti_hotel":
      return {
        file: args.file,
        sourceType: "api",
        sourceId,
        sourceName,
        title: `Bukti Hotel ${args.index + 1}`,
        description: "Bukti hotel LPJ SPPD",
        tags: [...uploadTags, "bukti_hotel"],
      };
    case "foto_ktp":
      return {
        file: args.file,
        sourceType: "api",
        sourceId,
        sourceName,
        title: `Foto KTP ${args.index + 1}`,
        description: "Foto KTP pendukung LPJ SPPD",
        tags: [...uploadTags, "foto_ktp"],
        isPrivate: true,
      };
    case "dokumentasi":
      return {
        file: args.file,
        sourceType: "api",
        sourceId,
        sourceName,
        title: `Dokumentasi Kegiatan ${args.index + 1}`,
        description: "Foto atau dokumentasi tambahan kegiatan perjalanan dinas",
        tags: [...uploadTags, "dokumentasi"],
      };
    case "nota_bukti":
      return {
        file: args.file,
        sourceType: "api",
        sourceId,
        sourceName,
        title: `Bukti Transport ${args.index + 1}`,
        description: "Bukti transport LPJ SPPD seperti BBM, tol, tiket, dan lainnya",
        tags: [...uploadTags, "bukti_transport"],
      };
  }
}

interface DeleteLpjStoredFileArgs {
  sppdId: string;
  pegawaiId: string;
  field: LpjFileField;
  value: string;
}

export async function deleteLpjStoredFileAction(args: DeleteLpjStoredFileArgs) {
  await requireRole(["Admin", "Operator"]);
  await connectMongoDB();

  const record = await KeuanganSppdModel.findOne({
    sppd_id: args.sppdId,
    pegawai_id: args.pegawaiId,
  });

  if (!record) {
    return {
      success: false,
      message: "Data LPJ tidak ditemukan.",
    };
  }

  const currentFiles = normalizeStoredFiles(record.berkas_lpj?.[args.field]);
  record.berkas_lpj[args.field] = currentFiles.filter((item) => item !== args.value);
  const berkasLpjDetail = ensureBerkasLpjDetail(record);
  const currentDetails = normalizeStoredUploadDetails(berkasLpjDetail[args.field]);
  berkasLpjDetail[args.field] = currentDetails.filter((item) => item.value !== args.value);
  await record.save();

  revalidatePath("/");
  revalidatePath("/sppd");
  revalidatePath(`/sppd/${args.sppdId}`);
  revalidatePath(`/sppd/${args.sppdId}/lpj`);

  return {
    success: true,
    message: "Berkas berhasil dihapus.",
  };
}

export async function uploadLpjStoredFileAction(formData: FormData) {
  await requireRole(["Admin", "Operator"]);
  await connectMongoDB();

  const sppdId = String(formData.get("sppd_id") ?? "");
  const pegawaiId = String(formData.get("pegawai_id") ?? "");
  const fieldRaw = String(formData.get("field") ?? "");
  const file = formData.get("file");

  if (!isLpjFileField(fieldRaw)) {
    return {
      success: false,
      message: "Field upload LPJ tidak valid.",
    };
  }

  if (!isSelectedFile(file)) {
    return {
      success: false,
      message: "File yang dipilih tidak valid.",
    };
  }

  const record = await KeuanganSppdModel.findOne({
    sppd_id: sppdId,
    pegawai_id: pegawaiId,
  });

  if (!record) {
    return {
      success: false,
      message: "Data LPJ tidak ditemukan.",
    };
  }

  const currentFiles = normalizeStoredFiles(record.berkas_lpj?.[fieldRaw]);
  const berkasLpjDetail = ensureBerkasLpjDetail(record);
  const currentDetails = normalizeStoredUploadDetails(berkasLpjDetail[fieldRaw]);
  const uploadRecord = await uploadIntegrationFile(
    buildLpjUploadParams({
      sppdId,
      pegawaiId,
      field: fieldRaw,
      file,
      index: currentFiles.length,
    }),
  );
  const storedValue = buildStoredUploadValue(uploadRecord);
  const storedDetail = buildStoredUploadDetail(uploadRecord);

  record.berkas_lpj[fieldRaw] = uniqStrings([...currentFiles, storedValue]);
  berkasLpjDetail[fieldRaw] = uniqUploadDetails([...currentDetails, storedDetail]);
  await record.save();

  revalidatePath("/");
  revalidatePath("/sppd");
  revalidatePath(`/sppd/${sppdId}`);
  revalidatePath(`/sppd/${sppdId}/lpj`);

  return {
    success: true,
    message: `${file.name} berhasil diunggah.`,
    value: storedValue,
  };
}

export async function submitRampungLpjFormAction(formData: FormData) {
  const sppdId = String(formData.get("sppd_id") ?? "");
  const pegawaiId = String(formData.get("pegawai_id") ?? "");
  const sourceId = `${sppdId}:${pegawaiId}`;
  const sourceName = `LPJ SPPD ${sourceId}`;
  const uploadTags = ["sppd", "lpj", sppdId, pegawaiId];
  const redirectPath = `/sppd/${sppdId}/lpj`;
  let status = "success";
  let message = "Realisasi LPJ berhasil disimpan.";

  try {
    const scanVisumExisting = parseExistingStringArray(formData.get("scan_visum_existing"));
    const scanDprExisting = parseExistingStringArray(formData.get("scan_dpr_existing"));
    const fotoKtpExisting = parseExistingStringArray(formData.get("foto_ktp_existing"));
    const buktiHotelExisting = parseExistingStringArray(formData.get("bukti_hotel_existing"));
    const dokumentasiExisting = parseExistingStringArray(formData.get("dokumentasi_existing"));
    const notaBuktiExisting = parseExistingStringArray(formData.get("nota_bukti_existing"));

    const scanVisumUploads = await uploadManyOptionalFiles(
      formData.getAll("scan_visum_files"),
      (file, index) =>
        buildLpjUploadParams({
          sppdId,
          pegawaiId,
          field: "scan_visum",
          file,
          index,
        }),
    );
    const scanDprUploads = await uploadManyOptionalFiles(
      formData.getAll("scan_dpr_files"),
      (file, index) =>
        buildLpjUploadParams({
          sppdId,
          pegawaiId,
          field: "scan_dpr",
          file,
          index,
        }),
    );
    const buktiHotelUploads = await uploadManyOptionalFiles(
      formData.getAll("bukti_hotel_files"),
      (file, index) =>
        buildLpjUploadParams({
          sppdId,
          pegawaiId,
          field: "bukti_hotel",
          file,
          index,
        }),
    );
    const fotoKtpUploads = await uploadManyOptionalFiles(
      formData.getAll("foto_ktp_files"),
      (file, index) =>
        buildLpjUploadParams({
          sppdId,
          pegawaiId,
          field: "foto_ktp",
          file,
          index,
        }),
    );
    const dokumentasiUploads = await uploadManyOptionalFiles(
      formData.getAll("dokumentasi_files"),
      (file, index) =>
        buildLpjUploadParams({
          sppdId,
          pegawaiId,
          field: "dokumentasi",
          file,
          index,
        }),
    );
    const notaBuktiFiles = formData.getAll("nota_bukti_files").filter((value): value is File =>
      isSelectedFile(value),
    );
    const notaBuktiUploads =
      String(formData.get("status_hotel") ?? "Menggunakan_Hotel") === "Dalam_Kota_Tanpa_Hotel"
        ? []
        : await uploadManyFilesSequentially(notaBuktiFiles, (file, index) =>
            buildLpjUploadParams({
              sppdId,
              pegawaiId,
              field: "nota_bukti",
              file,
              index,
            }),
          );

    await prosesRampungLpjAction({
      sppd_id: sppdId,
      pegawai_id: pegawaiId,
      dalam_kota_lebih_8_jam: String(formData.get("dalam_kota_lebih_8_jam") ?? "0") === "1",
      status_hotel: String(formData.get("status_hotel") ?? "Menggunakan_Hotel") as
        | "Menggunakan_Hotel"
        | "Tanpa_Hotel_30_Persen"
        | "Dalam_Kota_Tanpa_Hotel",
      uang_harian_riil: Number(formData.get("uang_harian_riil") ?? 0),
      transport_riil: Number(formData.get("transport_riil") ?? 0),
      hotel_riil_input: Number(formData.get("hotel_riil_input") ?? 0),
      alamat_menginap_tanpa_hotel: String(formData.get("alamat_menginap_tanpa_hotel") ?? ""),
      berkas_lpj: {
        scan_visum: uniqStrings([...scanVisumExisting, ...scanVisumUploads]),
        scan_dpr: uniqStrings([...scanDprExisting, ...scanDprUploads]),
        foto_ktp:
          String(formData.get("status_hotel") ?? "Menggunakan_Hotel") === "Tanpa_Hotel_30_Persen"
            ? uniqStrings([...fotoKtpExisting, ...fotoKtpUploads])
            : [],
        bukti_hotel:
          String(formData.get("status_hotel") ?? "Menggunakan_Hotel") === "Menggunakan_Hotel"
            ? uniqStrings([...buktiHotelExisting, ...buktiHotelUploads])
            : [],
        dokumentasi: uniqStrings([...dokumentasiExisting, ...dokumentasiUploads]),
        nota_bukti:
          String(formData.get("status_hotel") ?? "Menggunakan_Hotel") === "Dalam_Kota_Tanpa_Hotel"
            ? []
            : uniqStrings([...notaBuktiExisting, ...notaBuktiUploads]),
      },
    });
    await SppdModel.findByIdAndUpdate(sppdId, { status: "LPJ_Diproses" });
    revalidatePath(`/sppd/${sppdId}`);
  } catch (error) {
    status = "error";
    message = error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan LPJ.";
  }

  const params = new URLSearchParams({ status, message });
  redirect(`${redirectPath}?${params.toString()}`);
}

export async function finalizeSppdAfterLpjAction(args: {
  sppdId: string;
  nominalPelunasan?: number;
}) {
  await requireRole(["Admin", "Operator"]);
  await connectMongoDB();

  const sppdId = args.sppdId;

  const sppd = await SppdModel.findById(sppdId).lean();
  if (!sppd) {
    return {
      success: false,
      message: "Data SPPD tidak ditemukan.",
    };
  }

  if (!isFinalDocReady(sppd.dokumen_final?.surat_tugas) || !isFinalDocReady(sppd.dokumen_final?.visum)) {
    return {
      success: false,
      message: "Surat Tugas final dan Visum final harus sudah digenerate terlebih dahulu.",
    };
  }

  const rincian = await KeuanganSppdModel.find({ sppd_id: sppdId }).lean();
  const semuaLpjSiap = rincian.every((item) =>
    isLpjRecordComplete({
      ...item,
      jenis_perjalanan: sppd.jenis_perjalanan,
    }),
  );

  if (!rincian.length || !semuaLpjSiap) {
    return {
      success: false,
      message: "LPJ belum lengkap untuk seluruh pelaksana.",
    };
  }

  const totalKurangBayar = rincian
    .filter((item) => item.status_rampung === "Kurang_Bayar")
    .reduce((sum, item) => sum + Number(item.nominal_selisih_rampung ?? 0), 0);
  const nominalPelunasan = Number(args.nominalPelunasan ?? 0);

  if (totalKurangBayar > 0) {
    if (!Number.isFinite(nominalPelunasan) || nominalPelunasan <= 0) {
      return {
        success: false,
        message: "Nominal pelunasan wajib diisi untuk perjalanan dinas yang masih kurang bayar.",
      };
    }

    if (nominalPelunasan !== totalKurangBayar) {
      return {
        success: false,
        message: `Nominal pelunasan harus sama dengan total kurang bayar ${totalKurangBayar}.`,
      };
    }
  }

  await SppdModel.findByIdAndUpdate(sppdId, {
    status: "Selesai",
    finalisasi_lpj: {
      nominal_pelunasan: totalKurangBayar > 0 ? nominalPelunasan : 0,
      finalized_at: new Date(),
    },
  });

  revalidatePath("/");
  revalidatePath("/sppd");
  revalidatePath(`/sppd/${sppdId}`);
  revalidatePath(`/sppd/${sppdId}/lpj`);

  return {
    success: true,
    message:
      totalKurangBayar > 0
        ? "Pelunasan dan finalisasi perjalanan dinas berhasil disimpan."
        : "Perjalanan dinas berhasil difinalisasi.",
  };
}

export async function updateStatusSppdAction(formData: FormData) {
  await requireRole(["Admin"]);
  await connectMongoDB();

  const sppdId = String(formData.get("sppd_id") ?? "");
  const status = String(formData.get("status") ?? "Draft");

  await SppdModel.findByIdAndUpdate(sppdId, { status });

  revalidatePath("/");
  revalidatePath("/sppd");
  revalidatePath(`/sppd/${sppdId}`);
}
