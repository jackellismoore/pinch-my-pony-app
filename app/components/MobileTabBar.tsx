"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { supabase } from "@/lib/supabaseClient";

type Item = {
  href: string;
  label: string;
  icon: IconName;
  match: (pathname: string) => boolean;
};

const items: Item[] = [
  { href: "/", label: "Home", icon: "home", match: (pathname) => pathname === "/" },
  {
    href: "/browse",
    label: "Browse",
    icon: "search",
    match: (pathname) => pathname.startsWith("/browse") || pathname.startsWith("/horse/") || pathname.startsWith("/owner/"),
  },
  { href: "/dashboard", label: "Dashboard", icon: "horseshoe", match: (pathname) => pathname.startsWith("/dashboard") },
  { href: "/messages", label: "Messages", icon: "messages", match: (pathname) => pathname.startsWith("/messages") },
  { href: "/profile", label: "Profile", icon: "user", match: (pathname) => pathname.startsWith("/profile") },
];

export default function MobileTabBar() {
  const pathname = usePathname() || "/";
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function refresh() {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user?.id ?? null;
        if (!uid) {
          if (mounted) setUnreadMessages(0);
          return;
        }

        const { data: myHorses } = await supabase.from("horses").select("id").eq("owner_id", uid);
        const horseIds = (myHorses ?? []).map((h: any) => h.id).filter(Boolean);
        const [borrowerReqs, ownerReqs] = await Promise.all([
          supabase.from("borrow_requests").select("id").eq("borrower_id", uid),
          horseIds.length
            ? supabase.from("borrow_requests").select("id").in("horse_id", horseIds)
            : Promise.resolve({ data: [], error: null } as any),
        ]);

        const requestIds = Array.from(new Set([...(borrowerReqs.data ?? []), ...(ownerReqs.data ?? [])].map((r: any) => r.id).filter(Boolean)));
        if (!requestIds.length) {
          if (mounted) setUnreadMessages(0);
          return;
        }

        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .in("request_id", requestIds)
          .neq("sender_id", uid)
          .is("read_at", null);

        if (mounted) setUnreadMessages(count ?? 0);
      } catch {
        if (mounted) setUnreadMessages(0);
      }
    }

    void refresh();
    const msgCh = supabase.channel("mobile-nav-messages").on("postgres_changes", { event: "*", schema: "public", table: "messages" }, refresh).subscribe();
    const reqCh = supabase.channel("mobile-nav-requests").on("postgres_changes", { event: "*", schema: "public", table: "borrow_requests" }, refresh).subscribe();
    const { data: authSub } = supabase.auth.onAuthStateChange(refresh);

    return () => {
      mounted = false;
      authSub.subscription.unsubscribe();
      supabase.removeChannel(msgCh);
      supabase.removeChannel(reqCh);
    };
  }, []);

  if (pathname.startsWith("/messages/")) return null;

  return (
    <>
      <style>{`
        .pmp-mobileTabBar{position:fixed;left:0;right:0;bottom:0;z-index:1000;display:flex;align-items:stretch;justify-content:space-between;gap:3px;padding:8px 8px calc(8px + env(safe-area-inset-bottom));background:rgba(255,255,255,.95);backdrop-filter:blur(14px);border-top:1px solid rgba(15,23,42,.08);box-shadow:0 -8px 24px rgba(15,23,42,.06)}
        .pmp-mobileTabItem{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:8px 2px;border-radius:15px;text-decoration:none;color:rgba(15,23,42,.62);background:transparent;position:relative}
        .pmp-mobileTabIcon{display:grid;place-items:center;line-height:1;position:relative}
        .pmp-mobileTabLabel{font-size:10px;line-height:1.1;font-weight:850;color:inherit;text-align:center;white-space:nowrap;display:block}
        .pmp-mobileTabItem.is-active{background:rgba(31,61,43,.10);color:#1F3D2B}
        .pmp-mobileTabItem.is-active .pmp-mobileTabLabel{color:#1F3D2B;font-weight:950;text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:2px}
        .pmp-mobileTabBadge{position:absolute;top:-7px;right:-11px;min-width:17px;height:17px;padding:0 5px;border-radius:999px;background:#0f172a;color:#fff;font-size:10px;font-weight:950;display:flex;align-items:center;justify-content:center;line-height:1;box-shadow:0 3px 8px rgba(15,23,42,.24)}
      `}</style>
      <nav className="pmp-mobileTabBar" aria-label="Mobile navigation">
        {items.map((item) => {
          const active = item.match(pathname);
          const isMessages = item.href === "/messages";
          return (
            <Link key={item.href} href={item.href} className={`pmp-mobileTabItem${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
              <span className="pmp-mobileTabIcon" aria-hidden="true">
                <Icon name={item.icon} size={22} />
                {isMessages && unreadMessages > 0 ? <span className="pmp-mobileTabBadge">{unreadMessages > 99 ? "99+" : unreadMessages}</span> : null}
              </span>
              <span className="pmp-mobileTabLabel">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
