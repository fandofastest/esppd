import { NextResponse } from "next/server";

function safeText(value: string | null, fallback: string) {
  return (value ?? "").trim() || fallback;
}

function safeFilename(value: string) {
  return value
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = safeText(searchParams.get("title"), "referensi-arsip");
  const reference = safeText(searchParams.get("reference"), "-");
  const category = safeText(searchParams.get("category"), "-");
  const pelaksana = safeText(searchParams.get("pelaksana"), "-");
  const createdAt = safeText(searchParams.get("createdAt"), "-");

  const content = [
    "REFERENSI DOKUMENTASI PERJALANAN DINAS",
    "",
    `Judul: ${title}`,
    `Kategori: ${category}`,
    `Pelaksana: ${pelaksana}`,
    `Tanggal: ${createdAt}`,
    `Referensi Arsip: ${reference}`,
    "",
    "Catatan:",
    "Server arsip eksternal tidak mengembalikan URL file langsung untuk berkas ini.",
    "Gunakan nomor referensi arsip di atas untuk penelusuran manual pada sistem arsip.",
  ].join("\n");

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"${safeFilename(title || "referensi-arsip")}.txt\"`,
    },
  });
}
