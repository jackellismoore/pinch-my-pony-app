"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import StarRating from "@/components/StarRating";
import { sendPushNotification } from "@/lib/push/sendPushNotification";

type BorrowRequestRow = {
  id: string;
  horse_id: string;
  borrower_id: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
};

type HorseRow = {
  id: string;
  name: string | null;
  owner_id: string;
  image_url: string | null;
  image_urls?: string[] | null;
};

type ProfileMini = {
  id: string;
  display_name: string | null;
  full_name: string | null;
};

function fmtDate(d: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
}

export default function ReviewPage() {
  const params = useParams<{ requestId: string }>();
  const router = useRouter();
  const requestId = params?.requestId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [myUserId, setMyUserId] = useState<string | null>(null);

  const [req, setReq] = useState<BorrowRequestRow | null>(null);
  const [horse, setHorse] = useState<HorseRow | null>(null);
  const [owner, setOwner] = useState<ProfileMini | null>(null);

  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const ownerLabel = useMemo(() => {
    const dn = owner?.display_name?.trim();
    const fn = owner?.full_name?.trim();
    return dn || fn || "Member";
  }, [owner]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const { data: auth, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;

        const uid = auth?.user?.id ?? null;
        if (!uid) {
          setMyUserId(null);
          throw new Error("You must be logged in to leave a review.");
        }
        if (!cancelled) setMyUserId(uid);

        if (!requestId) throw new Error("Missing requestId in URL.");

        const { data: reqData, error: reqErr } = await supabase
          .from("borrow_requests")
          .select("id,horse_id,borrower_id,status,start_date,end_date")
          .eq("id", requestId)
          .single();

        if (reqErr) throw reqErr;

        const r = (reqData ?? null) as BorrowRequestRow | null;
        if (!r) throw new Error("Request not found.");
        if (r.borrower_id !== uid) throw new Error("You can only review requests you borrowed.");

        const s = String(r.status ?? "");
        if (s !== "accepted" && s !== "approved") {
          throw new Error("You can only review accepted/approved requests.");
        }
        if (!r.end_date || new Date(r.end_date) >= new Date(new Date().toISOString().slice(0, 10))) {
          throw new Error("Reviews become available after the booking has finished.");
        }

        const { data: existing, error: exErr } = await supabase
          .from("reviews")
          .select("id")
          .eq("request_id", requestId)
          .eq("borrower_id", uid)
          .maybeSingle();

        if (exErr) {
          console.warn("existing review check error:", exErr);
          if (!cancelled) setExistingReviewId(null);
        } else {
          if (!cancelled) setExistingReviewId(existing?.id ?? null);
        }

        const { data: horseData, error: horseErr } = await supabase
          .from("public_horses")
          .select("id,name,owner_id,image_url,image_urls")
          .eq("id", r.horse_id)
          .single();

        if (horseErr) throw horseErr;

        const h = (horseData ?? null) as HorseRow | null;
        if (!h) throw new Error("Horse not found for this request.");

        const { data: ownerData, error: ownerErr } = await supabase
          .from("public_profiles")
          .select("id,display_name,full_name")
          .eq("id", h.owner_id)
          .maybeSingle();

        if (ownerErr) {
          console.warn("owner profile load error:", ownerErr);
        }

        if (!cancelled) {
          setReq(r);
          setHorse(h);
          setOwner((ownerData ?? null) as ProfileMini | null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load review page.");
        if (!cancelled) {
          setReq(null);
          setHorse(null);
          setOwner(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const submit = async () => {
    if (!myUserId || !req || !horse) return;

    const s = String(req.status ?? "");
    if (s !== "accepted" && s !== "approved") {
      setError("You can only review accepted/approved requests.");
      return;
    }
    if (!req.end_date || new Date(req.end_date) >= new Date(new Date().toISOString().slice(0, 10))) {
      setError("Reviews become available after the booking has finished.");
      return;
    }

    const cleanComment = comment.trim();
    if (cleanComment.length > 1200) {
      setError("Comment is too long (max 1200 characters).");
      return;
    }
    if (rating < 1 || rating > 5) {
      setError("Rating must be between 1 and 5.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        request_id: req.id,
        borrower_id: myUserId,
        owner_id: horse.owner_id,
        horse_id: horse.id,
        rating,
        comment: cleanComment ? cleanComment : null,
      };

      const { error: insertErr } = await supabase.from("reviews").insert(payload);
      if (insertErr) throw insertErr;

      sendPushNotification({
          userId: horse.owner_id,
          url: "/dashboard/owner/reviews",
          eventType: "review_left_for_owner",
          requestId: req.id,
      }).catch(() => {});

      router.push("/dashboard/borrower/horses");
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Failed to submit review.");
    } finally {
      setSaving(false);
    }
  };

const reviewStyles = `
.pmp-reviewPage{max-width:820px;padding-bottom:40px}.pmp-reviewHeader{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}.pmp-reviewHero{margin-top:24px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:18px;padding:24px;border:1px solid rgba(200,162,77,.28);border-radius:24px;background:linear-gradient(145deg,rgba(255,255,255,.98),rgba(245,241,232,.78));box-shadow:0 16px 38px rgba(31,42,68,.06)}.pmp-reviewHorseImageWrap{width:88px;height:88px;border-radius:20px;overflow:hidden;background:#eef2ed;flex:0 0 auto}.pmp-reviewHorseImage{width:100%;height:100%;display:block;object-fit:cover}.pmp-reviewHorseImageFallback{width:100%;height:100%;display:grid;place-items:center;color:#1F3D2B;font-size:32px}.pmp-reviewHorseMark{display:none;width:58px;height:58px;border-radius:18px;background:rgba(31,61,43,.09);display:grid;place-items:center;color:#1F3D2B;font-size:28px}.pmp-reviewHorseInfo h2{margin:4px 0 0;font-size:28px;line-height:1.15;color:#1F2A44;letter-spacing:-.02em}.pmp-reviewOwner,.pmp-reviewDate{margin-top:5px;font-size:13px;color:rgba(31,42,68,.66)}.pmp-reviewStatus{justify-self:end;padding:8px 12px;border-radius:999px;background:rgba(31,61,43,.09);color:#1F3D2B;font-size:12px;font-weight:800}.pmp-reviewFormCard{margin-top:18px;padding:28px;border:1px solid rgba(200,162,77,.24);border-radius:24px;background:#fff;box-shadow:0 16px 38px rgba(31,42,68,.06)}.pmp-reviewSectionHeading{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.pmp-reviewSectionHeading h2{margin:4px 0 0;font-size:26px;line-height:1.2;color:#1F2A44;letter-spacing:-.02em}.pmp-reviewRatingNumber{font-size:16px;font-weight:850;color:#1F3D2B}.pmp-reviewStars{margin-top:22px;padding:20px;border-radius:18px;background:rgba(31,61,43,.055);border:1px solid rgba(31,61,43,.08);display:flex;align-items:center;gap:14px;flex-wrap:wrap}.pmp-reviewStars button svg{color:#C8A24D!important}.pmp-reviewStars button svg.text-gray-300{color:rgba(200,162,77,.28)!important}.pmp-reviewRatingHint{font-size:13px;font-weight:750;color:rgba(31,42,68,.65)}.pmp-reviewLabel{display:flex;justify-content:space-between;align-items:center;margin-top:20px;font-size:13px;font-weight:850;color:#1F2A44}.pmp-reviewLabel span{font-weight:700;color:rgba(31,42,68,.48)}.pmp-reviewFormCard textarea{display:block;width:100%;box-sizing:border-box;margin-top:8px;border:1px solid rgba(31,42,68,.13);border-radius:16px;padding:13px 14px;font:inherit;font-size:14px;line-height:1.5;color:#1F2A44;background:#fbfaf7;outline:none;resize:vertical}.pmp-reviewFormCard textarea:focus{border-color:rgba(31,61,43,.45);box-shadow:0 0 0 3px rgba(31,61,43,.08)}.pmp-reviewCount{margin-top:5px;text-align:right;font-size:11px;color:rgba(31,42,68,.48)}.pmp-reviewSubmitRow{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.pmp-reviewSubmit{min-height:48px;border:1px solid #173d2c;border-radius:12px;padding:9px 15px;background:linear-gradient(145deg,#173d2c,#214d38);color:#fff;font:inherit;font-size:13px;font-weight:850;cursor:pointer;box-shadow:0 8px 18px rgba(23,61,44,.14)}.pmp-reviewSubmit:disabled{opacity:.55;cursor:not-allowed}.pmp-reviewNote{margin-top:14px;font-size:11px;line-height:1.5;color:rgba(31,42,68,.52)}.pmp-reviewLoading{margin-top:18px;padding:18px;border-radius:18px;background:rgba(245,241,232,.75);color:rgba(31,42,68,.62)}.pmp-reviewSuccessIcon{width:52px;height:52px;border-radius:17px;display:grid;place-items:center;background:rgba(31,61,43,.1);color:#1F3D2B;font-size:24px;font-weight:900;flex:0 0 auto}.pmp-reviewTitle{margin:0;font-size:21px;color:#1F2A44}.pmp-reviewCard{margin-top:18px;padding:22px;border:1px solid rgba(200,162,77,.24);border-radius:24px;background:linear-gradient(145deg,#fff,#f5f1e8);box-shadow:0 16px 38px rgba(31,42,68,.06);display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:16px}.pmp-reviewCard .pmp-mutedText{margin-top:4px}@media(max-width:560px){.pmp-reviewHero{grid-template-columns:auto 1fr;padding:20px}.pmp-reviewHorseImageWrap{width:68px;height:68px}.pmp-reviewStatus{grid-column:1/-1;justify-self:start}.pmp-reviewFormCard{padding:18px}.pmp-reviewSubmitRow{display:grid;grid-template-columns:1fr}.pmp-reviewSubmitRow a,.pmp-reviewSubmit{width:100%;box-sizing:border-box;justify-content:center;text-align:center}.pmp-reviewCard{grid-template-columns:auto 1fr}.pmp-reviewCard .pmp-ctaPrimary{grid-column:1/-1;width:100%;box-sizing:border-box;justify-content:center}}.pmp-reviewStepTwo{margin-top:26px;padding-top:22px;border-top:1px solid rgba(31,42,68,.09)}.pmp-reviewPage .pmp-ctaSecondary{background:rgba(255,255,255,.8)}.pmp-reviewPage .pmp-kicker{color:#1F3D2B}
`;
  if (loading) {
    return (
      <div className="pmp-pageShell pmp-reviewPage">
        <style>{reviewStyles}</style>
        <div className="pmp-kicker">Your riding</div>
        <h1 className="pmp-pageTitle">Leave a review</h1>
        <div className="pmp-reviewLoading">Loading your review…</div>
      </div>
    );
  }

  if (existingReviewId) {
    return (
      <div className="pmp-pageShell pmp-reviewPage">
        <style>{reviewStyles}</style>
        <div className="pmp-reviewHeader">
          <div><div className="pmp-kicker">Your riding</div><h1 className="pmp-pageTitle">Review already submitted</h1><div className="pmp-mutedText">Thanks for sharing your experience.</div></div>
          <Link href="/dashboard/borrower/horses" className="pmp-ctaSecondary">← My rides</Link>
        </div>
        <section className="pmp-reviewCard">
          <div className="pmp-reviewSuccessIcon">✓</div>
          <div><h2 className="pmp-reviewTitle">You're all set</h2><p className="pmp-mutedText">You’ve already left a review for this booking.</p></div>
          {req?.id?<Link href={`/messages/${req.id}`} className="pmp-ctaPrimary">View conversation →</Link>:null}
        </section>
      </div>
    );
  }

  return (
    <div className="pmp-pageShell pmp-reviewPage">
      <style>{reviewStyles}</style>
      <div className="pmp-reviewHeader">
        <div><div className="pmp-kicker">Your riding</div><h1 className="pmp-pageTitle">Leave a review</h1><div className="pmp-mutedText">Tell the owner how your booking went.</div></div>
        <Link href="/dashboard/borrower/horses" className="pmp-ctaSecondary">← My rides</Link>
      </div>

      {error?<div className="pmp-errorBanner" style={{marginTop:16}}>{error}</div>:null}

      <section className="pmp-reviewHero">
        <div className="pmp-reviewHorseImageWrap">
          {horse?.image_url ? <img src={horse.image_url} alt={horse.name ?? "Horse"} className="pmp-reviewHorseImage" /> : <div className="pmp-reviewHorseImageFallback">♞</div>}
        </div>
        <div className="pmp-reviewHorseInfo">
          <div className="pmp-kicker">Your booking</div>
          <h2>{horse?.name ?? "Horse"}</h2>
          <div className="pmp-reviewOwner">Listed by <strong>{ownerLabel}</strong></div>
          <div className="pmp-reviewDate">{fmtDate(req?.start_date ?? null)} → {fmtDate(req?.end_date ?? null)}</div>
        </div>
        <span className="pmp-reviewStatus">Completed</span>
      </section>

      <section className="pmp-reviewFormCard">
        <div className="pmp-reviewSectionHeading">
          <div><div className="pmp-kicker">Step 1 of 2</div><h2>How was your ride?</h2><div className="pmp-mutedText" style={{marginTop:5}}>Choose a rating that reflects your overall experience.</div></div>
          <span className="pmp-reviewRatingNumber">{rating}/5</span>
        </div>

        <div className="pmp-reviewStars">
          <StarRating value={rating} onChange={setRating} size={30} />
          <div className="pmp-reviewRatingHint">{rating===5?'Excellent':rating===4?'Great':rating===3?'Good':rating===2?'Could be better':'Needs improvement'}</div>
        </div>

        <div className="pmp-reviewStepTwo"><div className="pmp-kicker">Step 2 of 2</div><label className="pmp-reviewLabel" htmlFor="review-comment">Share a few words <span>Optional</span></label>
        <textarea id="review-comment" value={comment} onChange={(e)=>setComment(e.target.value)} placeholder="What did you enjoy? Anything the owner should know?" rows={6} maxLength={1200}/>
        <div className="pmp-reviewCount">{comment.trim().length}/1200</div></div>

        <div className="pmp-reviewSubmitRow">
          <button onClick={submit} disabled={saving} className="pmp-reviewSubmit">{saving?"Submitting…":"Submit review →"}</button>
          {horse?.owner_id?<Link href={`/owner/${horse.owner_id}`} className="pmp-ctaSecondary">View profile</Link>:null}
        </div>
        <div className="pmp-reviewNote">Your review will be shared with the horse owner and may help other members understand the experience.</div>
      </section>
    </div>
  );
}
