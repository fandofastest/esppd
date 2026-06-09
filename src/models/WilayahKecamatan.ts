import { Model, Schema, Types, model, models } from "mongoose";

export interface IWilayahKecamatan {
  _id?: Types.ObjectId;
  kode: string;
  kode_kota_kabupaten: string;
  nama: string;
  nama_tampilan: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const WilayahKecamatanSchema = new Schema<IWilayahKecamatan>(
  {
    kode: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    kode_kota_kabupaten: {
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
    nama_tampilan: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "wilayah_kecamatan",
  },
);

WilayahKecamatanSchema.index({ kode_kota_kabupaten: 1, nama_tampilan: 1 });

export const WilayahKecamatanModel =
  (models.WilayahKecamatan as Model<IWilayahKecamatan>) ||
  model<IWilayahKecamatan>("WilayahKecamatan", WilayahKecamatanSchema);
