import { Model, Schema, Types, model, models } from "mongoose";

export type JenisWilayahKotaKabupaten = "Kabupaten" | "Kota";

export interface IWilayahKotaKabupaten {
  _id?: Types.ObjectId;
  kode: string;
  kode_provinsi: string;
  nama: string;
  jenis: JenisWilayahKotaKabupaten;
  nama_tampilan: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const WilayahKotaKabupatenSchema = new Schema<IWilayahKotaKabupaten>(
  {
    kode: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    kode_provinsi: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    nama: {
      type: String,
      required: true,
      trim: true,
    },
    jenis: {
      type: String,
      enum: ["Kabupaten", "Kota"],
      required: true,
    },
    nama_tampilan: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "wilayah_kota_kabupaten",
  },
);

WilayahKotaKabupatenSchema.index({ kode_provinsi: 1, nama_tampilan: 1 });

export const WilayahKotaKabupatenModel =
  (models.WilayahKotaKabupaten as Model<IWilayahKotaKabupaten>) ||
  model<IWilayahKotaKabupaten>("WilayahKotaKabupaten", WilayahKotaKabupatenSchema);
