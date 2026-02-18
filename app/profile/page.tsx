"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

type ProfileRow = {
  id: string
  role: "owner" | "borrower" | null
  full_name: string | null
  display_name: string | null
  avatar_url: string | null
  created_at: string | null
  last_seen_at: string | null

  // Optional legacy/custom fields (safe if they exist)
  stable_name?: string | null
  age?: number | null
  location?: string | null
  bio?: string | null
}

function safeTrim(v: string) {
  return v.trim()
}

export default function ProfilePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [profile, setProfile] = useState<ProfileRow | null>(null)

  // Editable fields
  const [fullName, setFullName] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [stableName, setStableName] = useState("")
  const [age, setAge] = useState<string>("")
  const [location, setLocation] = useState("")
  const [bio, setBio] = useState("")

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser()

      if (userErr) {
        if (!cancelled) setError(userErr.message)
        if (!cancelled) setLoading(false)
        return
      }

      if (!user) {
        router.push("/login")
        return
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (cancelled) return

      if (error) {
        setError(error.message)
        setLoading(false)
        return
      }

      const p = (data ?? null) as ProfileRow | null
      setProfile(p)

      setFullName(p?.full_name ?? "")
      setDisplayName(p?.display_name ?? "")
      setAvatarUrl(p?.avatar_url ?? "")
      setStableName((p as any)?.stable_name ?? "")
      setAge(
        typeof (p as any)?.age === "number" && Number.isFinite((p as any).age)
          ? String((p as any).age)
          : ""
      )
      setLocation((p as any)?.location ?? "")
      setBio((p as any)?.bio ?? "")

      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [router])

  const canSave = useMemo(() => {
    if (!profile) return false
    if (saving) return false
    if (!safeTrim(fullName)) return false
    // display name optional, but nice to have
    return true
  }, [profile, saving, fullName])

  async function save() {
    if (!profile) return
    setError(null)
    setSuccess(null)

    const fn = safeTrim(fullName)
    if (!fn) {
      setError("Full name is required.")
      return
    }

    // Optional fields
    const dn = safeTrim(displayName)
    const av = safeTrim(avatarUrl)
    const st = safeTrim(stableName)
    const loc = safeTrim(location)
    const b = bio.trim()
    const ageNum =
      age.trim() === "" ? null : Number.isFinite(Number(age.trim())) ? Number(age.trim()) : NaN

    if (Number.isNaN(ageNum as any)) {
      setError("Age must be a number.")
      return
    }

    try {
      setSaving(true)

      // Update only fields that exist / are safe. Profiles table definitely has these:
      const payload: any = {
        full_name: fn,
        display_name: dn || null,
        avatar_url: av || null,
      }

      // These are optional in your current profile UI; we include them if your DB has them.
      // If the columns don't exist, Supabase will error — so if you don't have them, tell me
      // and I’ll remove them in a clean follow-up.
      payload.stable_name = st || null
      payload.age = ageNum === null ? null : ageNum
      payload.location = loc || null
      payload.bio = b || null

      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", profile.id)

      if (error) throw error

      setSuccess("Profile saved.")
      // reload profile snapshot
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profile.id)
        .single()
      setProfile((data ?? null) as ProfileRow | null)
    } catch (e: any) {
      setError(e?.message ?? "Failed to save profile.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ padding: 40 }}>Loading…</div>

  if (!profile) {
    return (
      <div style={{ padding: 40 }}>
        {error ? <div style={{ color: "rgba(180,0,0,0.9)" }}>{error}</div> : "Profile not found."}
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>My Profile</h1>
          <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.65)" }}>
            Role: <span style={{ fontWeight: 750 }}>{profile.role ?? "—"}</span>
          </div>
        </div>

        <button
          onClick={save}
          disabled={!canSave}
          style={{
            border: "1px solid rgba(0,0,0,0.14)",
            borderRadius: 12,
            padding: "10px 14px",
            background: canSave ? "black" : "rgba(0,0,0,0.05)",
            color: canSave ? "white" : "rgba(0,0,0,0.5)",
            cursor: canSave ? "pointer" : "not-allowed",
            fontWeight: 800,
          }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
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

      {success ? (
        <div
          style={{
            marginTop: 12,
            border: "1px solid rgba(0,140,60,0.25)",
            background: "rgba(0,140,60,0.06)",
            padding: 12,
            borderRadius: 12,
            fontSize: 13,
            color: "rgba(0,120,50,0.95)",
          }}
        >
          {success}
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
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
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

          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 850, fontSize: 16 }}>
              {displayName.trim() || fullName.trim() || "Your name"}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: "rgba(0,0,0,0.65)" }}>
              Update your profile so owners/borrowers recognize you.
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
            Full name (required)
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{
                border: "1px solid rgba(0,0,0,0.14)",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 14,
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
            Display name
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="What others will see"
              style={{
                border: "1px solid rgba(0,0,0,0.14)",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 14,
              }}
            />
          </label>
        </div>

        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          Avatar URL
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
            style={{
              border: "1px solid rgba(0,0,0,0.14)",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 14,
            }}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 12 }}>
          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
            Stable name
            <input
              value={stableName}
              onChange={(e) => setStableName(e.target.value)}
              placeholder="Optional"
              style={{
                border: "1px solid rgba(0,0,0,0.14)",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 14,
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
            Age
            <input
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Optional"
              style={{
                border: "1px solid rgba(0,0,0,0.14)",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 14,
              }}
            />
          </label>
        </div>

        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          Location
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Optional"
            style={{
              border: "1px solid rgba(0,0,0,0.14)",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 14,
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          Bio
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={5}
            placeholder="Tell people about yourself…"
            style={{
              border: "1px solid rgba(0,0,0,0.14)",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 14,
              resize: "vertical",
            }}
          />
        </label>
      </div>
    </div>
  )
}
