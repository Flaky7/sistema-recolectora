import imageCompression from "browser-image-compression";

/**
 * Photos taken with the phone are reduced to ~200 KB JPEG before uploading (research R8):
 * faster on mobile data and cheaper Storage (constitution VII).
 */
export async function compressImage(file: File): Promise<File> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.2,
    maxWidthOrHeight: 1600,
    fileType: "image/jpeg",
    useWebWorker: true,
    initialQuality: 0.8,
  });
  const name = file.name.replace(/\.[^.]+$/, "") || "foto";
  return new File([compressed], `${name}.jpg`, { type: "image/jpeg" });
}
