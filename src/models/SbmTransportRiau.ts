import { Model, Schema, Types, model, models } from "mongoose";

export interface ISbmTransportRiau {
  _id?: Types.ObjectId;
  asal: string;
  tujuan: string;
  satuan: string;
  tarif: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const SbmTransportRiauSchema = new Schema<ISbmTransportRiau>(
  {
    asal: {
      type: String,
      required: true,
      default: "Dumai",
      trim: true,
    },
    tujuan: {
      type: String,
      required: true,
      trim: true,
    },
    satuan: {
      type: String,
      required: true,
      trim: true,
      default: "Orang/Kali",
    },
    tarif: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: "sbm_transport_riau",
  },
);

SbmTransportRiauSchema.index({ asal: 1, tujuan: 1 }, { unique: true });

export const SbmTransportRiauModel =
  (models.SbmTransportRiau as Model<ISbmTransportRiau>) ||
  model<ISbmTransportRiau>("SbmTransportRiau", SbmTransportRiauSchema);
