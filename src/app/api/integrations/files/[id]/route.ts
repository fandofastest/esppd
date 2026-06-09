import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth/session";
import { getUploadsIntegrationBaseUrl, getUploadsIntegrationToken } from "@/lib/integrations/uploads";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const token = getUploadsIntegrationToken();
  if (!token) {
    return NextResponse.json(
      { message: "INTEGRATION_UPLOADS_TOKEN belum diatur pada server aplikasi." },
      { status: 500 },
    );
  }

  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const inline = searchParams.get("inline") === "1" ? "1" : "0";
  const targetUrl = `${getUploadsIntegrationBaseUrl()}/api/integrations/files/${encodeURIComponent(
    id,
  )}?inline=${inline}`;

  const response = await fetch(targetUrl, {
    method: "GET",
    headers: {
      accept: "*/*",
      "x-integration-token": token,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { message: "Gagal mengambil file dari server arsip integrasi." },
      { status: response.status },
    );
  }

  const headers = new Headers();
  const contentType = response.headers.get("content-type");
  const contentDisposition = response.headers.get("content-disposition");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  if (contentDisposition) {
    headers.set("content-disposition", contentDisposition);
  }

  return new NextResponse(response.body, {
    status: 200,
    headers,
  });
}
