import Link from "next/link";
import { notFound } from "next/navigation";

import {
  generateFinalDokumenSppdAction,
  simpanTemplateDokumenAction,
  updateStatusSppdAction,
} from "@/actions/sppd.actions";
import { FormActionButton } from "@/components/forms/FormActionButton";
import { AppShell } from "@/components/layout/AppShell";
import { DocumentPreviewButton } from "@/components/sppd/DocumentPreviewButton";
import { SppdWorkflowStepper } from "@/components/sppd/SppdWorkflowStepper";
import { requireRole } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/db/mongoose";
import { ambilTemplateDokumenSppd } from "@/lib/documents/sppd";
import { formatRupiah, formatTanggal } from "@/lib/format";
import {
  gabungkanPengaturanGlobal,
  tentukanPenandatanganSuratTugas,
  tentukanPenandatanganVisum,
} from "@/lib/settings/global";
import {
  KeuanganSppdModel,
  PegawaiModel,
  PengaturanGlobalModel,
  SppdModel,
  type IKeuanganSppd,
  type IPegawai,
  type IPengaturanGlobal,
  type ISppd,
} from "@/models";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    status?: string;
    message?: string;
    open_document?: string;
  }>;
}

function isExternalUrl(value?: string) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

async function getSppdDetail(id: string) {
  await connectMongoDB();

  const sppd = await SppdModel.findById(id).lean<ISppd | null>();
  if (!sppd) {
    return null;
  }

  const [keuangan, pegawai] = await Promise.all([
    KeuanganSppdModel.find({ sppd_id: sppd._id }).lean<IKeuanganSppd[]>(),
    PegawaiModel.find({ _id: { $in: sppd.pelaksana } }).lean<IPegawai[]>(),
  ]);
  const pengaturanGlobalRaw = await PengaturanGlobalModel.findOne({ key: "global" }).lean<
    IPengaturanGlobal | null
  >();

  const totalEstimasi = keuangan.reduce((total, item) => total + item.estimasi_awal.total, 0);
  const totalDp = keuangan.reduce((total, item) => total + item.uang_muka_dp, 0);
  const dokumenTemplate = ambilTemplateDokumenSppd(sppd);
  const pengaturanGlobal = gabungkanPengaturanGlobal(pengaturanGlobalRaw);
  const penandatanganSuratTugas = tentukanPenandatanganSuratTugas(sppd, pengaturanGlobal);
  const penandatanganVisum = tentukanPenandatanganVisum(pengaturanGlobal);

  return {
    sppd,
    pegawai,
    totalEstimasi,
    totalDp,
    dokumenTemplate,
    pengaturanGlobal,
    penandatanganSuratTugas,
    penandatanganVisum,
  };
}

export default async function SppdDetailPage({ params, searchParams }: PageProps) {
  const session = await requireRole(["Admin", "Operator"]);
  const { id } = await params;
  const flashParams = searchParams ? await searchParams : undefined;
  const data = await getSppdDetail(id);

  if (!data) {
    notFound();
  }

  const labelVisum =
    data.sppd.jenis_perjalanan === "Dalam_Kota" ? "Visum Dalam Kota" : "Visum Luar Kota";
  const suratTugasFinal = data.sppd.dokumen_final?.surat_tugas ?? "";
  const visumFinal = data.sppd.dokumen_final?.visum ?? "";
  const autoOpenDocument = flashParams?.open_document;
  const flash =
    flashParams?.status && flashParams?.message
      ? {
          status: flashParams.status,
          message: flashParams.message,
        }
      : null;
  const workflowSteps = [
    {
      title: "Pengajuan",
      description: "Draft perjalanan dinas sudah dibuat.",
      state: "completed" as const,
      href: `/sppd/${id}`,
    },
    {
      title: "Surat Tugas",
      description: suratTugasFinal ? "Dokumen final sudah digenerate." : "Generate dan upload Surat Tugas final.",
      state: suratTugasFinal ? ("completed" as const) : ("current" as const),
      href: `/sppd/${id}`,
    },
    {
      title: "Visum",
      description: visumFinal ? "Dokumen final sudah digenerate." : "Generate dan upload Visum final.",
      state: visumFinal ? ("completed" as const) : suratTugasFinal ? ("current" as const) : ("pending" as const),
      href: `/sppd/${id}`,
    },
    {
      title: "Berjalan",
      description: "Perjalanan berjalan setelah kedua dokumen final siap.",
      state:
        data.sppd.status === "Berjalan" || data.sppd.status === "LPJ_Diproses" || data.sppd.status === "Selesai"
          ? ("completed" as const)
          : suratTugasFinal && visumFinal
            ? ("current" as const)
            : ("pending" as const),
      href: `/sppd/${id}`,
    },
    {
      title: "LPJ & Selesai",
      description: "Isi LPJ lalu finalisasi perjalanan dinas.",
      state:
        data.sppd.status === "Selesai"
          ? ("completed" as const)
          : data.sppd.status === "LPJ_Diproses"
            ? ("current" as const)
            : ("pending" as const),
      href: `/sppd/${id}/lpj`,
    },
  ];

  return (
    <AppShell nama={session.nama} role={session.role} currentPath="/sppd">
      <div className="space-y-6">
        <SppdWorkflowStepper steps={workflowSteps} />

        <section className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#798195]">
              Data SPPD / Persiapan Dokumen: {data.sppd.nomor_st}
            </p>
            <h1 className="mt-2 text-[28px] font-bold tracking-[-0.03em] text-[#e2342d]">
              Persiapan Dokumen & Cetak
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-[#717b8d]">
              Setelah pengajuan SPPD dibuat, tahap berikutnya adalah menyiapkan Surat Tugas dan
              Visum yang akan dibawa. Setelah dokumen final digenerate dan diupload, barulah
              perjalanan masuk ke tahap berikutnya.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DocumentPreviewButton
              className="btn-secondary"
              finalValue={suratTugasFinal}
              previewHref={`/print/surat-tugas/${id}`}
              previewLabel="Preview ST"
              printLabel="Cetak ST"
              modalTitle={`Surat Tugas Final ${data.sppd.nomor_st}`}
              initialOpen={autoOpenDocument === "surat_tugas"}
            />
            <DocumentPreviewButton
              className="btn-secondary"
              finalValue={visumFinal}
              previewHref={`/print/visum/${id}`}
              previewLabel="Preview Visum"
              printLabel="Cetak Visum"
              modalTitle={`${labelVisum} Final ${data.sppd.nomor_st}`}
              initialOpen={autoOpenDocument === "visum"}
            />
            <Link className="btn-secondary" href={`/sppd/${id}/dokumentasi`}>
              Lihat Dokumentasi
            </Link>
            <Link
              className={`btn-primary ${!suratTugasFinal || !visumFinal ? "pointer-events-none opacity-60" : ""}`}
              href={`/sppd/${id}/lpj`}
            >
              Buka LPJ Nanti
            </Link>
          </div>
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

        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <section className="space-y-5">
            <section className="card p-5">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8a92a5]">
                    Jenis Perjalanan
                  </p>
                  <p className="mt-2 font-bold text-[#252c38]">
                    {data.sppd.jenis_perjalanan === "Dalam_Kota" ? "Dalam Kota" : "Luar Kota"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8a92a5]">
                    Asal
                  </p>
                  <p className="mt-2 font-bold text-[#252c38]">{data.sppd.lokasi_asal}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8a92a5]">
                    Tujuan
                  </p>
                  <p className="mt-2 font-bold text-[#252c38]">{data.sppd.lokasi_tujuan}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8a92a5]">
                    Rentang Tanggal
                  </p>
                  <p className="mt-2 font-bold text-[#252c38]">
                    {formatTanggal(data.sppd.tanggal_mulai)} - {formatTanggal(data.sppd.tanggal_selesai)}
                  </p>
                </div>
              </div>
            </section>

            <section className="card p-5">
              <h3 className="text-lg font-bold text-[#252c38]">Data Otomatis</h3>
              <p className="mt-1 text-sm text-[#7f8799]">
                Bagian berikut diambil langsung dari data SPPD dan akan tampil otomatis saat cetak.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-[16px] bg-[#f7f8fc] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8c95a8]">
                    Nama Pegawai
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-[#465063]">
                    {data.pegawai.map((item) => (
                      <li key={String(item._id)}>{item.nama}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[16px] bg-[#f7f8fc] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8c95a8]">
                    Tanggal Otomatis
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-[#465063]">
                    <p>Tanggal ST: {formatTanggal(data.sppd.tanggal_st)}</p>
                    <p>
                      Tanggal Perjalanan: {formatTanggal(data.sppd.tanggal_mulai)} s.d.{" "}
                      {formatTanggal(data.sppd.tanggal_selesai)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="card p-5">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-[#252c38]">Edit Isi Dokumen</h3>
                  <p className="mt-1 text-sm text-[#7f8799]">
                    Ubah isi Surat Tugas dan {labelVisum} sesuai kebutuhan. Nama pegawai dan tanggal
                    tidak perlu diketik ulang.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <DocumentPreviewButton
                    className="btn-secondary text-sm"
                    finalValue={suratTugasFinal}
                    previewHref={`/print/surat-tugas/${id}`}
                    previewLabel="Preview ST"
                    printLabel="Cetak ST"
                    modalTitle={`Surat Tugas Final ${data.sppd.nomor_st}`}
                    initialOpen={false}
                  />
                  <DocumentPreviewButton
                    className="btn-secondary text-sm"
                    finalValue={visumFinal}
                    previewHref={`/print/visum/${id}`}
                    previewLabel="Preview Visum"
                    printLabel="Cetak Visum"
                    modalTitle={`${labelVisum} Final ${data.sppd.nomor_st}`}
                    initialOpen={false}
                  />
                </div>
              </div>

              <form action={simpanTemplateDokumenAction} className="space-y-6">
                <input type="hidden" name="sppd_id" value={String(data.sppd._id)} />

                <div className="rounded-[20px] border border-[#e8ebf1] p-5">
                  <h4 className="text-base font-bold text-[#252c38]">Surat Tugas</h4>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="label">Paragraf Pembuka</label>
                      <textarea
                        className="input min-h-[110px] resize-none"
                        name="st_pembuka"
                        defaultValue={data.dokumenTemplate.surat_tugas.pembuka}
                      />
                    </div>
                    <div>
                      <label className="label">Isi Pokok Surat</label>
                      <textarea
                        className="input min-h-[140px] resize-none"
                        name="st_isi"
                        defaultValue={data.dokumenTemplate.surat_tugas.isi}
                      />
                    </div>
                    <div>
                      <label className="label">Paragraf Penutup</label>
                      <textarea
                        className="input min-h-[100px] resize-none"
                        name="st_penutup"
                        defaultValue={data.dokumenTemplate.surat_tugas.penutup}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="label">Penandatangan Surat Tugas</label>
                        <select
                          className="input"
                          name="st_pejabat_jabatan"
                          defaultValue={data.penandatanganSuratTugas.jabatan}
                        >
                          <option value="Ketua KPU Kota Dumai">Ketua KPU Kota Dumai</option>
                          <option value="Sekretaris KPU Kota Dumai">Sekretaris KPU Kota Dumai</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Nama Penandatangan Surat Tugas</label>
                        <input
                          className="input"
                          defaultValue={data.penandatanganSuratTugas.nama}
                          placeholder="Diambil dari pengaturan global"
                          readOnly
                        />
                      </div>
                    </div>
                    <div className="rounded-[16px] bg-[#f7f8fc] p-4 text-sm text-[#465063]">
                      <p className="font-semibold text-[#252c38]">Keterangan Penandatangan ST</p>
                      <p className="mt-2">
                        Ketua: {data.pengaturanGlobal.ketua_nama || "(belum diatur)"}
                      </p>
                      <p className="mt-1">
                        Sekretaris: {data.pengaturanGlobal.sekretaris_nama || "(belum diatur)"}
                      </p>
                      <p className="mt-1">
                        NIP Sekretaris: {data.pengaturanGlobal.sekretaris_nip || "(belum diatur)"}
                      </p>
                      <p className="mt-2 text-xs text-[#7f8799]">
                        Nama dan NIP akan mengikuti penandatangan yang dipilih setelah dokumen
                        disimpan.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[20px] border border-[#e8ebf1] p-5">
                  <h4 className="text-base font-bold text-[#252c38]">{labelVisum}</h4>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="label">Paragraf Pengantar</label>
                      <textarea
                        className="input min-h-[120px] resize-none"
                        name="visum_pengantar"
                        defaultValue={data.dokumenTemplate.visum.pengantar}
                      />
                    </div>
                    <div>
                      <label className="label">Catatan / Instruksi Pengesahan</label>
                      <textarea
                        className="input min-h-[120px] resize-none"
                        name="visum_catatan"
                        defaultValue={data.dokumenTemplate.visum.catatan}
                      />
                    </div>
                    <div>
                      <label className="label">Paragraf Penutup</label>
                      <textarea
                        className="input min-h-[100px] resize-none"
                        name="visum_penutup"
                        defaultValue={data.dokumenTemplate.visum.penutup}
                      />
                    </div>
                    <div className="rounded-[16px] bg-[#f7f8fc] p-4 text-sm text-[#465063]">
                      <p className="font-semibold text-[#252c38]">Penanda Tangan Visum</p>
                      <p className="mt-2">{data.penandatanganVisum.jabatan}</p>
                      <p className="mt-1 font-semibold">
                        {data.penandatanganVisum.nama || "(belum diatur di Pengaturan Global)"}
                      </p>
                      <p className="mt-1">
                        NIP: {data.penandatanganVisum.nip || "(belum diatur di Pengaturan Global)"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                  <FormActionButton
                    className="btn-secondary"
                    label="Simpan Isi Dokumen"
                    pendingLabel="Menyimpan..."
                  />
                </div>
              </form>
            </section>
          </section>

          <aside className="space-y-5">
            <section className="card p-5">
              <h4 className="text-lg font-bold text-[#252c38]">Generate Dokumen Final</h4>
              <p className="mt-2 text-sm text-[#7f8799]">
                Tombol di bawah ini akan mengenerate PDF final lalu langsung menguploadnya ke API integrasi.
              </p>
              <div className="mt-4 grid gap-3">
                <form action={generateFinalDokumenSppdAction} className="space-y-2">
                  <input type="hidden" name="sppd_id" value={String(data.sppd._id)} />
                  <input type="hidden" name="document_type" value="surat_tugas" />
                  <FormActionButton
                    className="btn-primary w-full"
                    label={suratTugasFinal ? "Generate Ulang Surat Tugas Final" : "Generate Surat Tugas Final"}
                    pendingLabel="Mengenerate ST..."
                  />
                </form>
                <form action={generateFinalDokumenSppdAction} className="space-y-2">
                  <input type="hidden" name="sppd_id" value={String(data.sppd._id)} />
                  <input type="hidden" name="document_type" value="visum" />
                  <FormActionButton
                    className="btn-secondary w-full"
                    label={visumFinal ? `Generate Ulang ${labelVisum}` : `Generate ${labelVisum} Final`}
                    pendingLabel="Mengenerate Visum..."
                  />
                </form>
                <Link
                  className={`btn-secondary text-center ${!suratTugasFinal || !visumFinal ? "pointer-events-none opacity-60" : ""}`}
                  href={`/sppd/${id}/lpj`}
                >
                  Buka Halaman LPJ
                </Link>
                <Link className="btn-secondary text-center" href={`/sppd/${id}/dokumentasi`}>
                  Lihat Dokumentasi
                </Link>
              </div>
            </section>

            <section className="card p-5">
              <h4 className="text-lg font-bold text-[#252c38]">Status Perjalanan</h4>
              <div className="mt-4 rounded-[16px] bg-[#f7f8fc] p-4 text-sm text-[#4f5869]">
                <p className="font-semibold text-[#252c38]">Status saat ini: {data.sppd.status}</p>
                <p className="mt-2">
                  Status otomatis berubah menjadi Berjalan setelah Surat Tugas final dan Visum final
                  berhasil digenerate dan diupload.
                </p>
              </div>

              {session.role === "Admin" ? (
                <form action={updateStatusSppdAction} className="mt-4 space-y-3">
                  <input type="hidden" name="sppd_id" value={String(data.sppd._id)} />
                  <label className="label">Override Status Admin</label>
                  <select className="input" name="status" defaultValue={data.sppd.status}>
                    <option value="Draft">Draft</option>
                    <option value="Berjalan">Berjalan</option>
                    <option value="LPJ_Diproses">LPJ Diproses</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                  <FormActionButton
                    className="btn-secondary w-full"
                    label="Perbarui Status"
                    pendingLabel="Memperbarui..."
                  />
                </form>
              ) : null}
            </section>

            <section className="card p-5">
              <h4 className="text-lg font-bold text-[#252c38]">Dokumen Final Tersimpan</h4>
              <div className="mt-4 space-y-3 text-sm text-[#586173]">
                <div className="rounded-[16px] bg-[#f7f8fc] p-4">
                  <p className="font-semibold text-[#252c38]">Surat Tugas Final</p>
                  {suratTugasFinal ? (
                    isExternalUrl(suratTugasFinal) ? (
                      <a className="mt-2 inline-block font-semibold text-[#e2342d] underline" href={suratTugasFinal} target="_blank" rel="noreferrer">
                        Buka dokumen final
                      </a>
                    ) : (
                      <p className="mt-2 break-all">{suratTugasFinal}</p>
                    )
                  ) : (
                    <p className="mt-2 text-[#7f8799]">Belum digenerate.</p>
                  )}
                </div>
                <div className="rounded-[16px] bg-[#f7f8fc] p-4">
                  <p className="font-semibold text-[#252c38]">{labelVisum} Final</p>
                  {visumFinal ? (
                    isExternalUrl(visumFinal) ? (
                      <a className="mt-2 inline-block font-semibold text-[#e2342d] underline" href={visumFinal} target="_blank" rel="noreferrer">
                        Buka dokumen final
                      </a>
                    ) : (
                      <p className="mt-2 break-all">{visumFinal}</p>
                    )
                  ) : (
                    <p className="mt-2 text-[#7f8799]">Belum digenerate.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="card p-5">
              <h4 className="text-lg font-bold text-[#252c38]">Ringkasan Biaya Awal</h4>
              <div className="mt-4 space-y-3 text-sm text-[#5f687a]">
                <div className="flex items-center justify-between">
                  <span>Total Estimasi Tim</span>
                  <strong className="text-[#252c38]">{formatRupiah(data.totalEstimasi)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total DP Tim</span>
                  <strong className="text-[#252c38]">{formatRupiah(data.totalDp)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Jumlah Pelaksana</span>
                  <strong className="text-[#252c38]">{data.pegawai.length} pegawai</strong>
                </div>
              </div>
            </section>

            <section className="card p-5">
              <h4 className="text-lg font-bold text-[#252c38]">Tahapan</h4>
              <div className="mt-5 space-y-5 text-sm">
                <div className="flex gap-3">
                  <span className="mt-1 h-3 w-3 rounded-full bg-[#e2342d]" />
                  <div>
                    <p className="font-semibold text-[#252c38]">SPPD Dibuat</p>
                    <p className="text-[#7d8598]">{formatTanggal(data.sppd.createdAt)}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="mt-1 h-3 w-3 rounded-full border-2 border-[#e2342d] bg-white" />
                  <div>
                    <p className="font-semibold text-[#e2342d]">Persiapan Dokumen</p>
                    <p className="text-[#7d8598]">Edit isi ST dan Visum, lalu cetak untuk dibawa</p>
                  </div>
                </div>
                <div className="flex gap-3 opacity-60">
                  <span className="mt-1 h-3 w-3 rounded-full bg-[#d6dbe6]" />
                  <div>
                    <p className="font-semibold text-[#667085]">LPJ Pasca-Perjalanan</p>
                    <p className="text-[#7d8598]">Dikerjakan setelah kegiatan selesai</p>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
