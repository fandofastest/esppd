import { createMataAnggaranAction, deleteMataAnggaranAction } from "@/actions/master.actions";
import { FormActionButton } from "@/components/forms/FormActionButton";
import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/db/mongoose";
import { MataAnggaranModel, type IMataAnggaran } from "@/models";

async function getMataAnggaran() {
  await connectMongoDB();
  return MataAnggaranModel.find().sort({ kode: 1 }).lean<IMataAnggaran[]>();
}

export default async function MasterMataAnggaranPage() {
  const session = await requireRole(["Admin"]);
  const daftarMataAnggaran = await getMataAnggaran();

  return (
    <AppShell nama={session.nama} role={session.role} currentPath="/master/mata-anggaran">
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="card p-6">
          <h2 className="text-xl font-bold text-slate-900">Tambah Mata Anggaran</h2>
          <p className="mt-1 text-sm text-slate-500">
            Data ini digunakan untuk pembebanan anggaran pada pembuatan SPPD.
          </p>

          <form action={createMataAnggaranAction} className="mt-6 space-y-4">
            <div>
              <label className="label">Kode Mata Anggaran</label>
              <input className="input" name="kode" placeholder="contoh: 524111" required />
            </div>
            <div>
              <label className="label">Deskripsi</label>
              <textarea
                className="input min-h-[100px] resize-none"
                name="deskripsi"
                placeholder="contoh: Belanja Perjalanan Dinas Biasa"
                required
              />
            </div>
            <FormActionButton
              className="btn-primary w-full"
              label="Simpan Mata Anggaran"
              pendingLabel="Menyimpan..."
            />
          </form>
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900">Daftar Mata Anggaran</h2>
            <p className="mt-1 text-sm text-slate-500">
              Total data: {daftarMataAnggaran.length.toLocaleString("id-ID")} mata anggaran
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-6 py-4 w-[120px]">Kode</th>
                  <th className="px-6 py-4">Deskripsi</th>
                  <th className="px-6 py-4 w-[100px]">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftarMataAnggaran.map((item) => (
                  <tr key={String(item._id)} className="border-t border-slate-100">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{item.kode}</td>
                    <td className="px-6 py-4 text-slate-600">{item.deskripsi}</td>
                    <td className="px-6 py-4">
                      <form action={deleteMataAnggaranAction}>
                        <input type="hidden" name="id" value={String(item._id)} />
                        <FormActionButton
                          className="text-sm font-semibold text-rose-600"
                          label="Hapus"
                          pendingLabel="Menghapus..."
                        />
                      </form>
                    </td>
                  </tr>
                ))}
                {daftarMataAnggaran.length === 0 ? (
                  <tr>
                    <td className="px-6 py-8 text-center text-slate-500" colSpan={3}>
                      Belum ada data mata anggaran.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
