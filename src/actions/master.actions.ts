"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { connectMongoDB } from "@/lib/db/mongoose";
import {
  AdminUserModel,
  PegawaiModel,
  PengaturanGlobalModel,
  SbmPenginapanModel,
  SbmTransportRiauModel,
  SbmUangHarianModel,
  MataAnggaranModel,
} from "@/models";

function toNumber(value: FormDataEntryValue | null) {
  return Number(String(value ?? "0").replace(/[^\d.-]/g, "") || 0);
}

function buildPengaturanRedirect(status: "success" | "error", message: string) {
  return `/pengaturan?status=${status}&message=${encodeURIComponent(message)}`;
}

function parseUserRole(value: FormDataEntryValue | null) {
  return String(value ?? "Operator") === "Admin" ? "Admin" : "Operator";
}

function parseUserActive(value: FormDataEntryValue | null) {
  return String(value ?? "true") !== "false";
}

async function ensureAnotherActiveAdminExists(currentUserId: string) {
  const activeAdminCount = await AdminUserModel.countDocuments({
    role: "Admin",
    is_active: true,
    _id: { $ne: currentUserId },
  });

  return activeAdminCount > 0;
}

export async function createPegawaiAction(formData: FormData) {
  await requireRole(["Admin"]);
  await connectMongoDB();

  const nip_nik_raw = String(formData.get("nip_nik") ?? "").trim();
  const jenis_pegawai = String(formData.get("jenis_pegawai") ?? "PNS");
  const nip_nik = (jenis_pegawai === "Komisioner" || nip_nik_raw === "-" || !nip_nik_raw) ? undefined : nip_nik_raw;
  const pangkat_golongan = jenis_pegawai === "Komisioner" ? "IV" : String(formData.get("pangkat_golongan") ?? "").trim();

  await PegawaiModel.create({
    nama: String(formData.get("nama") ?? "").trim(),
    nip_nik,
    pangkat_golongan,
    jabatan: String(formData.get("jabatan") ?? "").trim(),
    jenis_pegawai,
  });

  revalidatePath("/master/pegawai");
  revalidatePath("/sppd/baru");
}

export async function deletePegawaiAction(formData: FormData) {
  await requireRole(["Admin"]);
  await connectMongoDB();

  const id = String(formData.get("id") ?? "");
  await PegawaiModel.findByIdAndDelete(id);

  revalidatePath("/master/pegawai");
  revalidatePath("/sppd/baru");
}

export async function createSbmUangHarianAction(formData: FormData) {
  await requireRole(["Admin"]);
  await connectMongoDB();

  await SbmUangHarianModel.findOneAndUpdate(
    { provinsi: String(formData.get("provinsi") ?? "").trim() },
    {
      $set: {
        provinsi: String(formData.get("provinsi") ?? "").trim(),
        satuan: String(formData.get("satuan") ?? "OH").trim() || "OH",
        luar_kota: toNumber(formData.get("luar_kota")),
        dalam_kota_lebih_8jam: toNumber(formData.get("dalam_kota_lebih_8jam")),
        diklat: toNumber(formData.get("diklat")),
      },
    },
    { upsert: true, new: true },
  );

  revalidatePath("/master/sbm");
}

export async function createSbmPenginapanAction(formData: FormData) {
  await requireRole(["Admin"]);
  await connectMongoDB();

  await SbmPenginapanModel.findOneAndUpdate(
    { provinsi: String(formData.get("provinsi") ?? "").trim() },
    {
      $set: {
        provinsi: String(formData.get("provinsi") ?? "").trim(),
        satuan: String(formData.get("satuan") ?? "OH").trim() || "OH",
        tarif_eselon_1: toNumber(formData.get("tarif_eselon_1")),
        tarif_eselon_2: toNumber(formData.get("tarif_eselon_2")),
        tarif_eselon_3_gol_iv: toNumber(formData.get("tarif_eselon_3_gol_iv")),
        tarif_eselon_4_gol_iii_ii_i: toNumber(formData.get("tarif_eselon_4_gol_iii_ii_i")),
      },
    },
    { upsert: true, new: true },
  );

  revalidatePath("/master/sbm");
}

export async function createSbmTransportRiauAction(formData: FormData) {
  await requireRole(["Admin"]);
  await connectMongoDB();

  await SbmTransportRiauModel.findOneAndUpdate(
    {
      asal: String(formData.get("asal") ?? "").trim(),
      tujuan: String(formData.get("tujuan") ?? "").trim(),
    },
    {
      $set: {
        asal: String(formData.get("asal") ?? "").trim(),
        tujuan: String(formData.get("tujuan") ?? "").trim(),
        satuan: String(formData.get("satuan") ?? "Orang/Kali").trim() || "Orang/Kali",
        tarif: toNumber(formData.get("tarif")),
      },
    },
    { upsert: true, new: true },
  );

  revalidatePath("/master/sbm");
}

export async function simpanPengaturanGlobalAction(formData: FormData) {
  await requireRole(["Admin"]);
  await connectMongoDB();

  await PengaturanGlobalModel.findOneAndUpdate(
    { key: "global" },
    {
      $set: {
        key: "global",
        ketua_nama: String(formData.get("ketua_nama") ?? "").trim(),
        sekretaris_nama: String(formData.get("sekretaris_nama") ?? "").trim(),
        sekretaris_nip: String(formData.get("sekretaris_nip") ?? "").trim(),
        ppk_nama: String(formData.get("ppk_nama") ?? "").trim(),
        ppk_nip: String(formData.get("ppk_nip") ?? "").trim(),
      },
    },
    { upsert: true, new: true },
  );

  revalidatePath("/pengaturan");
  revalidatePath("/sppd");
  revalidatePath("/sppd/baru");
}

export async function createOperatorAccountAction(formData: FormData) {
  await requireRole(["Admin"]);
  await connectMongoDB();

  const nama = String(formData.get("nama") ?? "").trim();
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "").trim();

  if (!nama || !username || !password) {
    throw new Error("Nama, username, dan password operator wajib diisi.");
  }

  const existing = await AdminUserModel.findOne({ username }).lean();
  if (existing) {
    throw new Error("Username operator sudah digunakan.");
  }

  await AdminUserModel.create({
    nama,
    username,
    password_hash: hashPassword(password),
    role: "Operator",
    is_active: true,
  });

  revalidatePath("/pengaturan");
}

export async function createUserAccountAction(formData: FormData) {
  await requireRole(["Admin"]);
  await connectMongoDB();

  const nama = String(formData.get("nama") ?? "").trim();
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const role = parseUserRole(formData.get("role"));
  const isActive = parseUserActive(formData.get("is_active"));

  if (!nama || !username || !password) {
    redirect(buildPengaturanRedirect("error", "Nama, username, dan password wajib diisi."));
  }

  const existing = await AdminUserModel.findOne({ username }).lean();
  if (existing) {
    redirect(buildPengaturanRedirect("error", "Username sudah digunakan."));
  }

  await AdminUserModel.create({
    nama,
    username,
    password_hash: hashPassword(password),
    role,
    is_active: isActive,
  });

  revalidatePath("/pengaturan");
  redirect(buildPengaturanRedirect("success", "Akun pengguna berhasil ditambahkan."));
}

export async function updateUserAccountAction(formData: FormData) {
  const session = await requireRole(["Admin"]);
  await connectMongoDB();

  const userId = String(formData.get("id") ?? "");
  const nama = String(formData.get("nama") ?? "").trim();
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  const role = parseUserRole(formData.get("role"));
  const isActive = parseUserActive(formData.get("is_active"));

  if (!userId || !nama || !username) {
    redirect(buildPengaturanRedirect("error", "Nama dan username pengguna wajib diisi."));
  }

  const existingUser = await AdminUserModel.findById(userId);
  if (!existingUser) {
    redirect(buildPengaturanRedirect("error", "Akun pengguna tidak ditemukan."));
  }

  const duplicate = await AdminUserModel.findOne({
    username,
    _id: { $ne: userId },
  }).lean();
  if (duplicate) {
    redirect(buildPengaturanRedirect("error", "Username sudah digunakan akun lain."));
  }

  const isCurrentUser = session.userId === userId;
  const wasActiveAdmin = existingUser.role === "Admin" && existingUser.is_active;
  const willRemainActiveAdmin = role === "Admin" && isActive;

  if (isCurrentUser && !isActive) {
    redirect(buildPengaturanRedirect("error", "Akun yang sedang dipakai login tidak bisa dinonaktifkan."));
  }

  if (wasActiveAdmin && !willRemainActiveAdmin) {
    const hasAnotherActiveAdmin = await ensureAnotherActiveAdminExists(userId);
    if (!hasAnotherActiveAdmin) {
      redirect(buildPengaturanRedirect("error", "Minimal harus ada satu admin aktif."));
    }
  }

  existingUser.nama = nama;
  existingUser.username = username;
  existingUser.role = role;
  existingUser.is_active = isActive;
  if (password) {
    existingUser.password_hash = hashPassword(password);
  }

  await existingUser.save();

  revalidatePath("/pengaturan");
  redirect(buildPengaturanRedirect("success", "Perubahan akun pengguna berhasil disimpan."));
}

export async function deleteUserAccountAction(formData: FormData) {
  const session = await requireRole(["Admin"]);
  await connectMongoDB();

  const userId = String(formData.get("id") ?? "");
  if (!userId) {
    redirect(buildPengaturanRedirect("error", "Akun pengguna tidak valid."));
  }

  if (session.userId === userId) {
    redirect(buildPengaturanRedirect("error", "Akun yang sedang dipakai login tidak bisa dihapus."));
  }

  const existingUser = await AdminUserModel.findById(userId).lean();
  if (!existingUser) {
    redirect(buildPengaturanRedirect("error", "Akun pengguna tidak ditemukan."));
  }

  if (existingUser.role === "Admin" && existingUser.is_active) {
    const hasAnotherActiveAdmin = await ensureAnotherActiveAdminExists(userId);
    if (!hasAnotherActiveAdmin) {
      redirect(buildPengaturanRedirect("error", "Minimal harus ada satu admin aktif."));
    }
  }

  await AdminUserModel.findByIdAndDelete(userId);

  revalidatePath("/pengaturan");
  redirect(buildPengaturanRedirect("success", "Akun pengguna berhasil dihapus."));
}

export async function createMataAnggaranAction(formData: FormData) {
  await requireRole(["Admin"]);
  await connectMongoDB();

  await MataAnggaranModel.create({
    kode: String(formData.get("kode") ?? "").trim(),
    deskripsi: String(formData.get("deskripsi") ?? "").trim(),
  });

  revalidatePath("/master/mata-anggaran");
  revalidatePath("/sppd/baru");
}

export async function deleteMataAnggaranAction(formData: FormData) {
  await requireRole(["Admin"]);
  await connectMongoDB();

  const id = String(formData.get("id") ?? "");
  await MataAnggaranModel.findByIdAndDelete(id);

  revalidatePath("/master/mata-anggaran");
  revalidatePath("/sppd/baru");
}
