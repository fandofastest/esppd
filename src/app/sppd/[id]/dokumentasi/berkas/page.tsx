import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth/session";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    title?: string;
    category?: string;
    pelaksana?: string;
    reference?: string;
    createdAt?: string;
    fileUrl?: string;
  }>;
}

function decodeValue(value: string | undefined, fallback: string) {
  return value ? decodeURIComponent(value) : fallback;
}

function isExternalUrl(value?: string) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

export default async function SppdDokumentasiBerkasPage({ params, searchParams }: PageProps) {
  const session = await requireRole(["Admin", "Operator"]);
  const { id } = await params;
  const query = searchParams ? await searchParams : undefined;
  const title = decodeValue(query?.title, "Dokumentasi Arsip");
  const category = decodeValue(query?.category, "-");
  const pelaksana = decodeValue(query?.pelaksana, "-");
  const reference = decodeValue(query?.reference, "-");
  const createdAt = decodeValue(query?.createdAt, "-");
  const fileUrl = decodeValue(query?.fileUrl, "");
  const hasDirectFile = isExternalUrl(fileUrl);
  const fallbackDownloadHref = `/api/dokumentasi-reference?title=${encodeURIComponent(
    title,
  )}&reference=${encodeURIComponent(reference)}&category=${encodeURIComponent(
    category,
  )}&pelaksana=${encodeURIComponent(pelaksana)}&createdAt=${encodeURIComponent(createdAt)}`;

  return (
    <AppShell nama={session.nama} role={session.role} currentPath="/sppd">
      <div className="space-y-6">
        <section className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-[#798195]">Dokumentasi Arsip / Detail Berkas</p>
            <h1 className="mt-2 text-[28px] font-bold tracking-[-0.03em] text-[#e2342d]">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-[#717b8d]">
              Detail arsip ini ditampilkan sebagai fallback ketika server arsip eksternal tidak
              mengirim URL file langsung.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="btn-secondary" href={`/sppd/${id}/dokumentasi`}>
              Kembali ke Tabel Dokumentasi
            </Link>
            <a className="btn-secondary" href={fallbackDownloadHref}>
              Download Referensi
            </a>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <section className="card p-5">
            <h2 className="text-xl font-bold text-[#252c38]">Preview / Informasi Arsip</h2>
            {hasDirectFile ? (
              <div className="mt-5 overflow-hidden rounded-[20px] border border-[#e8ebf1] bg-[#f7f8fc]">
                <iframe className="h-[70vh] w-full bg-white" src={fileUrl} title={title} />
              </div>
            ) : (
              <div className="mt-5 rounded-[20px] border border-[#ffd7d3] bg-[#fff1ef] p-5 text-sm text-[#d9544d]">
                URL file langsung tidak tersedia dari server arsip eksternal. Gunakan nomor
                referensi di panel kanan untuk pencarian manual atau unduh referensinya.
              </div>
            )}
          </section>

          <aside className="card p-5">
            <h2 className="text-xl font-bold text-[#252c38]">Metadata Arsip</h2>
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8a92a5]">Kategori</p>
                <p className="mt-2 font-semibold text-[#252c38]">{category}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8a92a5]">Pelaksana</p>
                <p className="mt-2 font-semibold text-[#252c38]">{pelaksana}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8a92a5]">Tanggal</p>
                <p className="mt-2 font-semibold text-[#252c38]">{createdAt}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8a92a5]">Referensi Arsip</p>
                <p className="mt-2 break-all font-semibold text-[#252c38]">{reference}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {hasDirectFile ? (
                <>
                  <a className="btn-primary text-center" href={fileUrl} target="_blank" rel="noreferrer">
                    View Langsung
                  </a>
                  <a className="btn-secondary text-center" href={fileUrl} target="_blank" rel="noreferrer" download>
                    Download File
                  </a>
                </>
              ) : null}
              <a className="btn-secondary text-center" href={fallbackDownloadHref}>
                Download Referensi
              </a>
            </div>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
