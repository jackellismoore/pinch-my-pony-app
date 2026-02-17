"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type FormError =
  | "missingHorse"
  | "notLoggedIn"
  | "invalidDates"
  | "duplicateRequest"
  | "unknown";

export default function RequestClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const horseId = searchParams.get("horseId");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [errorCode, setErrorCode] = useState<FormError | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // If horseId missing, bounce to browse
  useEffect(() => {
    if (!horseId) router.push("/browse");
  }, [horseId, router]);

  const canSubmit = useMemo(() => {
    if (!horseId) return false;

    // Dates are optional, but if either is set, they must be valid.
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
      if (end < start) return false;
    }

    return true;
  }, [horseId, startDate, endDate]);

  const humanError = useMemo(() => {
    if (!errorCode) return null;

    const map: Record<FormError, { title: string; body: string }> = {
      missingHorse: {
        title: "Missing horse",
        body: "Please select a horse again and retry.",
      },
      notLoggedIn: {
        title: "Please log in",
        body: "You need to be signed in to request a borrow.",
      },
      invalidDates: {
        title: "Invalid dates",
        body: "End date can’t be before the start date.",
      },
      duplicateRequest: {
        title: "Request already sent",
        body: "You already have a pending request for this horse.",
      },
      unknown: {
        title: "Request failed",
        body: errorMessage || "Something went wrong. Please try again.",
      },
    };

    return map[errorCode];
  }, [errorCode, errorMessage]);

  const checkDuplicatePendingRequest = async (userId: string, horseId: string) => {
    // Prevent spamming: if there is already a pending request for this horse from this borrower, block.
    // (RLS should allow this borrower to see their own requests; if not, we’ll rely on insert error handling.)
    const { data, error } = await supabase
      .from("borrow_requests")
      .select("id")
      .eq("borrower_id", userId)
      .eq("horse_id", horseId)
      .eq("status", "pending")
      .limit(1);

    if (error) {
      // If RLS blocks this select, we don't hard-fail; we just proceed to insert and let DB decide.
      return { exists: false, softFailure: true };
    }

    return { exists: (data?.length ?? 0) > 0, softFailure: false };
  };

  const handleSubmit = async () => {
    setErrorCode(null);
    setErrorMessage("");

    if (!horseId) {
      setErrorCode("missingHorse");
      return;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        setErrorCode("invalidDates");
        return;
      }
    }

    setLoading(true);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setLoading(false);
      setErrorCode("notLoggedIn");
      // Preserve horseId so user can continue after login
      router.push(`/login?next=${encodeURIComponent(`/request?horseId=${horseId}`)}`);
      return;
    }

    // Optional: prevent duplicate pending request
    const dup = await checkDuplicatePendingRequest(user.id, horseId);
    if (dup.exists) {
      setLoading(false);
      setErrorCode("duplicateRequest");
      return;
    }

    const { error } = await supabase.from("borrow_requests").insert({
      horse_id: horseId,
      borrower_id: user.id,
      start_date: startDate || null,
      end_date: endDate || null,
      message: message.trim() ? message.trim() : null,
      status: "pending", // matches DB constraint
    });

    if (error) {
      console.error("Insert error:", error);

      // If you later add a DB unique constraint for (borrower_id, horse_id, status='pending'),
      // you can map that specific error code to duplicateRequest here.
      setLoading(false);
      setErrorCode("unknown");
      setErrorMessage(error.message);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successTitle}>Request Sent ✔</div>
          <div style={styles.successSub}>Your request has been sent to the owner.</div>

          <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
            <button
              onClick={() => router.push("/messages")}
              style={{ ...styles.primaryBtn, width: "auto", padding: "12px 14px" }}
            >
              Go to Messages
            </button>

            <button
              onClick={() => router.push("/browse")}
              style={{ ...styles.secondaryBtn, width: "auto", padding: "12px 14px" }}
            >
              Browse More Horses
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.title}>Request to Borrow</div>
        <div style={styles.subtitle}>Send a message and optionally choose dates.</div>

        {humanError && (
          <div style={styles.errorBox}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>{humanError.title}</div>
            <div style={{ opacity: 0.85 }}>{humanError.body}</div>
          </div>
        )}

        <label style={styles.label}>Start Date (optional)</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={styles.input}
        />

        <label style={styles.label}>End Date (optional)</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={styles.input}
        />

        <label style={styles.label}>Message to Owner</label>
        <textarea
          placeholder="Introduce yourself, your riding experience, and what you’re looking for…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ ...styles.input, height: 110, resize: "vertical" }}
        />

        <button
          onClick={handleSubmit}
          disabled={loading || !canSubmit}
          style={{
            ...styles.primaryBtn,
            opacity: loading || !canSubmit ? 0.65 : 1,
            cursor: loading || !canSubmit ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Sending…" : "Send Request"}
        </button>

        <button onClick={() => router.back()} style={styles.linkBtn}>
          ← Back
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    justifyContent: "center",
    padding: 60,
  },
  card: {
    width: 520,
    background: "#fff",
    padding: 40,
    borderRadius: 14,
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
    border: "1px solid rgba(15,23,42,0.10)",
  },
  title: {
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: "-0.4px",
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 18,
    color: "rgba(15,23,42,0.70)",
    fontSize: 13,
    lineHeight: 1.4,
  },
  label: {
    display: "block",
    marginBottom: 6,
    fontWeight: 800,
    fontSize: 13,
  },
  input: {
    width: "100%",
    padding: 12,
    marginBottom: 18,
    borderRadius: 10,
    border: "1px solid rgba(15,23,42,0.14)",
    outline: "none",
    fontSize: 14,
  },
  primaryBtn: {
    width: "100%",
    padding: 14,
    borderRadius: 10,
    background: "#2563eb",
    color: "white",
    border: "none",
    fontWeight: 900,
    cursor: "pointer",
    marginTop: 4,
  },
  secondaryBtn: {
    borderRadius: 10,
    background: "white",
    color: "rgba(15,23,42,0.92)",
    border: "1px solid rgba(15,23,42,0.14)",
    fontWeight: 900,
    cursor: "pointer",
  },
  linkBtn: {
    marginTop: 14,
    background: "transparent",
    border: "none",
    color: "rgba(37,99,235,1)",
    fontWeight: 900,
    cursor: "pointer",
    padding: 0,
  },
  errorBox: {
    marginBottom: 18,
    padding: 14,
    borderRadius: 12,
    border: "1px solid rgba(220,38,38,0.35)",
    background: "rgba(220,38,38,0.06)",
    color: "rgba(127,29,29,1)",
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 900,
    color: "#16a34a",
    marginBottom: 8,
  },
  successSub: {
    color: "rgba(15,23,42,0.75)",
    lineHeight: 1.5,
  },
};
