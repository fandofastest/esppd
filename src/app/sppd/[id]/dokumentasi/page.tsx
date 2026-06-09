import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/db/mongoose";
import { formatTanggal } from "@/lib/format";
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
}

interface DokumentasiRow {
  jenis: string;
  kategori: string;
  pelaksana: string;
  fileLabel: string;
  reference: string;
  createdAt: string;
  viewHref: string;
  downloadHref: string;
  hasDirectFile: boolean;
}

interface StoredUploadDetailLike {
  value: string;
  uploadId: string;
  fileName: string;
  url: string;
  reference: string;
  createdAt: string;
  mimeType: string;
  archive: {
    archiveId: string;
    archiveNumber: string;
    originalName: string;
  };
}

function isExternalUrl(value?: string) {
  return Boolean(value && /^https?:\/\//i.test(value));
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
    .filter((item): item is StoredUploadDetailLike => Boolean(item?.value));
}

function buildLpjSourceId(sppdId: unknown, pegawaiId: unknown) {
  return `${String(sppdId)}:${String(pegawaiId)}`;
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

function buildStoredFileRows(
  sppdId: string,
  files: string[],
  tag: string,
  rows: Omit<
    DokumentasiRow,
    "fileLabel" | "reference" | "createdAt" | "viewHref" | "downloadHref" | "hasDirectFile"
  >,
  storedDetails: StoredUploadDetailLike[],
  uploadLogs: IntegrationUploadRecord[],
) {
  return files.map((value, index) => {
    const storedDetail = storedDetails.find((item) => item.value === value) ?? storedDetails[index];
    const matchedLog = findMatchingUploadLog(uploadLogs, tag, value, index);
    const archiveId = storedDetail?.archive.archiveId || matchedLog?.archiveId || "";
    const proxiedViewUrl = archiveId
      ? buildIntegrationFileProxyUrl(archiveId, true)
      : "";
    const proxiedDownloadUrl = archiveId
      ? buildIntegrationFileProxyUrl(archiveId, false)
      : "";
    const resolvedViewUrl =
      isExternalUrl(value) ? value : storedDetail?.url || matchedLog?.url || proxiedViewUrl;
    const resolvedDownloadUrl =
      isExternalUrl(value) ? value : storedDetail?.url || matchedLog?.url || proxiedDownloadUrl;
    const fileLabel = storedDetail?.fileName || matchedLog?.fileName || `${rows.kategori} ${index + 1}`;
    const createdAt = storedDetail?.createdAt || matchedLog?.createdAt || "-";
    const fallbackViewHref = `/sppd/${sppdId}/dokumentasi/berkas?title=${encodeURIComponent(
      fileLabel,
    )}&category=${encodeURIComponent(rows.kategori)}&pelaksana=${encodeURIComponent(
      rows.pelaksana,
    )}&reference=${encodeURIComponent(value)}&createdAt=${encodeURIComponent(
      createdAt,
    )}&fileUrl=${encodeURIComponent(resolvedViewUrl)}`;
    const fallbackDownloadHref = `/api/dokumentasi-reference?title=${encodeURIComponent(
      fileLabel,
    )}&reference=${encodeURIComponent(value)}&category=${encodeURIComponent(
      rows.kategori,
    )}&pelaksana=${encodeURIComponent(rows.pelaksana)}&createdAt=${encodeURIComponent(
      createdAt,
    )}`;

    return {
      ...rows,
      fileLabel,
      reference: value,
      createdAt,
      viewHref: resolvedViewUrl || fallbackViewHref,
      downloadHref: resolvedDownloadUrl || fallbackDownloadHref,
      hasDirectFile: Boolean(resolvedDownloadUrl),
    } satisfies DokumentasiRow;
  });
}

async function getDokumentasiSppd(id: string) {
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
  const uploadLogs = await Promise.all(
    keuangan.map(async (item) => {
      const sourceId = buildLpjSourceId(sppd._id, item.pegawai_id);
      const logs = await listIntegrationUploads({
        page: 1,
        limit: 50,
        q: sourceId,
        sourceType: "api",
      });

      return [sourceId, logs.filter((log) => !log.sourceId || log.sourceId === sourceId)] as const;
    }),
  );
  const uploadLogMap = new Map(uploadLogs);

  const rows: DokumentasiRow[] = [];

  const suratTugasUrl = dataUrlOrFallback(sppd.dokumen_final?.surat_tugas ?? "", `/print/surat-tugas/${id}`);
  const visumUrl = dataUrlOrFallback(sppd.dokumen_final?.visum ?? "", `/print/visum/${id}`);
  if (sppd.dokumen_final?.surat_tugas) {
    rows.push({
      jenis: "Dokumen Final",
      kategori: "Surat Tugas",
      pelaksana: "Semua Pelaksana",
      fileLabel: `Surat Tugas Final ${sppd.nomor_st}`,
      reference: sppd.dokumen_final.surat_tugas,
      createdAt: sppd.dokumen_final.surat_tugas_generated_at
        ? formatTanggal(sppd.dokumen_final.surat_tugas_generated_at)
        : "-",
      viewHref: suratTugasUrl.viewHref,
      downloadHref: suratTugasUrl.downloadHref,
      hasDirectFile: Boolean(suratTugasUrl.downloadHref),
    });
  }
  if (sppd.dokumen_final?.visum) {
    rows.push({
      jenis: "Dokumen Final",
      kategori: sppd.jenis_perjalanan === "Dalam_Kota" ? "Visum Dalam Kota" : "Visum Luar Kota",
      pelaksana: "Semua Pelaksana",
      fileLabel: `Visum Final ${sppd.nomor_st}`,
      reference: sppd.dokumen_final.visum,
      createdAt: sppd.dokumen_final.visum_generated_at
        ? formatTanggal(sppd.dokumen_final.visum_generated_at)
        : "-",
      viewHref: visumUrl.viewHref,
      downloadHref: visumUrl.downloadHref,
      hasDirectFile: Boolean(visumUrl.downloadHref),
    });
  }

  keuangan.forEach((item) => {
    const namaPegawai = pegawaiMap.get(String(item.pegawai_id))?.nama ?? "-";
    const sourceId = buildLpjSourceId(sppd._id, item.pegawai_id);
    const logs = uploadLogMap.get(sourceId) ?? [];
    const detail = item.berkas_lpj_detail ?? {
      scan_visum: [],
      scan_dpr: [],
      foto_ktp: [],
      bukti_hotel: [],
      dokumentasi: [],
      nota_bukti: [],
    };
    const baseRow = {
      jenis: "Berkas LPJ",
      pelaksana: namaPegawai,
    };

    rows.push(
      ...buildStoredFileRows(String(sppd._id), normalizeStoredFiles(item.berkas_lpj.scan_visum), "scan_visum", {
        ...baseRow,
        kategori: "Scan Visum",
      }, normalizeStoredUploadDetails(detail.scan_visum), logs),
      ...buildStoredFileRows(String(sppd._id), normalizeStoredFiles(item.berkas_lpj.scan_dpr), "scan_dpr", {
        ...baseRow,
        kategori: "Scan DPR",
      }, normalizeStoredUploadDetails(detail.scan_dpr), logs),
      ...buildStoredFileRows(String(sppd._id), normalizeStoredFiles(item.berkas_lpj.nota_bukti), "bukti_transport", {
        ...baseRow,
        kategori: "Bukti Transport",
      }, normalizeStoredUploadDetails(detail.nota_bukti), logs),
      ...buildStoredFileRows(String(sppd._id), normalizeStoredFiles(item.berkas_lpj.bukti_hotel), "bukti_hotel", {
        ...baseRow,
        kategori: "Bukti Hotel",
      }, normalizeStoredUploadDetails(detail.bukti_hotel), logs),
      ...buildStoredFileRows(String(sppd._id), normalizeStoredFiles(item.berkas_lpj.foto_ktp), "foto_ktp", {
        ...baseRow,
        kategori: "Foto KTP",
      }, normalizeStoredUploadDetails(detail.foto_ktp), logs),
      ...buildStoredFileRows(String(sppd._id), normalizeStoredFiles(item.berkas_lpj.dokumentasi), "dokumentasi", {
        ...baseRow,
        kategori: "Dokumentasi",
      }, normalizeStoredUploadDetails(detail.dokumentasi), logs),
    );
  });

  return {
    sppd,
    rows,
  };
}

function dataUrlOrFallback(value: string, fallbackHref: string) {
  if (isExternalUrl(value)) {
    return {
      viewHref: value,
      downloadHref: value,
    };
  }

  return {
    viewHref: fallbackHref,
    downloadHref: "",
  };
}

export default async function SppdDokumentasiPage({ params }: PageProps) {
  const session = await requireRole(["Admin", "Operator"]);
  const { id } = await params;
  const data = await getDokumentasiSppd(id);

  if (!data) {
    notFound();
  }

  return (
    <AppShell nama={session.nama} role={session.role} currentPath="/sppd">
      <div className="space-y-6">
        <section className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#798195]">
              Data SPPD / Dokumentasi: {data.sppd.nomor_st}
            </p>
            <h1 className="mt-2 text-[28px] font-bold tracking-[-0.03em] text-[#e2342d]">
              Dokumentasi Perjalanan Dinas
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-[#717b8d]">
              Semua berkas perjalanan dinas ditampilkan dalam satu tabel, termasuk Surat Tugas,
              Visum, dan seluruh lampiran LPJ.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="btn-secondary" href={`/sppd/${id}`}>
              Kembali ke Dokumen
            </Link>
            <Link className="btn-secondary" href={`/sppd/${id}/lpj`}>
              Kembali ke LPJ
            </Link>
          </div>
        </section>

        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-[#252c38]">Daftar Berkas</h2>
              <p className="mt-1 text-sm text-[#7d8598]">
                Tombol view selalu aktif. Jika server arsip tidak memberi URL file langsung, sistem
                membuka detail referensi arsip dan tombol download akan mengunduh referensinya.
              </p>
            </div>
            <div className="rounded-[16px] bg-[#f7f8fc] px-4 py-3 text-sm text-[#586173]">
              Total berkas: <strong className="text-[#252c38]">{data.rows.length}</strong>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto rounded-[20px] border border-[#e8ebf1]">
            <table className="min-w-full text-sm">
              <thead className="bg-[#fbfbfd] text-left text-[12px] font-semibold uppercase tracking-wide text-[#98a0b2]">
                <tr>
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">Jenis</th>
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Pelaksana</th>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Referensi</th>
                  <th className="px-4 py-3">Tanggal</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length ? (
                  data.rows.map((row, index) => (
                    <tr key={`${row.kategori}-${row.pelaksana}-${index}`} className="border-t border-[#eef1f6]">
                      <td className="px-4 py-3 text-[#586173]">{index + 1}</td>
                      <td className="px-4 py-3">{row.jenis}</td>
                      <td className="px-4 py-3">{row.kategori}</td>
                      <td className="px-4 py-3">{row.pelaksana}</td>
                      <td className="px-4 py-3 font-semibold text-[#252c38]">{row.fileLabel}</td>
                      <td className="max-w-[240px] px-4 py-3 text-[#586173]">
                        <span className="line-clamp-2 break-all">{row.reference}</span>
                      </td>
                      <td className="px-4 py-3 text-[#586173]">{row.createdAt || "-"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {row.viewHref ? (
                            <Link className="btn-secondary text-sm" href={row.viewHref} target="_blank" rel="noreferrer">
                              View
                            </Link>
                          ) : (
                            <span className="rounded-full bg-[#f2f4f8] px-3 py-2 text-xs font-semibold text-[#98a0b2]">
                              View
                            </span>
                          )}
                          {row.downloadHref ? (
                            <a
                              className="btn-primary text-sm"
                              href={row.downloadHref}
                              target="_blank"
                              rel="noreferrer"
                              download={row.hasDirectFile}
                            >
                              Download
                            </a>
                          ) : (
                            <span className="rounded-full bg-[#f2f4f8] px-3 py-2 text-xs font-semibold text-[#98a0b2]">
                              Download
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-center text-[#7d8598]" colSpan={8}>
                      Belum ada dokumentasi yang tersimpan untuk perjalanan dinas ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
