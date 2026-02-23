"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { VerificationBadge } from "../components/VerificationBadge";

type ProfileAny = Record<string, any>;

function safeTrim(v: any) {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

function isNumberLike(v: any) {
  if (v === null || v === undefined) return false;
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "string" && v.trim()) return !Number.isNaN(Number(v));
  return false;
}

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileAny | null>(null);

  // editable fields (core + optional)
  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Optional fields (only saved if your DB supports them)
  const [stableName, setStableName] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState(""); // store as string in UI, parse for DB

  const title = useMemo(() => {
    const dn = displayName.trim();
    const fn = fullName.trim();
    return dn || fn || "My Profile";
  }, [displayName, fullName]);

  const verificationStatus = (profile?.verification_status ?? "unverified") as string;
  const verifiedAt = (profile?.verified_at ?? null) as string | null;
  const verificationProvider = (profile?.verification_provider ?? null) as string | null;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setNotice(null);

      try {
        const { data: auth, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;

        const user = auth.user;
        if (!user) {
          router.push("/login");
          router.refresh();
          return;
        }

        if (cancelled) return;
        setUserId(user.id);

        // ✅ Include verification fields
        const res = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (cancelled) return;

        if (res.error) throw res.error;

        const p = (res.data ?? null) as ProfileAny | null;
        setProfile(p);

        // core
        setFullName(p?.full_name ?? "");
        setDisplayName(p?.display_name ?? "");
        setAvatarUrl(p?.avatar_url ?? "");

        // optional (only if present)
        setStableName(p?.stable_name ?? "");
        setLocation(p?.location ?? "");
        setBio(p?.bio ?? "");
        setAge(p?.age !== null && p?.age !== undefined ? String(p.age) : "");
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function tryUpdate(payload: Record<string, any>) {
    // Attempt full update; if optional columns don’t exist, fall back to core fields only.
    const attempt1 = await supabase.from("profiles").update(payload).eq("id", userId as string);

    if (!attempt1.error) return { ok: true as const, warn: null as string | null };

    const msg = attempt1.error.message || "";
    const looksLikeMissingColumn =
      msg.toLowerCase().includes("column") && msg.toLowerCase().includes("does not exist");

    if (!looksLikeMissingColumn)
      return { ok: false as const, warn: null as string | null, error: attempt1.error };

    // fallback to core only
    const coreOnly: Record<string, any> = {
      full_name: payload.full_name,
      display_name: payload.display_name,
      avatar_url: payload.avatar_url,
    };

    const attempt2 = await supabase.from("profiles").update(coreOnly).eq("id", userId as string);
    if (attempt2.error)
      return { ok: false as const, warn: null as string | null, error: attempt2.error };

    return {
      ok: true as const,
      warn:
        "Saved core fields. Optional fields (bio/location/stable_name/age) are not in your profiles table yet.",
    };
  }

  async function onSave() {
    setError(null);
    setNotice(null);

    if (!userId) return;

    const payload: Record<string, any> = {
      full_name: safeTrim(fullName),
      display_name: safeTrim(displayName),
      avatar_url: safeTrim(avatarUrl),

      // optional fields (will be ignored by fallback if columns don’t exist)
      stable_name: safeTrim(stableName),
      location: safeTrim(location),
      bio: safeTrim(bio),
      age: age.trim() === "" ? null : Number(age),
    };

    // Prevent sending NaN for age
    if (age.trim() !== "" && !isNumberLike(age)) {
      setError("Age must be a number (or leave it blank).");
      return;
    }

    try {
      setSaving(true);

      const r = await tryUpdate(payload);

      if (!r.ok) {
        // @ts-ignore
        throw r.error;
      }

      if (r.warn) setNotice(r.warn);
      else setNotice("Saved.");

      // reload profile for consistency
      const res = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (!res.error) setProfile(res.data as any);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function onUploadAvatar(file: File) {
    setError(null);
    setNotice(null);

    if (!userId) return;

    try {
      setSaving(true);

      // common bucket name; adjust if yours differs
      const bucket = "avatars";
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;

      const up = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "image/jpeg",
      });

      if (up.error) throw up.error;

      const pub = supabase.storage.from(bucket).getPublicUrl(path);
      const url = pub.data.publicUrl;

      setAvatarUrl(url);
      setNotice("Uploaded. Click Save to persist.");
    } catch (e: any) {
      setError(
        e?.message ??
          "Avatar upload failed. You can still paste a public image URL into the Avatar URL field."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 24, fontSize: 13, color: "rgba(0,0,0,0.6)" }}>Loading…</div>;
  }

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>{title}</h1>
          <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.65)" }}>
            Edit your public profile details.
          </div>
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          style={{
            border: "1px solid rgba(0,0,0,0.14)",
            background: saving ? "rgba(0,0,0,0.06)" : "black",
            color: saving ? "rgba(0,0,0,0.55)" : "white",
            padding: "10px 12px",
            borderRadius: 12,
            fontWeight: 950,
            fontSize: 13,
            cursor: saving ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* ✅ Trust & identity card */}
      <div
        style={{
          marginTop: 12,
          border: "1px solid rgba(0,0,0,0.10)",
          borderRadius: 14,
          padding: 14,
          background: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 950, fontSize: 13 }}>Trust & identity</div>
          <VerificationBadge status={verificationStatus} verifiedAt={verifiedAt} provider={verificationProvider} />
          {verificationProvider ? (
            <div style={{ fontSize: 12, opacity: 0.65 }}>Provider: {verificationProvider}</div>
          ) : null}
        </div>

        {String(verificationStatus).toLowerCase() !== "verified" ? (
          <button
            onClick={() => router.push("/verify")}
            style={{
              border: "1px solid rgba(0,0,0,0.14)",
              background: "black",
              color: "white",
              padding: "10px 12px",
              borderRadius: 12,
              fontWeight: 950,
              fontSize: 13,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Verify now →
          </button>
        ) : null}
      </div>

      {error ? (
        <div
          style={{
            marginTop: 12,
            border: "1px solid rgba(255,0,0,0.25)",
            background: "rgba(255,0,0,0.06)",
            padding: 12,
            borderRadius: 12,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}

      {notice ? (
        <div
          style={{
            marginTop: 12,
            border: "1px solid rgba(0,0,0,0.10)",
            background: "rgba(0,0,0,0.03)",
            padding: 12,
            borderRadius: 12,
            fontSize: 13,
            color: "rgba(0,0,0,0.75)",
          }}
        >
          {notice}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 14,
          border: "1px solid rgba(0,0,0,0.10)",
          borderRadius: 14,
          padding: 14,
          background: "white",
          display: "grid",
          gap: 12,
        }}
      >
        {/* Avatar */}
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 999,
              overflow: "hidden",
              background: "rgba(0,0,0,0.06)",
              border: "1px solid rgba(0,0,0,0.10)",
              flexShrink: 0,
            }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : null}
          </div>

          <div style={{ flex: 1, minWidth: 260, display: "grid", gap: 8 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
              Avatar URL
              <input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://…"
                style={{
                  border: "1px solid rgba(0,0,0,0.14)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 14,
                }}
              />
            </label>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <label
                style={{
                  border: "1px solid rgba(0,0,0,0.14)",
                  padding: "9px 10px",
                  borderRadius: 12,
                  fontWeight: 900,
                  fontSize: 13,
                  cursor: "pointer",
                  background: "white",
                }}
              >
                Upload avatar
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUploadAvatar(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>

              <div style={{ fontSize: 12, color: "rgba(0,0,0,0.6)" }}>
                Upload uses bucket <b>avatars</b>. If you use a different bucket, tell me.
              </div>
            </div>
          </div>
        </div>

        {/* Core fields */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
            Display name
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="What borrowers will see"
              style={{
                border: "1px solid rgba(0,0,0,0.14)",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 14,
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
            Full name
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Legal / full name (optional)"
              style={{
                border: "1px solid rgba(0,0,0,0.14)",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 14,
              }}
            />
          </label>
        </div>

        {/* Optional fields */}
        <div style={{ marginTop: 6, fontWeight: 950, fontSize: 13 }}>Optional public details</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
            Stable name
            <input
              value={stableName}
              onChange={(e) => setStableName(e.target.value)}
              placeholder="(optional)"
              style={{
                border: "1px solid rgba(0,0,0,0.14)",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 14,
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
            Location
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City / region"
              style={{
                border: "1px solid rgba(0,0,0,0.14)",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 14,
              }}
            />
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 10 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
            Bio
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={5}
              placeholder="A short intro…"
              style={{
                border: "1px solid rgba(0,0,0,0.14)",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 14,
                resize: "vertical",
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
            Age
            <input
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="(optional)"
              inputMode="numeric"
              style={{
                border: "1px solid rgba(0,0,0,0.14)",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 14,
              }}
            />
            <div style={{ fontSize: 12, color: "rgba(0,0,0,0.55)" }}>Leave blank if not applicable.</div>
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 12, color: "rgba(0,0,0,0.55)" }}>
            Profile ID:{" "}
            <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{userId}</span>
          </div>

          <button
            onClick={onSave}
            disabled={saving}
            style={{
              border: "1px solid rgba(0,0,0,0.14)",
              background: saving ? "rgba(0,0,0,0.06)" : "black",
              color: saving ? "rgba(0,0,0,0.55)" : "white",
              padding: "10px 12px",
              borderRadius: 12,
              fontWeight: 950,
              fontSize: 13,
              cursor: saving ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}