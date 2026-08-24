"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLaunchFeatures } from "@/components/LaunchFeaturesProvider";
import { Icon } from "@/components/Icon";
import { supabase } from "@/lib/supabaseClient";
import { userFacingError } from "@/lib/userFacingError";

type Profile = {
  membership_tier: string | null;
  membership_status: string | null;
  complimentary_access_until: string | null;
  membership_current_period_end: string | null;
  membership_cancel_at_period_end: boolean | null;
};

const activeStatuses = new Set(["active", "trialing"]);

function dateLabel(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export default function MembershipPage() {
  const { membershipCheckoutEnabled } = useLaunchFeatures();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"checkout" | "portal" | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authed, setAuthed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user ?? null;
    setAuthed(Boolean(user));
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data: row, error: profileError } = await supabase
      .from("profiles")
      .select("membership_tier,membership_status,complimentary_access_until,membership_current_period_end,membership_cancel_at_period_end")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) setError(userFacingError(profileError, "We couldn’t load your membership."));
    setProfile((row ?? null) as Profile | null);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") setNotice("Membership started successfully. Your account may take a moment to update.");
    if (params.get("checkout") === "cancelled") setNotice("Checkout was cancelled. Nothing has been charged.");
  }, []);

  const status = String(profile?.membership_status ?? "inactive").toLowerCase();
  const active = activeStatuses.has(status);
  const complimentaryUntil = dateLabel(profile?.complimentary_access_until ?? null);
  const renewalDate = dateLabel(profile?.membership_current_period_end ?? null);
  const hasComplimentaryAccess = Boolean(
    profile?.complimentary_access_until && new Date(profile.complimentary_access_until) > new Date()
  );

  const headline = useMemo(() => {
    if (active) return profile?.membership_cancel_at_period_end ? "Membership ending" : "Membership active";
    if (hasComplimentaryAccess) return "Complimentary borrowing access";
    if (!membershipCheckoutEnabled) return "Borrow free during launch";
    if (status === "past_due" || status === "unpaid") return "Payment needs attention";
    return "Borrowing membership";
  }, [active, hasComplimentaryAccess, membershipCheckoutEnabled, profile?.membership_cancel_at_period_end, status]);

  async function openStripe(kind: "checkout" | "portal") {
    setBusy(kind);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        window.location.href = `/login?redirectTo=${encodeURIComponent("/dashboard/membership")}`;
        return;
      }

      const response = await fetch(`/api/stripe/${kind}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: kind === "checkout" ? JSON.stringify({ plan: "member_monthly" }) : undefined,
      });
      const body = await response.json();
      if (!response.ok || !body?.url) throw new Error(body?.error ?? "Unable to continue");
      window.location.href = body.url;
    } catch (reason) {
      setError(userFacingError(reason, "We couldn’t open the secure Stripe page. Please try again."));
      setBusy(null);
    }
  }

  return (
    <div className="pmp-membershipPage">
      <section className="pmp-membershipHero">
        <div className="pmp-eyebrow"><Icon name="credit-card" size={17} /> Membership</div>
        <h1>Simple access. No surprise charges.</h1>
        <p>Your Pinch My Pony account is always free for listing horses. Borrowing remains free while the community proves itself, then becomes available through one straightforward membership only when we deliberately release it.</p>
      </section>

      {notice ? <div className="pmp-noticeBanner" role="status"><Icon name="check" size={20} />{notice}</div> : null}
      {error ? <div className="pmp-errorBanner" role="alert"><Icon name="warning" size={20} />{error}</div> : null}

      <section className="pmp-membershipLayout" aria-busy={loading}>
        <article className="pmp-membershipPlan">
          <div className="pmp-planTopline">
            <div><span className="pmp-statusBadge">{loading ? "Checking account" : headline}</span><h2>Borrowing membership</h2></div>
            <Icon name="horse" size={36} />
          </div>

          {!membershipCheckoutEnabled && !active && !hasComplimentaryAccess ? (
            <div className="pmp-launchPrice"><strong>Free</strong><span>throughout launch mode</span></div>
          ) : active ? (
            <div className="pmp-launchPrice"><strong>Active</strong><span>{renewalDate ? `${profile?.membership_cancel_at_period_end ? "Access until" : "Renews"} ${renewalDate}` : "Billing managed securely by Stripe"}</span></div>
          ) : hasComplimentaryAccess ? (
            <div className="pmp-launchPrice"><strong>Complimentary</strong><span>{complimentaryUntil ? `Access until ${complimentaryUntil}` : "Borrowing access included"}</span></div>
          ) : (
            <div className="pmp-launchPrice"><strong>Monthly</strong><span>Final price shown securely before payment</span></div>
          )}

          <ul className="pmp-benefitList">
            {["Browse and request horses", "Message and coordinate in one place", "Booking protection and availability checks", "Cancel through secure Stripe billing settings"].map((benefit) => <li key={benefit}><Icon name="check" size={18} />{benefit}</li>)}
          </ul>

          {!authed ? (
            <Link className="pmp-primaryAction" href={`/signup?redirectTo=${encodeURIComponent("/dashboard/membership")}`}>Create a free account <Icon name="arrow-right" size={18} /></Link>
          ) : active || status === "past_due" || status === "unpaid" ? (
            <button className="pmp-primaryAction" onClick={() => void openStripe("portal")} disabled={Boolean(busy)}>{busy === "portal" ? "Opening Stripe…" : "Manage membership"}<Icon name="settings" size={18} /></button>
          ) : membershipCheckoutEnabled && !hasComplimentaryAccess ? (
            <button className="pmp-primaryAction" onClick={() => void openStripe("checkout")} disabled={Boolean(busy)}>{busy === "checkout" ? "Opening secure checkout…" : "Start membership"}<Icon name="arrow-right" size={18} /></button>
          ) : (
            <Link className="pmp-primaryAction" href="/browse">Browse horses <Icon name="arrow-right" size={18} /></Link>
          )}
        </article>

        <aside className="pmp-membershipAssurance">
          <div className="pmp-assuranceIcon"><Icon name="shield" size={25} /></div>
          <h2>How launch access works</h2>
          <p>No payment details are required while launch mode is active, and you will never be moved onto a paid membership automatically. Free access continues until the community is ready.</p>
          <div className="pmp-assuranceRule" />
          <h3>Listing stays free</h3>
          <p>You can add and manage horses without purchasing a borrowing membership.</p>
          <div className="pmp-assuranceRule" />
          <h3>You stay in control</h3>
          <p>When paid borrowing is released, joining requires a separate, deliberate checkout.</p>
          <Link href="/faq" className="pmp-textAction">Read membership FAQs <Icon name="arrow-right" size={16} /></Link>
        </aside>
      </section>
    </div>
  );
}
