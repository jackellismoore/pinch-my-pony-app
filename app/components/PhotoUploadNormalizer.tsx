"use client";

import { useEffect } from "react";

const TARGET_BYTES = 4.5 * 1024 * 1024;
const MAX_DIMENSION = 2200;

async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {}
  }

  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This photo could not be prepared for upload."));
    };
    img.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Photo conversion failed."))), "image/jpeg", quality);
  });
}

async function normalizeImage(file: File): Promise<File> {
  const type = (file.type || "").toLowerCase();
  const alreadySafe = file.size <= TARGET_BYTES && ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(type);
  if (alreadySafe) return file;

  const decoded = await decodeImage(file);
  const sourceWidth = "naturalWidth" in decoded ? decoded.naturalWidth : decoded.width;
  const sourceHeight = "naturalHeight" in decoded ? decoded.naturalHeight : decoded.height;
  const ratio = Math.min(1, MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * ratio));
  const height = Math.max(1, Math.round(sourceHeight * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Photo conversion is unavailable on this device.");
  ctx.drawImage(decoded as CanvasImageSource, 0, 0, width, height);
  if ("close" in decoded && typeof decoded.close === "function") decoded.close();

  let quality = 0.86;
  let blob = await canvasBlob(canvas, quality);
  while (blob.size > TARGET_BYTES && quality > 0.5) {
    quality -= 0.08;
    blob = await canvasBlob(canvas, quality);
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}

export default function PhotoUploadNormalizer() {
  useEffect(() => {
    const onChange = async (event: Event) => {
      const input = event.target instanceof HTMLInputElement ? event.target : null;
      if (!input || input.type !== "file" || input.dataset.pmpNormalizing === "1") return;
      const files = Array.from(input.files ?? []);
      if (!files.length || !files.some((file) => file.type.startsWith("image/") || /\.(heic|heif|jpg|jpeg|png|webp)$/i.test(file.name))) return;

      const needsWork = files.some((file) => file.size > TARGET_BYTES || !["image/jpeg", "image/jpg", "image/png", "image/webp"].includes((file.type || "").toLowerCase()));
      if (!needsWork) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      input.dataset.pmpNormalizing = "1";

      try {
        const normalized = await Promise.all(files.map((file) => normalizeImage(file)));
        const dt = new DataTransfer();
        normalized.forEach((file) => dt.items.add(file));
        input.files = dt.files;
      } catch (error) {
        console.warn("[PhotoUploadNormalizer]", error);
      } finally {
        delete input.dataset.pmpNormalizing;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    };

    document.addEventListener("change", onChange, true);
    return () => document.removeEventListener("change", onChange, true);
  }, []);

  return null;
}
