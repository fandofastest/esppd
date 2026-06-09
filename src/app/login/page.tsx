import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/LoginForm";
import { getSession } from "@/lib/auth/session";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-blue-50 px-6 py-10">
      <LoginForm />
    </main>
  );
}
