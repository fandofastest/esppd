import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/db/mongoose";
import { formatTanggal } from "@/lib/format";
import { SppdModel, type ISppd } from "@/models";

async function getSppdList() {
  await connectMongoDB();
  return SppdModel.find().sort({ createdAt: -1 }).lean<ISppd[]>();
}

function badgeClass(status: string) {
  if (status === "Selesai") return "status-badge status-success";
  if (status === "Draft") return "status-badge status-draft";
  return "status-badge status-progress";
}

export default async function SppdListPage() {
  const session = await requireRole(["Admin", "Operator"]);
  const daftarSppd = await getSppdList();

  return (
    <AppShell nama={session.nama} role={session.role} currentPath="/sppd">
      <div className="space-y-5">
        <section>
          <p className="text-sm font-medium text-[#798195]">Data SPPD / Pengelolaan Perjalanan Dinas</p>
          <h1 className="mt-2 text-[30px] font-bold tracking-[-0.03em] text-[#242b38]">
            Daftar Perjalanan Dinas Aktif
          </h1>
        </section>

        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e6e9f0] px-6 py-5">
            <div>
              <h2 className="text-[20px] font-bold text-[#242b38]">Tabel Perjalanan Dinas</h2>
              <p className="mt-1 text-sm text-[#7a8295]">
                Kelola seluruh surat tugas dan perjalanan dinas aktif dari satu tampilan.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary text-sm" type="button">
                Saring
              </button>
              <button className="btn-secondary text-sm" type="button">
                Ekspor PDF
              </button>
              <Link className="btn-primary" href="/sppd/baru">
                + Buat SPPD
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#fbfbfd] text-left text-[12px] font-semibold uppercase tracking-wide text-[#98a0b2]">
                <tr>
                  <th className="px-6 py-4">Nomor Surat</th>
                  <th className="px-6 py-4">Tujuan</th>
                  <th className="px-6 py-4">Jenis</th>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Durasi</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftarSppd.map((item) => (
                  <tr key={String(item._id)} className="border-t border-[#eef1f6]">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-[#e2342d]">{item.nomor_st}</p>
                      <p className="mt-1 text-xs text-[#9198aa]">{item.maksud_perjalanan}</p>
                    </td>
                    <td className="px-6 py-4 text-[#586173]">{item.lokasi_tujuan}</td>
                    <td className="px-6 py-4 text-[#586173]">
                      {item.jenis_perjalanan === "Dalam_Kota" ? "Dalam Kota" : "Luar Kota"}
                    </td>
                    <td className="px-6 py-4 text-[#586173]">
                      {formatTanggal(item.tanggal_mulai)} - {formatTanggal(item.tanggal_selesai)}
                    </td>
                    <td className="px-6 py-4 text-[#586173]">{item.jumlah_hari} hari</td>
                    <td className="px-6 py-4">
                      <span className={badgeClass(item.status)}>{item.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        className="rounded-full border border-[#e2e6ef] px-4 py-2 text-sm font-semibold text-[#4f5869]"
                        href={`/sppd/${String(item._id)}`}
                      >
                        Buka
                      </Link>
                    </td>
                  </tr>
                ))}
                {daftarSppd.length === 0 ? (
                  <tr>
                    <td className="px-6 py-10 text-center text-[#8c94a7]" colSpan={7}>
                      Belum ada data SPPD.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-[#eef1f6] px-6 py-4 text-xs text-[#8b93a5]">
            <p>Menampilkan {daftarSppd.length} data</p>
            <div className="flex items-center gap-4">
              <span>1</span>
              <span>&gt;</span>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
