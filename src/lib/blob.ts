import { put } from "@vercel/blob";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: "Invalid file type. Allowed: JPEG, PNG, GIF, WEBP" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "File too large (max 5MB)" };
  }

  return { valid: true };
}

export async function uploadFile(file: File): Promise<string> {
  const blob = await put(file.name, file, {
    access: "public",
    addRandomSuffix: true,
  });
  return blob.url;
}
