// Turning a picture the user chose into a small square avatar.

export const AVATAR_SIZE = 256;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** Why this file can't be an avatar, or null if it can. */
export function checkAvatarFile(file) {
  if (!file || !ACCEPTED_TYPES.includes(file.type)) {
    return "That isn't a picture we can use. Choose a PNG, JPEG, WebP or GIF.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "That picture is too big. Choose one under 5 MB.";
  }
  return null;
}

/** The biggest square from the middle of a picture: where it starts and how long its side is. */
export function squareCrop(width, height) {
  const side = Math.min(width, height);
  return { sx: Math.floor((width - side) / 2), sy: Math.floor((height - side) / 2), side };
}

/**
 * The picture cropped to a square from its middle and shrunk to `size` pixels, as a data URL that can be kept and
 * shown straight away.
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function fileToAvatar(file, size = AVATAR_SIZE) {
  const bitmap = await createImageBitmap(file);
  try {
    const { sx, sy, side } = squareCrop(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    canvas.getContext("2d").drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
    // WebP keeps transparency in a small file; a browser that can't make one makes a PNG instead.
    return canvas.toDataURL("image/webp", 0.9);
  } finally {
    bitmap.close?.();
  }
}
