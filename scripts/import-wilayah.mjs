import mongoose from "mongoose";

const mongoUri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;

if (!mongoUri || !dbName) {
  throw new Error("MONGODB_URI dan MONGODB_DB wajib tersedia di .env.local");
}

const BASE_URL =
  "https://cdn.jsdelivr.net/gh/izzulabadi/api-wilayah-indonesia-2026@v1.0.4/api";

function normalizeName(name) {
  return String(name ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function toJenisWilayah(name) {
  return name.toUpperCase().startsWith("KABUPATEN") ? "Kabupaten" : "Kota";
}

function toNamaTampilan(name) {
  const normalized = normalizeName(name);
  const upper = normalized.toUpperCase();

  if (upper.startsWith("KABUPATEN ")) {
    return `Kabupaten ${normalized.slice("KABUPATEN ".length).trim()}`;
  }

  if (upper.startsWith("KOTA ")) {
    return `Kota ${normalized.slice("KOTA ".length).trim()}`;
  }

  return normalized;
}

async function fetchJson(path) {
  const response = await fetch(`${BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`Gagal mengambil data wilayah: ${path} (${response.status})`);
  }

  return response.json();
}

async function replaceCollection(collectionName, documents, indexes = []) {
  const collection = mongoose.connection.collection(collectionName);
  const now = new Date();
  const data = documents.map((item) => ({
    ...item,
    createdAt: now,
    updatedAt: now,
  }));

  let existingIndexes = [];
  try {
    existingIndexes = await collection.indexes();
  } catch (error) {
    if (error?.codeName !== "NamespaceNotFound") {
      throw error;
    }
  }

  for (const index of existingIndexes) {
    if (index.name !== "_id_") {
      await collection.dropIndex(index.name);
    }
  }

  await collection.deleteMany({});

  if (data.length > 0) {
    await collection.insertMany(data, { ordered: true });
  }

  for (const index of indexes) {
    await collection.createIndex(index.key, index.options);
  }
}

async function run() {
  const [provinces, regencies, districtsDumai] = await Promise.all([
    fetchJson("/provinces.json"),
    fetchJson("/regencies.json"),
    fetchJson("/districts/1472.json"),
  ]);

  const villagesPerDistrict = await Promise.all(
    districtsDumai.map(async (district) => ({
      districtId: String(district.id),
      districtName: normalizeName(district.name),
      items: await fetchJson(`/villages/${String(district.id)}.json`),
    })),
  );

  const wilayahProvinsi = provinces.map((item) => ({
    kode: String(item.id),
    nama: toNamaTampilan(item.name),
  }));

  const wilayahKotaKabupaten = regencies.map((item) => ({
    kode: String(item.id),
    kode_provinsi: String(item.province_id ?? item.provinceId),
    nama: normalizeName(item.name),
    jenis: toJenisWilayah(item.name),
    nama_tampilan: toNamaTampilan(item.name),
  }));

  const wilayahKecamatan = districtsDumai.map((item) => ({
    kode: String(item.id),
    kode_kota_kabupaten: String(item.regency_id ?? item.regencyId),
    nama: normalizeName(item.name),
    nama_tampilan: normalizeName(item.name),
  }));

  const wilayahKelurahan = villagesPerDistrict.flatMap((district) =>
    district.items.map((item) => ({
      kode: String(item.id),
      kode_kecamatan: String(item.district_id ?? item.districtId),
      kode_kota_kabupaten: "1472",
      nama: normalizeName(item.name),
      nama_tampilan: normalizeName(item.name),
      kecamatan_nama: district.districtName,
    })),
  );

  await mongoose.connect(mongoUri, { dbName });

  await replaceCollection("wilayah_provinsi", wilayahProvinsi, [
    { key: { kode: 1 }, options: { unique: true } },
    { key: { nama: 1 }, options: { name: "nama_1" } },
  ]);

  await replaceCollection("wilayah_kota_kabupaten", wilayahKotaKabupaten, [
    { key: { kode: 1 }, options: { unique: true } },
    { key: { kode_provinsi: 1 }, options: { name: "kode_provinsi_1" } },
    { key: { nama_tampilan: 1 }, options: { name: "nama_tampilan_1" } },
    { key: { kode_provinsi: 1, nama_tampilan: 1 }, options: { name: "kode_provinsi_1_nama_tampilan_1" } },
  ]);

  await replaceCollection("wilayah_kecamatan", wilayahKecamatan, [
    { key: { kode: 1 }, options: { unique: true } },
    { key: { kode_kota_kabupaten: 1 }, options: { name: "kode_kota_kabupaten_1" } },
    { key: { nama_tampilan: 1 }, options: { name: "nama_tampilan_1" } },
    {
      key: { kode_kota_kabupaten: 1, nama_tampilan: 1 },
      options: { name: "kode_kota_kabupaten_1_nama_tampilan_1" },
    },
  ]);

  await replaceCollection("wilayah_kelurahan", wilayahKelurahan, [
    { key: { kode: 1 }, options: { unique: true } },
    { key: { kode_kecamatan: 1 }, options: { name: "kode_kecamatan_1" } },
    { key: { kode_kota_kabupaten: 1 }, options: { name: "kode_kota_kabupaten_1" } },
    { key: { nama_tampilan: 1 }, options: { name: "nama_tampilan_1" } },
    {
      key: { kode_kecamatan: 1, nama_tampilan: 1 },
      options: { name: "kode_kecamatan_1_nama_tampilan_1" },
    },
    {
      key: { kode_kota_kabupaten: 1, nama_tampilan: 1 },
      options: { name: "kode_kota_kabupaten_1_nama_tampilan_1" },
    },
  ]);

  console.log("Import wilayah berhasil:");
  console.log(`- wilayah_provinsi: ${wilayahProvinsi.length} data`);
  console.log(`- wilayah_kota_kabupaten: ${wilayahKotaKabupaten.length} data`);
  console.log(`- wilayah_kecamatan: ${wilayahKecamatan.length} data`);
  console.log(`- wilayah_kelurahan: ${wilayahKelurahan.length} data`);
}

run()
  .catch((error) => {
    console.error("Gagal import wilayah:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
