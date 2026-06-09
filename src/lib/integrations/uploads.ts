type UnknownRecord = Record<string, unknown>;

export interface IntegrationUploadRecord {
  id: string;
  archiveId: string;
  archiveNumber: string;
  archiveOriginalName: string;
  fileName: string;
  status: string;
  sourceType: string;
  sourceId: string;
  sourceName: string;
  createdAt: string;
  url: string;
  reference: string;
  raw: UnknownRecord;
}

interface ListUploadsParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: string;
  sourceType?: string;
}

interface UploadFileParams {
  file: File;
  sourceType: string;
  sourceId: string;
  sourceName: string;
  title: string;
  description?: string;
  tags?: string[];
  isPrivate?: boolean;
}

function getBaseUrl() {
  return (process.env.INTEGRATION_UPLOADS_BASE_URL ?? "https://serverkpu.fando.id").replace(/\/+$/, "");
}

function getIntegrationToken() {
  return process.env.INTEGRATION_UPLOADS_TOKEN?.trim() ?? "";
}

function getUploaderPhone() {
  return process.env.INTEGRATION_UPLOADS_UPLOADER_PHONE?.trim() ?? "";
}

export function getUploadsIntegrationBaseUrl() {
  return getBaseUrl();
}

export function getUploadsIntegrationToken() {
  return getIntegrationToken();
}

function isObject(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickString(input: UnknownRecord, paths: string[][]) {
  for (const path of paths) {
    let current: unknown = input;

    for (const key of path) {
      if (!isObject(current)) {
        current = undefined;
        break;
      }

      current = current[key];
    }

    if (typeof current === "string" && current.trim()) {
      return current.trim();
    }
  }

  return "";
}

function normalizeUploadRecord(value: unknown): IntegrationUploadRecord {
  const raw = isObject(value) ? value : {};

  return {
    id: pickString(raw, [["_id"], ["id"], ["uploadId"], ["file", "_id"], ["file", "id"]]),
    archiveId: pickString(raw, [["archive", "archiveId"], ["archiveId"]]),
    archiveNumber: pickString(raw, [["archive", "archiveNumber"], ["archiveNumber"]]),
    archiveOriginalName: pickString(raw, [["archive", "originalName"], ["originalName"]]),
    fileName: pickString(raw, [
      ["fileName"],
      ["filename"],
      ["originalName"],
      ["name"],
      ["title"],
      ["file", "name"],
    ]),
    status: pickString(raw, [["status"]]),
    sourceType: pickString(raw, [["sourceType"], ["source", "type"]]),
    sourceId: pickString(raw, [["sourceId"], ["source", "id"]]),
    sourceName: pickString(raw, [["sourceName"], ["source", "name"]]),
    createdAt: pickString(raw, [["createdAt"], ["updatedAt"], ["timestamp"]]),
    url: pickString(raw, [
      ["url"],
      ["fileUrl"],
      ["downloadUrl"],
      ["publicUrl"],
      ["viewUrl"],
      ["file", "url"],
      ["file", "fileUrl"],
      ["file", "downloadUrl"],
      ["data", "url"],
    ]),
    reference: pickString(raw, [
      ["archive", "archiveNumber"],
      ["archive", "archiveId"],
      ["archiveNumber"],
      ["archiveId"],
      ["originalName"],
      ["fileName"],
      ["filename"],
      ["_id"],
      ["id"],
    ]),
    raw,
  };
}

async function readJsonSafely(response: Response) {
  try {
    return (await response.json()) as UnknownRecord;
  } catch {
    return {};
  }
}

export function isUploadsIntegrationConfigured() {
  return Boolean(getIntegrationToken());
}

export async function listIntegrationUploads(
  params: ListUploadsParams = {},
): Promise<IntegrationUploadRecord[]> {
  const token = getIntegrationToken();
  if (!token) {
    return [];
  }

  const searchParams = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 20),
  });

  if (params.q) {
    searchParams.set("q", params.q);
  }

  if (params.status) {
    searchParams.set("status", params.status);
  }

  if (params.sourceType) {
    searchParams.set("sourceType", params.sourceType);
  }

  try {
    const response = await fetch(`${getBaseUrl()}/api/integrations/uploads?${searchParams.toString()}`, {
      method: "GET",
      headers: {
        accept: "*/*",
        "x-integration-token": token,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return [];
    }

    const payload = await readJsonSafely(response);
    const records = Array.isArray(payload.data) ? payload.data : [];
    return records.map((item) => normalizeUploadRecord(item));
  } catch {
    return [];
  }
}

export async function uploadIntegrationFile(params: UploadFileParams) {
  const token = getIntegrationToken();
  if (!token) {
    throw new Error("INTEGRATION_UPLOADS_TOKEN belum diatur pada .env.local.");
  }

  const uploaderPhone = getUploaderPhone();
  if (!uploaderPhone) {
    throw new Error("INTEGRATION_UPLOADS_UPLOADER_PHONE belum diatur pada .env.local.");
  }

  const body = new FormData();
  body.append("file", params.file);
  body.append("uploaderPhone", uploaderPhone);
  body.append("sourceType", params.sourceType);
  body.append("sourceId", params.sourceId);
  body.append("sourceName", params.sourceName);
  body.append("title", params.title);

  if (params.description) {
    body.append("description", params.description);
  }

  if (params.tags?.length) {
    body.append("tags", params.tags.join(","));
  }

  if (params.isPrivate) {
    body.append("private", "true");
  }

  const response = await fetch(`${getBaseUrl()}/api/integrations/uploads`, {
    method: "POST",
    headers: {
      accept: "*/*",
      "x-integration-token": token,
    },
    body,
  });

  const payload = await readJsonSafely(response);
  if (!response.ok || payload.success === false) {
    const message =
      pickString(payload, [["message"], ["error"], ["errors", "0", "message"]]) ||
      "Upload file ke integrasi eksternal gagal.";
    throw new Error(message);
  }

  const record = normalizeUploadRecord(payload.data ?? payload);
  return record;
}

export function buildStoredUploadValue(record: IntegrationUploadRecord) {
  return record.url || record.reference || record.fileName || record.id;
}

export function buildStoredUploadDetail(record: IntegrationUploadRecord) {
  return {
    value: buildStoredUploadValue(record),
    uploadId: record.id,
    fileName: record.fileName,
    url: record.url,
    reference: record.reference,
    createdAt: record.createdAt,
    mimeType:
      typeof record.raw.mimeType === "string" && record.raw.mimeType.trim()
        ? record.raw.mimeType.trim()
        : "",
    archive: {
      archiveId: record.archiveId,
      archiveNumber: record.archiveNumber,
      originalName: record.archiveOriginalName,
    },
  };
}

export function buildIntegrationFileProxyUrl(fileId: string, inline: boolean) {
  if (!fileId.trim()) {
    return "";
  }

  return `/api/integrations/files/${encodeURIComponent(fileId)}?inline=${inline ? "1" : "0"}`;
}
