"use client";

import { useActionState } from "react";

import { loginAction } from "@/actions/auth.actions";

const initialState = {
  success: false,
  message: "",
};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="card w-full max-w-md space-y-5 p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
          e-SPPD KPU Kota Dumai
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Masuk ke aplikasi</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Gunakan akun Admin atau Operator yang telah dibuat di database.
        </p>
      </div>

      <div>
        <label className="label">Nama Pengguna</label>
        <input className="input" name="username" autoComplete="username" />
      </div>

      <div>
        <label className="label">Kata Sandi</label>
        <input className="input" type="password" name="password" autoComplete="current-password" />
      </div>

      {state?.message ? (
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {state.message}
        </div>
      ) : null}

      <button className="btn-primary w-full" type="submit" disabled={isPending}>
        {isPending ? "Memproses..." : "Masuk"}
      </button>
    </form>
  );
}
