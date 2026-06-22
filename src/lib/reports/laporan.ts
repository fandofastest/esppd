import { connectMongoDB } from "@/lib/db/mongoose";
import {
  KeuanganSppdModel,
  PegawaiModel,
  SppdModel,
  type IKeuanganSppd,
  type IPegawai,
  type ISppd,
  type JenisPegawai,
  type JenisPerjalanan,
  type StatusRampung,
  type StatusSppd,
  type StatusHotel,
} from "@/models";

export type SearchParamValue = string | string[] | undefined;

export interface LaporanFilters {
  q: string;
  nomorSt: string;
  tujuan: string;
  lokasiAsal: string;
  provinsiTujuan: string;
  kotaTujuan: string;
  kecamatanTujuan: string;
  status: string;
  jenis: string;
  bulan: string;
  tahun: string;
  tanggalStMulai: string;
  tanggalStSelesai: string;
  tanggalBerangkatMulai: string;
  tanggalBerangkatSelesai: string;
  pegawai: string;
  jenisPegawai: string;
  jabatan: string;
  statusHotel: string;
  statusRampung: string;
  lpjCompletion: string;
  dokumenSuratTugas: string;
  dokumenVisum: string;
  finalisasiLpj: string;
  dokumentasi: string;
  nominalMin: string;
  nominalMax: string;
  minPelaksana: string;
  maxPelaksana: string;
  sort: string;
  page: number;
  pageSize: number;
}

export interface LaporanRecord {
  sppd: ISppd;
  pelaksana: IPegawai[];
  pelaksanaIds: string[];
  keuangan: IKeuanganSppd[];
  totalEstimasi: number;
  totalRealisasi: number;
  totalUangMuka: number;
  totalSelisihRampung: number;
  hasSuratTugasFinal: boolean;
  hasVisumFinal: boolean;
  hasLpjFinal: boolean;
  hasDocumentation: boolean;
  hasFinanceData: boolean;
  jumlahBerkas: number;
  statusHotelList: StatusHotel[];
  statusRampungList: StatusRampung[];
  lpjCompletion: "Lengkap" | "Perlu_Perbaikan" | "Belum_Ada";
}

export interface SummaryBucket {
  value: string;
  label: string;
  count: number;
}

export interface LaporanSummary {
  totalRecords: number;
  totalSelesai: number;
  totalBelumSelesai: number;
  totalPelaksanaTerlibat: number;
  totalEstimasi: number;
  totalRealisasi: number;
  totalUangMuka: number;
  totalSelisihRampung: number;
  totalBerkas: number;
  totalLengkap: number;
  totalDokumenFinal: number;
}

export interface LaporanOptionSet {
  tahunOptions: number[];
  lokasiAsalOptions: string[];
  provinsiTujuanOptions: string[];
  kotaTujuanOptions: string[];
  kecamatanTujuanOptions: string[];
  jabatanOptions: string[];
}

export interface LaporanChartPoint {
  label: string;
  totalSppd: number;
  totalRealisasi: number;
  totalPelaksana: number;
}

export interface LaporanPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  startItem: number;
  endItem: number;
}

export interface LaporanData {
  filters: LaporanFilters;
  records: LaporanRecord[];
  paginatedRecords: LaporanRecord[];
  summary: LaporanSummary;
  options: LaporanOptionSet;
  statusSummary: SummaryBucket[];
  jenisPegawaiSummary: SummaryBucket[];
  hotelSummary: SummaryBucket[];
  monthlyChart: LaporanChartPoint[];
  yearlyChart: LaporanChartPoint[];
  pagination: LaporanPagination;
}

export const MONTH_OPTIONS = [
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
] as const;

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export const STATUS_OPTIONS: Array<{ value: StatusSppd; label: string }> = [
  { value: "Draft", label: "Draft" },
  { value: "Berjalan", label: "Berjalan" },
  { value: "LPJ_Diproses", label: "LPJ Diproses" },
  { value: "Selesai", label: "Selesai" },
];

export const JENIS_PERJALANAN_OPTIONS: Array<{ value: JenisPerjalanan; label: string }> = [
  { value: "Dalam_Kota", label: "Dalam Kota" },
  { value: "Luar_Kota", label: "Luar Kota" },
];

export const JENIS_PEGAWAI_OPTIONS: Array<{ value: JenisPegawai; label: string }> = [
  { value: "PNS", label: "PNS" },
  { value: "PPPK", label: "PPPK" },
  { value: "Komisioner", label: "Komisioner" },
];

export const STATUS_HOTEL_OPTIONS: Array<{ value: StatusHotel; label: string }> = [
  { value: "Menggunakan_Hotel", label: "Menggunakan Hotel" },
  { value: "Tanpa_Hotel_30_Persen", label: "Tanpa Hotel 30%" },
  { value: "Dalam_Kota_Tanpa_Hotel", label: "Dalam Kota Tanpa Hotel" },
];

export const STATUS_RAMPUNG_OPTIONS: Array<{ value: StatusRampung; label: string }> = [
  { value: "Pas", label: "Pas" },
  { value: "Kurang_Bayar", label: "Kurang Bayar" },
  { value: "Lebih_Bayar", label: "Lebih Bayar" },
];

function getParamValue(
  params: Record<string, SearchParamValue> | URLSearchParams,
  key: string,
) {
  if (params instanceof URLSearchParams) {
    return params.get(key) ?? "";
  }

  const value = params[key];
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeText(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function includesText(haystack: string, needle: string) {
  if (!needle) {
    return true;
  }

  return normalizeText(haystack).includes(normalizeText(needle));
}

function parseDateInput(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function isWithinDateRange(value: Date | string | undefined, start?: string, end?: string) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const startDate = parseDateInput(start ?? "");
  const endDate = parseDateInput(end ?? "");

  if (startDate && date < startDate) {
    return false;
  }

  if (endDate) {
    const inclusiveEndDate = new Date(endDate);
    inclusiveEndDate.setHours(23, 59, 59, 999);
    if (date > inclusiveEndDate) {
      return false;
    }
  }

  return true;
}

function parseNumberInput(value: string) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.replace(/[^\d.-]/g, "");
  if (!normalizedValue) {
    return null;
  }

  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampPositiveInteger(value: string, fallback: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function normalizeBerkasLpj(
  berkas?: Partial<IKeuanganSppd["berkas_lpj"]> | null,
): IKeuanganSppd["berkas_lpj"] {
  return {
    scan_visum: Array.isArray(berkas?.scan_visum) ? berkas.scan_visum : [],
    scan_dpr: Array.isArray(berkas?.scan_dpr) ? berkas.scan_dpr : [],
    foto_ktp: Array.isArray(berkas?.foto_ktp) ? berkas.foto_ktp : [],
    bukti_hotel: Array.isArray(berkas?.bukti_hotel) ? berkas.bukti_hotel : [],
    dokumentasi: Array.isArray(berkas?.dokumentasi) ? berkas.dokumentasi : [],
    nota_bukti: Array.isArray(berkas?.nota_bukti) ? berkas.nota_bukti : [],
  };
}

function countUploadedFiles(berkas?: Partial<IKeuanganSppd["berkas_lpj"]> | null) {
  const normalizedBerkas = normalizeBerkasLpj(berkas);

  return (
    normalizedBerkas.scan_visum.length +
    normalizedBerkas.scan_dpr.length +
    normalizedBerkas.foto_ktp.length +
    normalizedBerkas.bukti_hotel.length +
    normalizedBerkas.dokumentasi.length +
    normalizedBerkas.nota_bukti.length
  );
}

function getLpjCompletion(keuangan: IKeuanganSppd[]): LaporanRecord["lpjCompletion"] {
  if (keuangan.length === 0) {
    return "Belum_Ada";
  }

  const completeRows = keuangan.filter((item) => {
    const normalizedBerkas = normalizeBerkasLpj(item.berkas_lpj);
    const requiredUploadKeys: Array<keyof IKeuanganSppd["berkas_lpj"]> = [
      "scan_visum",
      "scan_dpr",
      "nota_bukti",
      "dokumentasi",
    ];

    if (item.status_hotel === "Menggunakan_Hotel") {
      requiredUploadKeys.push("bukti_hotel");
    }

    if (item.status_hotel === "Tanpa_Hotel_30_Persen") {
      requiredUploadKeys.push("foto_ktp");
    }

    const hasRequiredUploads = requiredUploadKeys.every(
      (key) => normalizedBerkas[key].length > 0,
    );
    return hasRequiredUploads && item.realisasi_akhir.total > 0;
  });

  return completeRows.length === keuangan.length ? "Lengkap" : "Perlu_Perbaikan";
}

function uniqSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "id"));
}

function groupByPeriod(
  records: LaporanRecord[],
  period: "month" | "year",
): LaporanChartPoint[] {
  const buckets = new Map<string, LaporanChartPoint>();

  for (const record of records) {
    const date = new Date(record.sppd.tanggal_mulai);
    const key =
      period === "month"
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        : String(date.getFullYear());

    const label =
      period === "month"
        ? new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" }).format(date)
        : key;

    const existing = buckets.get(key) ?? {
      label,
      totalSppd: 0,
      totalRealisasi: 0,
      totalPelaksana: 0,
    };

    existing.totalSppd += 1;
    existing.totalRealisasi += record.totalRealisasi;
    existing.totalPelaksana += record.pelaksana.length;
    buckets.set(key, existing);
  }

  const sortedEntries = Array.from(buckets.entries()).sort(([left], [right]) =>
    left.localeCompare(right, "id"),
  );
  const points = sortedEntries.map(([, value]) => value);
  return period === "month" ? points.slice(-12) : points;
}

export function getJenisPerjalananLabel(value: JenisPerjalanan) {
  return value === "Dalam_Kota" ? "Dalam Kota" : "Luar Kota";
}

export function getStatusHotelLabel(value: StatusHotel) {
  if (value === "Menggunakan_Hotel") {
    return "Menggunakan Hotel";
  }

  if (value === "Tanpa_Hotel_30_Persen") {
    return "Tanpa Hotel 30%";
  }

  return "Dalam Kota Tanpa Hotel";
}

export function getStatusRampungLabel(value: StatusRampung) {
  if (value === "Kurang_Bayar") {
    return "Kurang Bayar";
  }

  if (value === "Lebih_Bayar") {
    return "Lebih Bayar";
  }

  return "Pas";
}

export function getLpjCompletionClass(value: LaporanRecord["lpjCompletion"]) {
  if (value === "Lengkap") {
    return "status-badge status-success";
  }

  if (value === "Belum_Ada") {
    return "status-badge status-draft";
  }

  return "status-badge status-progress";
}

export function getLpjCompletionLabel(value: LaporanRecord["lpjCompletion"]) {
  if (value === "Lengkap") {
    return "Lengkap";
  }

  if (value === "Belum_Ada") {
    return "Belum Ada LPJ";
  }

  return "Perlu Perbaikan";
}

export function getStatusBadgeClass(status: StatusSppd) {
  if (status === "Selesai") {
    return "status-badge status-success";
  }

  if (status === "Draft") {
    return "status-badge status-draft";
  }

  return "status-badge status-progress";
}

export function getLaporanFilters(
  params: Record<string, SearchParamValue> | URLSearchParams,
): LaporanFilters {
  const pageSizeValue = clampPositiveInteger(getParamValue(params, "pageSize"), 10);

  return {
    q: getParamValue(params, "q"),
    nomorSt: getParamValue(params, "nomorSt"),
    tujuan: getParamValue(params, "tujuan"),
    lokasiAsal: getParamValue(params, "lokasiAsal"),
    provinsiTujuan: getParamValue(params, "provinsiTujuan"),
    kotaTujuan: getParamValue(params, "kotaTujuan"),
    kecamatanTujuan: getParamValue(params, "kecamatanTujuan"),
    status: getParamValue(params, "status"),
    jenis: getParamValue(params, "jenis"),
    bulan: getParamValue(params, "bulan"),
    tahun: getParamValue(params, "tahun"),
    tanggalStMulai: getParamValue(params, "tanggalStMulai"),
    tanggalStSelesai: getParamValue(params, "tanggalStSelesai"),
    tanggalBerangkatMulai: getParamValue(params, "tanggalBerangkatMulai"),
    tanggalBerangkatSelesai: getParamValue(params, "tanggalBerangkatSelesai"),
    pegawai: getParamValue(params, "pegawai"),
    jenisPegawai: getParamValue(params, "jenisPegawai"),
    jabatan: getParamValue(params, "jabatan"),
    statusHotel: getParamValue(params, "statusHotel"),
    statusRampung: getParamValue(params, "statusRampung"),
    lpjCompletion: getParamValue(params, "lpjCompletion"),
    dokumenSuratTugas: getParamValue(params, "dokumenSuratTugas"),
    dokumenVisum: getParamValue(params, "dokumenVisum"),
    finalisasiLpj: getParamValue(params, "finalisasiLpj"),
    dokumentasi: getParamValue(params, "dokumentasi"),
    nominalMin: getParamValue(params, "nominalMin"),
    nominalMax: getParamValue(params, "nominalMax"),
    minPelaksana: getParamValue(params, "minPelaksana"),
    maxPelaksana: getParamValue(params, "maxPelaksana"),
    sort: getParamValue(params, "sort") || "tanggal_terbaru",
    page: clampPositiveInteger(getParamValue(params, "page"), 1),
    pageSize: PAGE_SIZE_OPTIONS.includes(pageSizeValue as (typeof PAGE_SIZE_OPTIONS)[number])
      ? pageSizeValue
      : 10,
  };
}

export function toQueryString(
  filters: LaporanFilters,
  overrides: Partial<Record<keyof LaporanFilters, string | number | null | undefined>> = {},
) {
  const params = new URLSearchParams();
  const mergedEntries = {
    ...filters,
    ...overrides,
  } as Record<string, string | number | null | undefined>;

  for (const [key, value] of Object.entries(mergedEntries)) {
    if (value === null || value === undefined) {
      continue;
    }

    const stringValue = String(value).trim();
    if (!stringValue) {
      continue;
    }

    params.set(key, stringValue);
  }

  return params.toString();
}

export async function getLaporanData(
  params: Record<string, SearchParamValue> | URLSearchParams,
): Promise<LaporanData> {
  const filters = getLaporanFilters(params);

  await connectMongoDB();

  const [daftarSppd, daftarKeuangan, daftarPegawai] = await Promise.all([
    SppdModel.find().sort({ tanggal_mulai: -1, createdAt: -1 }).lean<ISppd[]>(),
    KeuanganSppdModel.find().lean<IKeuanganSppd[]>(),
    PegawaiModel.find().sort({ nama: 1 }).lean<IPegawai[]>(),
  ]);

  const pegawaiById = new Map(daftarPegawai.map((item) => [String(item._id), item]));
  const keuanganBySppd = daftarKeuangan.reduce<Map<string, IKeuanganSppd[]>>((map, item) => {
    const key = String(item.sppd_id);
    const existing = map.get(key) ?? [];
    existing.push(item);
    map.set(key, existing);
    return map;
  }, new Map());

  const options: LaporanOptionSet = {
    tahunOptions: Array.from(
      new Set(
        daftarSppd.flatMap((item) => {
          const tanggalSt = new Date(item.tanggal_st).getFullYear();
          const tanggalMulai = new Date(item.tanggal_mulai).getFullYear();
          return [tanggalSt, tanggalMulai].filter((year) => Number.isFinite(year));
        }),
      ),
    ).sort((a, b) => b - a),
    lokasiAsalOptions: uniqSorted(daftarSppd.map((item) => item.lokasi_asal)),
    provinsiTujuanOptions: uniqSorted(
      daftarSppd.map((item) => item.lokasi_tujuan_provinsi_nama),
    ),
    kotaTujuanOptions: uniqSorted(daftarSppd.map((item) => item.lokasi_tujuan_kota_nama)),
    kecamatanTujuanOptions: uniqSorted(
      daftarSppd.flatMap((item) => {
        const valueList = item.lokasi_tujuan_kecamatan_nama_list ?? [];
        return valueList.length > 0 ? valueList : [item.lokasi_tujuan_kecamatan_nama ?? ""];
      }),
    ),
    jabatanOptions: uniqSorted(daftarPegawai.map((item) => item.jabatan)),
  };

  const records: LaporanRecord[] = daftarSppd.map((sppd) => {
    const pelaksanaIds = sppd.pelaksana.map((item) => String(item));
    const pelaksana = pelaksanaIds
      .map((item) => pegawaiById.get(item))
      .filter((item): item is IPegawai => Boolean(item));
    const keuangan = keuanganBySppd.get(String(sppd._id)) ?? [];

    return {
      sppd,
      pelaksana,
      pelaksanaIds,
      keuangan,
      totalEstimasi: keuangan.reduce((sum, item) => sum + item.estimasi_awal.total, 0),
      totalRealisasi: keuangan.reduce((sum, item) => sum + item.realisasi_akhir.total, 0),
      totalUangMuka: keuangan.reduce((sum, item) => sum + item.uang_muka_dp, 0),
      totalSelisihRampung: keuangan.reduce(
        (sum, item) => sum + item.nominal_selisih_rampung,
        0,
      ),
      hasSuratTugasFinal: Boolean(sppd.dokumen_final?.surat_tugas),
      hasVisumFinal: Boolean(sppd.dokumen_final?.visum),
      hasLpjFinal: Boolean(sppd.finalisasi_lpj?.finalized_at),
      hasDocumentation: keuangan.some(
        (item) => normalizeBerkasLpj(item.berkas_lpj).dokumentasi.length > 0,
      ),
      hasFinanceData: keuangan.length > 0,
      jumlahBerkas: keuangan.reduce((sum, item) => sum + countUploadedFiles(item.berkas_lpj), 0),
      statusHotelList: Array.from(new Set(keuangan.map((item) => item.status_hotel))),
      statusRampungList: Array.from(new Set(keuangan.map((item) => item.status_rampung))),
      lpjCompletion: getLpjCompletion(keuangan),
    };
  });

  const nominalMin = parseNumberInput(filters.nominalMin);
  const nominalMax = parseNumberInput(filters.nominalMax);
  const minPelaksana = parseNumberInput(filters.minPelaksana);
  const maxPelaksana = parseNumberInput(filters.maxPelaksana);

  const filteredRecords = records
    .filter((record) => {
      const searchableText = [
        record.sppd.nomor_st,
        record.sppd.maksud_perjalanan,
        record.sppd.lokasi_tujuan,
        record.sppd.lokasi_tujuan_provinsi_nama,
        record.sppd.lokasi_tujuan_kota_nama,
        record.sppd.lokasi_tujuan_kecamatan_nama ?? "",
        ...(record.sppd.lokasi_tujuan_kecamatan_nama_list ?? []),
        ...record.pelaksana.flatMap((pegawai) => {
          const jp = pegawai.jenis_pegawai === "ASN" ? "PNS" : (pegawai.jenis_pegawai === "PPNPN" ? "Komisioner" : pegawai.jenis_pegawai);
          return [
            pegawai.nama,
            pegawai.nip_nik ?? "",
            pegawai.jabatan,
            jp,
          ];
        }),
      ]
        .join(" ")
        .trim();

      const matchMonth =
        !filters.bulan ||
        new Date(record.sppd.tanggal_mulai).getMonth() + 1 === Number(filters.bulan);
      const matchYear =
        !filters.tahun ||
        new Date(record.sppd.tanggal_mulai).getFullYear() === Number(filters.tahun) ||
        new Date(record.sppd.tanggal_st).getFullYear() === Number(filters.tahun);
      const matchJenisPegawai =
        !filters.jenisPegawai ||
        record.pelaksana.some((pegawai) => {
          const jp = pegawai.jenis_pegawai === "ASN" ? "PNS" : (pegawai.jenis_pegawai === "PPNPN" ? "Komisioner" : pegawai.jenis_pegawai);
          return jp === filters.jenisPegawai;
        });
      const matchJabatan =
        !filters.jabatan || record.pelaksana.some((pegawai) => pegawai.jabatan === filters.jabatan);
      const matchStatusHotel =
        !filters.statusHotel || record.statusHotelList.includes(filters.statusHotel as StatusHotel);
      const matchStatusRampung =
        !filters.statusRampung ||
        record.statusRampungList.includes(filters.statusRampung as StatusRampung);
      const matchDokumenSuratTugas =
        !filters.dokumenSuratTugas ||
        (filters.dokumenSuratTugas === "ada" && record.hasSuratTugasFinal) ||
        (filters.dokumenSuratTugas === "belum" && !record.hasSuratTugasFinal);
      const matchDokumenVisum =
        !filters.dokumenVisum ||
        (filters.dokumenVisum === "ada" && record.hasVisumFinal) ||
        (filters.dokumenVisum === "belum" && !record.hasVisumFinal);
      const matchFinalisasiLpj =
        !filters.finalisasiLpj ||
        (filters.finalisasiLpj === "ada" && record.hasLpjFinal) ||
        (filters.finalisasiLpj === "belum" && !record.hasLpjFinal);
      const matchDokumentasi =
        !filters.dokumentasi ||
        (filters.dokumentasi === "ada" && record.hasDocumentation) ||
        (filters.dokumentasi === "belum" && !record.hasDocumentation);
      const matchLpjCompletion =
        !filters.lpjCompletion ||
        (filters.lpjCompletion === "lengkap" && record.lpjCompletion === "Lengkap") ||
        (filters.lpjCompletion === "perlu_perbaikan" &&
          record.lpjCompletion === "Perlu_Perbaikan") ||
        (filters.lpjCompletion === "belum_ada" && record.lpjCompletion === "Belum_Ada");

      if (!includesText(searchableText, filters.q)) return false;
      if (!includesText(record.sppd.nomor_st, filters.nomorSt)) return false;
      if (!includesText(record.sppd.lokasi_tujuan, filters.tujuan)) return false;
      if (!includesText(record.sppd.lokasi_asal, filters.lokasiAsal)) return false;
      if (!includesText(record.sppd.lokasi_tujuan_provinsi_nama, filters.provinsiTujuan)) return false;
      if (!includesText(record.sppd.lokasi_tujuan_kota_nama, filters.kotaTujuan)) return false;

      const kecamatanTarget = [
        record.sppd.lokasi_tujuan_kecamatan_nama ?? "",
        ...(record.sppd.lokasi_tujuan_kecamatan_nama_list ?? []),
      ].join(" ");
      if (!includesText(kecamatanTarget, filters.kecamatanTujuan)) return false;
      if (
        !includesText(
          record.pelaksana.map((item) => `${item.nama} ${item.nip_nik}`).join(" "),
          filters.pegawai,
        )
      ) {
        return false;
      }
      if (filters.status && record.sppd.status !== filters.status) return false;
      if (filters.jenis && record.sppd.jenis_perjalanan !== filters.jenis) return false;
      if (!matchMonth || !matchYear || !matchJenisPegawai || !matchJabatan) return false;
      if (!matchStatusHotel || !matchStatusRampung) return false;
      if (!matchDokumenSuratTugas || !matchDokumenVisum) return false;
      if (!matchFinalisasiLpj || !matchDokumentasi || !matchLpjCompletion) return false;
      if (
        !isWithinDateRange(
          record.sppd.tanggal_st,
          filters.tanggalStMulai,
          filters.tanggalStSelesai,
        )
      ) {
        return false;
      }
      if (
        !isWithinDateRange(
          record.sppd.tanggal_mulai,
          filters.tanggalBerangkatMulai,
          filters.tanggalBerangkatSelesai,
        )
      ) {
        return false;
      }
      if (nominalMin !== null && record.totalRealisasi < nominalMin) return false;
      if (nominalMax !== null && record.totalRealisasi > nominalMax) return false;
      if (minPelaksana !== null && record.pelaksana.length < minPelaksana) return false;
      if (maxPelaksana !== null && record.pelaksana.length > maxPelaksana) return false;

      return true;
    })
    .sort((left, right) => {
      if (filters.sort === "tanggal_terlama") {
        return (
          new Date(left.sppd.tanggal_mulai).getTime() - new Date(right.sppd.tanggal_mulai).getTime()
        );
      }

      if (filters.sort === "biaya_tertinggi") {
        return right.totalRealisasi - left.totalRealisasi;
      }

      if (filters.sort === "biaya_terendah") {
        return left.totalRealisasi - right.totalRealisasi;
      }

      if (filters.sort === "pelaksana_terbanyak") {
        return right.pelaksana.length - left.pelaksana.length;
      }

      return (
        new Date(right.sppd.tanggal_mulai).getTime() - new Date(left.sppd.tanggal_mulai).getTime()
      );
    });

  const summary: LaporanSummary = {
    totalRecords: filteredRecords.length,
    totalSelesai: filteredRecords.filter((item) => item.sppd.status === "Selesai").length,
    totalBelumSelesai: filteredRecords.filter((item) => item.sppd.status !== "Selesai").length,
    totalPelaksanaTerlibat: new Set(filteredRecords.flatMap((record) => record.pelaksanaIds)).size,
    totalEstimasi: filteredRecords.reduce((sum, item) => sum + item.totalEstimasi, 0),
    totalRealisasi: filteredRecords.reduce((sum, item) => sum + item.totalRealisasi, 0),
    totalUangMuka: filteredRecords.reduce((sum, item) => sum + item.totalUangMuka, 0),
    totalSelisihRampung: filteredRecords.reduce(
      (sum, item) => sum + item.totalSelisihRampung,
      0,
    ),
    totalBerkas: filteredRecords.reduce((sum, item) => sum + item.jumlahBerkas, 0),
    totalLengkap: filteredRecords.filter((item) => item.lpjCompletion === "Lengkap").length,
    totalDokumenFinal: filteredRecords.filter(
      (item) => item.hasSuratTugasFinal && item.hasVisumFinal,
    ).length,
  };

  const statusSummary: SummaryBucket[] = STATUS_OPTIONS.map((item) => ({
    ...item,
    count: filteredRecords.filter((record) => record.sppd.status === item.value).length,
  }));

  const jenisPegawaiSummary: SummaryBucket[] = JENIS_PEGAWAI_OPTIONS.map((item) => ({
    ...item,
    count: new Set(
      filteredRecords.flatMap((record) =>
        record.pelaksana
          .filter((pegawai) => {
            const jp = pegawai.jenis_pegawai === "ASN" ? "PNS" : (pegawai.jenis_pegawai === "PPNPN" ? "Komisioner" : pegawai.jenis_pegawai);
            return jp === item.value;
          })
          .map((pegawai) => String(pegawai._id)),
      ),
    ).size,
  }));

  const hotelSummary: SummaryBucket[] = STATUS_HOTEL_OPTIONS.map((item) => ({
    ...item,
    count: filteredRecords.reduce((sum, record) => {
      const matchCount = record.keuangan.filter((keuangan) => keuangan.status_hotel === item.value).length;
      return sum + matchCount;
    }, 0),
  }));

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / filters.pageSize));
  const page = Math.min(filters.page, totalPages);
  const startIndex = (page - 1) * filters.pageSize;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + filters.pageSize);
  const pagination: LaporanPagination = {
    page,
    pageSize: filters.pageSize,
    totalItems: filteredRecords.length,
    totalPages,
    startItem: filteredRecords.length === 0 ? 0 : startIndex + 1,
    endItem: Math.min(startIndex + filters.pageSize, filteredRecords.length),
  };

  return {
    filters: { ...filters, page },
    records: filteredRecords,
    paginatedRecords,
    summary,
    options,
    statusSummary,
    jenisPegawaiSummary,
    hotelSummary,
    monthlyChart: groupByPeriod(filteredRecords, "month"),
    yearlyChart: groupByPeriod(filteredRecords, "year"),
    pagination,
  };
}
