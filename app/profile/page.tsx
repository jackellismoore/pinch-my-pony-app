"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { VerificationBadge } from "../components/VerificationBadge";
import LocationAutocomplete from "@/components/LocationAutocomplete";

type ProfileAny = Record<string, any>;

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

const DEFAULT_AVATAR_DATA_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f5f1e8"/>
          <stop offset="100%" stop-color="#efe6d3"/>
        </linearGradient>
      </defs>
      <rect width="160" height="160" rx="80" fill="url(#bg)"/>
      <circle cx="80" cy="80" r="72" fill="none" stroke="#d8c4a0" stroke-width="2"/>
      <text x="80" y="96" text-anchor="middle" font-size="64">🐴</text>
    </svg>
  `);

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

function isAllowedAvatarType(file: File) {
  return ALLOWED_AVATAR_TYPES.has((file.type || "").toLowerCase());
}

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileAny | null>(null);

  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const [stableName, setStableName] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState("");

  const title = useMemo(() => {
    const dn = displayName.trim();
    const fn = fullName.trim();
    return dn || fn || "My Profile";
  }, [displayName, fullName]);

  const verificationStatus = (profile?.verification_status ?? "unverified") as string;
  const verifiedAt = (profile?.verified_at ?? null) as string | null;
  const verificationProvider = (profile?.verification_provider ?? null) as string | null;
  const isVerified = String(verificationStatus).toLowerCase() === "verified";

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

        const res = await supabase.from("profiles").select("*").eq("id", user.id).single();

        if (cancelled) return;
        if (res.error) throw res.error;

        const p = (res.data ?? null) as ProfileAny | null;
        setProfile(p);

        setFullName(p?.full_name ?? "");
        setDisplayName(p?.display_name ?? "");
        setAvatarUrl(p?.avatar_url ?? "");
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

  const checklist = useMemo(() => {
    const items = [
      { key: "photo", label: "Profile photo uploaded", done: !!avatarUrl.trim() },
      { key: "location", label: "Location added", done: !!location.trim() },
      { key: "bio", label: "Bio added", done: !!bio.trim() },
      { key: "age", label: "Age added", done: !!age.trim() },
      { key: "verification", label: "Identity verified", done: isVerified },
    ];
    return items;
  }, [avatarUrl, location, bio, age, isVerified]);

  const profileComplete = useMemo(() => {
    const done = checklist.filter((item) => item.done).length;
    return Math.round((done / checklist.length) * 100);
  }, [checklist]);

  const missingItems = useMemo(() => checklist.filter((item) => !item.done), [checklist]);

  async function tryUpdate(payload: Record<string, any>) {
    const attempt1 = await supabase.from("profiles").update(payload).eq("id", userId as string);

    if (!attempt1.error) return { ok: true as const, warn: null as string | null };

    const msg = attempt1.error.message || "";
    const looksLikeMissingColumn =
      msg.toLowerCase().includes("column") && msg.toLowerCase().includes("does not exist");

    if (!looksLikeMissingColumn) {
      return { ok: false as const, warn: null as string | null, error: attempt1.error };
    }

    const coreOnly: Record<string, any> = {
      full_name: payload.full_name,
      display_name: payload.display_name,
      avatar_url: payload.avatar_url,
      location: payload.location,
      age: payload.age,
      bio: payload.bio,
    };

    const attempt2 = await supabase.from("profiles").update(coreOnly).eq("id", userId as string);
    if (attempt2.error) {
      return { ok: false as const, warn: null as string | null, error: attempt2.error };
    }

    return {
      ok: true as const,
      warn:
        "Saved core fields. Optional fields may not all exist in your profiles table yet.",
    };
  }

  async function onSave() {
    setError(null);
    setNotice(null);

    if (!userId) return;

    if (!age.trim()) {
      setError("Age is required.");
      return;
    }

    if (!isNumberLike(age)) {
      setError("Age must be a number.");
      return;
    }

    const payload: Record<string, any> = {
      full_name: safeTrim(fullName),
      display_name: safeTrim(displayName),
      avatar_url: safeTrim(avatarUrl),
      stable_name: safeTrim(stableName),
      location: safeTrim(location),
      bio: safeTrim(bio),
      age: Number(age),
    };

    try {
      setSaving(true);

      const r = await tryUpdate(payload);

      if (!r.ok) {
        // @ts-ignore
        throw r.error;
      }

      if (r.warn) setNotice(r.warn);
      else setNotice("Saved.");

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

    if (!isAllowedAvatarType(file)) {
      setError("Please choose a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setError("That image is too large. Maximum size is 5MB.");
      return;
    }

    try {
      setSaving(true);

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
      setNotice("Avatar uploaded. Click Save to persist.");
    } catch (e: any) {
      setError(e?.message ?? "Avatar upload failed.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount() {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete your account? This cannot be undone."
    );
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError(null);
      setNotice(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;
      if (!token) throw new Error("You are not signed in.");

      const res = await fetch("/api/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.error || "Failed to delete account.");
      }

      await supabase.auth.signOut();
      router.replace("/");
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete account.");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="pmp-pageShell">
        <div className="pmp-sectionCard">
          <div className="pmp-mutedText">Loading profile…</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .pmp-profileGrid2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .pmp-profileGridBio {
          display: grid;
          grid-template-columns: 1fr 220px;
          gap: 12px;
        }

        .pmp-profileHero {
          display: grid;
          grid-template-columns: 112px 1fr;
          gap: 16px;
          align-items: center;
        }

        .pmp-profileHeaderMeta {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .pmp-profileSectionTitle {
          font-weight: 950;
          font-size: 14px;
          color: #0f172a;
        }

        .pmp-profileInput,
        .pmp-profileTextarea {
          border: 1px solid rgba(15,23,42,0.12);
          border-radius: 14px;
          padding: 12px 12px;
          font-size: 14px;
          width: 100%;
          background: rgba(255,255,255,0.88);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.75);
        }

        .pmp-profileTextarea {
          resize: vertical;
        }

        .pmp-profileFooterRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        @media (max-width: 767px) {
          .pmp-profileGrid2,
          .pmp-profileGridBio,
          .pmp-profileHero {
            grid-template-columns: 1fr;
          }

          .pmp-profileFooterRow > * {
            width: 100%;
          }

          .pmp-profileFooterRow button {
            width: 100%;
          }
        }
      `}</style>

      <div className="pmp-pageShell" style={{ paddingBottom: 110 }}>
        <div className="pmp-sectionCard" style={{ overflow: "hidden" }}>
          <div
            style={{
              padding: 2,
              borderRadius: 22,
              background:
                "linear-gradient(135deg, rgba(31,61,43,0.12), rgba(200,162,77,0.18), rgba(31,42,68,0.10))",
            }}
          >
            <div
              style={{
                borderRadius: 20,
                padding: 18,
                background:
                  "radial-gradient(900px 240px at 0% 0%, rgba(200,162,77,0.12), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.98), rgba(245,241,232,0.84))",
                boxShadow: "0 18px 44px rgba(15,23,42,0.06)",
              }}
            >
              <div className="pmp-profileHero">
                <div
                  style={{
                    width: 112,
                    height: 112,
                    borderRadius: 999,
                    overflow: "hidden",
                    background: "rgba(0,0,0,0.06)",
                    border: "2px solid rgba(200,162,77,0.35)",
                    boxShadow: "0 18px 34px rgba(15,23,42,0.10)",
                  }}
                >
                  <img
                    src={avatarUrl || DEFAULT_AVATAR_DATA_URI}
                    alt="Profile avatar"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_AVATAR_DATA_URI;
                    }}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <div className="pmp-kicker">Account</div>
                    <h1 className="pmp-pageTitle" style={{ marginBottom: 4 }}>
                      {title}
                    </h1>
                    <div className="pmp-mutedText">
                      Edit your public profile details and build trust with riders.
                    </div>
                  </div>

                  <div className="pmp-profileHeaderMeta">
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        color: "rgba(11,59,46,0.82)",
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid rgba(11,59,46,0.18)",
                        background: "rgba(255,255,255,0.76)",
                        boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
                      }}
                    >
                      {profileComplete}% complete
                    </div>

                    <VerificationBadge
                      status={verificationStatus}
                      verifiedAt={verifiedAt}
                      provider={verificationProvider}
                    />

                    {verificationProvider ? (
                      <div style={{ fontSize: 12, opacity: 0.65 }}>Provider: {verificationProvider}</div>
                    ) : null}
                  </div>

                  {!isVerified ? (
                    <div>
                      <button
                        onClick={() => router.push("/verify")}
                        className="pmp-ctaPrimary"
                        style={{
                          border: "1px solid rgba(0,0,0,0.14)",
                          background: "#111111",
                          color: "white",
                        }}
                      >
                        Verify now →
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pmp-sectionCard">
          <div style={{ display: "grid", gap: 8 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div className="pmp-profileSectionTitle">Profile completeness</div>
              <div className="pmp-mutedText">{profileComplete}% complete</div>
            </div>

            <div
              style={{
                height: 10,
                borderRadius: 999,
                background: "rgba(15,23,42,0.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${profileComplete}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #1F3D2B, #C8A24D)",
                }}
              />
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
              {checklist.map((item) => (
                <div
                  key={item.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                    color: item.done ? "#0b3b2e" : "rgba(0,0,0,0.72)",
                    fontWeight: item.done ? 900 : 700,
                  }}
                >
                  <span aria-hidden="true">{item.done ? "✅" : "⬜"}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            {missingItems.length ? (
              <div className="pmp-mutedText" style={{ fontSize: 12, marginTop: 2 }}>
                Missing: {missingItems.map((item) => item.label.toLowerCase()).join(", ")}.
              </div>
            ) : (
              <div className="pmp-mutedText" style={{ fontSize: 12, marginTop: 2 }}>
                Everything needed for a complete profile is filled in.
              </div>
            )}
          </div>
        </div>

        {error ? <div className="pmp-errorBanner">{error}</div> : null}

        {notice ? (
          <div
            className="pmp-sectionCard"
            style={{
              padding: 12,
              background: "rgba(15,23,42,0.03)",
              color: "rgba(0,0,0,0.75)",
            }}
          >
            {notice}
          </div>
        ) : null}

        <div
          className="pmp-sectionCard"
          style={{
            display: "grid",
            gap: 16,
            background:
              "radial-gradient(900px 220px at 0% 0%, rgba(200,162,77,0.10), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,246,241,0.92))",
          }}
        >
          <div style={{ display: "grid", gap: 10 }}>
            <div className="pmp-profileSectionTitle">Profile photo</div>

            <div
              style={{
                display: "flex",
                gap: 14,
                alignItems: "center",
                flexWrap: "wrap",
                padding: 14,
                borderRadius: 18,
                border: "1px solid rgba(15,23,42,0.08)",
                background: "rgba(255,255,255,0.72)",
              }}
            >
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: 999,
                  overflow: "hidden",
                  background: "rgba(0,0,0,0.06)",
                  border: "1px solid rgba(0,0,0,0.10)",
                  flexShrink: 0,
                }}
              >
                <img
                  src={avatarUrl || DEFAULT_AVATAR_DATA_URI}
                  alt="Profile avatar"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_AVATAR_DATA_URI;
                  }}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 240, display: "grid", gap: 8 }}>
                <div style={{ fontSize: 12, color: "rgba(0,0,0,0.6)", lineHeight: 1.6 }}>
                  Upload a JPG, PNG, or WebP image from your photo library or files. Maximum size 5MB.
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <label
                    style={{
                      border: "1px solid rgba(0,0,0,0.14)",
                      padding: "10px 12px",
                      borderRadius: 12,
                      fontWeight: 900,
                      fontSize: 13,
                      cursor: "pointer",
                      background: "white",
                      minHeight: 44,
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    Choose photo
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onUploadAvatar(f);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>

                  <div style={{ fontSize: 12, color: "rgba(0,0,0,0.6)" }}>
                    Placeholder stays until you upload your own image.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div className="pmp-profileSectionTitle">Identity & trust</div>

            <div
              style={{
                border: "1px solid rgba(15,23,42,0.08)",
                borderRadius: 18,
                background: "rgba(255,255,255,0.72)",
                padding: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 900 }}>Trust & identity</div>
                <VerificationBadge
                  status={verificationStatus}
                  verifiedAt={verifiedAt}
                  provider={verificationProvider}
                />
                {verificationProvider ? (
                  <div style={{ fontSize: 12, opacity: 0.65 }}>Provider: {verificationProvider}</div>
                ) : null}
              </div>

              {!isVerified ? (
                <button
                  onClick={() => router.push("/verify")}
                  className="pmp-ctaPrimary"
                  style={{
                    border: "1px solid rgba(0,0,0,0.14)",
                    background: "#111111",
                    color: "white",
                  }}
                >
                  Verify now →
                </button>
              ) : null}
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div className="pmp-profileSectionTitle">Names</div>

            <div className="pmp-profileGrid2">
              <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
                Display name
                <input
                  className="pmp-profileInput"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="What riders will see"
                />
              </label>

              <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
                Full name
                <input
                  className="pmp-profileInput"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Legal / full name (optional)"
                />
              </label>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div className="pmp-profileSectionTitle">Public details</div>

            <div className="pmp-profileGrid2">
              <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
                Stable name
                <input
                  className="pmp-profileInput"
                  value={stableName}
                  onChange={(e) => setStableName(e.target.value)}
                  placeholder="(optional)"
                />
              </label>

              <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
                Location
                <LocationAutocomplete
                  value={location}
                  onChange={setLocation}
                  onPlaceSelect={({ address }) => setLocation(address)}
                />
              </label>
            </div>

            <div className="pmp-profileGridBio">
              <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
                Bio
                <textarea
                  className="pmp-profileTextarea"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={5}
                  placeholder="A short intro…"
                />
              </label>

              <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
                Age *
                <input
                  className="pmp-profileInput"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Required"
                  inputMode="numeric"
                />
                <div style={{ fontSize: 12, color: "rgba(0,0,0,0.55)" }}>
                  Age is required for profile completion.
                </div>
              </label>
            </div>
          </div>

          <div className="pmp-profileFooterRow">
            <div style={{ fontSize: 12, color: "rgba(0,0,0,0.55)", wordBreak: "break-all" }}>
              Profile ID:{" "}
              <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {userId}
              </span>
            </div>

            <button
              onClick={onSave}
              disabled={saving || deleting}
              className="pmp-ctaPrimary"
              style={{
                border: "1px solid rgba(0,0,0,0.14)",
                background: saving ? "rgba(0,0,0,0.06)" : "#111111",
                color: saving ? "rgba(0,0,0,0.55)" : "white",
                cursor: saving ? "not-allowed" : "pointer",
                minWidth: 160,
              }}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>

        <div
          className="pmp-sectionCard"
          style={{
            border: "1px solid rgba(185,28,28,0.15)",
            background: "rgba(185,28,28,0.03)",
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 950, fontSize: 14, color: "#991b1b" }}>Delete account</div>
          <div style={{ fontSize: 13, color: "rgba(0,0,0,0.7)", lineHeight: 1.6 }}>
            Permanently delete your Pinch My Pony account and associated profile data. This cannot be
            undone.
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={deleteAccount}
              disabled={deleting || saving}
              style={{
                border: "1px solid rgba(185,28,28,0.22)",
                background: deleting ? "rgba(185,28,28,0.05)" : "rgba(185,28,28,0.08)",
                color: "#991b1b",
                borderRadius: 12,
                padding: "11px 14px",
                fontWeight: 950,
                fontSize: 14,
                cursor: deleting ? "not-allowed" : "pointer",
              }}
            >
              {deleting ? "Deleting account…" : "Delete account"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}