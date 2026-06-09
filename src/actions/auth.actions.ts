"use server";

import { redirect } from "next/navigation";

import { verifyPassword } from "@/lib/auth/password";
import { clearSession, setSession } from "@/lib/auth/session";
import { connectMongoDB } from "@/lib/db/mongoose";
import { AdminUserModel } from "@/models";

export async function loginAction(
  _prevState: { success: boolean; message: string },
  formData: FormData,
) {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "").trim();

  if (!username || !password) {
    return {
      success: false,
      message: "Nama pengguna dan kata sandi wajib diisi.",
    };
  }

  await connectMongoDB();

  const user = await AdminUserModel.findOne({ username }).lean();
  if (!user || !user.is_active) {
    return {
      success: false,
      message: "Akun tidak ditemukan atau tidak aktif.",
    };
  }

  const isValidPassword = verifyPassword(password, user.password_hash);
  if (!isValidPassword) {
    return {
      success: false,
      message: "Kata sandi salah.",
    };
  }

  await setSession({
    _id: user._id,
    username: user.username,
    role: user.role,
  });

  redirect("/");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
