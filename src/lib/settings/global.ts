import type { IPengaturanGlobal, ISppd } from "@/models";

export type PilihanPenandatanganSuratTugas = "Ketua" | "Sekretaris";

export function getPengaturanGlobalDefault() {
  return {
    key: "global",
    ketua_nama: "",
    sekretaris_nama: "",
    sekretaris_nip: "",
    ppk_nama: "",
    ppk_nip: "",
  } satisfies Omit<IPengaturanGlobal, "createdAt" | "updatedAt">;
}

export function gabungkanPengaturanGlobal(
  data?: Partial<IPengaturanGlobal> | null,
): Omit<IPengaturanGlobal, "createdAt" | "updatedAt"> {
  return {
    ...getPengaturanGlobalDefault(),
    ...(data ?? {}),
  };
}

export function tentukanPenandatanganSuratTugas(
  sppd: Pick<ISppd, "dokumen_template">,
  pengaturanGlobal: Pick<IPengaturanGlobal, "ketua_nama" | "sekretaris_nama" | "sekretaris_nip">,
) {
  const jabatanTersimpan = sppd.dokumen_template?.surat_tugas?.pejabat_jabatan?.trim();
  const pilihan: PilihanPenandatanganSuratTugas =
    jabatanTersimpan === "Ketua KPU Kota Dumai" ? "Ketua" : "Sekretaris";

  const namaDefault =
    pilihan === "Ketua" ? pengaturanGlobal.ketua_nama : pengaturanGlobal.sekretaris_nama;

  return {
    pilihan,
    jabatan: pilihan === "Ketua" ? "Ketua KPU Kota Dumai" : "Sekretaris KPU Kota Dumai",
    nama: namaDefault || "",
    nip: pilihan === "Sekretaris" ? pengaturanGlobal.sekretaris_nip || "" : "",
  };
}

export function tentukanPenandatanganVisum(
  pengaturanGlobal: Pick<IPengaturanGlobal, "ppk_nama" | "ppk_nip">,
) {
  return {
    jabatan: "Pejabat Pembuat Komitmen KPU Kota Dumai",
    nama: pengaturanGlobal.ppk_nama || "",
    nip: pengaturanGlobal.ppk_nip || "",
  };
}
