import Link from "next/link";
import { notFound } from "next/navigation";

import {
  submitRampungLpjFormAction,
  updateStatusSppdAction,
} from "@/actions/sppd.actions";
import { FormActionButton } from "@/components/forms/FormActionButton";
import { LpjAkomodasiFields } from "@/components/forms/LpjAkomodasiFields";
import { LpjFinalizationDialog } from "@/components/forms/LpjFinalizationDialog";
import { LpjInstantUploadField } from "@/components/forms/LpjInstantUploadField";
import { LpjSubmitActions } from "@/components/forms/LpjSubmitActions";
import { LpjUangHarianField } from "@/components/forms/LpjUangHarianField";
import { AppShell } from "@/components/layout/AppShell";
import { DocumentPreviewButton } from "@/components/sppd/DocumentPreviewButton";
import { SppdWorkflowStepper } from "@/components/sppd/SppdWorkflowStepper";
import { requireRole } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/db/mongoose";
import { hitungEstimasiPerPegawai } from "@/lib/finance/sppd";
import { formatRupiah, formatTanggal } from "@/lib/format";
import {
  buildIntegrationFileProxyUrl,
  listIntegrationUploads,
  type IntegrationUploadRecord,
} from "@/lib/integrations/uploads";
import {
  KeuanganSppdModel,
  PegawaiModel,
  SppdModel,
  type IKeuanganSppd,
  type IPegawai,
  type ISppd,
} from "@/models";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    status?: string;
    message?: string;
  }>;
}

function isExternalUrl(value?: string) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

function buildLpjSourceId(sppdId: unknown, pegawaiId: unknown) {
  return `${String(sppdId)}:${String(pegawaiId)}`;
}

function normalizeStoredFiles(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }

  const single = String(value ?? "").trim();
  return single ? [single] : [];
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
        url: String(entry.url ?? "").trim(),
        fileName: String(entry.fileName ?? "").trim(),
        archiveId: String(archiveRaw.archiveId ?? "").trim(),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item?.value));
}

function getUploadLogTags(log: IntegrationUploadRecord) {
  const candidates = [
    log.raw.tags,
    log.raw.tag,
    typeof log.raw.metadata === "object" && log.raw.metadata !== null
      ? (log.raw.metadata as Record<string, unknown>).tags
      : undefined,
  ];

  const tags = candidates.flatMap((candidate) => {
    if (Array.isArray(candidate)) {
      return candidate.map((item) => String(item ?? "").trim()).filter(Boolean);
    }

    if (typeof candidate === "string") {
      return candidate
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  });

  return [...new Set(tags)];
}

function findMatchingUploadLog(
  uploadLogs: IntegrationUploadRecord[],
  tag: string,
  value: string,
  index: number,
) {
  const trimmedValue = value.trim();
  const taggedLogs = uploadLogs.filter((log) => getUploadLogTags(log).includes(tag));
  const directMatch =
    uploadLogs.find(
      (log) =>
        log.reference === trimmedValue ||
        log.archiveNumber === trimmedValue ||
        log.url === trimmedValue ||
        log.fileName === trimmedValue,
    ) ??
    taggedLogs.find(
      (log) =>
        log.reference === trimmedValue ||
        log.archiveNumber === trimmedValue ||
        log.url === trimmedValue ||
        log.fileName === trimmedValue,
    );

  if (directMatch) {
    return directMatch;
  }

  return taggedLogs[index] ?? uploadLogs[index];
}

function buildStoredFilePreviews(
  files: string[],
  tag: string,
  storedDetails: Array<{
    value: string;
    url: string;
    fileName: string;
    archiveId: string;
  }>,
  uploadLogs: IntegrationUploadRecord[],
) {
  return files.map((value, index) => ({
    value,
    previewUrl: (() => {
      const storedDetail = storedDetails.find((item) => item.value === value) ?? storedDetails[index];
      const matchedLog = findMatchingUploadLog(uploadLogs, tag, value, index);
      const archiveId = storedDetail?.archiveId || matchedLog?.archiveId || "";

      if (isExternalUrl(value)) {
        return value;
      }

      if (storedDetail?.url) {
        return storedDetail.url;
      }

      if (archiveId) {
        return buildIntegrationFileProxyUrl(archiveId, true);
      }

      return matchedLog?.url || "";
    })(),
  }));
}

async function getSppdDetail(id: string) {
  await connectMongoDB();

  const sppd = await SppdModel.findById(id).lean<ISppd | null>();
  if (!sppd) {
    return null;
  }

  const [keuangan, pegawai] = await Promise.all([
    KeuanganSppdModel.find({ sppd_id: sppd._id }).lean<IKeuanganSppd[]>(),
    PegawaiModel.find({ _id: { $in: sppd.pelaksana } }).lean<IPegawai[]>(),
  ]);

  const pegawaiMap = new Map(pegawai.map((item) => [String(item._id), item]));
  const mappedRincian = keuangan.map((item) => ({
    ...item,
    pegawai: pegawaiMap.get(String(item.pegawai_id)),
    sourceId: buildLpjSourceId(sppd._id, item.pegawai_id),
  }));
  const uploadLogs = await Promise.all(
    mappedRincian.map(async (item) => {
      const logs = await listIntegrationUploads({
        page: 1,
        limit: 20,
        q: item.sourceId,
        sourceType: "api",
      });

      return [
        item.sourceId,
        logs.filter((log) => !log.sourceId || log.sourceId === item.sourceId),
      ] as const;
    }),
  );
  const uploadLogMap = new Map(uploadLogs);
  const dalamKotaUangHarianMap =
    sppd.jenis_perjalanan === "Dalam_Kota"
      ? new Map(
          await Promise.all(
            mappedRincian.map(async (item) => {
              const estimasiDalamKota = await hitungEstimasiPerPegawai({
                pegawaiId: item.pegawai_id,
                jenisPerjalanan: sppd.jenis_perjalanan,
                dalamKotaLebih8Jam: true,
                lokasiAsal: sppd.lokasi_asal,
                lokasiTujuan: sppd.lokasi_tujuan,
                provinsiTujuan: sppd.lokasi_tujuan_provinsi_nama,
                kotaAsal: sppd.lokasi_asal_kota_nama,
                kotaTujuan: sppd.lokasi_tujuan_kota_nama,
                tanggalMulai: sppd.tanggal_mulai,
                tanggalSelesai: sppd.tanggal_selesai,
              });

              return [String(item.pegawai_id), estimasiDalamKota.rincian.uangHarian] as const;
            }),
          ),
        )
      : new Map<string, number>();

  return {
    sppd,
    rincian: mappedRincian.map((item) => ({
      ...item,
      uploadLogs: uploadLogMap.get(item.sourceId) ?? [],
      uangHarianDalamKotaLebih8Jam: dalamKotaUangHarianMap.get(String(item.pegawai_id)) ?? 0,
    })),
  };
}

export default async function SppdLpjPage({ params, searchParams }: PageProps) {
  const session = await requireRole(["Admin", "Operator"]);
  const { id } = await params;
  const flash = searchParams ? await searchParams : undefined;
  const data = await getSppdDetail(id);

  if (!data) {
    notFound();
  }

  const suratTugasFinal = data.sppd.dokumen_final?.surat_tugas ?? "";
  const visumFinal = data.sppd.dokumen_final?.visum ?? "";
  const visumLabel =
    data.sppd.jenis_perjalanan === "Dalam_Kota" ? "Visum Dalam Kota" : "Visum Luar Kota";
  const dokumenAwalLengkap = Boolean(suratTugasFinal && visumFinal);
  const workflowSteps = [
    {
      title: "Pengajuan",
      description: "Draft perjalanan dinas sudah dibuat.",
      state: "completed" as const,
      href: `/sppd/${id}`,
    },
    {
      title: "Surat Tugas",
      description: suratTugasFinal ? "Dokumen final sudah tersedia." : "Generate ST final dari tahap dokumen.",
      state: suratTugasFinal ? ("completed" as const) : ("pending" as const),
      href: `/sppd/${id}`,
    },
    {
      title: "Visum",
      description: visumFinal ? "Dokumen final sudah tersedia." : "Generate Visum final dari tahap dokumen.",
      state: visumFinal ? ("completed" as const) : ("pending" as const),
      href: `/sppd/${id}`,
    },
    {
      title: "Berjalan",
      description: "Perjalanan aktif setelah kedua dokumen awal final.",
      state:
        data.sppd.status === "Berjalan" || data.sppd.status === "LPJ_Diproses" || data.sppd.status === "Selesai"
          ? ("completed" as const)
          : dokumenAwalLengkap
            ? ("current" as const)
            : ("pending" as const),
      href: `/sppd/${id}`,
    },
    {
      title: "LPJ & Selesai",
      description: "Isi LPJ lalu finalisasi perjalanan.",
      state:
        data.sppd.status === "Selesai"
          ? ("completed" as const)
          : data.sppd.status === "LPJ_Diproses"
            ? ("current" as const)
            : ("pending" as const),
      href: `/sppd/${id}/lpj`,
    },
  ];
  const lpjItems = data.rincian.map((item) => {
    const detail = item.berkas_lpj_detail ?? {
      scan_visum: [],
      scan_dpr: [],
      foto_ktp: [],
      bukti_hotel: [],
      dokumentasi: [],
      nota_bukti: [],
    };
    const scanVisumFiles = normalizeStoredFiles(item.berkas_lpj.scan_visum);
    const scanDprFiles = normalizeStoredFiles(item.berkas_lpj.scan_dpr);
    const fotoKtpFiles = normalizeStoredFiles(item.berkas_lpj.foto_ktp);
    const buktiHotelFiles = normalizeStoredFiles(item.berkas_lpj.bukti_hotel);
    const dokumentasiFiles = normalizeStoredFiles(item.berkas_lpj.dokumentasi);
    const notaBuktiFiles = normalizeStoredFiles(item.berkas_lpj.nota_bukti);
    const transportProofs = buildStoredFilePreviews(
      notaBuktiFiles,
      "bukti_transport",
      normalizeStoredUploadDetails(detail.nota_bukti),
      item.uploadLogs,
    );
    const documentationProofs = buildStoredFilePreviews(
      dokumentasiFiles,
      "dokumentasi",
      normalizeStoredUploadDetails(detail.dokumentasi),
      item.uploadLogs,
    );
    const scanVisumProofs = buildStoredFilePreviews(
      scanVisumFiles,
      "scan_visum",
      normalizeStoredUploadDetails(detail.scan_visum),
      item.uploadLogs,
    );
    const scanDprProofs = buildStoredFilePreviews(
      scanDprFiles,
      "scan_dpr",
      normalizeStoredUploadDetails(detail.scan_dpr),
      item.uploadLogs,
    );
    const buktiHotelProofs = buildStoredFilePreviews(
      buktiHotelFiles,
      "bukti_hotel",
      normalizeStoredUploadDetails(detail.bukti_hotel),
      item.uploadLogs,
    );
    const fotoKtpProofs = buildStoredFilePreviews(
      fotoKtpFiles,
      "foto_ktp",
      normalizeStoredUploadDetails(detail.foto_ktp),
      item.uploadLogs,
    );
    const transportComplete =
      data.sppd.jenis_perjalanan === "Dalam_Kota"
        ? true
        : Number(item.realisasi_akhir.transport_riil ?? 0) <= 0 || notaBuktiFiles.length > 0;
    const scanVisumComplete = scanVisumFiles.length > 0;
    const scanDprComplete = scanDprFiles.length > 0;
    const accommodationLabel =
      item.status_hotel === "Menggunakan_Hotel"
        ? "Bukti Hotel"
        : item.status_hotel === "Tanpa_Hotel_30_Persen"
          ? "Foto KTP"
          : "Akomodasi";
    const accommodationComplete =
      item.status_hotel === "Menggunakan_Hotel"
        ? buktiHotelFiles.length > 0
        : item.status_hotel === "Tanpa_Hotel_30_Persen"
          ? fotoKtpFiles.length > 0
          : true;
    const documentationComplete = documentationProofs.length > 0;
    const requirements = [
      { label: "Scan Visum", done: scanVisumComplete },
      { label: "Scan DPR", done: scanDprComplete },
      ...(data.sppd.jenis_perjalanan === "Dalam_Kota"
        ? []
        : [
            { label: "Bukti Transport", done: transportComplete },
            { label: accommodationLabel, done: accommodationComplete },
          ]),
      { label: "Dokumentasi", done: documentationComplete },
    ];
    const completedRequirementCount = requirements.filter((requirement) => requirement.done).length;
    const lpjComplete = requirements.every((requirement) => requirement.done);

    return {
      ...item,
      scanVisumFiles,
      scanDprFiles,
      fotoKtpFiles,
      buktiHotelFiles,
      dokumentasiFiles,
      notaBuktiFiles,
      transportProofs,
      documentationProofs,
      scanVisumProofs,
      scanDprProofs,
      buktiHotelProofs,
      fotoKtpProofs,
      transportComplete,
      scanVisumComplete,
      scanDprComplete,
      accommodationLabel,
      accommodationComplete,
      documentationComplete,
      requirements,
      completedRequirementCount,
      lpjComplete,
    };
  });
  const completedPelaksanaCount = lpjItems.filter((item) => item.lpjComplete).length;
  const semuaPelaksanaLengkap = lpjItems.length > 0 && completedPelaksanaCount === lpjItems.length;
  const sisaPelaksana = lpjItems.length - completedPelaksanaCount;
  const finalizationDisabledReason = !dokumenAwalLengkap
    ? "Surat Tugas final dan Visum final harus lengkap sebelum finalisasi perjalanan."
    : !semuaPelaksanaLengkap
      ? `Lengkapi LPJ untuk ${sisaPelaksana} pelaksana lagi sebelum finalisasi.`
      : "";

  return (
    <AppShell nama={session.nama} role={session.role} currentPath="/sppd">
      <div className="space-y-6">
        <SppdWorkflowStepper steps={workflowSteps} />

        <section className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#798195]">
              Data SPPD / ID Perjalanan: {data.sppd.nomor_st}
            </p>
            <h1 className="mt-2 text-[28px] font-bold tracking-[-0.03em] text-[#e2342d]">
              Form Realisasi Pasca-Perjalanan (LPJ)
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-[#7d8598]">
              Setiap pelaksana diisi per nama. Buka accordion detail, lengkapi form dan upload
              buktinya sampai ceklis hijau semua, lalu lanjut finalisasi perjalanan.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DocumentPreviewButton
              className="btn-secondary"
              finalValue={suratTugasFinal}
              previewHref={`/print/surat-tugas/${id}`}
              previewLabel="Preview ST"
              printLabel="Cetak ST"
              modalTitle={`Surat Tugas Final ${data.sppd.nomor_st}`}
            />
            <DocumentPreviewButton
              className="btn-secondary"
              finalValue={visumFinal}
              previewHref={`/print/visum/${id}`}
              previewLabel="Preview Visum"
              printLabel="Cetak Visum"
              modalTitle={`${visumLabel} Final ${data.sppd.nomor_st}`}
            />
            <Link className="btn-secondary" href={`/sppd/${id}/dokumentasi`}>
              Lihat Dokumentasi
            </Link>
            <Link className="btn-secondary" href={`/sppd/${id}`}>
              Kembali ke Dokumen
            </Link>
          </div>
        </section>

        {flash?.message ? (
          <section
            className={`rounded-[18px] px-4 py-3 text-sm font-medium ${
              flash.status === "success"
                ? "bg-[#edf8ef] text-[#2b8e5c]"
                : "bg-[#fff1ef] text-[#d9544d]"
            }`}
          >
            {flash.message}
          </section>
        ) : null}

        {!dokumenAwalLengkap ? (
          <section className="rounded-[18px] border border-[#ffd7d3] bg-[#fff1ef] px-4 py-3 text-sm font-medium text-[#d9544d]">
            Surat Tugas final dan Visum final belum lengkap. Tahap LPJ bisa diisi, tetapi
            finalisasi perjalanan baru bisa diselesaikan setelah kedua dokumen awal sudah final.
          </section>
        ) : null}

        <section className="card p-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#252c38]">Daftar Pelaksana LPJ</h2>
              <p className="mt-2 text-sm text-[#7d8598]">
                Isi LPJ per pelaksana melalui accordion di bawah. Finalisasi perjalanan hanya aktif
                setelah semua nama memiliki ceklis hijau.
              </p>
            </div>
            <div className="w-full max-w-[360px] rounded-[20px] border border-[#e8ebf1] bg-[#fbfbfd] p-4">
              <p className="text-sm font-semibold text-[#252c38]">Progress Finalisasi</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[16px] bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8a92a5]">
                    Pelaksana Lengkap
                  </p>
                  <p className="mt-2 text-lg font-bold text-[#252c38]">
                    {completedPelaksanaCount}/{lpjItems.length}
                  </p>
                </div>
                <div className="rounded-[16px] bg-white px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8a92a5]">
                    Status Final
                  </p>
                  <p className="mt-2 text-lg font-bold text-[#252c38]">
                    {data.sppd.status === "Selesai"
                      ? "Selesai"
                      : semuaPelaksanaLengkap && dokumenAwalLengkap
                        ? "Siap Finalisasi"
                        : "Belum Siap"}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <LpjFinalizationDialog
                  sppdId={String(data.sppd._id)}
                  nomorSt={data.sppd.nomor_st}
                  statusSppd={data.sppd.status}
                  disabled={Boolean(finalizationDisabledReason)}
                  disabledMessage={finalizationDisabledReason}
                  items={data.rincian.map((rincian) => ({
                    pegawaiId: String(rincian.pegawai_id),
                    nama: rincian.pegawai?.nama ?? "-",
                    jabatan: rincian.pegawai?.jabatan ?? "-",
                    estimasiAwal: rincian.estimasi_awal.total,
                    panjarAwal: rincian.uang_muka_dp,
                    realisasiAkhir: rincian.realisasi_akhir.total,
                    selisih: rincian.nominal_selisih_rampung,
                    statusRampung: rincian.status_rampung,
                  }))}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[20px] border border-[#e8ebf1] bg-white">
            <div className="hidden gap-3 border-b border-[#eef1f6] bg-[#fbfbfd] px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#98a0b2] md:grid md:grid-cols-[60px_minmax(0,1.5fr)_minmax(0,1.3fr)_160px_120px]">
              <span>No</span>
              <span>Nama Pelaksana</span>
              <span>Jabatan</span>
              <span>Status LPJ</span>
              <span>Ceklis</span>
            </div>

            {lpjItems.map((item, index) => (
              <details
                key={String(item._id)}
                className="border-t border-[#eef1f6] first:border-t-0"
                open={lpjItems.length === 1 || index === 0}
              >
                <summary className="list-none cursor-pointer px-5 py-4">
                  <div className="grid gap-3 md:grid-cols-[60px_minmax(0,1.5fr)_minmax(0,1.3fr)_160px_120px] md:items-center">
                    <div className="text-sm font-semibold text-[#5f687a]">#{index + 1}</div>
                    <div>
                      <p className="font-semibold text-[#252c38]">{item.pegawai?.nama ?? "-"}</p>
                      <p className="mt-1 text-xs text-[#7d8598]">Klik untuk buka detail LPJ per nama</p>
                    </div>
                    <p className="text-sm text-[#5f687a]">{item.pegawai?.jabatan ?? "-"}</p>
                    <div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          item.lpjComplete
                            ? "bg-[#edf8ef] text-[#2b8e5c]"
                            : "bg-[#fff1ef] text-[#d9544d]"
                        }`}
                      >
                        {item.lpjComplete ? "Lengkap" : "Belum Lengkap"}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-[#252c38]">
                      {item.completedRequirementCount}/{item.requirements.length}
                    </p>
                  </div>
                </summary>

                <div className="border-t border-[#eef1f6] bg-[#fbfbfd] px-5 py-5">
                  <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
                    <div className="space-y-5">
                      <section className="rounded-[20px] border border-[#e8ebf1] bg-white p-5">
                        <h3 className="text-lg font-bold text-[#252c38]">Detail Perjalanan</h3>
                        <p className="mt-1 text-sm text-[#7f8799]">
                          {item.pegawai?.nama ?? "-"} | {item.pegawai?.jabatan ?? "-"}
                        </p>

                        <div className="mt-4 grid gap-4 border-t border-[#e8ebf1] pt-4 md:grid-cols-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#8a92a5]">
                              Tujuan
                            </p>
                            <p className="mt-2 font-bold text-[#252c38]">{data.sppd.lokasi_tujuan}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#8a92a5]">
                              Jenis
                            </p>
                            <p className="mt-2 font-bold text-[#252c38]">
                              {data.sppd.jenis_perjalanan === "Dalam_Kota" ? "Dalam Kota" : "Luar Kota"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#8a92a5]">
                              Rentang Tanggal
                            </p>
                            <p className="mt-2 font-bold text-[#252c38]">
                              {formatTanggal(data.sppd.tanggal_mulai)} - {formatTanggal(data.sppd.tanggal_selesai)}
                            </p>
                          </div>
                          <div className="md:col-span-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[#8a92a5]">
                              Durasi
                            </p>
                            <p className="mt-2 font-bold text-[#252c38]">{data.sppd.jumlah_hari} hari</p>
                          </div>
                        </div>
                      </section>

                      <section className="rounded-[20px] border border-[#e8ebf1] bg-white p-5">
                        <h4 className="text-lg font-bold text-[#252c38]">Input LPJ per Pelaksana</h4>
                        <p className="mt-1 text-sm text-[#7f8799]">
                          Lengkapi form dan upload bukti pada nama ini sampai semua status berubah
                          hijau.
                        </p>

                        <form action={submitRampungLpjFormAction} className="mt-5 space-y-4">
                          <input type="hidden" name="sppd_id" value={String(data.sppd._id)} />
                          <input type="hidden" name="pegawai_id" value={String(item.pegawai_id)} />
                          <input
                            type="hidden"
                            name="scan_visum_existing"
                            value={JSON.stringify(item.scanVisumFiles)}
                          />
                          <input
                            type="hidden"
                            name="scan_dpr_existing"
                            value={JSON.stringify(item.scanDprFiles)}
                          />
                          <input
                            type="hidden"
                            name="foto_ktp_existing"
                            value={JSON.stringify(item.fotoKtpFiles)}
                          />
                          <input
                            type="hidden"
                            name="bukti_hotel_existing"
                            value={JSON.stringify(item.buktiHotelFiles)}
                          />
                          <input
                            type="hidden"
                            name="dokumentasi_existing"
                            value={JSON.stringify(item.dokumentasiFiles)}
                          />
                          <input
                            type="hidden"
                            name="nota_bukti_existing"
                            value={JSON.stringify(item.notaBuktiFiles)}
                          />

                          <LpjAkomodasiFields
                            sppdId={String(data.sppd._id)}
                            pegawaiId={String(item.pegawai_id)}
                            jenisPerjalanan={data.sppd.jenis_perjalanan}
                            initialStatusHotel={item.status_hotel}
                            initialHotelRiil={item.realisasi_akhir.hotel_riil}
                            initialAlamatMenginapTanpaHotel={item.alamat_menginap_tanpa_hotel ?? ""}
                            existingBuktiHotelCount={item.buktiHotelFiles.length}
                            existingFotoKtpCount={item.fotoKtpFiles.length}
                            buktiHotelFiles={item.buktiHotelProofs}
                            fotoKtpFiles={item.fotoKtpProofs}
                          />

                          <div className="grid gap-4 md:grid-cols-2">
                            <LpjUangHarianField
                              jenisPerjalanan={data.sppd.jenis_perjalanan}
                              initialDalamKotaLebih8Jam={item.dalam_kota_lebih_8_jam ?? false}
                              initialUangHarianRiil={item.realisasi_akhir.uang_harian}
                              uangHarianDalamKotaLebih8Jam={item.uangHarianDalamKotaLebih8Jam}
                            />
                            <div>
                              <label className="label">Transport Riil</label>
                              <input
                                className="input"
                                type="number"
                                min={0}
                                name="transport_riil"
                                defaultValue={
                                  data.sppd.jenis_perjalanan === "Dalam_Kota"
                                    ? item.estimasi_awal.transport
                                    : item.realisasi_akhir.transport_riil
                                }
                                readOnly={data.sppd.jenis_perjalanan === "Dalam_Kota"}
                              />
                              <p className="mt-2 text-xs text-[#7d8598]">
                                {data.sppd.jenis_perjalanan === "Dalam_Kota"
                                  ? "Nominal transport dalam kota mengikuti nilai fix pada pengajuan dan tidak perlu bukti."
                                  : "Jika diisi, lampirkan bukti transport seperti BBM, tol, tiket, parkir, dan lain-lain."}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            {data.sppd.jenis_perjalanan === "Dalam_Kota" ? (
                              <div className="rounded-[18px] border border-[#e8ebf1] bg-[#f7f8fc] p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-[#252c38]">Bukti Transport</p>
                                    <p className="mt-1 text-xs text-[#7d8598]">
                                      Perjalanan dinas dalam kota tidak memerlukan upload bukti transport.
                                    </p>
                                  </div>
                                  <span className="inline-flex items-center rounded-full bg-[#edf8ef] px-3 py-1 text-xs font-semibold text-[#2b8e5c]">
                                    Tidak Diperlukan
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <LpjInstantUploadField
                                sppdId={String(data.sppd._id)}
                                pegawaiId={String(item.pegawai_id)}
                                field="nota_bukti"
                                label="Bukti Transport"
                                inputName="nota_bukti_files"
                                accept=".pdf,image/*"
                                helpText="Upload bukti transport di sini. Setelah berhasil, file langsung muncul di kartu ini."
                                emptyText="Belum ada bukti transport."
                                uploadedFiles={item.transportProofs}
                                isComplete={item.transportComplete}
                              />
                            )}
                            <LpjInstantUploadField
                              sppdId={String(data.sppd._id)}
                              pegawaiId={String(item.pegawai_id)}
                              field="dokumentasi"
                              label="Dokumentasi Kegiatan"
                              inputName="dokumentasi_files"
                              accept="image/*,.pdf"
                              helpText="Foto kegiatan atau dokumentasi tambahan lain bisa diunggah banyak file."
                              emptyText="Belum ada dokumentasi."
                              uploadedFiles={item.documentationProofs}
                              isComplete={item.documentationComplete}
                            />
                          </div>

                          <div className="space-y-3">
                            <label className="label">Dokumen Administratif</label>
                            <div className="grid gap-4 md:grid-cols-2">
                              <LpjInstantUploadField
                                sppdId={String(data.sppd._id)}
                                pegawaiId={String(item.pegawai_id)}
                                field="scan_visum"
                                label="Scan Visum"
                                inputName="scan_visum_files"
                                accept=".pdf,image/*"
                                required={item.scanVisumFiles.length === 0}
                                helpText="Setelah dipilih, file langsung diunggah ke server dan akan muncul di kartu ini."
                                emptyText="Belum ada scan visum."
                                uploadedFiles={item.scanVisumProofs}
                                isComplete={item.scanVisumComplete}
                              />
                              <LpjInstantUploadField
                                sppdId={String(data.sppd._id)}
                                pegawaiId={String(item.pegawai_id)}
                                field="scan_dpr"
                                label="Scan DPR"
                                inputName="scan_dpr_files"
                                accept=".pdf,image/*"
                                required={item.scanDprFiles.length === 0}
                                helpText="Setelah dipilih, file langsung diunggah ke server dan akan muncul di kartu ini."
                                emptyText="Belum ada scan DPR."
                                uploadedFiles={item.scanDprProofs}
                                isComplete={item.scanDprComplete}
                              />
                            </div>
                          </div>

                          <LpjSubmitActions
                            jenisPerjalanan={data.sppd.jenis_perjalanan}
                            existingScanVisumCount={item.scanVisumFiles.length}
                            existingScanDprCount={item.scanDprFiles.length}
                            existingTransportProofCount={item.notaBuktiFiles.length}
                            existingBuktiHotelCount={item.buktiHotelFiles.length}
                            existingFotoKtpCount={item.fotoKtpFiles.length}
                            existingDocumentationCount={item.dokumentasiFiles.length}
                          />
                        </form>
                      </section>
                    </div>

                    <div className="space-y-5">
                      <aside className="rounded-[20px] border border-[#e8ebf1] bg-white p-5">
                        <h4 className="text-lg font-bold text-[#252c38]">Checklist Kelengkapan</h4>
                        <div className="mt-4 space-y-2">
                          {item.requirements.map((statusItem) => (
                            <div
                              key={statusItem.label}
                              className={`rounded-[14px] px-3 py-2 text-sm ${
                                statusItem.done
                                  ? "bg-[#edf8ef] text-[#2b8e5c]"
                                  : "bg-[#f7f8fc] text-[#7d8598]"
                              }`}
                            >
                              {statusItem.done ? "Ceklis Hijau: " : "Belum Lengkap: "}
                              {statusItem.label}
                            </div>
                          ))}
                        </div>
                      </aside>

                      <aside className="rounded-[20px] border border-[#e8ebf1] bg-white p-5">
                        <h4 className="text-lg font-bold text-[#252c38]">Ringkasan Perhitungan</h4>
                        <div className="mt-4 space-y-3 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-[#727b8e]">Panjar Awal</span>
                            <strong className="text-right text-[#252c38]">{formatRupiah(item.uang_muka_dp)}</strong>
                          </div>
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-[#727b8e]">Realisasi Aktual</span>
                            <strong className="text-right text-[#252c38]">
                              {formatRupiah(item.realisasi_akhir.total)}
                            </strong>
                          </div>
                        </div>

                        <div className="mt-5 rounded-[16px] bg-[#edf8ef] p-4">
                          <p className="font-bold text-[#2b8e5c]">{item.status_rampung}</p>
                          <div className="mt-2 flex items-start justify-between gap-3 text-sm">
                            <span className="text-[#5d856b]">Nominal Selisih</span>
                            <strong className="text-right text-[#2b8e5c]">
                              {formatRupiah(item.nominal_selisih_rampung)}
                            </strong>
                          </div>
                        </div>
                      </aside>

                      <aside className="rounded-[20px] border border-[#e8ebf1] bg-white p-5">
                        <h4 className="text-lg font-bold text-[#252c38]">Estimasi Awal</h4>
                        <div className="mt-4 space-y-3 text-sm text-[#5f687a]">
                          <div className="flex items-center justify-between">
                            <span>Estimasi Uang Harian</span>
                            <strong className="text-[#252c38]">
                              {formatRupiah(item.estimasi_awal.uang_harian)}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Estimasi Transport</span>
                            <strong className="text-[#252c38]">
                              {formatRupiah(item.estimasi_awal.transport)}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Estimasi Hotel</span>
                            <strong className="text-[#252c38]">
                              {formatRupiah(item.estimasi_awal.hotel)}
                            </strong>
                          </div>
                          <div className="flex items-center justify-between">
                            <span>Total Estimasi</span>
                            <strong className="text-[#252c38]">
                              {formatRupiah(item.estimasi_awal.total)}
                            </strong>
                          </div>
                        </div>
                      </aside>

                      <aside className="rounded-[20px] border border-[#e8ebf1] bg-white p-5">
                        <h4 className="text-lg font-bold text-[#252c38]">Log Upload Integrasi</h4>
                        <p className="mt-1 text-sm text-[#7f8799]">Source ID: {item.sourceId}</p>
                        <div className="mt-4 space-y-3 text-sm">
                          {item.uploadLogs.length ? (
                            item.uploadLogs.map((log, logIndex) => (
                              <div
                                key={`${log.id || log.url || logIndex}`}
                                className="rounded-[16px] bg-[#f7f8fc] p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-semibold text-[#252c38]">
                                      {log.fileName || `Upload ${logIndex + 1}`}
                                    </p>
                                    <p className="mt-1 text-[#7d8598]">
                                      {log.status || "Status tidak tersedia"}
                                    </p>
                                  </div>
                                  {log.url ? (
                                    <a
                                      className="font-semibold text-[#e2342d] underline"
                                      href={log.url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      Buka
                                    </a>
                                  ) : null}
                                </div>
                                <p className="mt-2 text-xs text-[#7d8598]">
                                  {log.createdAt || "Waktu upload tidak tersedia"}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="text-[#7d8598]">
                              Belum ada log upload untuk data pegawai ini.
                            </p>
                          )}
                        </div>
                      </aside>
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>

        {session.role === "Admin" ? (
          <section className="card max-w-md p-5">
            <h4 className="text-lg font-bold text-[#252c38]">Override Status Admin</h4>
            <form action={updateStatusSppdAction} className="mt-4 space-y-3">
              <input type="hidden" name="sppd_id" value={String(data.sppd._id)} />
              <label className="label">Ubah Status SPPD</label>
              <select className="input" name="status" defaultValue={data.sppd.status}>
                <option value="Draft">Draft</option>
                <option value="Berjalan">Berjalan</option>
                <option value="LPJ_Diproses">LPJ Diproses</option>
                <option value="Selesai">Selesai</option>
              </select>
              <FormActionButton
                className="btn-secondary w-full"
                label="Perbarui Status"
                pendingLabel="Memperbarui..."
              />
            </form>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
