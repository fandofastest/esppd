import { notFound } from "next/navigation";

import { PrintToolbar } from "@/components/print/PrintToolbar";
import { SuratTugasPrint } from "@/components/print/SuratTugasPrint";
import { requireRole } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/db/mongoose";
import { ambilTemplateDokumenSppd } from "@/lib/documents/sppd";
import { formatTanggal } from "@/lib/format";
import {
  gabungkanPengaturanGlobal,
  tentukanPenandatanganSuratTugas,
} from "@/lib/settings/global";
import {
  PegawaiModel,
  PengaturanGlobalModel,
  SppdModel,
  type IPegawai,
  type IPengaturanGlobal,
  type ISppd,
} from "@/models";

interface SuratTugasPrintPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SuratTugasPrintPage({ params }: SuratTugasPrintPageProps) {
  await requireRole(["Admin", "Operator"]);
  const { id } = await params;
  await connectMongoDB();

  const sppd = await SppdModel.findById(id).lean<ISppd | null>();
  if (!sppd) {
    notFound();
  }

  const pegawai = await PegawaiModel.find({ _id: { $in: sppd.pelaksana } }).lean<IPegawai[]>();
  const pengaturanGlobalRaw = await PengaturanGlobalModel.findOne({ key: "global" }).lean<
    IPengaturanGlobal | null
  >();
  const templateDokumen = ambilTemplateDokumenSppd(sppd);
  const pengaturanGlobal = gabungkanPengaturanGlobal(pengaturanGlobalRaw);
  const penandatanganSuratTugas = tentukanPenandatanganSuratTugas(sppd, pengaturanGlobal);

  return (
    <main className="container-app">
      <PrintToolbar label="Cetak Surat Tugas" />
      <SuratTugasPrint
        nomorSt={sppd.nomor_st}
        tanggalSt={formatTanggal(sppd.tanggal_st)}
        maksudPerjalanan={sppd.maksud_perjalanan}
        lokasiAsal={sppd.lokasi_asal}
        lokasiTujuan={sppd.lokasi_tujuan}
        tanggalMulai={formatTanggal(sppd.tanggal_mulai)}
        tanggalSelesai={formatTanggal(sppd.tanggal_selesai)}
        pelaksana={pegawai.map((item) => ({
          nama: item.nama,
          jabatan: item.jabatan,
        }))}
        pembuka={templateDokumen.surat_tugas.pembuka}
        isi={templateDokumen.surat_tugas.isi}
        penutup={templateDokumen.surat_tugas.penutup}
        pejabatJabatan={penandatanganSuratTugas.jabatan}
        pejabatNama={penandatanganSuratTugas.nama}
        pejabatNip={penandatanganSuratTugas.nip}
      />
    </main>
  );
}
