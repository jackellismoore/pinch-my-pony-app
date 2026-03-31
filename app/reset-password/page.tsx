"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const palette = {
  forest: "#1F3D2B",
  saddle: "#8B5E3C",
  cream: "#F5F1E8",
  navy: "#1F2A44",
  gold: "#C8A24D",
};

function getHashParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : "";
  return new URLSearchParams(hash);
}

export default function ResetPasswordPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setChecking(true);
      setError(null);

      try {
        const hashParams = getHashParams();
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        if (type === "recovery" && accessToken && refreshToken) {
          const { error: sessionErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionErr) throw sessionErr;

          if (typeof window !== "undefined" && window.location.hash) {
            window.history.replaceState(null, "", window.location.pathname);
          }
        }

        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const user = data.session?.user ?? null;

        if (!cancelled) {
          setHasSession(!!user);
          setChecking(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setHasSession(false);
          setChecking(false);
          setError(e?.message ?? "Your reset link is invalid or expired.");
        }
      }
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      init();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const pwdErr = useMemo(() => {
    if (!password) return "Password is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return null;
  }, [password]);

  const matchErr = useMemo(() => {
    if (!password2) return "Please confirm your password.";
    if (password2 !== password) return "Passwords do not match.";
    return null;
  }, [password2, password]);

  const canSubmit = hasSession && !saving && !pwdErr && !matchErr;

  async function saveNewPassword() {
    setError(null);

    if (!hasSession) {
      setError("Your reset link is missing or expired. Please request a new one.");
      return;
    }

    if (!canSubmit) {
      setError(pwdErr || matchErr || "Please check your inputs.");
      return;
    }

    try {
      setSaving(true);

      const res = await supabase.auth.updateUser({ password });
      if (res.error) throw res.error;

      setDone(true);

      setTimeout(() => {
        router.replace("/login");
        router.refresh();
      }, 900);
    } catch (e: any) {
      setError(e?.message ?? "Failed to update password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={wrap()}>
      <div style={container()}>
        <div style={topRow()}>
          <div>
            <div style={pill()}>🔑 Set new password</div>
            <h1 style={title()}>Reset password</h1>
            <div style={sub()}>Choose a new password for your Pinch My Pony account.</div>
          </div>

          <Link href="/login" style={{ textDecoration: "none" }}>
            <span style={btn("secondary")}>← Back to login</span>
          </Link>
        </div>

        <div style={{ marginTop: 14, ...card() }}>
          {checking ? (
            <div style={{ fontSize: 13, color: "rgba(31,42,68,0.70)", fontWeight: 850 }}>
              Loading…
            </div>
          ) : null}

          {!checking && !hasSession ? (
            <div style={warnBand()}>
              <div style={{ fontWeight: 950, color: palette.navy }}>
                This reset link isn’t active
              </div>
              <div style={{ marginTop: 6, opacity: 0.85, lineHeight: 1.7 }}>
                It may have expired, already been used, or opened in a different browser.
                <div style={{ marginTop: 10 }}>
                  <Link href="/forgot-password" style={inlineLink()}>
                    Request a new reset link →
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

          {error ? <div style={errorBand()}>{error}</div> : null}

          {done ? (
            <div style={successBand()}>
              <div style={{ fontWeight: 950, color: palette.navy }}>Password updated</div>
              <div style={{ marginTop: 6, opacity: 0.85, lineHeight: 1.7 }}>
                You’re all set. Taking you back to login…
              </div>
            </div>
          ) : null}

          {!checking && hasSession && !done ? (
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <label style={label()}>
                New password
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  style={input(!!pwdErr)}
                />
                {pwdErr ? <div style={fieldErr()}>{pwdErr}</div> : null}
              </label>

              <label style={label()}>
                Confirm new password
                <input
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  style={input(!!matchErr)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveNewPassword();
                  }}
                />
                {matchErr ? <div style={fieldErr()}>{matchErr}</div> : null}
              </label>

              <button
                onClick={saveNewPassword}
                disabled={!canSubmit}
                style={btnPrimaryDisabled(!canSubmit)}
              >
                {saving ? "Saving…" : "Save new password →"}
              </button>
            </div>
          ) : null}
        </div>

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.6, textAlign: "center" }}>
          Pinch My Pony · Secure access
        </div>
      </div>
    </div>
  );
}

/* ---- styles ---- */

function wrap(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: "calc(100vh - 64px)",
    background:
      "radial-gradient(900px 420px at 20% 10%, rgba(200,162,77,0.18), transparent 55%), radial-gradient(900px 420px at 90% 30%, rgba(31,61,43,0.14), transparent 58%), linear-gradient(180deg, rgba(245,241,232,1) 0%, rgba(250,250,250,1) 65%)",
    padding: "18px 0 28px",
  };
}

function container(): React.CSSProperties {
  return { padding: 16, maxWidth: 720, margin: "0 auto" };
}

function topRow(): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-end",
    flexWrap: "wrap",
  };
}

function pill(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(31,61,43,0.16)",
    background: "rgba(31,61,43,0.08)",
    color: palette.forest,
    fontWeight: 900,
    fontSize: 12,
    width: "fit-content",
  };
}

function title(): React.CSSProperties {
  return {
    margin: 0,
    marginTop: 10,
    fontSize: 26,
    fontWeight: 950,
    color: palette.navy,
    letterSpacing: -0.3,
  };
}

function sub(): React.CSSProperties {
  return { marginTop: 6, fontSize: 13, color: "rgba(31,42,68,0.72)", lineHeight: 1.7 };
}

function card(): React.CSSProperties {
  return {
    border: "1px solid rgba(31,42,68,0.12)",
    borderRadius: 22,
    padding: 18,
    background: "rgba(255,255,255,0.80)",
    boxShadow: "0 16px 44px rgba(31,42,68,0.08)",
    backdropFilter: "blur(6px)",
  };
}

function label(): React.CSSProperties {
  return {
    display: "grid",
    gap: 6,
    fontSize: 13,
    color: "rgba(31,42,68,0.78)",
    fontWeight: 850,
  };
}

function input(hasError: boolean): React.CSSProperties {
  return {
    border: hasError ? "1px solid rgba(122,31,31,0.35)" : "1px solid rgba(31,42,68,0.16)",
    borderRadius: 14,
    padding: "12px 12px",
    fontSize: 14,
    background: "rgba(255,255,255,0.90)",
    outline: "none",
    boxShadow: hasError ? "0 0 0 3px rgba(122,31,31,0.12)" : "none",
  };
}

function fieldErr(): React.CSSProperties {
  return { fontSize: 12, color: "#7a1f1f", fontWeight: 900 };
}

function btn(kind: "primary" | "secondary"): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: 14,
    padding: "11px 14px",
    fontSize: 13,
    fontWeight: 950,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    whiteSpace: "nowrap",
    cursor: "pointer",
    border: "1px solid rgba(0,0,0,0.10)",
  };

  if (kind === "primary") {
    return {
      ...base,
      background: `linear-gradient(180deg, ${palette.forest}, #173223)`,
      color: "white",
      boxShadow: "0 14px 34px rgba(31,61,43,0.18)",
    };
  }

  return {
    ...base,
    background: "rgba(255,255,255,0.78)",
    color: palette.navy,
    border: "1px solid rgba(31,42,68,0.18)",
    boxShadow: "0 12px 30px rgba(31,42,68,0.06)",
  };
}

function btnPrimaryDisabled(disabled: boolean): React.CSSProperties {
  return {
    ...btn("primary"),
    opacity: disabled ? 0.65 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}

function errorBand(): React.CSSProperties {
  return {
    marginTop: 12,
    border: "1px solid rgba(255,0,0,0.25)",
    background: "rgba(255,0,0,0.06)",
    padding: 12,
    borderRadius: 14,
    fontSize: 13,
    fontWeight: 850,
  };
}

function warnBand(): React.CSSProperties {
  return {
    marginTop: 12,
    borderRadius: 18,
    border: "1px solid rgba(200,162,77,0.22)",
    background: "rgba(200,162,77,0.10)",
    padding: 12,
    fontSize: 13,
    fontWeight: 850,
    color: "rgba(31,42,68,0.82)",
    lineHeight: 1.6,
  };
}

function successBand(): React.CSSProperties {
  return {
    marginTop: 12,
    borderRadius: 18,
    border: "1px solid rgba(31,61,43,0.18)",
    background: "rgba(31,61,43,0.08)",
    padding: 12,
    fontSize: 13,
    fontWeight: 850,
    color: "rgba(31,42,68,0.82)",
    lineHeight: 1.6,
  };
}

function inlineLink(): React.CSSProperties {
  return {
    color: palette.forest,
    fontWeight: 900,
    textDecoration: "none",
    borderBottom: "2px solid rgba(200,162,77,0.45)",
    paddingBottom: 1,
  };
}