import { deletePegawaiAction } from "@/actions/master.actions";
import { FormActionButton } from "@/components/forms/FormActionButton";
import { TambahPegawaiForm } from "@/components/forms/TambahPegawaiForm";
import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/db/mongoose";
import { PegawaiModel, type IPegawai } from "@/models";

async function getPegawai() {
  await connectMongoDB();
  return PegawaiModel.find().sort({ nama: 1 }).lean<IPegawai[]>();
}

export default async function MasterPegawaiPage() {
  const session = await requireRole(["Admin"]);
  const pegawai = await getPegawai();

  return (
    <AppShell nama={session.nama} role={session.role} currentPath="/master/pegawai">
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="card p-6">
          <h2 className="text-xl font-bold text-slate-900">Tambah Pegawai</h2>
          <p className="mt-1 text-sm text-slate-500">
            Data ini dipakai untuk penyusunan tim pelaksana dan perhitungan SBM.
          </p>

          <TambahPegawaiForm />
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900">Daftar Pegawai</h2>
            <p className="mt-1 text-sm text-slate-500">
              Total data: {pegawai.length.toLocaleString("id-ID")} pegawai
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-6 py-4">Nama</th>
                  <th className="px-6 py-4">NIP/NIK</th>
                  <th className="px-6 py-4">Jabatan</th>
                  <th className="px-6 py-4">Pangkat</th>
                  <th className="px-6 py-4">Jenis</th>
                  <th className="px-6 py-4">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pegawai.map((item) => (
                  <tr key={String(item._id)} className="border-t border-slate-100">
                    <td className="px-6 py-4 font-medium text-slate-900">{item.nama}</td>
                    <td className="px-6 py-4 text-slate-600">{item.nip_nik || "-"}</td>
                    <td className="px-6 py-4 text-slate-600">{item.jabatan}</td>
                    <td className="px-6 py-4 text-slate-600">{item.pangkat_golongan}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {item.jenis_pegawai === "ASN"
                        ? "PNS"
                        : item.jenis_pegawai === "PPNPN"
                          ? "Komisioner"
                          : item.jenis_pegawai}
                    </td>
                    <td className="px-6 py-4">
                      <form action={deletePegawaiAction}>
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
                {pegawai.length === 0 ? (
                  <tr>
                    <td className="px-6 py-8 text-center text-slate-500" colSpan={6}>
                      Belum ada data pegawai.
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
