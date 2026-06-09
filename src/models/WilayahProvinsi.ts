import { Model, Schema, Types, model, models } from "mongoose";

export interface IWilayahProvinsi {
  _id?: Types.ObjectId;
  kode: string;
  nama: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const WilayahProvinsiSchema = new Schema<IWilayahProvinsi>(
  {
    kode: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    nama: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "wilayah_provinsi",
  },
);

WilayahProvinsiSchema.index({ nama: 1 });

export const WilayahProvinsiModel =
  (models.WilayahProvinsi as Model<IWilayahProvinsi>) ||
  model<IWilayahProvinsi>("WilayahProvinsi", WilayahProvinsiSchema);
