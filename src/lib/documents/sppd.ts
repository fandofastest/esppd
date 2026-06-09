import type { IDokumenSppdTemplate, ISppd, JenisPerjalanan } from "@/models";

export function buatTemplateDokumenDefault(params: {
  jenisPerjalanan: JenisPerjalanan;
  maksudPerjalanan: string;
}) {
  const labelVisum =
    params.jenisPerjalanan === "Dalam_Kota" ? "perjalanan dinas dalam kota" : "perjalanan dinas luar kota";

  return {
    surat_tugas: {
      pembuka:
        "Berdasarkan kebutuhan kedinasan dan pelaksanaan tugas kelembagaan, pegawai yang namanya tercantum pada surat tugas ini diperintahkan untuk melaksanakan perjalanan dinas.",
      isi: `Pelaksanaan tugas dilakukan untuk ${params.maksudPerjalanan}. Selama melaksanakan perjalanan dinas, pegawai wajib menjaga tertib administrasi, membawa surat tugas dan visum, serta menyampaikan hasil pelaksanaan tugas setelah kegiatan selesai.`,
      penutup:
        "Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab sebagaimana mestinya.",
      pejabat_jabatan: "Sekretaris KPU Kota Dumai",
      pejabat_nama: "",
    },
    visum: {
      pengantar: `Lembar visum ini dipergunakan sebagai dokumen pengesahan ${labelVisum}. Dokumen ini dibawa oleh pelaksana perjalanan dinas bersama surat tugas.`,
      catatan:
        "Mohon kepada pejabat atau instansi tujuan untuk memberikan paraf, tanda tangan, cap, atau pengesahan lain yang diperlukan pada lembar visum ini sesuai kebutuhan administrasi.",
      penutup:
        "Setelah perjalanan dinas selesai, lembar visum ini menjadi bagian dari dokumen pertanggungjawaban perjalanan dinas.",
    },
  } satisfies IDokumenSppdTemplate;
}

export function ambilTemplateDokumenSppd(
  sppd: Pick<ISppd, "jenis_perjalanan" | "maksud_perjalanan"> & {
    dokumen_template?: Partial<IDokumenSppdTemplate> | null;
  },
) {
  const templateDefault = buatTemplateDokumenDefault({
    jenisPerjalanan: sppd.jenis_perjalanan,
    maksudPerjalanan: sppd.maksud_perjalanan,
  });

  return {
    surat_tugas: {
      ...templateDefault.surat_tugas,
      ...(sppd.dokumen_template?.surat_tugas ?? {}),
    },
    visum: {
      ...templateDefault.visum,
      ...(sppd.dokumen_template?.visum ?? {}),
    },
  } satisfies IDokumenSppdTemplate;
}
