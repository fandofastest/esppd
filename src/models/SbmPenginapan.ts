import { Model, Schema, Types, model, models } from "mongoose";

export interface ISbmPenginapan {
  _id?: Types.ObjectId;
  provinsi: string;
  satuan: string;
  tarif_eselon_1: number;
  tarif_eselon_2: number;
  tarif_eselon_3_gol_iv: number;
  tarif_eselon_4_gol_iii_ii_i: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const SbmPenginapanSchema = new Schema<ISbmPenginapan>(
  {
    provinsi: {
      type: String,
      required: true,
      trim: true,
    },
    satuan: {
      type: String,
      required: true,
      trim: true,
      default: "OH",
    },
    tarif_eselon_1: {
      type: Number,
      required: true,
      default: 0,
    },
    tarif_eselon_2: {
      type: Number,
      required: true,
      default: 0,
    },
    tarif_eselon_3_gol_iv: {
      type: Number,
      required: true,
      default: 0,
    },
    tarif_eselon_4_gol_iii_ii_i: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: "sbm_penginapan",
  },
);

SbmPenginapanSchema.index({ provinsi: 1 }, { unique: true });

export const SbmPenginapanModel =
  (models.SbmPenginapan as Model<ISbmPenginapan>) ||
  model<ISbmPenginapan>("SbmPenginapan", SbmPenginapanSchema);
