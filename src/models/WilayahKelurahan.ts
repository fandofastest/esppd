import { Model, Schema, Types, model, models } from "mongoose";

export interface IWilayahKelurahan {
  _id?: Types.ObjectId;
  kode: string;
  kode_kecamatan: string;
  kode_kota_kabupaten: string;
  nama: string;
  nama_tampilan: string;
  kecamatan_nama: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const WilayahKelurahanSchema = new Schema<IWilayahKelurahan>(
  {
    kode: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    kode_kecamatan: {
      type: String,
      required: true,
      trim: true,
      index: true,
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
    kecamatan_nama: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "wilayah_kelurahan",
  },
);

WilayahKelurahanSchema.index({ kode_kecamatan: 1, nama_tampilan: 1 });
WilayahKelurahanSchema.index({ kode_kota_kabupaten: 1, nama_tampilan: 1 });

export const WilayahKelurahanModel =
  (models.WilayahKelurahan as Model<IWilayahKelurahan>) ||
  model<IWilayahKelurahan>("WilayahKelurahan", WilayahKelurahanSchema);
