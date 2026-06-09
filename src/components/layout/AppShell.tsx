import {
  BarChart3,
  Bell,
  CirclePlus,
  FileText,
  LayoutGrid,
  Search,
  Settings,
  ShieldCheck,
  UserCircle2,
  Users,
} from "lucide-react";
import Link from "next/link";

import { logoutAction } from "@/actions/auth.actions";
import { FormActionButton } from "@/components/forms/FormActionButton";

interface AppShellProps {
  children: React.ReactNode;
  nama: string;
  role: "Admin" | "Operator";
  currentPath?: string;
}

const menuItems = [
  { href: "/", label: "Beranda", icon: LayoutGrid },
  { href: "/sppd", label: "Data SPPD", icon: FileText },
  { href: "/laporan", label: "Laporan", icon: BarChart3 },
  { href: "/sppd/baru", label: "Buat Baru", icon: CirclePlus },
  { href: "/master/pegawai", label: "Pegawai", icon: Users },
  { href: "/master/sbm", label: "Master SBM", icon: Settings },
  { href: "/master/mata-anggaran", label: "Mata Anggaran", icon: FileText },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings, adminOnly: true },
];

function isMenuActive(itemHref: string, currentPath: string) {
  if (itemHref === "/") {
    return currentPath === "/";
  }

  if (itemHref === "/sppd") {
    return (
      currentPath === "/sppd" ||
      (/^\/sppd\/[^/]+$/.test(currentPath) && currentPath !== "/sppd/baru")
    );
  }

  return currentPath === itemHref || currentPath.startsWith(`${itemHref}/`);
}

export function AppShell({ children, nama, role, currentPath = "/" }: AppShellProps) {
  const visibleMenuItems = menuItems.filter((item) => !item.adminOnly || role === "Admin");

  return (
    <div className="min-h-screen bg-[#f3f4fa]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] lg:grid-cols-[190px_1fr]">
        <aside className="border-r border-[#e1e4ee] bg-[#fbfbfd] px-3 py-6">
          <div>
            <p className="text-[14px] font-extrabold tracking-tight text-[#e2342d]">
              e-SPPD
            </p>
            <p className="mt-1 text-sm text-[#6c7384]">
              KPU Dumai {role === "Admin" ? "Admin" : "Operator"}
            </p>
          </div>

          <nav className="mt-8 space-y-1.5">
            {visibleMenuItems.map((item) => (
              (() => {
                const Icon = item.icon;
                const active = isMenuActive(item.href, currentPath);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold transition ${
                      active
                        ? "bg-[#e2342d] text-white shadow-[0_12px_24px_rgba(226,52,45,0.22)]"
                        : "text-[#5d6577] hover:bg-[#f1f3f8]"
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })()
            ))}
          </nav>

          <div className="mt-8 rounded-2xl bg-[#f1f3fa] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#e2342d] shadow-sm">
                <UserCircle2 size={20} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[#283042]">{nama}</p>
                <p className="text-xs text-[#7b8394]">{role}</p>
              </div>
            </div>
            <form action={logoutAction} className="mt-4">
              <FormActionButton
                className="btn-secondary w-full text-sm"
                label="Keluar"
                pendingLabel="Keluar..."
              />
            </form>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="border-b border-[#e1e4ee] bg-[#fbfbfd] px-8 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-[260px] flex-1 items-center gap-4">
                <div className="relative w-full max-w-[360px]">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8b93a6]"
                  />
                  <input
                    className="w-full rounded-full border border-[#e2e6ef] bg-[#eff1f7] py-3 pl-11 pr-4 text-sm text-[#4c5668] outline-none"
                    placeholder="Cari SPPD, nama, atau tujuan..."
                    readOnly
                  />
                </div>
                <p className="hidden text-sm font-semibold text-[#5e6678] xl:block">
                  e-SPPD KPU Dumai
                </p>
              </div>

              <div className="flex items-center gap-4 text-[#4c5567]">
                <Bell size={18} />
                <ShieldCheck size={18} />
                <div className="flex items-center gap-3 rounded-full bg-white px-3 py-2 shadow-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff0ef] text-[#e2342d]">
                    <UserCircle2 size={17} />
                  </div>
                  <div className="hidden text-left md:block">
                    <p className="text-sm font-semibold text-[#283042]">{nama}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="p-7">{children}</div>
        </div>
      </div>
    </div>
  );
}
