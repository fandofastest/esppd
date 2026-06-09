import {
  createSbmPenginapanAction,
  createSbmTransportRiauAction,
  createSbmUangHarianAction,
} from "@/actions/master.actions";
import { FormActionButton } from "@/components/forms/FormActionButton";
import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/db/mongoose";
import { formatRupiah } from "@/lib/format";
import {
  SbmPenginapanModel,
  SbmTransportRiauModel,
  SbmUangHarianModel,
  type ISbmPenginapan,
  type ISbmTransportRiau,
  type ISbmUangHarian,
} from "@/models";

async function getMasterSbm() {
  await connectMongoDB();

  const [uangHarian, penginapan, transport] = await Promise.all([
    SbmUangHarianModel.find().sort({ provinsi: 1 }).lean<ISbmUangHarian[]>(),
    SbmPenginapanModel.find().sort({ provinsi: 1 }).lean<ISbmPenginapan[]>(),
    SbmTransportRiauModel.find().sort({ asal: 1, tujuan: 1 }).lean<ISbmTransportRiau[]>(),
  ]);

  return { uangHarian, penginapan, transport };
}

function InputRupiah({ name }: { name: string }) {
  return <input className="input" type="number" min={0} name={name} required />;
}

export default async function MasterSbmPage() {
  const session = await requireRole(["Admin"]);
  const data = await getMasterSbm();

  return (
    <AppShell nama={session.nama} role={session.role} currentPath="/master/sbm">
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-3">
          <section className="card p-6">
            <h2 className="text-lg font-bold text-slate-900">SBM Uang Harian</h2>
            <form action={createSbmUangHarianAction} className="mt-5 space-y-4">
              <div>
                <label className="label">Provinsi</label>
                <input className="input" name="provinsi" required />
              </div>
              <div>
                <label className="label">Luar Kota</label>
                <InputRupiah name="luar_kota" />
              </div>
              <div>
                <label className="label">Dalam Kota &gt; 8 Jam</label>
                <InputRupiah name="dalam_kota_lebih_8jam" />
              </div>
              <div>
                <label className="label">Diklat</label>
                <InputRupiah name="diklat" />
              </div>
              <FormActionButton
                className="btn-primary w-full"
                label="Simpan Uang Harian"
                pendingLabel="Menyimpan..."
              />
            </form>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-bold text-slate-900">SBM Penginapan</h2>
            <form action={createSbmPenginapanAction} className="mt-5 space-y-4">
              <div>
                <label className="label">Provinsi</label>
                <input className="input" name="provinsi" required />
              </div>
              <div>
                <label className="label">Eselon 1</label>
                <InputRupiah name="tarif_eselon_1" />
              </div>
              <div>
                <label className="label">Eselon 2</label>
                <InputRupiah name="tarif_eselon_2" />
              </div>
              <div>
                <label className="label">Eselon 3 / Gol. IV</label>
                <InputRupiah name="tarif_eselon_3_gol_iv" />
              </div>
              <div>
                <label className="label">Eselon 4 / Gol. III-II-I</label>
                <InputRupiah name="tarif_eselon_4_gol_iii_ii_i" />
              </div>
              <FormActionButton
                className="btn-primary w-full"
                label="Simpan Penginapan"
                pendingLabel="Menyimpan..."
              />
            </form>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-bold text-slate-900">SBM Transport Riau</h2>
            <form action={createSbmTransportRiauAction} className="mt-5 space-y-4">
              <div>
                <label className="label">Asal</label>
                <input className="input" name="asal" defaultValue="Dumai" required />
              </div>
              <div>
                <label className="label">Tujuan</label>
                <input className="input" name="tujuan" required />
              </div>
              <div>
                <label className="label">Tarif</label>
                <InputRupiah name="tarif" />
              </div>
              <FormActionButton
                className="btn-primary w-full"
                label="Simpan Transport"
                pendingLabel="Menyimpan..."
              />
            </form>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="card overflow-hidden">
            <div className="border-b border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900">Data Uang Harian</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {data.uangHarian.map((item) => (
                <div key={String(item._id)} className="p-4 text-sm">
                  <p className="font-semibold text-slate-900">{item.provinsi}</p>
                  <p className="mt-2 text-slate-600">Luar kota: {formatRupiah(item.luar_kota)}</p>
                  <p className="text-slate-600">
                    Dalam kota &gt; 8 jam: {formatRupiah(item.dalam_kota_lebih_8jam)}
                  </p>
                  <p className="text-slate-600">Diklat: {formatRupiah(item.diklat)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="border-b border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900">Data Penginapan</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {data.penginapan.map((item) => (
                <div key={String(item._id)} className="p-4 text-sm">
                  <p className="font-semibold text-slate-900">{item.provinsi}</p>
                  <p className="mt-2 text-slate-600">Eselon 1: {formatRupiah(item.tarif_eselon_1)}</p>
                  <p className="text-slate-600">Eselon 2: {formatRupiah(item.tarif_eselon_2)}</p>
                  <p className="text-slate-600">
                    Eselon 3 / Gol IV: {formatRupiah(item.tarif_eselon_3_gol_iv)}
                  </p>
                  <p className="text-slate-600">
                    Eselon 4 / Gol III-II-I: {formatRupiah(item.tarif_eselon_4_gol_iii_ii_i)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="border-b border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900">Data Transport Riau</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {data.transport.map((item) => (
                <div key={String(item._id)} className="p-4 text-sm">
                  <p className="font-semibold text-slate-900">
                    {item.asal} - {item.tujuan}
                  </p>
                  <p className="mt-2 text-slate-600">Tarif: {formatRupiah(item.tarif)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
