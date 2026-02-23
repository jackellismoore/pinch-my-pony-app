"use client";

import Link from "next/link";
import React, { useMemo, useState } from "react";

type FaqItem = {
  id: string;
  category: string;
  q: string;
  a: React.ReactNode;
  keywords?: string[];
};

const palette = {
  forest: "#1F3D2B",
  cream: "#F5F1E8",
  navy: "#1F2A44",
  gold: "#C8A24D",
};

const CATEGORIES = [
  "Safety & Verification",
  "Borrowing",
  "Owners",
  "Payments",
  "Messaging",
  "Cancellations",
  "Support",
] as const;

export default function FAQPage() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>("safety-1");

  const faqs: FaqItem[] = useMemo(
    () => [
      {
        id: "safety-1",
        category: "Safety & Verification",
        q: "Why do I need to verify my identity?",
        a: (
          <>
            Verification helps keep Pinch My Pony calm, trustworthy, and rider-safe. It reduces fraud, improves accountability,
            and gives owners confidence when approving requests.
          </>
        ),
        keywords: ["verify", "identity", "trust", "safety"],
      },
      {
        id: "safety-2",
        category: "Safety & Verification",
        q: "Can I browse without being verified?",
        a: (
          <>
            In most cases, yes. Verification is typically required before you can access the full marketplace experience (like
            completing certain actions). If you’re prompted, you’ll be guided to the verification step.
          </>
        ),
        keywords: ["browse", "verified", "unverified"],
      },
      {
        id: "borrow-1",
        category: "Borrowing",
        q: "How do I request dates for a horse?",
        a: (
          <>
            Browse a listing, choose your date range, and send a request. Availability rules help prevent overlaps so schedules
            stay clean and dependable.
          </>
        ),
        keywords: ["request", "dates", "availability"],
      },
      {
        id: "borrow-2",
        category: "Borrowing",
        q: "What should I message an owner before riding?",
        a: (
          <>
            Ask about riding level expectations, tack preferences, barn rules, and any care routines. Clear details up front
            keeps everyone comfortable — and the ride more enjoyable.
          </>
        ),
        keywords: ["message", "owner", "rules", "tack"],
      },
      {
        id: "owner-1",
        category: "Owners",
        q: "How do I keep my horse’s availability accurate?",
        a: (
          <>
            Use your dashboard to manage requests and availability. Keeping dates current helps you avoid conflicts and makes
            your listing more reliable for borrowers.
          </>
        ),
        keywords: ["owner", "availability", "dashboard"],
      },
      {
        id: "owner-2",
        category: "Owners",
        q: "Can I decline a request?",
        a: (
          <>
            Yes — and it’s totally fine. If a rider isn’t the right fit for your horse or schedule, decline politely. You can
            also message to ask clarifying questions before deciding.
          </>
        ),
        keywords: ["decline", "request", "owner"],
      },
      {
        id: "pay-1",
        category: "Payments",
        q: "How do payments work?",
        a: (
          <>
            Payment flow depends on how your marketplace is configured. If you see a payment step, you’ll always be shown the
            details before confirming. If something looks off, reach out — we’ll help.
          </>
        ),
        keywords: ["payment", "pricing", "fees"],
      },
      {
        id: "msg-1",
        category: "Messaging",
        q: "Where do I find my conversations?",
        a: (
          <>
            Head to <b>Messages</b> from your menu. Keep all coordination inside the app so dates, context, and details stay in
            one place.
          </>
        ),
        keywords: ["messages", "chat", "threads"],
      },
      {
        id: "cancel-1",
        category: "Cancellations",
        q: "What if I need to cancel?",
        a: (
          <>
            Notify the other party as soon as possible through Messages. If there’s a policy for your booking, it should be
            visible in your request details. When in doubt, contact support and we’ll help you navigate it.
          </>
        ),
        keywords: ["cancel", "cancellation", "refund"],
      },
      {
        id: "support-1",
        category: "Support",
        q: "Something feels wrong — what should I do?",
        a: (
          <>
            Trust your instincts. Pause the booking, don’t share sensitive info, and contact us right away. We’ll help you sort
            it out quickly and safely.
          </>
        ),
        keywords: ["support", "safety", "report"],
      },
      {
        id: "support-2",
        category: "Support",
        q: "How can I reach Pinch My Pony support?",
        a: (
          <>
            Use our <Link href="/contact" style={linkInline}>Contact Us</Link> form — we’ll get back to you as soon as possible.
          </>
        ),
        keywords: ["contact", "email", "help"],
      },
    ],
    []
  );

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedQuery) return faqs;

    return faqs.filter((f) => {
      const hay = [
        f.category,
        f.q,
        typeof f.a === "string" ? f.a : "",
        ...(f.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(normalizedQuery);
    });
  }, [faqs, normalizedQuery]);

  const grouped = useMemo(() => {
    const map = new Map<string, FaqItem[]>();
    for (const c of CATEGORIES) map.set(c, []);
    for (const item of filtered) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return Array.from(map.entries()).filter(([, items]) => items.length > 0);
  }, [filtered]);

  const totalCount = filtered.length;

  return (
    <div style={pageWrap}>
      <style>{css}</style>

      <div style={container}>
        <header style={header}>
          <div style={eyebrowPill}>
            <span aria-hidden="true">🧾</span>
            <span>Help Center</span>
          </div>

          <h1 style={title}>FAQs</h1>
          <p style={subtitle}>
            Clear answers, calm experience. If you don’t see what you need, we’re happy to help.
          </p>

          <div style={searchRow}>
            <div style={searchBox}>
              <div aria-hidden="true" style={{ opacity: 0.7 }}>🔎</div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search questions…"
                style={searchInput}
                aria-label="Search FAQs"
              />
              {query ? (
                <button onClick={() => setQuery("")} style={clearBtn} aria-label="Clear search">
                  Clear
                </button>
              ) : null}
            </div>

            <div style={countPill} aria-label={`${totalCount} results`}>
              {totalCount} result{totalCount === 1 ? "" : "s"}
            </div>
          </div>
        </header>

        {/* Content */}
        <section style={{ display: "grid", gap: 14 }}>
          {grouped.length === 0 ? (
            <div className="pmp-hoverLift" style={emptyCard}>
              <div style={{ fontWeight: 950, fontSize: 16, color: palette.navy }}>No matches found</div>
              <div style={{ opacity: 0.78, marginTop: 6, lineHeight: 1.6 }}>
                Try a different search term — or contact us and we’ll help you directly.
              </div>
              <div style={{ marginTop: 12 }}>
                <Link href="/contact" style={{ textDecoration: "none" }}>
                  <span style={primaryBtn}>Contact Us</span>
                </Link>
              </div>
            </div>
          ) : (
            grouped.map(([category, items]) => (
              <div key={category} className="pmp-hoverLift" style={categoryCard}>
                <div style={categoryHeader}>
                  <div style={{ fontWeight: 950, color: palette.navy, fontSize: 16 }}>{category}</div>
                  <div style={miniPill}>{items.length} item{items.length === 1 ? "" : "s"}</div>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {items.map((item) => (
                    <AccordionRow
                      key={item.id}
                      item={item}
                      open={openId === item.id}
                      onToggle={() => setOpenId((prev) => (prev === item.id ? null : item.id))}
                    />
                  ))}
                </div>
              </div>
            ))
          )}

          <div className="pmp-hoverLift" style={calloutBand}>
            <div>
              <div style={{ fontWeight: 950, fontSize: 18, color: palette.navy }}>Still need help?</div>
              <div style={{ opacity: 0.78, marginTop: 4, lineHeight: 1.6 }}>
                Send us a message — we’ll respond as quickly as we can.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Link href="/contact" style={{ textDecoration: "none" }}>
                <span style={primaryBtn}>Contact Us</span>
              </Link>
              <Link href="/" style={{ textDecoration: "none" }}>
                <span style={secondaryBtn}>Back to Home</span>
              </Link>
            </div>
          </div>
        </section>

        <div style={{ height: 26 }} />
      </div>
    </div>
  );
}

function AccordionRow({
  item,
  open,
  onToggle,
}: {
  item: FaqItem;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={accordionWrap(open)}>
      <button onClick={onToggle} style={accordionButton} aria-expanded={open} aria-controls={`faq-${item.id}`}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span aria-hidden="true" style={qDot(open)}>?</span>
          <span style={{ fontWeight: 950, color: palette.navy, textAlign: "left" }}>{item.q}</span>
        </div>
        <span aria-hidden="true" style={chev(open)}>›</span>
      </button>

      <div
        id={`faq-${item.id}`}
        style={accordionBody(open)}
        aria-hidden={!open}
      >
        <div style={answerText}>{item.a}</div>
      </div>
    </div>
  );
}

/* ---------- styles ---------- */

const css = `
  :root { -webkit-tap-highlight-color: transparent; }
  @media (prefers-reduced-motion: reduce) {
    * { animation: none !important; transition: none !important; }
  }
  @keyframes pmpFaqIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .pmp-faq-in { animation: pmpFaqIn 420ms ease both; }
`;

const pageWrap: React.CSSProperties = {
  width: "100%",
};

const container: React.CSSProperties = {
  maxWidth: 980,
  margin: "0 auto",
  padding: "22px 16px 0",
};

const header: React.CSSProperties = {
  display: "grid",
  gap: 10,
  marginBottom: 14,
  padding: 18,
  borderRadius: 22,
  border: "1px solid rgba(31,42,68,0.12)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(245,241,232,0.70) 100%)",
  boxShadow: "0 18px 55px rgba(31,42,68,0.10)",
};

const eyebrowPill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  width: "fit-content",
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(31,61,43,0.08)",
  border: "1px solid rgba(31,61,43,0.12)",
  color: palette.forest,
  fontWeight: 900,
  fontSize: 13,
};

const title: React.CSSProperties = {
  margin: 0,
  fontSize: 40,
  lineHeight: 1.08,
  letterSpacing: -0.6,
  color: palette.navy,
};

const subtitle: React.CSSProperties = {
  margin: 0,
  opacity: 0.82,
  lineHeight: 1.7,
  maxWidth: 800,
};

const searchRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  marginTop: 6,
};

const searchBox: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flex: "1 1 520px",
  padding: "12px 12px",
  borderRadius: 16,
  border: "1px solid rgba(31,42,68,0.14)",
  background: "rgba(255,255,255,0.78)",
  boxShadow: "0 14px 34px rgba(31,42,68,0.06)",
};

const searchInput: React.CSSProperties = {
  border: "none",
  outline: "none",
  width: "100%",
  background: "transparent",
  fontSize: 14.5,
  fontWeight: 800,
  color: palette.navy,
};

const clearBtn: React.CSSProperties = {
  borderRadius: 999,
  padding: "8px 10px",
  fontWeight: 950,
  border: "1px solid rgba(31,42,68,0.14)",
  background: "rgba(31,42,68,0.04)",
};

const countPill: React.CSSProperties = {
  fontWeight: 950,
  fontSize: 12,
  padding: "10px 12px",
  borderRadius: 999,
  border: "1px solid rgba(31,42,68,0.14)",
  background: "rgba(31,42,68,0.04)",
  color: palette.navy,
  opacity: 0.9,
};

const categoryCard: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(31,42,68,0.12)",
  background: "rgba(255,255,255,0.86)",
  boxShadow: "0 18px 55px rgba(31,42,68,0.08)",
  padding: 16,
};

const categoryHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 10,
};

const miniPill: React.CSSProperties = {
  fontWeight: 950,
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(200,162,77,0.22)",
  background: "rgba(200,162,77,0.12)",
  color: palette.navy,
};

const accordionButton: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "12px 12px",
  borderRadius: 16,
  border: "1px solid rgba(31,42,68,0.10)",
  background: "rgba(31,42,68,0.03)",
  cursor: "pointer",
};

function accordionWrap(open: boolean): React.CSSProperties {
  return {
    borderRadius: 18,
    border: open ? "1px solid rgba(200,162,77,0.30)" : "1px solid rgba(31,42,68,0.10)",
    background: open
      ? "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(245,241,232,0.78) 100%)"
      : "rgba(255,255,255,0.70)",
    boxShadow: open ? "0 16px 44px rgba(31,42,68,0.10)" : "none",
    overflow: "hidden",
    transition: "box-shadow 160ms ease, border-color 160ms ease, background 160ms ease",
  };
}

function accordionBody(open: boolean): React.CSSProperties {
  return {
    maxHeight: open ? 420 : 0,
    opacity: open ? 1 : 0,
    transform: open ? "translateY(0px)" : "translateY(-2px)",
    transition: "max-height 220ms ease, opacity 180ms ease, transform 180ms ease",
    padding: open ? "12px 14px 14px" : "0 14px",
  };
}

const answerText: React.CSSProperties = {
  lineHeight: 1.7,
  opacity: 0.88,
  color: palette.navy,
  fontWeight: 650,
};

function chev(open: boolean): React.CSSProperties {
  return {
    fontWeight: 950,
    transform: open ? "rotate(90deg)" : "rotate(0deg)",
    transition: "transform 160ms ease",
    opacity: 0.7,
  };
}

function qDot(open: boolean): React.CSSProperties {
  return {
    width: 28,
    height: 28,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    fontWeight: 950,
    background: open ? "rgba(200,162,77,0.22)" : "rgba(31,61,43,0.10)",
    border: open ? "1px solid rgba(200,162,77,0.28)" : "1px solid rgba(31,61,43,0.14)",
    color: palette.navy,
  };
}

const calloutBand: React.CSSProperties = {
  marginTop: 2,
  borderRadius: 22,
  border: "1px solid rgba(31,42,68,0.12)",
  background:
    "linear-gradient(90deg, rgba(31,61,43,0.08) 0%, rgba(200,162,77,0.10) 55%, rgba(31,42,68,0.07) 100%)",
  padding: 16,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: 14,
  background: `linear-gradient(180deg, ${palette.forest}, #173223)`,
  color: "white",
  fontWeight: 950,
  border: "1px solid rgba(0,0,0,0.10)",
  boxShadow: "0 14px 34px rgba(31,61,43,0.18)",
};

const secondaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 14px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.75)",
  color: palette.navy,
  fontWeight: 950,
  border: "1px solid rgba(31,42,68,0.18)",
  boxShadow: "0 14px 34px rgba(31,42,68,0.08)",
};

const emptyCard: React.CSSProperties = {
  borderRadius: 22,
  border: "1px solid rgba(31,42,68,0.12)",
  background: "rgba(255,255,255,0.86)",
  boxShadow: "0 18px 55px rgba(31,42,68,0.08)",
  padding: 18,
};

const linkInline: React.CSSProperties = {
  color: palette.forest,
  fontWeight: 950,
  textDecoration: "underline",
  textUnderlineOffset: 3,
  textDecorationColor: "rgba(200,162,77,0.55)",
};