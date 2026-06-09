import { BriefcaseBusiness, FileCheck2, FileClock, FileText } from "lucide-react";

interface DashboardStatsProps {
  totalDraft: number;
  totalBerjalan: number;
  totalLpjDiproses: number;
  totalSelesai: number;
}

const daftarStat = [
  {
    key: "totalDraft",
    label: "Total SPPD Terbit",
    warna: "bg-[#fff2f2] text-[#e2342d]",
    icon: FileText,
    hint: "+12%",
  },
  {
    key: "totalBerjalan",
    label: "Perjalanan Aktif",
    warna: "bg-[#f5f2ff] text-[#8261e6]",
    icon: BriefcaseBusiness,
    hint: "Sedang berjalan",
  },
  {
    key: "totalLpjDiproses",
    label: "LPJ Menunggu",
    warna: "bg-[#fff7ed] text-[#f08c2b]",
    icon: FileClock,
    hint: "Perlu tindak lanjut",
  },
  {
    key: "totalSelesai",
    label: "Arsip Selesai",
    warna: "bg-[#ecfaf2] text-[#26a269]",
    icon: FileCheck2,
    hint: "Tersimpan",
  },
] as const;

export function DashboardStats(props: DashboardStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {daftarStat.map((item) => (
        <section key={item.key} className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.warna}`}>
              <item.icon size={18} />
            </div>
            <p className="text-xs font-semibold text-[#7e8799]">{item.hint}</p>
          </div>
          <p className="mt-5 text-sm font-medium text-[#676f81]">{item.label}</p>
          <p className="mt-2 text-4xl font-bold tracking-tight text-[#242b38]">
            {props[item.key].toLocaleString("id-ID")}
          </p>
        </section>
      ))}
    </div>
  );
}
