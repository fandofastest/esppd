import { Model, Schema, Types, model, models } from "mongoose";

export type StatusSppd = "Draft" | "Berjalan" | "LPJ_Diproses" | "Selesai";
export type JenisPerjalanan = "Dalam_Kota" | "Luar_Kota";

export interface ISuratTugasTemplate {
  pembuka: string;
  isi: string;
  penutup: string;
  pejabat_jabatan: string;
  pejabat_nama: string;
}

export interface IVisumTemplate {
  pengantar: string;
  catatan: string;
  penutup: string;
}

export interface IDokumenSppdTemplate {
  surat_tugas: ISuratTugasTemplate;
  visum: IVisumTemplate;
}

export interface IDokumenSppdFinal {
  surat_tugas: string;
  surat_tugas_generated_at?: Date;
  visum: string;
  visum_generated_at?: Date;
}

export interface IFinalisasiLpjSppd {
  nominal_pelunasan: number;
  finalized_at?: Date;
}

export interface ISppd {
  _id?: Types.ObjectId;
  nomor_st: string;
  tanggal_st: Date;
  maksud_perjalanan: string;
  mata_anggaran: string;
  jenis_perjalanan: JenisPerjalanan;
  dalam_kota_lebih_8_jam: boolean;
  lokasi_asal: string;
  lokasi_tujuan: string;
  lokasi_asal_provinsi_kode: string;
  lokasi_asal_provinsi_nama: string;
  lokasi_asal_kota_kode: string;
  lokasi_asal_kota_nama: string;
  lokasi_tujuan_provinsi_kode: string;
  lokasi_tujuan_provinsi_nama: string;
  lokasi_tujuan_kota_kode: string;
  lokasi_tujuan_kota_nama: string;
  lokasi_tujuan_kecamatan_kode?: string;
  lokasi_tujuan_kecamatan_nama?: string;
  lokasi_tujuan_kecamatan_kode_list?: string[];
  lokasi_tujuan_kecamatan_nama_list?: string[];
  lokasi_tujuan_kelurahan_kode_list?: string[];
  lokasi_tujuan_kelurahan_nama_list?: string[];
  lokasi_tujuan_custom_dalam_kota?: string[];
  tanggal_mulai: Date;
  tanggal_selesai: Date;
  jumlah_hari: number;
  pelaksana: Types.ObjectId[];
  status: StatusSppd;
  dokumen_template: IDokumenSppdTemplate;
  dokumen_final: IDokumenSppdFinal;
  finalisasi_lpj?: IFinalisasiLpjSppd;
  createdAt?: Date;
  updatedAt?: Date;
}

const SuratTugasTemplateSchema = new Schema<ISuratTugasTemplate>(
  {
    pembuka: { type: String, required: true, trim: true, default: "" },
    isi: { type: String, required: true, trim: true, default: "" },
    penutup: { type: String, required: true, trim: true, default: "" },
    pejabat_jabatan: { type: String, required: true, trim: true, default: "" },
    pejabat_nama: { type: String, required: false, trim: true, default: "" },
  },
  { _id: false },
);

const VisumTemplateSchema = new Schema<IVisumTemplate>(
  {
    pengantar: { type: String, required: true, trim: true, default: "" },
    catatan: { type: String, required: true, trim: true, default: "" },
    penutup: { type: String, required: true, trim: true, default: "" },
  },
  { _id: false },
);

const DokumenSppdTemplateSchema = new Schema<IDokumenSppdTemplate>(
  {
    surat_tugas: {
      type: SuratTugasTemplateSchema,
      required: true,
      default: () => ({}),
    },
    visum: {
      type: VisumTemplateSchema,
      required: true,
      default: () => ({}),
    },
  },
  { _id: false },
);

const DokumenSppdFinalSchema = new Schema<IDokumenSppdFinal>(
  {
    surat_tugas: { type: String, trim: true, default: "" },
    surat_tugas_generated_at: { type: Date },
    visum: { type: String, trim: true, default: "" },
    visum_generated_at: { type: Date },
  },
  { _id: false },
);

const FinalisasiLpjSppdSchema = new Schema<IFinalisasiLpjSppd>(
  {
    nominal_pelunasan: { type: Number, required: true, default: 0 },
    finalized_at: { type: Date },
  },
  { _id: false },
);

const SppdSchema = new Schema<ISppd>(
  {
    nomor_st: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    tanggal_st: {
      type: Date,
      required: true,
    },
    maksud_perjalanan: {
      type: String,
      required: true,
      trim: true,
    },
    mata_anggaran: {
      type: String,
      required: true,
      trim: true,
      default: "",
    },
    jenis_perjalanan: {
      type: String,
      enum: ["Dalam_Kota", "Luar_Kota"],
      required: true,
      default: "Luar_Kota",
    },
    dalam_kota_lebih_8_jam: {
      type: Boolean,
      required: true,
      default: false,
    },
    lokasi_asal: {
      type: String,
      required: true,
      default: "Dumai",
      trim: true,
    },
    lokasi_asal_provinsi_kode: {
      type: String,
      required: true,
      trim: true,
    },
    lokasi_asal_provinsi_nama: {
      type: String,
      required: true,
      trim: true,
    },
    lokasi_asal_kota_kode: {
      type: String,
      required: true,
      trim: true,
    },
    lokasi_asal_kota_nama: {
      type: String,
      required: true,
      trim: true,
    },
    lokasi_tujuan: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    lokasi_tujuan_provinsi_kode: {
      type: String,
      required: true,
      trim: true,
    },
    lokasi_tujuan_provinsi_nama: {
      type: String,
      required: true,
      trim: true,
    },
    lokasi_tujuan_kota_kode: {
      type: String,
      required: true,
      trim: true,
    },
    lokasi_tujuan_kota_nama: {
      type: String,
      required: true,
      trim: true,
    },
    lokasi_tujuan_kecamatan_kode: {
      type: String,
      trim: true,
      default: "",
    },
    lokasi_tujuan_kecamatan_nama: {
      type: String,
      trim: true,
      default: "",
    },
    lokasi_tujuan_kecamatan_kode_list: {
      type: [String],
      default: [],
    },
    lokasi_tujuan_kecamatan_nama_list: {
      type: [String],
      default: [],
    },
    lokasi_tujuan_kelurahan_kode_list: {
      type: [String],
      default: [],
    },
    lokasi_tujuan_kelurahan_nama_list: {
      type: [String],
      default: [],
    },
    lokasi_tujuan_custom_dalam_kota: {
      type: [String],
      default: [],
    },
    tanggal_mulai: {
      type: Date,
      required: true,
    },
    tanggal_selesai: {
      type: Date,
      required: true,
    },
    jumlah_hari: {
      type: Number,
      required: true,
      min: 1,
    },
    pelaksana: [
      {
        type: Schema.Types.ObjectId,
        ref: "Pegawai",
        required: true,
      },
    ],
    status: {
      type: String,
      enum: ["Draft", "Berjalan", "LPJ_Diproses", "Selesai"],
      default: "Draft",
      required: true,
    },
    dokumen_template: {
      type: DokumenSppdTemplateSchema,
      required: true,
      default: () => ({}),
    },
    dokumen_final: {
      type: DokumenSppdFinalSchema,
      required: true,
      default: () => ({}),
    },
    finalisasi_lpj: {
      type: FinalisasiLpjSppdSchema,
      required: false,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    collection: "sppd",
  },
);

delete models.Sppd;

export const SppdModel = model<ISppd>("Sppd", SppdSchema);
