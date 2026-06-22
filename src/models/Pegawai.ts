import { Model, Schema, Types, model, models } from "mongoose";

export type JenisPegawai = "PNS" | "PPPK" | "Komisioner" | "ASN" | "PPNPN";

export interface IPegawai {
  _id?: Types.ObjectId;
  nama: string;
  nip_nik?: string;
  pangkat_golongan: string;
  jabatan: string;
  jenis_pegawai: JenisPegawai;
  createdAt?: Date;
  updatedAt?: Date;
}

const PegawaiSchema = new Schema<IPegawai>(
  {
    nama: {
      type: String,
      required: true,
      trim: true,
    },
    nip_nik: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true,
    },
    pangkat_golongan: {
      type: String,
      required: true,
      trim: true,
    },
    jabatan: {
      type: String,
      required: true,
      trim: true,
    },
    jenis_pegawai: {
      type: String,
      enum: ["PNS", "PPPK", "Komisioner", "ASN", "PPNPN"],
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "pegawai",
  },
);

export const PegawaiModel =
  (models.Pegawai as Model<IPegawai>) || model<IPegawai>("Pegawai", PegawaiSchema);
