"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Icon } from "@/components/Icon";

type Props = {
  bucket: string;
  value: string;
  onChange: (url: string) => void;
  label?: string;
  helper?: string;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function optimiseImage(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function") return file;
  const bitmap = await createImageBitmap(file);
  const maxSide = 1800;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 2 * 1024 * 1024) return file;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Could not prepare photo")), "image/jpeg", 0.86));
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "horse"}.jpg`, { type: "image/jpeg" });
}

export default function HorseImageUploader({
  bucket,
  value,
  onChange,
  label = "Upload photo",
  helper = "Uploads to storage bucket and saves a public URL.",
}: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase())) {
      setErr("Choose a JPEG, PNG or WebP photo.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErr("Choose a photo smaller than 8 MB.");
      e.target.value = "";
      return;
    }

    setErr(null);
    setUploading(true);

    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not signed in.");

      const prepared = await optimiseImage(file);
      const ext = prepared.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${uid}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage.from(bucket).upload(fileName, prepared, {
        cacheControl: "3600",
        upsert: true,
        contentType: prepared.type || undefined,
      });

      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(fileName);
      const publicUrl = pub?.publicUrl;

      if (!publicUrl) throw new Error("Could not generate public URL.");

      onChange(publicUrl);

      if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 10,
        border: "1px solid rgba(15,23,42,0.10)",
        borderRadius: 16,
        padding: 12,
        background: "white",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div
          style={{
            width: 74,
            height: 74,
            borderRadius: 16,
            overflow: "hidden",
            background: "rgba(0,0,0,0.06)",
            border: "1px solid rgba(0,0,0,0.10)",
            flexShrink: 0,
          }}
        >
          {isNonEmptyString(value) ? (
            <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "rgba(23,35,61,.45)" }}><Icon name="camera" size={27} /></div>}
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 950 }}>{label}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{helper} JPEG, PNG or WebP up to 8 MB.</div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <label
              style={{
                border: "1px solid rgba(0,0,0,0.14)",
                background: "white",
                color: "black",
                padding: "10px 12px",
                borderRadius: 12,
                fontSize: 13,
                fontWeight: 950,
                cursor: uploading ? "not-allowed" : "pointer",
                opacity: uploading ? 0.6 : 1,
              }}
            >
              {uploading ? "Uploading…" : "Choose file"}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onPickFile}
                disabled={uploading}
                style={{ display: "none" }}
              />
            </label>

            {isNonEmptyString(value) ? (
              <button
                type="button"
                onClick={() => onChange("")}
                disabled={uploading}
                style={{
                  border: "1px solid rgba(0,0,0,0.14)",
                  background: "white",
                  color: "black",
                  padding: "10px 12px",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 900,
                  cursor: uploading ? "not-allowed" : "pointer",
                  opacity: uploading ? 0.6 : 1,
                }}
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {err ? (
        <div
          style={{
            border: "1px solid rgba(255,0,0,0.25)",
            background: "rgba(255,0,0,0.06)",
            padding: 10,
            borderRadius: 12,
            fontSize: 13,
          }}
        >
          {err}
        </div>
      ) : null}
    </div>
  );
}
