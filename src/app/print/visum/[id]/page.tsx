import { notFound } from "next/navigation";

import { PrintToolbar } from "@/components/print/PrintToolbar";
import { VisumPrint } from "@/components/print/VisumPrint";
import { requireRole } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/db/mongoose";
import { ambilTemplateDokumenSppd } from "@/lib/documents/sppd";
import { formatTanggal } from "@/lib/format";
import { tentukanPenandatanganVisum } from "@/lib/settings/global";
import { ambilDaftarTujuanDalamKota } from "@/lib/sppd/dalamKota";
import {
  PegawaiModel,
  PengaturanGlobalModel,
  SppdModel,
  type IPegawai,
  type IPengaturanGlobal,
  type ISppd,
} from "@/models";

interface VisumPrintPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function VisumPrintPage({ params }: VisumPrintPageProps) {
  await requireRole(["Admin", "Operator"]);
  const { id } = await params;
  await connectMongoDB();

  const sppd = await SppdModel.findById(id).lean<ISppd | null>();
  if (!sppd) {
    notFound();
  }

  const pegawai = await PegawaiModel.find({ _id: { $in: sppd.pelaksana } }).lean<IPegawai[]>();
  const pengaturanGlobal = await PengaturanGlobalModel.findOne({ key: "global" }).lean<
    IPengaturanGlobal | null
  >();
  const templateDokumen = ambilTemplateDokumenSppd(sppd);
  const penandatanganVisum = tentukanPenandatanganVisum({
    ppk_nama: pengaturanGlobal?.ppk_nama ?? "",
    ppk_nip: pengaturanGlobal?.ppk_nip ?? "",
  });
  const judul =
    sppd.jenis_perjalanan === "Dalam_Kota"
      ? "Lembar Visum Perjalanan Dinas Dalam Kota"
      : "Lembar Visum Perjalanan Dinas Luar Kota";
  const labelToolbar =
    sppd.jenis_perjalanan === "Dalam_Kota" ? "Cetak Visum Dalam Kota" : "Cetak Visum Luar Kota";

  return (
    <main className="container-app">
      <PrintToolbar label={labelToolbar} />
      <VisumPrint
        judul={judul}
        nomorSt={sppd.nomor_st}
        tanggalSt={formatTanggal(sppd.tanggal_st)}
        lokasiAsal={sppd.lokasi_asal}
        lokasiTujuan={sppd.lokasi_tujuan}
        maksudPerjalanan={sppd.maksud_perjalanan}
        daftarTujuanDalamKota={ambilDaftarTujuanDalamKota(sppd)}
        tanggalMulai={formatTanggal(sppd.tanggal_mulai)}
        tanggalSelesai={formatTanggal(sppd.tanggal_selesai)}
        pelaksana={pegawai.map((item) => ({
          nama: item.nama,
          nip_nik: item.nip_nik,
          pangkat_golongan: item.pangkat_golongan,
          jabatan: item.jabatan,
        }))}
        jumlahHari={sppd.jumlah_hari}
        jenisPerjalanan={sppd.jenis_perjalanan}
        tujuanProvinsi={sppd.lokasi_tujuan_provinsi_nama}
        pengantar={templateDokumen.visum.pengantar}
        catatan={templateDokumen.visum.catatan}
        penutup={templateDokumen.visum.penutup}
        pejabatJabatan={penandatanganVisum.jabatan}
        pejabatNama={penandatanganVisum.nama}
        pejabatNip={penandatanganVisum.nip}
        mataAnggaran={sppd.mata_anggaran}
      />
    </main>
  );
}
