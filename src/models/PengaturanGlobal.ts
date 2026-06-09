import { Model, Schema, model, models } from "mongoose";

export interface IPengaturanGlobal {
  key: string;
  ketua_nama: string;
  sekretaris_nama: string;
  sekretaris_nip: string;
  ppk_nama: string;
  ppk_nip: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const PengaturanGlobalSchema = new Schema<IPengaturanGlobal>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "global",
      trim: true,
    },
    ketua_nama: {
      type: String,
      required: true,
      trim: true,
      default: "",
    },
    sekretaris_nama: {
      type: String,
      required: true,
      trim: true,
      default: "",
    },
    sekretaris_nip: {
      type: String,
      required: true,
      trim: true,
      default: "",
    },
    ppk_nama: {
      type: String,
      required: true,
      trim: true,
      default: "",
    },
    ppk_nip: {
      type: String,
      required: true,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
    collection: "pengaturan_global",
  },
);

export const PengaturanGlobalModel =
  (models.PengaturanGlobal as Model<IPengaturanGlobal>) ||
  model<IPengaturanGlobal>("PengaturanGlobal", PengaturanGlobalSchema);
