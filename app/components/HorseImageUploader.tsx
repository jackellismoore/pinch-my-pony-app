"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function HorseImageUploader({
  bucket = "horses",
  value,
  onChange,
}: {
  bucket?: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pick = () => inputRef.current?.click();

  const onFile = async (file: File | null) => {
    if (!file) return;
    setErr(null);
    setUploading(true);

    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Not logged in");

      const ext = file.name.split(".").pop() || "jpg";
      const path = `public/${uid}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: true,
      });
      if (upErr) throw upErr;

      const pub = supabase.storage.from(bucket).getPublicUrl(path);
      const url = pub.data.publicUrl;

      if (!url) throw new Error("Could not build public URL");
      onChange(url);
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 14,
            overflow: "hidden",
            background: "rgba(15,23,42,0.06)",
            border: "1px solid rgba(15,23,42,0.12)",
            flexShrink: 0,
          }}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <button
            type="button"
            onClick={pick}
            disabled={uploading}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(15,23,42,0.12)",
              background: uploading ? "rgba(0,0,0,0.06)" : "white",
              fontWeight: 900,
              cursor: uploading ? "not-allowed" : "pointer",
              width: "fit-content",
            }}
          >
            {uploading ? "Uploading…" : "Upload photo"}
          </button>
          <div style={{ fontSize: 12, opacity: 0.65 }}>
            Uploads to storage bucket <b>{bucket}</b> and saves a public URL.
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        style={{ display: "none" }}
      />

      <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
        Image URL (auto-filled on upload)
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          style={{
            border: "1px solid rgba(0,0,0,0.14)",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 14,
          }}
        />
      </label>

      {err ? <div style={{ fontSize: 13, color: "rgba(180,0,0,0.9)" }}>{err}</div> : null}
    </div>
  );
}
