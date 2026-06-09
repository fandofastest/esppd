import { Model, Schema, Types, model, models } from "mongoose";

export type StatusHotel =
  | "Menggunakan_Hotel"
  | "Tanpa_Hotel_30_Persen"
  | "Dalam_Kota_Tanpa_Hotel";

export type StatusRampung = "Kurang_Bayar" | "Lebih_Bayar" | "Pas";

export interface IArchiveUploadSummary {
  archiveId: string;
  archiveNumber: string;
  originalName: string;
}

export interface IStoredLpjUploadDetail {
  value: string;
  uploadId: string;
  fileName: string;
  url: string;
  reference: string;
  createdAt: string;
  mimeType: string;
  archive: IArchiveUploadSummary;
}

export interface IKeuanganSppd {
  _id?: Types.ObjectId;
  sppd_id: Types.ObjectId;
  pegawai_id: Types.ObjectId;
  estimasi_awal: {
    uang_harian: number;
    transport: number;
    hotel: number;
    total: number;
  };
  uang_muka_dp: number;
  realisasi_akhir: {
    uang_harian: number;
    transport_riil: number;
    hotel_riil: number;
    total: number;
  };
  dalam_kota_lebih_8_jam: boolean;
  status_hotel: StatusHotel;
  alamat_menginap_tanpa_hotel?: string;
  berkas_lpj: {
    scan_visum: string[];
    scan_dpr: string[];
    foto_ktp: string[];
    bukti_hotel: string[];
    dokumentasi: string[];
    nota_bukti: string[];
  };
  berkas_lpj_detail?: {
    scan_visum: IStoredLpjUploadDetail[];
    scan_dpr: IStoredLpjUploadDetail[];
    foto_ktp: IStoredLpjUploadDetail[];
    bukti_hotel: IStoredLpjUploadDetail[];
    dokumentasi: IStoredLpjUploadDetail[];
    nota_bukti: IStoredLpjUploadDetail[];
  };
  status_rampung: StatusRampung;
  nominal_selisih_rampung: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const AngkaRingkasSchema = new Schema(
  {
    uang_harian: { type: Number, required: true, default: 0 },
    transport: { type: Number, required: true, default: 0 },
    hotel: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const RealisasiSchema = new Schema(
  {
    uang_harian: { type: Number, required: true, default: 0 },
    transport_riil: { type: Number, required: true, default: 0 },
    hotel_riil: { type: Number, required: true, default: 0 },
    total: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const BerkasLpjSchema = new Schema(
  {
    scan_visum: [{ type: String, default: [] }],
    scan_dpr: [{ type: String, default: [] }],
    foto_ktp: [{ type: String, default: [] }],
    bukti_hotel: [{ type: String, default: [] }],
    dokumentasi: [{ type: String, default: [] }],
    nota_bukti: [{ type: String, default: [] }],
  },
  { _id: false },
);

const ArchiveUploadSummarySchema = new Schema<IArchiveUploadSummary>(
  {
    archiveId: { type: String, default: "" },
    archiveNumber: { type: String, default: "" },
    originalName: { type: String, default: "" },
  },
  { _id: false },
);

const StoredLpjUploadDetailSchema = new Schema<IStoredLpjUploadDetail>(
  {
    value: { type: String, default: "" },
    uploadId: { type: String, default: "" },
    fileName: { type: String, default: "" },
    url: { type: String, default: "" },
    reference: { type: String, default: "" },
    createdAt: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    archive: { type: ArchiveUploadSummarySchema, default: () => ({}) },
  },
  { _id: false },
);

const BerkasLpjDetailSchema = new Schema(
  {
    scan_visum: [{ type: StoredLpjUploadDetailSchema, default: [] }],
    scan_dpr: [{ type: StoredLpjUploadDetailSchema, default: [] }],
    foto_ktp: [{ type: StoredLpjUploadDetailSchema, default: [] }],
    bukti_hotel: [{ type: StoredLpjUploadDetailSchema, default: [] }],
    dokumentasi: [{ type: StoredLpjUploadDetailSchema, default: [] }],
    nota_bukti: [{ type: StoredLpjUploadDetailSchema, default: [] }],
  },
  { _id: false },
);

const KeuanganSppdSchema = new Schema<IKeuanganSppd>(
  {
    sppd_id: {
      type: Schema.Types.ObjectId,
      ref: "Sppd",
      required: true,
      index: true,
    },
    pegawai_id: {
      type: Schema.Types.ObjectId,
      ref: "Pegawai",
      required: true,
      index: true,
    },
    estimasi_awal: {
      type: AngkaRingkasSchema,
      required: true,
    },
    uang_muka_dp: {
      type: Number,
      required: true,
      default: 0,
    },
    realisasi_akhir: {
      type: RealisasiSchema,
      required: true,
      default: {
        uang_harian: 0,
        transport_riil: 0,
        hotel_riil: 0,
        total: 0,
      },
    },
    dalam_kota_lebih_8_jam: {
      type: Boolean,
      required: true,
      default: false,
    },
    status_hotel: {
      type: String,
      enum: ["Menggunakan_Hotel", "Tanpa_Hotel_30_Persen", "Dalam_Kota_Tanpa_Hotel"],
      required: true,
      default: "Menggunakan_Hotel",
    },
    alamat_menginap_tanpa_hotel: {
      type: String,
      default: "",
    },
    berkas_lpj: {
      type: BerkasLpjSchema,
      required: true,
      default: {
        scan_visum: [],
        scan_dpr: [],
        foto_ktp: [],
        bukti_hotel: [],
        dokumentasi: [],
        nota_bukti: [],
      },
    },
    berkas_lpj_detail: {
      type: BerkasLpjDetailSchema,
      required: true,
      default: {
        scan_visum: [],
        scan_dpr: [],
        foto_ktp: [],
        bukti_hotel: [],
        dokumentasi: [],
        nota_bukti: [],
      },
    },
    status_rampung: {
      type: String,
      enum: ["Kurang_Bayar", "Lebih_Bayar", "Pas"],
      default: "Pas",
      required: true,
    },
    nominal_selisih_rampung: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: "keuangan_sppd",
  },
);

delete models.KeuanganSppd;

export const KeuanganSppdModel = model<IKeuanganSppd>("KeuanganSppd", KeuanganSppdSchema);
