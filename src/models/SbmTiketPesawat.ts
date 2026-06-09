import { Model, Schema, Types, model, models } from "mongoose";

export interface ISbmTiketPesawat {
  _id?: Types.ObjectId;
  asal: string;
  tujuan: string;
  bisnis: number;
  ekonomi: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const SbmTiketPesawatSchema = new Schema<ISbmTiketPesawat>(
  {
    asal: {
      type: String,
      required: true,
      trim: true,
    },
    tujuan: {
      type: String,
      required: true,
      trim: true,
    },
    bisnis: {
      type: Number,
      required: true,
      default: 0,
    },
    ekonomi: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: "sbm_tiket_pesawat",
  },
);

SbmTiketPesawatSchema.index({ asal: 1, tujuan: 1 }, { unique: true });

export const SbmTiketPesawatModel =
  (models.SbmTiketPesawat as Model<ISbmTiketPesawat>) ||
  model<ISbmTiketPesawat>("SbmTiketPesawat", SbmTiketPesawatSchema);
