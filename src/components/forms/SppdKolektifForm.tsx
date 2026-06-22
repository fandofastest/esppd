"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import {
  buatPengajuanSppdAction,
  hitungEstimasiPrePerjalananAction,
} from "@/actions/sppd.actions";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

interface PegawaiOption {
  _id: string;
  nama: string;
  nip_nik?: string;
  jabatan: string;
  pangkat_golongan: string;
}

interface KotaKabupatenTujuanOption {
  kode: string;
  kode_provinsi: string;
  provinsi_nama: string;
  nama: string;
  jenis: "Kabupaten" | "Kota";
  nama_tampilan: string;
}

interface KecamatanDumaiOption {
  kode: string;
  nama: string;
  nama_tampilan: string;
}

interface KelurahanDumaiOption {
  kode: string;
  kode_kecamatan: string;
  nama: string;
  nama_tampilan: string;
  kecamatan_nama: string;
}

interface SppdKolektifFormProps {
  daftarPegawai: PegawaiOption[];
  daftarKotaKabupatenTujuan: KotaKabupatenTujuanOption[];
  daftarKecamatanDumai: KecamatanDumaiOption[];
  daftarKelurahanDumai: KelurahanDumaiOption[];
  daftarMataAnggaran?: { _id: string; kode: string; deskripsi: string }[];
}

interface FormValues {
  nomor_st: string;
  tanggal_st: string;
  maksud_perjalanan: string;
  mata_anggaran: string;
  jenis_perjalanan: "Dalam_Kota" | "Luar_Kota";
  lokasi_asal: string;
  lokasi_asal_provinsi_kode: string;
  lokasi_asal_provinsi_nama: string;
  lokasi_asal_kota_kode: string;
  lokasi_asal_kota_nama: string;
  lokasi_tujuan: string;
  lokasi_tujuan_provinsi_kode: string;
  lokasi_tujuan_provinsi_nama: string;
  lokasi_tujuan_kota_kode: string;
  lokasi_tujuan_kota_nama: string;
  lokasi_tujuan_kecamatan_kode: string;
  lokasi_tujuan_kecamatan_nama: string;
  lokasi_tujuan_kecamatan_kode_list: string[];
  lokasi_tujuan_kecamatan_nama_list: string[];
  lokasi_tujuan_kelurahan_kode_list: string[];
  lokasi_tujuan_kelurahan_nama_list: string[];
  lokasi_tujuan_custom_dalam_kota: string[];
  tanggal_mulai: string;
  tanggal_selesai: string;
  pelaksana: {
    pegawai_id: string;
    nominal_dp: number;
  }[];
}

interface PreviewEstimasi {
  jumlah_hari: number;
  provinsi: string;
  total_estimasi_tim: number;
  total_dp_tim: number;
  rincian_per_pegawai: Array<{
    pegawaiId: string;
    namaPegawai: string;
    jabatan: string;
    pangkatGolongan: string;
    uangHarian: number;
    transport: number;
    hotel: number;
    total: number;
    uangMukaDp: number;
  }>;
}

const ASAL_TETAP = {
  lokasi_asal: "Kota Dumai, Riau",
  lokasi_asal_provinsi_kode: "14",
  lokasi_asal_provinsi_nama: "Riau",
  lokasi_asal_kota_kode: "1472",
  lokasi_asal_kota_nama: "Kota Dumai",
};

function formatRupiah(nominal: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(nominal);
}

function formatDalamKotaKecamatanLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return /^kecamatan\s/i.test(trimmed) ? trimmed : `Kecamatan ${trimmed}`;
}

function formatDalamKotaKelurahanLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return /^kelurahan\s/i.test(trimmed) ? trimmed : `Kelurahan ${trimmed}`;
}

export function SppdKolektifForm({
  daftarPegawai,
  daftarKotaKabupatenTujuan,
  daftarKecamatanDumai,
  daftarKelurahanDumai,
  daftarMataAnggaran = [],
}: SppdKolektifFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<PreviewEstimasi | null>(null);
  const [pesan, setPesan] = useState("");
  const [draftKecamatanKode, setDraftKecamatanKode] = useState("");
  const [draftKelurahanKode, setDraftKelurahanKode] = useState("");
  const [customTujuanInput, setCustomTujuanInput] = useState("");

  const form = useForm<FormValues>({
    defaultValues: {
      nomor_st: "",
      tanggal_st: "",
      maksud_perjalanan: "",
      mata_anggaran: daftarMataAnggaran[0]?.kode || "524111",
      jenis_perjalanan: "Luar_Kota",
      ...ASAL_TETAP,
      lokasi_tujuan: "",
      lokasi_tujuan_provinsi_kode: "",
      lokasi_tujuan_provinsi_nama: "",
      lokasi_tujuan_kota_kode: "",
      lokasi_tujuan_kota_nama: "",
      lokasi_tujuan_kecamatan_kode: "",
      lokasi_tujuan_kecamatan_nama: "",
      lokasi_tujuan_kecamatan_kode_list: [],
      lokasi_tujuan_kecamatan_nama_list: [],
      lokasi_tujuan_kelurahan_kode_list: [],
      lokasi_tujuan_kelurahan_nama_list: [],
      lokasi_tujuan_custom_dalam_kota: [],
      tanggal_mulai: "",
      tanggal_selesai: "",
      pelaksana: [{ pegawai_id: "", nominal_dp: 0 }],
    },
  });

  const pelaksanaFields = useFieldArray({
    control: form.control,
    name: "pelaksana",
  });

  const opsiPegawai = useMemo(
    () =>
      daftarPegawai.map((pegawai) => ({
        value: pegawai._id,
        label: `${pegawai.nama} - ${pegawai.jabatan}`,
      })),
    [daftarPegawai],
  );

  const opsiLuarKota = useMemo(
    () =>
      daftarKotaKabupatenTujuan.map((item) => ({
        value: item.kode,
        label: `${item.nama_tampilan}, ${item.provinsi_nama}`,
        keywords: [item.nama, item.jenis, item.provinsi_nama],
      })),
    [daftarKotaKabupatenTujuan],
  );

  const opsiKecamatan = useMemo(
    () =>
      daftarKecamatanDumai.map((item) => ({
        value: item.kode,
        label: item.nama_tampilan,
        keywords: [item.nama, "Dumai", "Kecamatan"],
      })),
    [daftarKecamatanDumai],
  );

  const opsiKelurahan = useMemo(
    () =>
      daftarKelurahanDumai.map((item) => ({
        value: item.kode,
        label: `${item.nama_tampilan} - ${item.kecamatan_nama}`,
        keywords: [item.nama, item.kecamatan_nama, "Dumai", "Kelurahan"],
      })),
    [daftarKelurahanDumai],
  );

  const jenisPerjalanan = form.watch("jenis_perjalanan");
  const tujuanKecamatanList = form.watch("lokasi_tujuan_kecamatan_nama_list");
  const tujuanKelurahanList = form.watch("lokasi_tujuan_kelurahan_nama_list");
  const tujuanCustomList = form.watch("lokasi_tujuan_custom_dalam_kota");

  function composeDalamKotaTujuan(
    kecamatanList: string[],
    kelurahanList: string[],
    customList: string[],
  ) {
    const bagianKecamatan = kecamatanList.map((item) => formatDalamKotaKecamatanLabel(item)).filter(Boolean);
    const bagianKelurahan = kelurahanList.map((item) => formatDalamKotaKelurahanLabel(item)).filter(Boolean);
    const bagianCustom = customList.map((item) => item.trim()).filter(Boolean);
    const semuaTujuan = [...bagianKecamatan, ...bagianKelurahan, ...bagianCustom];

    if (semuaTujuan.length === 0) {
      return "";
    }

    return `${semuaTujuan.join("; ")}, Kota Dumai, Riau`;
  }

  function syncDalamKotaTujuan(
    kecamatanKodeList: string[],
    kecamatanNamaList: string[],
    kelurahanKodeList: string[],
    kelurahanNamaList: string[],
    customList: string[],
  ) {
    form.setValue("lokasi_tujuan_kecamatan_kode_list", kecamatanKodeList, { shouldValidate: true });
    form.setValue("lokasi_tujuan_kecamatan_nama_list", kecamatanNamaList, { shouldValidate: true });
    form.setValue("lokasi_tujuan_kelurahan_kode_list", kelurahanKodeList, { shouldValidate: true });
    form.setValue("lokasi_tujuan_kelurahan_nama_list", kelurahanNamaList, { shouldValidate: true });
    form.setValue("lokasi_tujuan_custom_dalam_kota", customList, { shouldValidate: true });
    form.setValue("lokasi_tujuan_kecamatan_kode", kecamatanKodeList[0] ?? kelurahanKodeList[0] ?? "", {
      shouldValidate: true,
    });
    form.setValue("lokasi_tujuan_kecamatan_nama", kecamatanNamaList[0] ?? kelurahanNamaList[0] ?? "", {
      shouldValidate: true,
    });
    form.setValue("lokasi_tujuan", composeDalamKotaTujuan(kecamatanNamaList, kelurahanNamaList, customList), {
      shouldValidate: true,
    });
    form.setValue("lokasi_tujuan_provinsi_kode", "14", { shouldValidate: true });
    form.setValue("lokasi_tujuan_provinsi_nama", "Riau", { shouldValidate: true });
    form.setValue("lokasi_tujuan_kota_kode", "1472", { shouldValidate: true });
    form.setValue("lokasi_tujuan_kota_nama", "Kota Dumai", { shouldValidate: true });
    setPreview(null);
  }

  function resetTujuan() {
    form.setValue("lokasi_tujuan", "");
    form.setValue("lokasi_tujuan_provinsi_kode", "");
    form.setValue("lokasi_tujuan_provinsi_nama", "");
    form.setValue("lokasi_tujuan_kota_kode", "");
    form.setValue("lokasi_tujuan_kota_nama", "");
    form.setValue("lokasi_tujuan_kecamatan_kode", "");
    form.setValue("lokasi_tujuan_kecamatan_nama", "");
    form.setValue("lokasi_tujuan_kecamatan_kode_list", []);
    form.setValue("lokasi_tujuan_kecamatan_nama_list", []);
    form.setValue("lokasi_tujuan_kelurahan_kode_list", []);
    form.setValue("lokasi_tujuan_kelurahan_nama_list", []);
    form.setValue("lokasi_tujuan_custom_dalam_kota", []);
    setDraftKecamatanKode("");
    setDraftKelurahanKode("");
    setCustomTujuanInput("");
    setPreview(null);
  }

  function pilihJenisPerjalanan(jenis: "Dalam_Kota" | "Luar_Kota") {
    form.setValue("jenis_perjalanan", jenis, { shouldValidate: true });
    resetTujuan();
  }

  function pilihTujuanLuarKota(kodeKota: string) {
    const tujuan = daftarKotaKabupatenTujuan.find((item) => item.kode === kodeKota);

    form.setValue("lokasi_tujuan_kota_kode", tujuan?.kode ?? "", { shouldValidate: true });
    form.setValue("lokasi_tujuan_kota_nama", tujuan?.nama_tampilan ?? "", { shouldValidate: true });
    form.setValue("lokasi_tujuan_provinsi_kode", tujuan?.kode_provinsi ?? "", {
      shouldValidate: true,
    });
    form.setValue("lokasi_tujuan_provinsi_nama", tujuan?.provinsi_nama ?? "", {
      shouldValidate: true,
    });
    form.setValue("lokasi_tujuan_kecamatan_kode", "", { shouldValidate: true });
    form.setValue("lokasi_tujuan_kecamatan_nama", "", { shouldValidate: true });
    form.setValue(
      "lokasi_tujuan",
      tujuan ? `${tujuan.nama_tampilan}, ${tujuan.provinsi_nama}` : "",
      { shouldValidate: true },
    );
    setPreview(null);
  }

  function pilihTujuanDalamKota(kodeKecamatan: string) {
    const tujuan = daftarKecamatanDumai.find((item) => item.kode === kodeKecamatan);
    if (!tujuan) {
      setDraftKecamatanKode("");
      return;
    }

    const currentKodeList = form.getValues("lokasi_tujuan_kecamatan_kode_list");
    const currentNamaList = form.getValues("lokasi_tujuan_kecamatan_nama_list");
    if (currentKodeList.includes(tujuan.kode)) {
      setDraftKecamatanKode("");
      return;
    }

    syncDalamKotaTujuan(
      [...currentKodeList, tujuan.kode],
      [...currentNamaList, tujuan.nama_tampilan],
      form.getValues("lokasi_tujuan_kelurahan_kode_list"),
      form.getValues("lokasi_tujuan_kelurahan_nama_list"),
      form.getValues("lokasi_tujuan_custom_dalam_kota"),
    );
    setDraftKecamatanKode("");
  }

  function pilihKelurahanDalamKota(kodeKelurahan: string) {
    const tujuan = daftarKelurahanDumai.find((item) => item.kode === kodeKelurahan);
    if (!tujuan) {
      setDraftKelurahanKode("");
      return;
    }

    const currentKodeList = form.getValues("lokasi_tujuan_kelurahan_kode_list");
    const currentNamaList = form.getValues("lokasi_tujuan_kelurahan_nama_list");
    if (currentKodeList.includes(tujuan.kode)) {
      setDraftKelurahanKode("");
      return;
    }

    syncDalamKotaTujuan(
      form.getValues("lokasi_tujuan_kecamatan_kode_list"),
      form.getValues("lokasi_tujuan_kecamatan_nama_list"),
      [...currentKodeList, tujuan.kode],
      [...currentNamaList, tujuan.nama_tampilan],
      form.getValues("lokasi_tujuan_custom_dalam_kota"),
    );
    setDraftKelurahanKode("");
  }

  function hapusTujuanKecamatan(kodeKecamatan: string) {
    const currentKodeList = form.getValues("lokasi_tujuan_kecamatan_kode_list");
    const currentNamaList = form.getValues("lokasi_tujuan_kecamatan_nama_list");
    const nextEntries = currentKodeList
      .map((kode, index) => ({ kode, nama: currentNamaList[index] ?? "" }))
      .filter((item) => item.kode !== kodeKecamatan);

    syncDalamKotaTujuan(
      nextEntries.map((item) => item.kode),
      nextEntries.map((item) => item.nama),
      form.getValues("lokasi_tujuan_kelurahan_kode_list"),
      form.getValues("lokasi_tujuan_kelurahan_nama_list"),
      form.getValues("lokasi_tujuan_custom_dalam_kota"),
    );
  }

  function hapusTujuanKelurahan(kodeKelurahan: string) {
    const currentKodeList = form.getValues("lokasi_tujuan_kelurahan_kode_list");
    const currentNamaList = form.getValues("lokasi_tujuan_kelurahan_nama_list");
    const nextEntries = currentKodeList
      .map((kode, index) => ({ kode, nama: currentNamaList[index] ?? "" }))
      .filter((item) => item.kode !== kodeKelurahan);

    syncDalamKotaTujuan(
      form.getValues("lokasi_tujuan_kecamatan_kode_list"),
      form.getValues("lokasi_tujuan_kecamatan_nama_list"),
      nextEntries.map((item) => item.kode),
      nextEntries.map((item) => item.nama),
      form.getValues("lokasi_tujuan_custom_dalam_kota"),
    );
  }

  function tambahTujuanCustomDalamKota() {
    const nextValue = customTujuanInput.trim();
    if (!nextValue) {
      return;
    }

    const currentCustomList = form.getValues("lokasi_tujuan_custom_dalam_kota");
    if (currentCustomList.includes(nextValue)) {
      setCustomTujuanInput("");
      return;
    }

    syncDalamKotaTujuan(
      form.getValues("lokasi_tujuan_kecamatan_kode_list"),
      form.getValues("lokasi_tujuan_kecamatan_nama_list"),
      form.getValues("lokasi_tujuan_kelurahan_kode_list"),
      form.getValues("lokasi_tujuan_kelurahan_nama_list"),
      [...currentCustomList, nextValue],
    );
    setCustomTujuanInput("");
  }

  function hapusTujuanCustomDalamKota(value: string) {
    syncDalamKotaTujuan(
      form.getValues("lokasi_tujuan_kecamatan_kode_list"),
      form.getValues("lokasi_tujuan_kecamatan_nama_list"),
      form.getValues("lokasi_tujuan_kelurahan_kode_list"),
      form.getValues("lokasi_tujuan_kelurahan_nama_list"),
      form
        .getValues("lokasi_tujuan_custom_dalam_kota")
        .filter((item) => item !== value),
    );
  }

  async function handlePreview(values: FormValues) {
    try {
      setPesan("");

      const hasil = await hitungEstimasiPrePerjalananAction({
        nomor_st: values.nomor_st,
        tanggal_st: new Date(values.tanggal_st),
        maksud_perjalanan: values.maksud_perjalanan,
        mata_anggaran: values.mata_anggaran,
        jenis_perjalanan: values.jenis_perjalanan,
        dalam_kota_lebih_8_jam: false,
        lokasi_asal: values.lokasi_asal,
        lokasi_asal_provinsi_kode: values.lokasi_asal_provinsi_kode,
        lokasi_asal_provinsi_nama: values.lokasi_asal_provinsi_nama,
        lokasi_asal_kota_kode: values.lokasi_asal_kota_kode,
        lokasi_asal_kota_nama: values.lokasi_asal_kota_nama,
        lokasi_tujuan: values.lokasi_tujuan,
        lokasi_tujuan_provinsi_kode: values.lokasi_tujuan_provinsi_kode,
        lokasi_tujuan_provinsi_nama: values.lokasi_tujuan_provinsi_nama,
        lokasi_tujuan_kota_kode: values.lokasi_tujuan_kota_kode,
        lokasi_tujuan_kota_nama: values.lokasi_tujuan_kota_nama,
        lokasi_tujuan_kecamatan_kode: values.lokasi_tujuan_kecamatan_kode,
        lokasi_tujuan_kecamatan_nama: values.lokasi_tujuan_kecamatan_nama,
        lokasi_tujuan_kecamatan_kode_list: values.lokasi_tujuan_kecamatan_kode_list,
        lokasi_tujuan_kecamatan_nama_list: values.lokasi_tujuan_kecamatan_nama_list,
        lokasi_tujuan_kelurahan_kode_list: values.lokasi_tujuan_kelurahan_kode_list,
        lokasi_tujuan_kelurahan_nama_list: values.lokasi_tujuan_kelurahan_nama_list,
        lokasi_tujuan_custom_dalam_kota: values.lokasi_tujuan_custom_dalam_kota,
        tanggal_mulai: new Date(values.tanggal_mulai),
        tanggal_selesai: new Date(values.tanggal_selesai),
        pelaksana: values.pelaksana.map((item) => item.pegawai_id),
        uang_muka_dp: values.pelaksana.map((item) => ({
          pegawai_id: item.pegawai_id,
          nominal: Number(item.nominal_dp ?? 0),
        })),
      });

      setPreview(hasil as PreviewEstimasi);
      setPesan("Preview estimasi berhasil dihitung dari SBM.");
    } catch (error) {
      setPesan(error instanceof Error ? error.message : "Gagal menghitung estimasi.");
    }
  }

  async function handleSimpan(values: FormValues) {
    try {
      setPesan("");

      const hasil = await buatPengajuanSppdAction({
        nomor_st: values.nomor_st,
        tanggal_st: new Date(values.tanggal_st),
        maksud_perjalanan: values.maksud_perjalanan,
        mata_anggaran: values.mata_anggaran,
        jenis_perjalanan: values.jenis_perjalanan,
        dalam_kota_lebih_8_jam: false,
        lokasi_asal: values.lokasi_asal,
        lokasi_asal_provinsi_kode: values.lokasi_asal_provinsi_kode,
        lokasi_asal_provinsi_nama: values.lokasi_asal_provinsi_nama,
        lokasi_asal_kota_kode: values.lokasi_asal_kota_kode,
        lokasi_asal_kota_nama: values.lokasi_asal_kota_nama,
        lokasi_tujuan: values.lokasi_tujuan,
        lokasi_tujuan_provinsi_kode: values.lokasi_tujuan_provinsi_kode,
        lokasi_tujuan_provinsi_nama: values.lokasi_tujuan_provinsi_nama,
        lokasi_tujuan_kota_kode: values.lokasi_tujuan_kota_kode,
        lokasi_tujuan_kota_nama: values.lokasi_tujuan_kota_nama,
        lokasi_tujuan_kecamatan_kode: values.lokasi_tujuan_kecamatan_kode,
        lokasi_tujuan_kecamatan_nama: values.lokasi_tujuan_kecamatan_nama,
        lokasi_tujuan_kecamatan_kode_list: values.lokasi_tujuan_kecamatan_kode_list,
        lokasi_tujuan_kecamatan_nama_list: values.lokasi_tujuan_kecamatan_nama_list,
        lokasi_tujuan_kelurahan_kode_list: values.lokasi_tujuan_kelurahan_kode_list,
        lokasi_tujuan_kelurahan_nama_list: values.lokasi_tujuan_kelurahan_nama_list,
        lokasi_tujuan_custom_dalam_kota: values.lokasi_tujuan_custom_dalam_kota,
        tanggal_mulai: new Date(values.tanggal_mulai),
        tanggal_selesai: new Date(values.tanggal_selesai),
        pelaksana: values.pelaksana.map((item) => item.pegawai_id),
        uang_muka_dp: values.pelaksana.map((item) => ({
          pegawai_id: item.pegawai_id,
          nominal: Number(item.nominal_dp ?? 0),
        })),
      });

      setPesan(hasil.message);
      router.push(`/sppd/${hasil.sppdId}`);
      router.refresh();
    } catch (error) {
      setPesan(error instanceof Error ? error.message : "Gagal menyimpan SPPD.");
    }
  }

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[16px] border border-[#eadde0] p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e2342d] text-sm font-bold text-white">
                1
              </div>
              <div>
                <p className="font-bold text-[#e2342d]">Detail Perjalanan</p>
                <p className="text-xs text-[#8f97a8]">Informasi Utama</p>
              </div>
            </div>
            <div className="h-1 rounded-full bg-[#e2342d]" />
          </div>
          <div className="rounded-[16px] border border-[#eceef4] p-4 opacity-60">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef1f7] text-sm font-bold text-[#70798c]">
                2
              </div>
              <div>
                <p className="font-bold text-[#80889a]">Pemilihan Personel</p>
                <p className="text-xs text-[#9ca4b5]">Anggota pelaksana</p>
              </div>
            </div>
            <div className="h-1 rounded-full bg-[#eceff5]" />
          </div>
          <div className="rounded-[16px] border border-[#eceef4] p-4 opacity-60">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef1f7] text-sm font-bold text-[#70798c]">
                3
              </div>
              <div>
                <p className="font-bold text-[#80889a]">Pengaturan Keuangan</p>
                <p className="text-xs text-[#9ca4b5]">Uang harian & DP</p>
              </div>
            </div>
            <div className="h-1 rounded-full bg-[#eceff5]" />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="card p-6">
          <div className="mb-6">
            <h2 className="text-[18px] font-bold text-[#252c38]">Langkah 1: Informasi Utama</h2>
            <p className="mt-1 text-sm text-[#7d8598]">
              Asal perjalanan dinas selalu dari Kota Dumai. Pilih jenis perjalanan lalu tentukan tujuan secara langsung.
            </p>
          </div>

          <form className="space-y-5" onSubmit={form.handleSubmit(() => undefined)}>
            <input type="hidden" {...form.register("jenis_perjalanan")} />
            <input type="hidden" {...form.register("lokasi_asal")} />
            <input type="hidden" {...form.register("lokasi_asal_provinsi_kode")} />
            <input type="hidden" {...form.register("lokasi_asal_provinsi_nama")} />
            <input type="hidden" {...form.register("lokasi_asal_kota_kode")} />
            <input type="hidden" {...form.register("lokasi_asal_kota_nama")} />
            <input type="hidden" {...form.register("lokasi_tujuan")} />
            <input type="hidden" {...form.register("lokasi_tujuan_provinsi_kode")} />
            <input type="hidden" {...form.register("lokasi_tujuan_provinsi_nama")} />
            <input type="hidden" {...form.register("lokasi_tujuan_kota_kode")} />
            <input type="hidden" {...form.register("lokasi_tujuan_kota_nama")} />
            <input type="hidden" {...form.register("lokasi_tujuan_kecamatan_kode")} />
            <input type="hidden" {...form.register("lokasi_tujuan_kecamatan_nama")} />
            <input type="hidden" {...form.register("lokasi_tujuan_kecamatan_kode_list")} />
            <input type="hidden" {...form.register("lokasi_tujuan_kecamatan_nama_list")} />
            <input type="hidden" {...form.register("lokasi_tujuan_kelurahan_kode_list")} />
            <input type="hidden" {...form.register("lokasi_tujuan_kelurahan_nama_list")} />
            <input type="hidden" {...form.register("lokasi_tujuan_custom_dalam_kota")} />

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label">Nomor Surat Tugas</label>
                <input className="input" {...form.register("nomor_st")} placeholder="contoh: 001/SPPD/KPU-DUM/2026" />
              </div>
              <div>
                <label className="label">Tanggal Surat Tugas</label>
                <input className="input" type="date" {...form.register("tanggal_st")} />
              </div>
              <div className="md:col-span-2">
                <label className="label">Maksud Perjalanan</label>
                <textarea
                  className="input min-h-[132px] resize-none"
                  {...form.register("maksud_perjalanan")}
                  placeholder="Jelaskan alasan dan tujuan perjalanan dinas..."
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Mata Anggaran</label>
                <select className="input" {...form.register("mata_anggaran")}>
                  {daftarMataAnggaran.length === 0 ? (
                    <option value="524111">524111 - Belanja Perjalanan Dinas (Default)</option>
                  ) : (
                    daftarMataAnggaran.map((item) => (
                      <option key={item._id} value={item.kode}>
                        {item.kode} - {item.deskripsi}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="label">Kota Asal</label>
                <div className="input flex items-center bg-[#f7f8fc] font-semibold text-[#4c5567]">
                  {ASAL_TETAP.lokasi_asal}
                </div>
              </div>
              <div>
                <label className="label">Jenis Perjalanan Dinas</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className={`rounded-[16px] border px-4 py-3 text-sm font-semibold transition ${
                      jenisPerjalanan === "Dalam_Kota"
                        ? "border-[#f0c9c5] bg-[#fff7f6] text-[#d94841]"
                        : "border-[#dfe4ee] text-[#556072]"
                    }`}
                    onClick={() => pilihJenisPerjalanan("Dalam_Kota")}
                  >
                    Dalam Kota
                  </button>
                  <button
                    type="button"
                    className={`rounded-[16px] border px-4 py-3 text-sm font-semibold transition ${
                      jenisPerjalanan === "Luar_Kota"
                        ? "border-[#f0c9c5] bg-[#fff7f6] text-[#d94841]"
                        : "border-[#dfe4ee] text-[#556072]"
                    }`}
                    onClick={() => pilihJenisPerjalanan("Luar_Kota")}
                  >
                    Luar Kota
                  </button>
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="label">
                  {jenisPerjalanan === "Dalam_Kota" ? "Tujuan Dalam Kota di Dumai" : "Kota/Kabupaten Tujuan"}
                </label>
                {jenisPerjalanan === "Dalam_Kota" ? (
                  <div className="space-y-3">
                    <SearchableSelect
                      value={draftKecamatanKode}
                      options={opsiKecamatan}
                      placeholder="Cari dan tambahkan kecamatan tujuan..."
                      onChange={(value) => {
                        setDraftKecamatanKode(value);
                        pilihTujuanDalamKota(value);
                      }}
                    />
                    <SearchableSelect
                      value={draftKelurahanKode}
                      options={opsiKelurahan}
                      placeholder="Cari dan tambahkan kelurahan tujuan..."
                      onChange={(value) => {
                        setDraftKelurahanKode(value);
                        pilihKelurahanDalamKota(value);
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      {tujuanKecamatanList.length > 0 ? (
                        tujuanKecamatanList.map((item, index) => (
                          <button
                            key={`${item}-${index}`}
                            type="button"
                            className="rounded-full bg-[#eef1f7] px-3 py-1.5 text-xs font-semibold text-[#4f5869]"
                            onClick={() =>
                              hapusTujuanKecamatan(
                                form.getValues("lokasi_tujuan_kecamatan_kode_list")[index] ?? "",
                              )
                            }
                          >
                            {item} x
                          </button>
                        ))
                      ) : (
                        <span className="text-xs text-[#8f97a8]">Belum ada kecamatan dipilih.</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tujuanKelurahanList.length > 0 ? (
                        tujuanKelurahanList.map((item, index) => (
                          <button
                            key={`${item}-${index}`}
                            type="button"
                            className="rounded-full bg-[#edf8f0] px-3 py-1.5 text-xs font-semibold text-[#2f7a47]"
                            onClick={() =>
                              hapusTujuanKelurahan(
                                form.getValues("lokasi_tujuan_kelurahan_kode_list")[index] ?? "",
                              )
                            }
                          >
                            {item} x
                          </button>
                        ))
                      ) : (
                        <span className="text-xs text-[#8f97a8]">Belum ada kelurahan dipilih.</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        className="input"
                        value={customTujuanInput}
                        placeholder="Tambah tujuan custom dalam kota..."
                        onChange={(event) => setCustomTujuanInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            tambahTujuanCustomDalamKota();
                          }
                        }}
                      />
                      <button className="btn-secondary whitespace-nowrap" type="button" onClick={tambahTujuanCustomDalamKota}>
                        Tambah
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tujuanCustomList.length > 0 ? (
                        tujuanCustomList.map((item) => (
                          <button
                            key={item}
                            type="button"
                            className="rounded-full bg-[#fff0ef] px-3 py-1.5 text-xs font-semibold text-[#d94841]"
                            onClick={() => hapusTujuanCustomDalamKota(item)}
                          >
                            {item} x
                          </button>
                        ))
                      ) : (
                        <span className="text-xs text-[#8f97a8]">Belum ada tujuan custom.</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <SearchableSelect
                    value={form.watch("lokasi_tujuan_kota_kode")}
                    options={opsiLuarKota}
                    placeholder="Cari kota atau kabupaten tujuan..."
                    onChange={pilihTujuanLuarKota}
                  />
                )}
              </div>
              <div>
                <label className="label">Tanggal Berangkat</label>
                <input className="input" type="date" {...form.register("tanggal_mulai")} />
              </div>
              <div>
                <label className="label">Tanggal Kembali</label>
                <input className="input" type="date" {...form.register("tanggal_selesai")} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Daftar Pelaksana</h3>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => pelaksanaFields.append({ pegawai_id: "", nominal_dp: 0 })}
                >
                  Tambah Pelaksana
                </button>
              </div>

              {pelaksanaFields.fields.map((field, index) => (
                <div key={field.id} className="rounded-[16px] border border-[#e7eaf1] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-[#434b5c]">Pelaksana {index + 1}</p>
                    {pelaksanaFields.fields.length > 1 ? (
                      <button
                        className="text-sm font-semibold text-[#e2342d]"
                        type="button"
                        onClick={() => pelaksanaFields.remove(index)}
                      >
                        Hapus
                      </button>
                    ) : null}
                  </div>

                  <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                    <div>
                      <label className="label">Pegawai</label>
                      <select className="input" {...form.register(`pelaksana.${index}.pegawai_id`)}>
                        <option value="">Pilih pegawai</option>
                        {opsiPegawai.map((opsi) => (
                          <option key={opsi.value} value={opsi.value}>
                            {opsi.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">DP / Uang Muka</label>
                      <input
                        className="input"
                        type="number"
                        min={0}
                        {...form.register(`pelaksana.${index}.nominal_dp`, { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button className="btn-secondary min-w-[120px]" type="button">
                Batal
              </button>
              <div className="flex flex-wrap gap-3">
                <button
                  className="btn-secondary"
                  type="button"
                  disabled={isPending}
                  onClick={form.handleSubmit((values) => {
                    startTransition(async () => {
                      await handlePreview(values);
                    });
                  })}
                >
                  {isPending ? "Menghitung..." : "Preview Estimasi SBM"}
                </button>
                <button
                  className="btn-primary"
                  type="button"
                  disabled={isPending}
                  onClick={form.handleSubmit((values) => {
                    startTransition(async () => {
                      await handleSimpan(values);
                    });
                  })}
                >
                  {isPending ? "Menyimpan..." : "Lanjut ke Langkah 2"}
                </button>
              </div>
            </div>

            {pesan ? (
              <div className="rounded-2xl bg-[#fff1ef] px-4 py-3 text-sm font-medium text-[#d9544d]">
                {pesan}
              </div>
            ) : null}
          </form>
        </section>

        <aside className="space-y-4">
          <section className="card border-dashed p-5">
            <p className="text-[13px] font-bold uppercase tracking-wide text-[#7f8799]">
              Langkah Berikutnya 2
            </p>
            <h3 className="mt-3 text-[18px] font-bold text-[#252c38]">Pemilihan Personel</h3>
            <p className="mt-2 text-sm leading-6 text-[#838ca0]">
              Pilih pegawai yang akan ditugaskan dalam surat perjalanan dinas ini.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {form
                .watch("pelaksana")
                .map((item) => daftarPegawai.find((pegawai) => pegawai._id === item.pegawai_id)?.nama)
                .filter(Boolean)
                .slice(0, 3)
                .map((nama) => (
                  <span
                    key={nama}
                    className="rounded-full bg-[#eef1f7] px-3 py-1.5 text-xs font-semibold text-[#5e6677]"
                  >
                    {nama}
                  </span>
                ))}
            </div>
          </section>

          <section className="card border-dashed p-5">
            <p className="text-[13px] font-bold uppercase tracking-wide text-[#7f8799]">
              Konteks Perjalanan
            </p>
            <div className="mt-3 space-y-3 text-sm text-[#5c6476]">
              <div className="flex items-center justify-between">
                <span>Jenis</span>
                <strong>{jenisPerjalanan === "Dalam_Kota" ? "Dalam Kota" : "Luar Kota"}</strong>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Tujuan</span>
                <strong className="text-right">{form.watch("lokasi_tujuan") || "-"}</strong>
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h3 className="text-[18px] font-bold text-[#252c38]">Preview Estimasi</h3>
            <p className="mt-1 text-sm text-[#7f8799]">
              Perjalanan dalam kota memakai kecamatan atau kelurahan di Dumai. Perjalanan luar kota memakai kota/kabupaten tujuan langsung.
            </p>

            {preview ? (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[16px] bg-[#f5f7fb] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8c95a8]">Provinsi</p>
                    <p className="mt-2 text-base font-bold text-[#252c38]">{preview.provinsi}</p>
                  </div>
                  <div className="rounded-[16px] bg-[#f5f7fb] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8c95a8]">Jumlah Hari</p>
                    <p className="mt-2 text-base font-bold text-[#252c38]">{preview.jumlah_hari} hari</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {preview.rincian_per_pegawai.map((item) => (
                    <div key={item.pegawaiId} className="rounded-[16px] border border-[#e8ebf1] p-4">
                      <p className="font-semibold text-[#252c38]">{item.namaPegawai}</p>
                      <p className="text-sm text-[#7d8598]">
                        {item.jabatan} | {item.pangkatGolongan}
                      </p>
                      <div className="mt-3 grid gap-2 text-sm text-[#5d6678]">
                        <div className="flex items-center justify-between">
                          <span>Uang harian</span>
                          <strong>{formatRupiah(item.uangHarian)}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Transport</span>
                          <strong>{formatRupiah(item.transport)}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Hotel</span>
                          <strong>{formatRupiah(item.hotel)}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>DP</span>
                          <strong>{formatRupiah(item.uangMukaDp)}</strong>
                        </div>
                        <div className="flex items-center justify-between border-t border-[#edf0f5] pt-2 text-base">
                          <span>Total estimasi</span>
                          <strong>{formatRupiah(item.total)}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-[16px] bg-[#fff0ef] p-4 text-sm text-[#ba433d]">
                  <div className="flex items-center justify-between">
                    <span>Total Estimasi Tim</span>
                    <strong>{formatRupiah(preview.total_estimasi_tim)}</strong>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span>Total DP Tim</span>
                    <strong>{formatRupiah(preview.total_dp_tim)}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-[16px] border border-dashed border-[#d8dde8] p-6 text-sm text-[#7d8598]">
                Pilih jenis perjalanan dan tujuan, lalu klik Preview Estimasi SBM.
              </div>
            )}
          </section>

          <section className="rounded-[18px] bg-[#e2342d] p-5 text-white shadow-[0_16px_32px_rgba(226,52,45,0.22)]">
            <h3 className="text-lg font-bold">Panduan</h3>
            <p className="mt-3 text-sm leading-6 text-white/85">
              Untuk perjalanan dinas dalam kota, tujuan diambil dari master kecamatan atau kelurahan Kota Dumai. Untuk luar kota, operator langsung memilih kota atau kabupaten tujuan.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
