import { randomBytes, scryptSync } from "node:crypto";
import mongoose from "mongoose";

const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
const adminUsername = process.env.ADMIN_USERNAME;
const adminPassword = process.env.ADMIN_PASSWORD;
const adminName = process.env.ADMIN_NAME ?? "Administrator e-SPPD";

if (!mongoUri || !dbName) {
  throw new Error("MONGODB_URI dan MONGODB_DB wajib tersedia di .env.local");
}

if (!adminUsername || !adminPassword) {
  throw new Error("ADMIN_USERNAME dan ADMIN_PASSWORD wajib tersedia di .env.local");
}

const AdminUserSchema = new mongoose.Schema(
  {
    nama: { type: String, required: true, trim: true },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    password_hash: { type: String, required: true },
    role: {
      type: String,
      enum: ["Admin", "Operator"],
      required: true,
      default: "Admin",
    },
    is_active: { type: Boolean, required: true, default: true },
  },
  {
    timestamps: true,
    collection: "admin_users",
  },
);

const AdminUserModel =
  mongoose.models.AdminUser || mongoose.model("AdminUser", AdminUserSchema);

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");

  return `${salt}:${derivedKey}`;
}

async function run() {
  await mongoose.connect(mongoUri, { dbName });

  const username = adminUsername.trim().toLowerCase();
  const passwordHash = hashPassword(adminPassword);

  const result = await AdminUserModel.findOneAndUpdate(
    { username },
    {
      $set: {
        nama: adminName,
        username,
        password_hash: passwordHash,
        role: "Admin",
        is_active: true,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    },
  );

  console.log(`Admin berhasil di-seed: ${result.username} (${result.role})`);
}

run()
  .catch((error) => {
    console.error("Gagal seed admin:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
