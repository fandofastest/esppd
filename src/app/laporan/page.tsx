import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth/session";
import { formatRupiah, formatTanggal } from "@/lib/format";
import {
  getJenisPerjalananLabel,
  getLaporanData,
  getLpjCompletionClass,
  getLpjCompletionLabel,
  getStatusBadgeClass,
  getStatusHotelLabel,
  getStatusRampungLabel,
  JENIS_PEGAWAI_OPTIONS,
  JENIS_PERJALANAN_OPTIONS,
  MONTH_OPTIONS,
  PAGE_SIZE_OPTIONS,
  STATUS_HOTEL_OPTIONS,
  STATUS_OPTIONS,
  STATUS_RAMPUNG_OPTIONS,
  toQueryString,
  type LaporanChartPoint,
  type SearchParamValue,
} from "@/lib/reports/laporan";

interface LaporanPageProps {
  searchParams?: Promise<Record<string, SearchParamValue>>;
}

const ADVANCED_FILTER_KEYS = [
  "nomorSt",
  "tujuan",
  "pegawai",
  "status",
  "jenis",
  "bulan",
  "tahun",
  "lokasiAsal",
  "provinsiTujuan",
  "kotaTujuan",
  "kecamatanTujuan",
  "tanggalStMulai",
  "tanggalStSelesai",
  "jenisPegawai",
  "jabatan",
  "statusHotel",
  "statusRampung",
  "lpjCompletion",
  "dokumenSuratTugas",
  "dokumenVisum",
  "finalisasiLpj",
  "dokumentasi",
  "nominalMin",
  "nominalMax",
  "minPelaksana",
  "maxPelaksana",
  "sort",
  "pageSize",
] as const;

function buildPaginationItems(currentPage: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);
}

function hasAdvancedFiltersActive(
  filters: Record<(typeof ADVANCED_FILTER_KEYS)[number] | "tanggalBerangkatMulai" | "tanggalBerangkatSelesai", string | number>,
) {
  return ADVANCED_FILTER_KEYS.some((key) => String(filters[key] ?? "").trim() !== "");
}

function MiniChart({
  title,
  description,
  points,
}: {
  title: string;
  description: string;
  points: LaporanChartPoint[];
}) {
  const maxSppd = Math.max(...points.map((point) => point.totalSppd), 1);

  return (
    <article className="card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#222938]">{title}</h2>
          <p className="mt-1 text-sm text-[#6f778a]">{description}</p>
        </div>
        <p className="rounded-full bg-[#f5f6fb] px-3 py-1 text-xs font-semibold text-[#6f778a]">
          {points.length.toLocaleString("id-ID")} periode
        </p>
      </div>

      {points.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[#d8dde8] bg-[#fafbfe] p-5 text-sm text-[#7f8798]">
          Belum ada data untuk divisualisasikan pada filter ini.
        </div>
      ) : (
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {points.map((point) => {
            const heightPercent = Math.max(14, Math.round((point.totalSppd / maxSppd) * 100));

            return (
              <div key={point.label} className="rounded-2xl border border-[#e8ebf2] bg-[#fafbfe] p-4">
                <div className="flex items-end gap-4">
                  <div className="flex h-28 w-10 items-end rounded-2xl bg-[#eef1f7] p-1">
                    <div
                      className="w-full rounded-xl bg-[#e2342d]"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#2e3646]">{point.label}</p>
                    <p className="mt-2 text-2xl font-bold text-[#222938]">
                      {point.totalSppd.toLocaleString("id-ID")}
                    </p>
                    <p className="text-xs text-[#7f8798]">
                      Pelaksana: {point.totalPelaksana.toLocaleString("id-ID")}
                    </p>
                    <p className="mt-1 text-xs text-[#7f8798]">
                      Realisasi: {formatRupiah(point.totalRealisasi)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}

export default async function LaporanPage({ searchParams }: LaporanPageProps) {
  const session = await requireRole(["Admin", "Operator"]);
  const params = (await searchParams) ?? {};
  const {
    filters,
    paginatedRecords,
    summary,
    options,
    statusSummary,
    jenisPegawaiSummary,
    hotelSummary,
    monthlyChart,
    yearlyChart,
    pagination,
  } = await getLaporanData(params);
  const paginationItems = buildPaginationItems(pagination.page, pagination.totalPages);
  const advancedFiltersOpen = hasAdvancedFiltersActive({
    nomorSt: filters.nomorSt,
    tujuan: filters.tujuan,
    pegawai: filters.pegawai,
    status: filters.status,
    jenis: filters.jenis,
    bulan: filters.bulan,
    tahun: filters.tahun,
    lokasiAsal: filters.lokasiAsal,
    provinsiTujuan: filters.provinsiTujuan,
    kotaTujuan: filters.kotaTujuan,
    kecamatanTujuan: filters.kecamatanTujuan,
    tanggalStMulai: filters.tanggalStMulai,
    tanggalStSelesai: filters.tanggalStSelesai,
    tanggalBerangkatMulai: filters.tanggalBerangkatMulai,
    tanggalBerangkatSelesai: filters.tanggalBerangkatSelesai,
    jenisPegawai: filters.jenisPegawai,
    jabatan: filters.jabatan,
    statusHotel: filters.statusHotel,
    statusRampung: filters.statusRampung,
    lpjCompletion: filters.lpjCompletion,
    dokumenSuratTugas: filters.dokumenSuratTugas,
    dokumenVisum: filters.dokumenVisum,
    finalisasiLpj: filters.finalisasiLpj,
    dokumentasi: filters.dokumentasi,
    nominalMin: filters.nominalMin,
    nominalMax: filters.nominalMax,
    minPelaksana: filters.minPelaksana,
    maxPelaksana: filters.maxPelaksana,
    sort: filters.sort === "tanggal_terbaru" ? "" : filters.sort,
    pageSize: filters.pageSize === 10 ? "" : String(filters.pageSize),
  });

  return (
    <AppShell nama={session.nama} role={session.role} currentPath="/laporan">
      <div className="space-y-6">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#798195]">Laporan / Analitik Menyeluruh</p>
            <h1 className="mt-2 text-[30px] font-bold tracking-[-0.03em] text-[#242b38]">
              Laporan Perjalanan, Pelaksana, Keuangan, dan Dokumen
            </h1>
            <p className="mt-2 max-w-4xl text-sm text-[#6f778a]">
              Satu menu laporan untuk memantau seluruh aspek SPPD dengan filter rinci berdasarkan
              perjalanan, pegawai, anggaran, kelengkapan LPJ, dan dokumen final.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link className="btn-secondary text-sm" href="/sppd">
              Buka Data SPPD
            </Link>
            <Link className="btn-primary text-sm" href="/laporan">
              Reset Laporan
            </Link>
          </div>
        </section>

        <section className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#222938]">Filter Laporan</h2>
              <p className="mt-1 text-sm text-[#6f778a]">
                Kombinasikan filter sebanyak yang dibutuhkan untuk menelusuri laporan secara detail.
              </p>
            </div>
            <p className="rounded-full bg-[#fff0ef] px-4 py-2 text-sm font-semibold text-[#d44d46]">
              {summary.totalRecords.toLocaleString("id-ID")} data cocok
            </p>
          </div>

          <form className="mt-6 space-y-5" method="get">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="md:col-span-2 xl:col-span-2">
                <label className="label">Pencarian umum</label>
                <input
                  className="input"
                  name="q"
                  defaultValue={filters.q}
                  placeholder="Nomor ST, tujuan, pelaksana, maksud"
                />
              </div>
              <div>
                <label className="label">Tanggal perjalanan mulai</label>
                <input
                  className="input"
                  type="date"
                  name="tanggalBerangkatMulai"
                  defaultValue={filters.tanggalBerangkatMulai}
                />
              </div>
              <div>
                <label className="label">Tanggal perjalanan s.d.</label>
                <input
                  className="input"
                  type="date"
                  name="tanggalBerangkatSelesai"
                  defaultValue={filters.tanggalBerangkatSelesai}
                />
              </div>
            </div>

            <details
              className="rounded-2xl border border-[#e8ebf2] bg-[#fafbfe] p-4"
              open={advancedFiltersOpen}
            >
              <summary className="cursor-pointer list-none text-sm font-semibold text-[#2e3646]">
                Pencarian Tingkat Lanjut
                <span className="ml-2 text-xs font-medium text-[#7f8798]">
                  Lokasi, status, pegawai, dokumen, nominal, dan pengaturan tampilan
                </span>
              </summary>

              <div className="mt-4 space-y-4 border-t border-[#e8ebf2] pt-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="label">Nomor surat</label>
                    <input
                      className="input"
                      name="nomorSt"
                      defaultValue={filters.nomorSt}
                      placeholder="Contoh: 090/..."
                    />
                  </div>
                  <div>
                    <label className="label">Tujuan / lokasi</label>
                    <input
                      className="input"
                      name="tujuan"
                      defaultValue={filters.tujuan}
                      placeholder="Nama tujuan"
                    />
                  </div>
                  <div>
                    <label className="label">Nama / NIP pegawai</label>
                    <input
                      className="input"
                      name="pegawai"
                      defaultValue={filters.pegawai}
                      placeholder="Cari pelaksana"
                    />
                  </div>
                  <div>
                    <label className="label">Status SPPD</label>
                    <select className="input" name="status" defaultValue={filters.status}>
                      <option value="">Semua status</option>
                      {STATUS_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="label">Jenis perjalanan</label>
                    <select className="input" name="jenis" defaultValue={filters.jenis}>
                      <option value="">Semua jenis</option>
                      {JENIS_PERJALANAN_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Bulan perjalanan</label>
                    <select className="input" name="bulan" defaultValue={filters.bulan}>
                      <option value="">Semua bulan</option>
                      {MONTH_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Tahun</label>
                    <select className="input" name="tahun" defaultValue={filters.tahun}>
                      <option value="">Semua tahun</option>
                      {options.tahunOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Asal perjalanan</label>
                    <select className="input" name="lokasiAsal" defaultValue={filters.lokasiAsal}>
                      <option value="">Semua asal</option>
                      {options.lokasiAsalOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="label">Provinsi tujuan</label>
                    <select
                      className="input"
                      name="provinsiTujuan"
                      defaultValue={filters.provinsiTujuan}
                    >
                      <option value="">Semua provinsi</option>
                      {options.provinsiTujuanOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Kota / kabupaten tujuan</label>
                    <select className="input" name="kotaTujuan" defaultValue={filters.kotaTujuan}>
                      <option value="">Semua kota/kabupaten</option>
                      {options.kotaTujuanOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Kecamatan tujuan</label>
                    <select
                      className="input"
                      name="kecamatanTujuan"
                      defaultValue={filters.kecamatanTujuan}
                    >
                      <option value="">Semua kecamatan</option>
                      {options.kecamatanTujuanOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Tanggal ST mulai</label>
                    <input
                      className="input"
                      type="date"
                      name="tanggalStMulai"
                      defaultValue={filters.tanggalStMulai}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="label">Tanggal ST s.d.</label>
                    <input
                      className="input"
                      type="date"
                      name="tanggalStSelesai"
                      defaultValue={filters.tanggalStSelesai}
                    />
                  </div>
                  <div>
                    <label className="label">Jenis pegawai</label>
                    <select className="input" name="jenisPegawai" defaultValue={filters.jenisPegawai}>
                      <option value="">Semua jenis pegawai</option>
                      {JENIS_PEGAWAI_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Jabatan</label>
                    <select className="input" name="jabatan" defaultValue={filters.jabatan}>
                      <option value="">Semua jabatan</option>
                      {options.jabatanOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Status akomodasi</label>
                    <select className="input" name="statusHotel" defaultValue={filters.statusHotel}>
                      <option value="">Semua status akomodasi</option>
                      {STATUS_HOTEL_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="label">Status rampung</label>
                    <select
                      className="input"
                      name="statusRampung"
                      defaultValue={filters.statusRampung}
                    >
                      <option value="">Semua status rampung</option>
                      {STATUS_RAMPUNG_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Kelengkapan LPJ</label>
                    <select className="input" name="lpjCompletion" defaultValue={filters.lpjCompletion}>
                      <option value="">Semua kondisi LPJ</option>
                      <option value="lengkap">Lengkap</option>
                      <option value="perlu_perbaikan">Perlu Perbaikan</option>
                      <option value="belum_ada">Belum Ada LPJ</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Dokumen Surat Tugas</label>
                    <select
                      className="input"
                      name="dokumenSuratTugas"
                      defaultValue={filters.dokumenSuratTugas}
                    >
                      <option value="">Semua kondisi</option>
                      <option value="ada">Sudah ada</option>
                      <option value="belum">Belum ada</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Dokumen Visum</label>
                    <select className="input" name="dokumenVisum" defaultValue={filters.dokumenVisum}>
                      <option value="">Semua kondisi</option>
                      <option value="ada">Sudah ada</option>
                      <option value="belum">Belum ada</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="label">Finalisasi LPJ</label>
                    <select className="input" name="finalisasiLpj" defaultValue={filters.finalisasiLpj}>
                      <option value="">Semua kondisi</option>
                      <option value="ada">Sudah final</option>
                      <option value="belum">Belum final</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Dokumentasi kegiatan</label>
                    <select className="input" name="dokumentasi" defaultValue={filters.dokumentasi}>
                      <option value="">Semua kondisi</option>
                      <option value="ada">Ada dokumentasi</option>
                      <option value="belum">Belum ada dokumentasi</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Minimal realisasi</label>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      name="nominalMin"
                      defaultValue={filters.nominalMin}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="label">Maksimal realisasi</label>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      name="nominalMax"
                      defaultValue={filters.nominalMax}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="label">Minimal pelaksana</label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      name="minPelaksana"
                      defaultValue={filters.minPelaksana}
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="label">Maksimal pelaksana</label>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      name="maxPelaksana"
                      defaultValue={filters.maxPelaksana}
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <label className="label">Urutkan</label>
                    <select className="input" name="sort" defaultValue={filters.sort}>
                      <option value="tanggal_terbaru">Tanggal terbaru</option>
                      <option value="tanggal_terlama">Tanggal terlama</option>
                      <option value="biaya_tertinggi">Realisasi tertinggi</option>
                      <option value="biaya_terendah">Realisasi terendah</option>
                      <option value="pelaksana_terbanyak">Pelaksana terbanyak</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Baris per halaman</label>
                    <select className="input" name="pageSize" defaultValue={String(filters.pageSize)}>
                      {PAGE_SIZE_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item} baris
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </details>

            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" type="submit">
                Terapkan Filter
              </button>
              <Link className="btn-secondary" href="/laporan">
                Bersihkan Filter
              </Link>
            </div>
          </form>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article className="card p-5">
            <p className="text-sm font-semibold text-[#6f778a]">SPPD Terfilter</p>
            <p className="mt-3 text-[32px] font-bold text-[#222938]">
              {summary.totalRecords.toLocaleString("id-ID")}
            </p>
            <p className="mt-2 text-sm text-[#7f8798]">
              {summary.totalSelesai.toLocaleString("id-ID")} selesai,{" "}
              {summary.totalBelumSelesai.toLocaleString("id-ID")} belum selesai
            </p>
          </article>
          <article className="card p-5">
            <p className="text-sm font-semibold text-[#6f778a]">Pelaksana Terlibat</p>
            <p className="mt-3 text-[32px] font-bold text-[#222938]">
              {summary.totalPelaksanaTerlibat.toLocaleString("id-ID")}
            </p>
            <p className="mt-2 text-sm text-[#7f8798]">Unik dari seluruh data hasil filter</p>
          </article>
          <article className="card p-5">
            <p className="text-sm font-semibold text-[#6f778a]">Total Estimasi</p>
            <p className="mt-3 text-[32px] font-bold text-[#222938]">
              {formatRupiah(summary.totalEstimasi)}
            </p>
            <p className="mt-2 text-sm text-[#7f8798]">Akumulasi estimasi awal seluruh pelaksana</p>
          </article>
          <article className="card p-5">
            <p className="text-sm font-semibold text-[#6f778a]">Total Realisasi</p>
            <p className="mt-3 text-[32px] font-bold text-[#222938]">
              {formatRupiah(summary.totalRealisasi)}
            </p>
            <p className="mt-2 text-sm text-[#7f8798]">Total LPJ riil pada data yang terpilih</p>
          </article>
          <article className="card p-5">
            <p className="text-sm font-semibold text-[#6f778a]">Uang Muka & Selisih</p>
            <p className="mt-3 text-[24px] font-bold text-[#222938]">
              {formatRupiah(summary.totalUangMuka)}
            </p>
            <p className="mt-2 text-sm text-[#7f8798]">
              Selisih rampung: {formatRupiah(summary.totalSelisihRampung)}
            </p>
          </article>
          <article className="card p-5">
            <p className="text-sm font-semibold text-[#6f778a]">Kelengkapan Dokumen</p>
            <p className="mt-3 text-[24px] font-bold text-[#222938]">
              {summary.totalDokumenFinal.toLocaleString("id-ID")} final,{" "}
              {summary.totalLengkap.toLocaleString("id-ID")} LPJ lengkap
            </p>
            <p className="mt-2 text-sm text-[#7f8798]">
              {summary.totalBerkas.toLocaleString("id-ID")} file pendukung terunggah
            </p>
          </article>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="card p-6">
            <h2 className="text-xl font-bold text-[#222938]">Aspek Perjalanan</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {statusSummary.map((item) => (
                <div key={item.value} className="rounded-2xl border border-[#e8ebf2] bg-[#fafbfe] p-4">
                  <p className="text-sm font-semibold text-[#576073]">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-[#222938]">
                    {item.count.toLocaleString("id-ID")}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="card p-6">
            <h2 className="text-xl font-bold text-[#222938]">Aspek Pelaksana & Akomodasi</h2>
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {jenisPegawaiSummary.map((item) => (
                  <div key={item.value} className="rounded-2xl border border-[#e8ebf2] bg-[#fafbfe] p-4">
                    <p className="text-sm font-semibold text-[#576073]">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold text-[#222938]">
                      {item.count.toLocaleString("id-ID")}
                    </p>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {hotelSummary.map((item) => (
                  <div key={item.value} className="rounded-2xl border border-[#e8ebf2] bg-[#fafbfe] p-4">
                    <p className="text-sm font-semibold text-[#576073]">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold text-[#222938]">
                      {item.count.toLocaleString("id-ID")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <MiniChart
            title="Tren Bulanan"
            description="12 periode terakhir berdasarkan tanggal mulai perjalanan."
            points={monthlyChart}
          />
          <MiniChart
            title="Tren Tahunan"
            description="Ringkasan jumlah SPPD, pelaksana, dan realisasi per tahun."
            points={yearlyChart}
          />
        </section>

        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e6e9f0] px-6 py-5">
            <div>
              <h2 className="text-[20px] font-bold text-[#242b38]">Detail Laporan</h2>
              <p className="mt-1 text-sm text-[#7a8295]">
                Menampilkan detail SPPD lengkap beserta pelaksana, keuangan, dan status dokumen.
              </p>
            </div>
            <div className="text-right text-sm text-[#7a8295]">
              <p>
                {pagination.startItem.toLocaleString("id-ID")} -{" "}
                {pagination.endItem.toLocaleString("id-ID")} dari{" "}
                {pagination.totalItems.toLocaleString("id-ID")} baris
              </p>
              <p className="mt-1">
                Halaman {pagination.page.toLocaleString("id-ID")} /{" "}
                {pagination.totalPages.toLocaleString("id-ID")}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#fbfbfd] text-left text-[12px] font-semibold uppercase tracking-wide text-[#98a0b2]">
                <tr>
                  <th className="px-6 py-4">SPPD</th>
                  <th className="px-6 py-4">Pelaksana</th>
                  <th className="px-6 py-4">Perjalanan</th>
                  <th className="px-6 py-4">Keuangan</th>
                  <th className="px-6 py-4">Dokumen</th>
                  <th className="px-6 py-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((record) => (
                  <tr key={String(record.sppd._id)} className="border-t border-[#eef1f6] align-top">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-[#e2342d]">{record.sppd.nomor_st}</p>
                      <p className="mt-1 text-sm font-medium text-[#2e3646]">
                        {record.sppd.maksud_perjalanan}
                      </p>
                      <p className="mt-2 text-xs text-[#7f8798]">
                        ST: {formatTanggal(record.sppd.tanggal_st)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={getStatusBadgeClass(record.sppd.status)}>
                          {record.sppd.status}
                        </span>
                        <span className="status-badge status-draft">
                          {getJenisPerjalananLabel(record.sppd.jenis_perjalanan)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#586173]">
                      <p className="font-semibold text-[#2e3646]">
                        {record.pelaksana.length.toLocaleString("id-ID")} pelaksana
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#7f8798]">
                        {record.pelaksana.length > 0
                          ? record.pelaksana.map((item) => item.nama).join(", ")
                          : "Belum ada data pelaksana."}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-[#586173]">
                      <p>
                        {record.sppd.lokasi_asal} - {record.sppd.lokasi_tujuan}
                      </p>
                      <p className="mt-1 text-xs text-[#7f8798]">
                        {record.sppd.lokasi_tujuan_provinsi_nama},{" "}
                        {record.sppd.lokasi_tujuan_kota_nama}
                      </p>
                      <p className="mt-2 text-xs text-[#7f8798]">
                        {formatTanggal(record.sppd.tanggal_mulai)} -{" "}
                        {formatTanggal(record.sppd.tanggal_selesai)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-[#586173]">
                      <p>Estimasi: {formatRupiah(record.totalEstimasi)}</p>
                      <p className="mt-1">Realisasi: {formatRupiah(record.totalRealisasi)}</p>
                      <p className="mt-1 text-xs text-[#7f8798]">
                        Uang muka: {formatRupiah(record.totalUangMuka)}
                      </p>
                      <p className="mt-1 text-xs text-[#7f8798]">
                        Rampung:{" "}
                        {record.statusRampungList.length > 0
                          ? record.statusRampungList.map(getStatusRampungLabel).join(", ")
                          : "-"}
                      </p>
                      <p className="mt-1 text-xs text-[#7f8798]">
                        Akomodasi:{" "}
                        {record.statusHotelList.length > 0
                          ? record.statusHotelList.map(getStatusHotelLabel).join(", ")
                          : "-"}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-[#586173]">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={
                            record.hasSuratTugasFinal
                              ? "status-badge status-success"
                              : "status-badge status-draft"
                          }
                        >
                          ST {record.hasSuratTugasFinal ? "Final" : "Belum"}
                        </span>
                        <span
                          className={
                            record.hasVisumFinal
                              ? "status-badge status-success"
                              : "status-badge status-draft"
                          }
                        >
                          Visum {record.hasVisumFinal ? "Final" : "Belum"}
                        </span>
                        <span
                          className={
                            record.hasLpjFinal
                              ? "status-badge status-success"
                              : "status-badge status-draft"
                          }
                        >
                          LPJ {record.hasLpjFinal ? "Final" : "Belum"}
                        </span>
                        <span className={getLpjCompletionClass(record.lpjCompletion)}>
                          {getLpjCompletionLabel(record.lpjCompletion)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[#7f8798]">
                        Dokumentasi: {record.hasDocumentation ? "Ada" : "Belum ada"}
                      </p>
                      <p className="mt-1 text-xs text-[#7f8798]">
                        Total berkas: {record.jumlahBerkas.toLocaleString("id-ID")} file
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        className="rounded-full border border-[#e2e6ef] px-4 py-2 text-sm font-semibold text-[#4f5869]"
                        href={`/sppd/${String(record.sppd._id)}`}
                      >
                        Buka Detail
                      </Link>
                    </td>
                  </tr>
                ))}
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td className="px-6 py-10 text-center text-[#8c94a7]" colSpan={6}>
                      Tidak ada data yang cocok dengan kombinasi filter saat ini.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#eef1f6] px-6 py-4">
            <div className="text-sm text-[#8e96a7]">
              Menampilkan {pagination.startItem.toLocaleString("id-ID")} -{" "}
              {pagination.endItem.toLocaleString("id-ID")} dari{" "}
              {pagination.totalItems.toLocaleString("id-ID")} hasil
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  pagination.page <= 1
                    ? "pointer-events-none bg-[#f1f3f8] text-[#b1b7c4]"
                    : "border border-[#e2e6ef] text-[#4f5869]"
                }`}
                href={
                  pagination.page <= 1
                    ? "#"
                    : `/laporan?${toQueryString(filters, { page: pagination.page - 1 })}`
                }
              >
                Sebelumnya
              </Link>
              {paginationItems.map((page) => (
                <Link
                  key={page}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    page === pagination.page
                      ? "bg-[#e2342d] text-white"
                      : "border border-[#e2e6ef] text-[#4f5869]"
                  }`}
                  href={`/laporan?${toQueryString(filters, { page })}`}
                >
                  {page}
                </Link>
              ))}
              <Link
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  pagination.page >= pagination.totalPages
                    ? "pointer-events-none bg-[#f1f3f8] text-[#b1b7c4]"
                    : "border border-[#e2e6ef] text-[#4f5869]"
                }`}
                href={
                  pagination.page >= pagination.totalPages
                    ? "#"
                    : `/laporan?${toQueryString(filters, { page: pagination.page + 1 })}`
                }
              >
                Berikutnya
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
