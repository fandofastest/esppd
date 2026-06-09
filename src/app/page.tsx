import Link from "next/link";

import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { AppShell } from "@/components/layout/AppShell";
import { requireSession } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/db/mongoose";
import { formatTanggal } from "@/lib/format";
import { AdminUserModel, PegawaiModel, SppdModel, type ISppd } from "@/models";

async function ambilStatistikDashboard() {
  try {
    await connectMongoDB();

    const [totalDraft, totalBerjalan, totalLpjDiproses, totalSelesai] = await Promise.all([
      SppdModel.countDocuments({ status: "Draft" }),
      SppdModel.countDocuments({ status: "Berjalan" }),
      SppdModel.countDocuments({ status: "LPJ_Diproses" }),
      SppdModel.countDocuments({ status: "Selesai" }),
    ]);

    return {
      totalDraft,
      totalBerjalan,
      totalLpjDiproses,
      totalSelesai,
    };
  } catch {
    return {
      totalDraft: 0,
      totalBerjalan: 0,
      totalLpjDiproses: 0,
      totalSelesai: 0,
    };
  }
}

function badgeClass(status: string) {
  if (status === "Selesai") {
    return "status-badge status-success";
  }

  if (status === "Draft") {
    return "status-badge status-draft";
  }

  return "status-badge status-progress";
}

export default async function DashboardPage() {
  const session = await requireSession();
  const statistik = await ambilStatistikDashboard();
  await connectMongoDB();

  const [totalPegawai, totalAdminOperator, recentSppd] = await Promise.all([
    PegawaiModel.countDocuments(),
    AdminUserModel.countDocuments({ is_active: true }),
    SppdModel.find().sort({ createdAt: -1 }).limit(4).lean<ISppd[]>(),
  ]);

  return (
    <AppShell nama={session.nama} role={session.role} currentPath="/">
      <div className="space-y-8">
        <section>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-[38px] font-bold leading-tight tracking-[-0.03em] text-[#222938]">
                Ringkasan Operasional
              </h1>
              <p className="mt-2 text-[15px] text-[#71798c]">
                Pemantauan real-time surat tugas, perjalanan dinas, dan administrasi pendukung.
              </p>
            </div>

            <Link className="btn-primary inline-flex items-center gap-2" href="/sppd/baru">
              <span className="text-lg leading-none">+</span>
              <span>Buat SPPD</span>
            </Link>
          </div>
        </section>

        <DashboardStats {...statistik} />

        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5e8f0] px-6 py-5">
            <div>
              <h2 className="text-[32px] font-bold tracking-[-0.03em] text-[#252c38]">
                Perjalanan Dinas Aktif
              </h2>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary text-sm" type="button">
                Saring
              </button>
              <button className="btn-secondary text-sm" type="button">
                Ekspor PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#fbfbfd] text-left text-[12px] font-semibold uppercase tracking-wide text-[#98a0b2]">
                <tr>
                  <th className="px-6 py-4">Nomor Surat</th>
                  <th className="px-6 py-4">Pelaksana / Peran</th>
                  <th className="px-6 py-4">Tujuan</th>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {recentSppd.map((item) => (
                  <tr key={String(item._id)} className="border-t border-[#eef1f6]">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-[#e2342d]">{item.nomor_st}</p>
                    </td>
                    <td className="px-6 py-4 text-[#323a4a]">
                      <p className="font-semibold">Pelaksana Kolektif</p>
                      <p className="text-xs text-[#8a92a5]">{item.pelaksana.length} pegawai</p>
                    </td>
                    <td className="px-6 py-4 text-[#5d6678]">{item.lokasi_tujuan}</td>
                    <td className="px-6 py-4 text-[#5d6678]">
                      {formatTanggal(item.tanggal_mulai)} - {formatTanggal(item.tanggal_selesai)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={badgeClass(item.status)}>{item.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        className="text-sm font-semibold text-[#4c5567]"
                        href={`/sppd/${String(item._id)}`}
                      >
                        Lihat
                      </Link>
                    </td>
                  </tr>
                ))}
                {recentSppd.length === 0 ? (
                  <tr>
                    <td className="px-6 py-10 text-center text-[#8991a5]" colSpan={6}>
                      Belum ada data SPPD untuk ditampilkan.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-[#eef1f6] px-6 py-4 text-xs text-[#8e96a7]">
            <p>Menampilkan {recentSppd.length} data terbaru</p>
            <div className="flex items-center gap-3">
              <span>1</span>
              <span>&gt;</span>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="card p-6">
            <h3 className="text-[18px] font-bold text-[#222938]">Aktivitas Terbaru</h3>
            <div className="mt-5 space-y-5">
              <div className="flex gap-3">
                <span className="mt-1 h-3 w-3 rounded-full bg-[#e2342d]" />
                <div>
                  <p className="font-semibold text-[#2e3646]">SPPD Disetujui</p>
                  <p className="mt-1 text-sm text-[#737b8e]">
                    Surat tugas terakhir diverifikasi dan siap diproses pada tahap keuangan.
                  </p>
                  <p className="mt-1 text-xs text-[#a0a7b8]">10 menit yang lalu</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="mt-1 h-3 w-3 rounded-full bg-[#8b5e5e]" />
                <div>
                  <p className="font-semibold text-[#2e3646]">Draft Baru Dibuat</p>
                  <p className="mt-1 text-sm text-[#737b8e]">
                    Operator membuat draft perjalanan baru untuk kebutuhan rapat koordinasi.
                  </p>
                  <p className="mt-1 text-xs text-[#a0a7b8]">2 jam yang lalu</p>
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-[18px] bg-[#e2342d] p-6 text-white shadow-[0_18px_38px_rgba(226,52,45,0.22)]">
            <h3 className="text-[28px] font-bold tracking-[-0.03em]">Laporan Sistem</h3>
            <p className="mt-4 max-w-md text-sm leading-6 text-white/85">
              Buat ringkasan perjalanan dinas bulanan dan laporan realisasi anggaran secara cepat.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <div className="rounded-full bg-white/15 px-4 py-2 text-sm">
                Pegawai: {totalPegawai}
              </div>
              <div className="rounded-full bg-white/15 px-4 py-2 text-sm">
                User Aktif: {totalAdminOperator}
              </div>
              <div className="rounded-full bg-white/15 px-4 py-2 text-sm">
                Sesi: {session.role}
              </div>
            </div>
            <div className="mt-10">
              <Link
                className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-bold text-[#e2342d]"
                href="/laporan"
              >
                Buka Laporan
              </Link>
            </div>
          </article>
        </section>
      </div>
    </AppShell>
  );
}
