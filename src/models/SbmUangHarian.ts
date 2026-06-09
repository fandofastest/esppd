import { Model, Schema, Types, model, models } from "mongoose";

export interface ISbmUangHarian {
  _id?: Types.ObjectId;
  provinsi: string;
  satuan: string;
  luar_kota: number;
  dalam_kota_lebih_8jam: number;
  diklat: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const SbmUangHarianSchema = new Schema<ISbmUangHarian>(
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
    luar_kota: {
      type: Number,
      required: true,
      default: 0,
    },
    dalam_kota_lebih_8jam: {
      type: Number,
      required: true,
      default: 0,
    },
    diklat: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: "sbm_uang_harian",
  },
);

SbmUangHarianSchema.index({ provinsi: 1 }, { unique: true });

export const SbmUangHarianModel =
  (models.SbmUangHarian as Model<ISbmUangHarian>) ||
  model<ISbmUangHarian>("SbmUangHarian", SbmUangHarianSchema);
