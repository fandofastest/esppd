import mongoose from "mongoose";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!mongoUri || !dbName) {
  throw new Error("MONGODB_URI dan MONGODB_DB wajib tersedia di .env.local");
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const masterdataDir = path.join(scriptDir, "..", "masterdata");

function readRows(fileName) {
  const workbook = XLSX.readFile(path.join(masterdataDir, fileName));
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

  return XLSX.utils.sheet_to_json(firstSheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(value) {
  if (typeof value === "number") {
    return value;
  }

  const cleaned = String(value ?? "").replace(/[^\d.-]/g, "");
  return cleaned ? Number(cleaned) : 0;
}

function extractDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function isDataRow(row) {
  return Number.isFinite(Number(row?.[0])) && Number(row[0]) > 0;
}

function parseJenisPegawai(identifierRaw) {
  const identifier = normalizeText(identifierRaw).toUpperCase();

  if (identifier.includes("PPPK")) {
    return "PPPK";
  }

  if (identifier.includes("NIP")) {
    return "PNS";
  }

  return "Komisioner";
}

function parsePegawai() {
  const rows = readRows("PEGAWAI.xlsx");
  const pegawai = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];

    if (!isDataRow(row)) {
      continue;
    }

    const detailRow = rows[index + 1] ?? [];
    const nama = normalizeText(row[1]);
    const pangkatUtama = normalizeText(row[2]);
    const pangkatLanjutan = normalizeText(detailRow[2]);
    const jabatan = normalizeText(row[3]);
    const identifierRaw = normalizeText(detailRow[1]);
    const nipNik = extractDigits(identifierRaw);
    const jenis_pegawai = parseJenisPegawai(identifierRaw);

    if (!nama || (jenis_pegawai !== "Komisioner" && !nipNik)) {
      continue;
    }

    pegawai.push({
      nama,
      nip_nik: jenis_pegawai === "Komisioner" ? undefined : nipNik,
      pangkat_golongan: jenis_pegawai === "Komisioner" ? "IV" : normalizeText(`${pangkatUtama} ${pangkatLanjutan}`),
      jabatan,
      jenis_pegawai,
    });

    index += 1;
  }

  return pegawai;
}

function parseSbmUangHarian() {
  return readRows("SBM_Perjalanan_Dinas.xlsx")
    .filter(isDataRow)
    .map((row) => ({
      provinsi: normalizeText(row[1]),
      satuan: normalizeText(row[2]) || "OH",
      luar_kota: toNumber(row[3]),
      dalam_kota_lebih_8jam: toNumber(row[4]),
      diklat: toNumber(row[5]),
    }));
}

function parseSbmPenginapan() {
  return readRows("SBM_Penginapan.xlsx")
    .filter(isDataRow)
    .map((row) => ({
      provinsi: normalizeText(row[1]),
      satuan: normalizeText(row[2]) || "OH",
      tarif_eselon_1: toNumber(row[3]),
      tarif_eselon_2: toNumber(row[4]),
      tarif_eselon_3_gol_iv: toNumber(row[5]),
      tarif_eselon_4_gol_iii_ii_i: toNumber(row[6]),
    }));
}

function parseSbmTransportRiau() {
  return readRows("SBM_Transport_Riau.xlsx")
    .filter(isDataRow)
    .map((row) => ({
      asal: normalizeText(row[1]),
      tujuan: normalizeText(row[2]),
      satuan: normalizeText(row[3]) || "Orang/Kali",
      tarif: toNumber(row[4]),
    }));
}

function parseSbmTransportTerminal() {
  return readRows("SBM_Transport_Terminal.xlsx")
    .filter(isDataRow)
    .map((row) => ({
      provinsi: normalizeText(row[1]),
      satuan: normalizeText(row[2]) || "Orang/Kali",
      tarif: toNumber(row[3]),
    }));
}

function parseSbmTiketPesawat() {
  return readRows("SBM_Tiket_Pesawat.xlsx")
    .filter(isDataRow)
    .map((row) => ({
      asal: normalizeText(row[1]),
      tujuan: normalizeText(row[2]),
      bisnis: toNumber(row[3]),
      ekonomi: toNumber(row[4]),
    }));
}

async function replaceCollection(collectionName, documents, indexes = []) {
  const collection = mongoose.connection.collection(collectionName);
  const now = new Date();
  const docsWithTimestamps = documents.map((document) => ({
    ...document,
    createdAt: now,
    updatedAt: now,
  }));

  const existingIndexes = await collection.indexes();
  for (const existingIndex of existingIndexes) {
    if (existingIndex.name !== "_id_") {
      await collection.dropIndex(existingIndex.name);
    }
  }

  await collection.deleteMany({});

  if (docsWithTimestamps.length > 0) {
    await collection.insertMany(docsWithTimestamps, { ordered: true });
  }

  for (const index of indexes) {
    await collection.createIndex(index.key, index.options);
  }
}

async function run() {
  const datasets = {
    pegawai: parsePegawai(),
    sbm_uang_harian: parseSbmUangHarian(),
    sbm_penginapan: parseSbmPenginapan(),
    sbm_transport_riau: parseSbmTransportRiau(),
    sbm_transport_terminal: parseSbmTransportTerminal(),
    sbm_tiket_pesawat: parseSbmTiketPesawat(),
  };

  await mongoose.connect(mongoUri, { dbName });

  await replaceCollection("pegawai", datasets.pegawai, [
    { key: { nip_nik: 1 }, options: { unique: true, sparse: true } },
  ]);
  await replaceCollection("sbm_uang_harian", datasets.sbm_uang_harian, [
    { key: { provinsi: 1 }, options: { unique: true } },
  ]);
  await replaceCollection("sbm_penginapan", datasets.sbm_penginapan, [
    { key: { provinsi: 1 }, options: { unique: true } },
  ]);
  await replaceCollection("sbm_transport_riau", datasets.sbm_transport_riau, [
    { key: { asal: 1, tujuan: 1 }, options: { unique: true } },
  ]);
  await replaceCollection("sbm_transport_terminal", datasets.sbm_transport_terminal, [
    { key: { provinsi: 1 }, options: { unique: true } },
  ]);
  await replaceCollection("sbm_tiket_pesawat", datasets.sbm_tiket_pesawat, [
    { key: { asal: 1, tujuan: 1 }, options: { unique: true } },
  ]);

  console.log("Import masterdata berhasil:");
  for (const [collectionName, items] of Object.entries(datasets)) {
    console.log(`- ${collectionName}: ${items.length} data`);
  }
}

run()
  .catch((error) => {
    console.error("Gagal import masterdata:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
