import { Model, Schema, Types, model, models } from "mongoose";

export interface ISbmTransportTerminal {
  _id?: Types.ObjectId;
  provinsi: string;
  satuan: string;
  tarif: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const SbmTransportTerminalSchema = new Schema<ISbmTransportTerminal>(
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
    collection: "sbm_transport_terminal",
  },
);

SbmTransportTerminalSchema.index({ provinsi: 1 }, { unique: true });

export const SbmTransportTerminalModel =
  (models.SbmTransportTerminal as Model<ISbmTransportTerminal>) ||
  model<ISbmTransportTerminal>("SbmTransportTerminal", SbmTransportTerminalSchema);
