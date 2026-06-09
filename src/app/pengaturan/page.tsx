import {
  createUserAccountAction,
  deleteUserAccountAction,
  simpanPengaturanGlobalAction,
  updateUserAccountAction,
} from "@/actions/master.actions";
import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/db/mongoose";
import { FormActionButton } from "@/components/forms/FormActionButton";
import { gabungkanPengaturanGlobal } from "@/lib/settings/global";
import { AdminUserModel, PengaturanGlobalModel, type IAdminUser, type IPengaturanGlobal } from "@/models";

interface PageProps {
  searchParams?: Promise<{
    status?: string;
    message?: string;
  }>;
}

async function getPengaturanGlobal() {
  await connectMongoDB();

  const pengaturan = await PengaturanGlobalModel.findOne({ key: "global" }).lean<
    IPengaturanGlobal | null
  >();

  return gabungkanPengaturanGlobal(pengaturan);
}

async function getDaftarPengguna() {
  await connectMongoDB();
  return AdminUserModel.find()
    .sort({ createdAt: -1 })
    .select("nama username role is_active createdAt")
    .lean<IAdminUser[]>();
}

export default async function PengaturanPage({ searchParams }: PageProps) {
  const session = await requireRole(["Admin"]);
  const flashParams = searchParams ? await searchParams : undefined;
  const [pengaturan, daftarPengguna] = await Promise.all([
    getPengaturanGlobal(),
    getDaftarPengguna(),
  ]);
  const flash =
    flashParams?.status && flashParams?.message
      ? {
          status: flashParams.status,
          message: flashParams.message,
        }
      : null;

  return (
    <AppShell nama={session.nama} role={session.role} currentPath="/pengaturan">
      <div className="space-y-6">
        <section>
          <p className="text-sm font-medium text-[#798195]">Pengaturan Sistem</p>
          <h1 className="mt-2 text-[30px] font-bold tracking-[-0.03em] text-[#242b38]">
            Pengaturan Global Penanda Tangan
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[#717b8d]">
            Atur nama pejabat global yang dipakai pada dokumen, yaitu Ketua, Sekretaris,
            dan Pejabat Pembuat Komitmen KPU Kota Dumai.
          </p>
        </section>

        {flash ? (
          <section
            className={`rounded-[22px] border px-5 py-4 text-sm ${
              flash.status === "success"
                ? "border-[#dbeede] bg-[#edf8ef] text-[#2b8e5c]"
                : "border-[#ffd7d3] bg-[#fff1ef] text-[#d9544d]"
            }`}
          >
            {flash.message}
          </section>
        ) : null}

        <section className="card max-w-3xl p-6">
          <form action={simpanPengaturanGlobalAction} className="space-y-5">
            <div>
              <label className="label">Ketua KPU Kota Dumai</label>
              <input
                className="input"
                name="ketua_nama"
                defaultValue={pengaturan.ketua_nama}
                placeholder="Nama Ketua"
                required
              />
            </div>

            <div>
              <label className="label">Sekretaris KPU Kota Dumai</label>
              <input
                className="input"
                name="sekretaris_nama"
                defaultValue={pengaturan.sekretaris_nama}
                placeholder="Nama Sekretaris"
                required
              />
            </div>

            <div>
              <label className="label">NIP Sekretaris KPU Kota Dumai</label>
              <input
                className="input"
                name="sekretaris_nip"
                defaultValue={pengaturan.sekretaris_nip}
                placeholder="NIP Sekretaris"
                required
              />
            </div>

            <div>
              <label className="label">Pejabat Pembuat Komitmen KPU Kota Dumai</label>
              <input
                className="input"
                name="ppk_nama"
                defaultValue={pengaturan.ppk_nama}
                placeholder="Nama PPK"
                required
              />
            </div>

            <div>
              <label className="label">NIP Pejabat Pembuat Komitmen KPU Kota Dumai</label>
              <input
                className="input"
                name="ppk_nip"
                defaultValue={pengaturan.ppk_nip}
                placeholder="NIP PPK"
                required
              />
            </div>

            <div className="flex justify-end">
              <FormActionButton
                className="btn-primary"
                label="Simpan Pengaturan Global"
                pendingLabel="Menyimpan..."
              />
            </div>
          </form>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <section className="card p-6">
            <h2 className="text-xl font-bold text-[#242b38]">Daftar Admin & Operator</h2>
            <p className="mt-2 text-sm text-[#717b8d]">
              Admin dapat membuat, mengubah, menonaktifkan, dan menghapus akun pengguna.
            </p>

            <div className="mt-5 space-y-4">
              {daftarPengguna.map((user) => (
                <article
                  key={String(user._id)}
                  className="rounded-[20px] border border-[#e8ebf1] bg-[#fbfbfd] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-[#252c38]">{user.nama}</p>
                      <p className="mt-1 text-sm text-[#7d8598]">@{user.username}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-white px-3 py-1 text-[#5f687a]">
                        {user.role}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 ${
                          user.is_active
                            ? "bg-[#edf8ef] text-[#2b8e5c]"
                            : "bg-[#f7f8fc] text-[#7d8598]"
                        }`}
                      >
                        {user.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                  </div>

                  <form action={updateUserAccountAction} className="mt-4 grid gap-4 md:grid-cols-2">
                    <input type="hidden" name="id" value={String(user._id)} />
                    <div>
                      <label className="label">Nama</label>
                      <input className="input" name="nama" defaultValue={user.nama} required />
                    </div>
                    <div>
                      <label className="label">Username</label>
                      <input className="input" name="username" defaultValue={user.username} required />
                    </div>
                    <div>
                      <label className="label">Role</label>
                      <select className="input" name="role" defaultValue={user.role}>
                        <option value="Admin">Admin</option>
                        <option value="Operator">Operator</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Status</label>
                      <select className="input" name="is_active" defaultValue={user.is_active ? "true" : "false"}>
                        <option value="true">Aktif</option>
                        <option value="false">Nonaktif</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="label">Password Baru</label>
                      <input
                        className="input"
                        type="password"
                        name="password"
                        placeholder="Kosongkan jika password tidak diubah"
                      />
                    </div>
                    <div className="md:col-span-2 flex flex-wrap justify-end gap-3">
                      <FormActionButton
                        className="btn-secondary"
                        label="Simpan Perubahan"
                        pendingLabel="Menyimpan..."
                      />
                    </div>
                  </form>

                  <form action={deleteUserAccountAction} className="mt-3 flex justify-end">
                    <input type="hidden" name="id" value={String(user._id)} />
                    <FormActionButton
                      className="text-sm font-semibold text-[#d9544d]"
                      label="Hapus Akun"
                      pendingLabel="Menghapus..."
                    />
                  </form>
                </article>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-bold text-[#242b38]">Tambah Pengguna</h2>
            <form action={createUserAccountAction} className="mt-5 space-y-4">
              <div>
                <label className="label">Nama Pengguna</label>
                <input className="input" name="nama" placeholder="Nama lengkap pengguna" required />
              </div>
              <div>
                <label className="label">Username</label>
                <input className="input" name="username" placeholder="username login" required />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" name="role" defaultValue="Operator">
                  <option value="Operator">Operator</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="label">Status Awal</label>
                <select className="input" name="is_active" defaultValue="true">
                  <option value="true">Aktif</option>
                  <option value="false">Nonaktif</option>
                </select>
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  name="password"
                  placeholder="Password operator"
                  required
                />
              </div>
              <FormActionButton
                className="btn-primary w-full"
                label="Tambah Pengguna"
                pendingLabel="Menambahkan..."
              />
            </form>
          </section>
        </section>
      </div>
    </AppShell>
  );
}
