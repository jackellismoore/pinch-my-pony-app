"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";

const palette = {
  forest: "#1F3D2B",
  navy: "#1F2A44",
};

const navItems = [
  { href: "/dashboard/owner/horses", title: "My horses", description: "Manage your horse listings and availability.", icon: "horse" },
  { href: "/dashboard/owner/requests", title: "Listing requests", description: "View and manage requests from borrowers.", icon: "messages" },
  { href: "/dashboard/owner/reviews", title: "Reviews", description: "See feedback from borrowers.", icon: "heart" },
] as const;

export default function OwnerManagePage() {
  return (
    <div className="pmp-pageShell">
      <style>{`
        .pmp-ownerManageBack{display:inline-flex;align-items:center;gap:6px;color:#1F3D2B;text-decoration:none;font-size:13px;font-weight:950;min-height:44px}
        .pmp-ownerManageList{display:grid;gap:10px;margin-top:20px}
        .pmp-ownerManageCard{display:flex;align-items:center;gap:14px;min-height:76px;padding:14px;border-radius:18px;border:1px solid rgba(31,42,68,.12);background:rgba(255,255,255,.86);color:#1F2A44;text-decoration:none;box-shadow:0 12px 28px rgba(31,42,68,.06)}
        .pmp-ownerManageCard:active{transform:translateY(1px)}
        .pmp-ownerManageIcon{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;flex:0 0 auto;background:rgba(31,61,43,.08);color:#1F3D2B}
        .pmp-ownerManageText{min-width:0;flex:1}
        .pmp-ownerManageTitle{font-size:16px;font-weight:950}
        .pmp-ownerManageDescription{display:block;margin-top:3px;font-size:12px;line-height:1.45;color:rgba(31,42,68,.64)}
        .pmp-ownerManageArrow{font-size:20px;color:rgba(31,42,68,.48);flex:0 0 auto}
        .pmp-ownerManagePrimary{display:flex;align-items:center;justify-content:center;min-height:48px;margin-top:14px;border-radius:16px;background:linear-gradient(180deg,#1F3D2B,#173223);border:1px solid rgba(0,0,0,.10);color:white;text-decoration:none;font-size:14px;font-weight:950;box-shadow:0 14px 34px rgba(31,61,43,.18)}
      `}</style>

      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Link href="/dashboard/owner" className="pmp-ownerManageBack">← Dashboard</Link>

        <div style={{ marginTop: 8 }}>
          <div className="pmp-kicker">Horse sharing</div>
          <h1 className="pmp-pageTitle">My Horses</h1>
          <div className="pmp-mutedText" style={{ marginTop: 6 }}>
            Manage your listings, requests, reviews, and availability.
          </div>
        </div>

        <div className="pmp-ownerManageList">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="pmp-ownerManageCard">
              <span className="pmp-ownerManageIcon" aria-hidden="true"><Icon name={item.icon} size={22} /></span>
              <span className="pmp-ownerManageText">
                <span className="pmp-ownerManageTitle">{item.title}</span>
                <span className="pmp-ownerManageDescription">{item.description}</span>
              </span>
              <span className="pmp-ownerManageArrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>

        <Link href="/dashboard/owner/horses/add" className="pmp-ownerManagePrimary">+ Add a horse</Link>
      </div>
    </div>
  );
}
