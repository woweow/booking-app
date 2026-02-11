import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "crypto";

type EncryptionKey = {
  version: number;
  key: Buffer;
};

function parseEncryptionKeys(): EncryptionKey[] {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("FIELD_ENCRYPTION_KEY environment variable is not set");
  }

  const parts = raw.split(",").map((part) => part.trim());
  const keys: EncryptionKey[] = [];

  for (const part of parts) {
    const match = part.match(/^v(\d+):(.+)$/);
    if (!match) {
      throw new Error(`Invalid encryption key format: ${part}. Expected v{n}:{base64key}`);
    }

    const version = parseInt(match[1], 10);
    const key = Buffer.from(match[2], "base64");

    if (key.length !== 32) {
      throw new Error(
        `Encryption key v${version} must be 32 bytes (256 bits), got ${key.length} bytes`
      );
    }

    keys.push({ version, key });
  }

  if (keys.length === 0) {
    throw new Error("No valid encryption keys found");
  }

  return keys;
}

let cachedKeys: EncryptionKey[] | null = null;

function getKeys(): EncryptionKey[] {
  if (!cachedKeys) {
    cachedKeys = parseEncryptionKeys();
  }
  return cachedKeys;
}

function getCurrentKey(): EncryptionKey {
  const keys = getKeys();
  return keys[keys.length - 1]; // Latest version
}

function getKeyByVersion(version: number): EncryptionKey {
  const keys = getKeys();
  const key = keys.find((k) => k.version === version);
  if (!key) {
    throw new Error(`Encryption key version ${version} not found`);
  }
  return key;
}

function deriveFieldKey(masterKey: Buffer, fieldName: string): Buffer {
  const hash = createHash("sha256");
  hash.update(masterKey);
  hash.update(fieldName);
  return hash.digest();
}

export function encryptField(plaintext: string | null, fieldName: string): string | null {
  if (plaintext === null || plaintext === undefined) return null;

  const currentKey = getCurrentKey();
  const fieldKey = deriveFieldKey(currentKey.key, fieldName);
  const iv = randomBytes(16);

  const cipher = createCipheriv("aes-256-gcm", fieldKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plaintext, "utf8")),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();
  const versionHex = currentKey.version.toString(16).padStart(4, "0");

  return `v${versionHex}:${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptField(ciphertext: string | null, fieldName: string): string | null {
  if (ciphertext === null || ciphertext === undefined) return null;

  // If it doesn't look like encrypted data, return as-is
  if (!ciphertext.startsWith("v")) return ciphertext;

  try {
    const [versionStr, ivBase64, authTagBase64, encryptedBase64] = ciphertext.split(":");

    const versionMatch = versionStr.match(/^v([0-9a-f]{4})$/);
    if (!versionMatch) {
      throw new Error(`Invalid encrypted format version: ${versionStr}`);
    }

    const version = parseInt(versionMatch[1], 16);
    const encKey = getKeyByVersion(version);
    const fieldKey = deriveFieldKey(encKey.key, fieldName);

    const iv = Buffer.from(ivBase64, "base64");
    const authTag = Buffer.from(authTagBase64, "base64");
    const encrypted = Buffer.from(encryptedBase64, "base64");

    const decipher = createDecipheriv("aes-256-gcm", fieldKey, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Decryption failed for field:", fieldName, error);
    throw new Error("Failed to decrypt field");
  }
}

function encryptBoolean(value: boolean | undefined | null, fieldName: string): string | null {
  if (value === undefined || value === null) return null;
  return encryptField(value ? "true" : "false", fieldName);
}

function decryptBoolean(ciphertext: string | null, fieldName: string): boolean {
  const decrypted = decryptField(ciphertext, fieldName);
  return decrypted === "true";
}

type MedicalDataInput = {
  skinConditions?: string | null;
  allergies?: string | null;
  medications?: string | null;
  bloodDisorders?: boolean;
  isPregnant?: boolean;
  recentSubstances?: boolean;
};

type EncryptedMedicalData = {
  skinConditions: string | null;
  allergies: string | null;
  medications: string | null;
  bloodDisorders: string | null;
  isPregnant: string | null;
  recentSubstances: string | null;
};

type DecryptedMedicalData = {
  skinConditions: string | null;
  allergies: string | null;
  medications: string | null;
  bloodDisorders: boolean;
  isPregnant: boolean;
  recentSubstances: boolean;
};

export function encryptMedicalData(data: MedicalDataInput): EncryptedMedicalData {
  return {
    skinConditions: encryptField(data.skinConditions ?? null, "skinConditions"),
    allergies: encryptField(data.allergies ?? null, "allergies"),
    medications: encryptField(data.medications ?? null, "medications"),
    bloodDisorders: encryptBoolean(data.bloodDisorders, "bloodDisorders"),
    isPregnant: encryptBoolean(data.isPregnant, "isPregnant"),
    recentSubstances: encryptBoolean(data.recentSubstances, "recentSubstances"),
  };
}

export function decryptMedicalData(data: {
  skinConditions: string | null;
  allergies: string | null;
  medications: string | null;
  bloodDisorders: string | null;
  isPregnant: string | null;
  recentSubstances: string | null;
}): DecryptedMedicalData {
  return {
    skinConditions: decryptField(data.skinConditions, "skinConditions"),
    allergies: decryptField(data.allergies, "allergies"),
    medications: decryptField(data.medications, "medications"),
    bloodDisorders: decryptBoolean(data.bloodDisorders, "bloodDisorders"),
    isPregnant: decryptBoolean(data.isPregnant, "isPregnant"),
    recentSubstances: decryptBoolean(data.recentSubstances, "recentSubstances"),
  };
}
