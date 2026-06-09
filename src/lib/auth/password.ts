import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, KEY_LENGTH).toString("hex");

  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, existingKey] = storedHash.split(":");

  if (!salt || !existingKey) {
    return false;
  }

  const derivedKey = scryptSync(password, salt, KEY_LENGTH);
  const existingBuffer = Buffer.from(existingKey, "hex");

  if (derivedKey.length !== existingBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, existingBuffer);
}
