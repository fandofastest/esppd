import { Model, Schema, Types, model, models } from "mongoose";

export type RolePengguna = "Admin" | "Operator";

export interface IAdminUser {
  _id?: Types.ObjectId;
  nama: string;
  username: string;
  password_hash: string;
  role: RolePengguna;
  is_active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const AdminUserSchema = new Schema<IAdminUser>(
  {
    nama: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password_hash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["Admin", "Operator"],
      required: true,
      default: "Admin",
    },
    is_active: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "admin_users",
  },
);

export const AdminUserModel =
  (models.AdminUser as Model<IAdminUser>) ||
  model<IAdminUser>("AdminUser", AdminUserSchema);
