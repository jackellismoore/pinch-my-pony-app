"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  bucket: string;              // e.g. "horses"
  value: string;               // current public URL
  onChange: (url: string) => void;
  label?: string;
  helper?: string;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
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

    setErr(null);
    setUploading(true);

    try {
      // must be authed for RLS storage policies
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userRes.user?.id;
      if (!uid) throw new Error("Not signed in.");

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${uid}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage.from(bucket).upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || undefined,
      });

      if (upErr) throw upErr;

      // If your bucket is PUBLIC:
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(fileName);
      const publicUrl = pub?.publicUrl;

      if (!publicUrl) throw new Error("Could not generate public URL.");

      onChange(publicUrl);

      // reset input so selecting same file again still triggers change
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
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 950 }}>{label}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{helper}</div>

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

      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.85 }}>Image URL</div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          style={{
            border: "1px solid rgba(15,23,42,0.12)",
            borderRadius: 12,
            padding: "12px 12px",
            fontSize: 14,
            outline: "none",
            background: "white",
          }}
        />
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
