import { Model, Schema, model, models } from "mongoose";

export interface IMataAnggaran {
  _id?: string;
  kode: string;
  deskripsi: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const MataAnggaranSchema = new Schema<IMataAnggaran>(
  {
    kode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    deskripsi: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: "mata_anggaran",
  }
);

export const MataAnggaranModel =
  (models.MataAnggaran as Model<IMataAnggaran>) ||
  model<IMataAnggaran>("MataAnggaran", MataAnggaranSchema);
