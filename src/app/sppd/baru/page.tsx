import { SppdKolektifForm } from "@/components/forms/SppdKolektifForm";
import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/db/mongoose";
import {
  MataAnggaranModel,
  PegawaiModel,
  WilayahKecamatanModel,
  WilayahKelurahanModel,
  WilayahKotaKabupatenModel,
  WilayahProvinsiModel,
  type IMataAnggaran,
  type IPegawai,
  type IWilayahKecamatan,
  type IWilayahKelurahan,
  type IWilayahKotaKabupaten,
  type IWilayahProvinsi,
} from "@/models";

async function ambilPegawai() {
  try {
    await connectMongoDB();
    const pegawai = await PegawaiModel.find().sort({ nama: 1 }).lean<IPegawai[]>();

    return pegawai.map((item) => ({
      _id: String(item._id),
      nama: item.nama,
      nip_nik: item.nip_nik,
      jabatan: item.jabatan,
      pangkat_golongan: item.pangkat_golongan,
    }));
  } catch {
    return [
      {
        _id: "demo-pegawai-1",
        nama: "Pegawai Contoh 1",
        nip_nik: "198801012010011001",
        jabatan: "Analis",
        pangkat_golongan: "Penata Tk.I (III/d)",
      },
      {
        _id: "demo-pegawai-2",
        nama: "Pegawai Contoh 2",
        nip_nik: "3172010101900001",
        jabatan: "Staf Administrasi",
        pangkat_golongan: "IX (PPPK)",
      },
    ];
  }
}

async function ambilWilayah() {
  await connectMongoDB();

  const [provinsi, kotaKabupaten, kecamatan, kelurahan] = await Promise.all([
    WilayahProvinsiModel.find().sort({ nama: 1 }).lean<IWilayahProvinsi[]>(),
    WilayahKotaKabupatenModel.find().sort({ nama_tampilan: 1 }).lean<IWilayahKotaKabupaten[]>(),
    WilayahKecamatanModel.find({ kode_kota_kabupaten: "1472" })
      .sort({ nama_tampilan: 1 })
      .lean<IWilayahKecamatan[]>(),
    WilayahKelurahanModel.find({ kode_kota_kabupaten: "1472" })
      .sort({ nama_tampilan: 1 })
      .lean<IWilayahKelurahan[]>(),
  ]);

  const provinsiMap = new Map(provinsi.map((item) => [item.kode, item.nama]));

  return {
    daftarKotaKabupatenTujuan: kotaKabupaten
      .filter((item) => item.kode !== "1472")
      .map((item) => ({
        kode: item.kode,
        kode_provinsi: item.kode_provinsi,
        provinsi_nama: provinsiMap.get(item.kode_provinsi) ?? "",
        nama: item.nama,
        jenis: item.jenis,
        nama_tampilan: item.nama_tampilan,
      })),
    daftarKecamatanDumai: kecamatan.map((item) => ({
      kode: item.kode,
      nama: item.nama,
      nama_tampilan: item.nama_tampilan,
    })),
    daftarKelurahanDumai: kelurahan.map((item) => ({
      kode: item.kode,
      kode_kecamatan: item.kode_kecamatan,
      nama: item.nama,
      nama_tampilan: item.nama_tampilan,
      kecamatan_nama: item.kecamatan_nama,
    })),
  };
}

async function ambilMataAnggaran() {
  try {
    await connectMongoDB();
    const mataAnggaran = await MataAnggaranModel.find().sort({ kode: 1 }).lean<IMataAnggaran[]>();
    return mataAnggaran.map((item) => ({
      _id: String(item._id),
      kode: item.kode,
      deskripsi: item.deskripsi,
    }));
  } catch {
    return [];
  }
}

export default async function SppdBaruPage() {
  const session = await requireRole(["Admin", "Operator"]);
  const [daftarPegawai, wilayah, daftarMataAnggaran] = await Promise.all([
    ambilPegawai(),
    ambilWilayah(),
    ambilMataAnggaran(),
  ]);

  return (
    <AppShell nama={session.nama} role={session.role} currentPath="/sppd/baru">
      <div className="space-y-6">
        <section>
          <p className="text-sm font-medium text-[#798195]">Panduan Input Perjalanan</p>
          <h1 className="mt-2 text-[30px] font-bold tracking-[-0.03em] text-[#242b38]">
            Buat Surat Perintah Perjalanan Dinas (SPPD) baru.
          </h1>
        </section>

        <SppdKolektifForm
          daftarPegawai={daftarPegawai}
          daftarKotaKabupatenTujuan={wilayah.daftarKotaKabupatenTujuan}
          daftarKecamatanDumai={wilayah.daftarKecamatanDumai}
          daftarKelurahanDumai={wilayah.daftarKelurahanDumai}
          daftarMataAnggaran={daftarMataAnggaran}
        />
      </div>
    </AppShell>
  );
}
