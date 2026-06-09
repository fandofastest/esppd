import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/esppd-kpu-kota-dumai";

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const cache = global.mongooseCache ?? { conn: null, promise: null };

export async function connectMongoDB() {
  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      dbName: process.env.MONGODB_DB ?? "esppd_kpu_kota_dumai",
    });
  }

  cache.conn = await cache.promise;
  global.mongooseCache = cache;

  return cache.conn;
}
