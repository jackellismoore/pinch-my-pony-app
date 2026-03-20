"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  href: string;
  label: string;
  icon: string;
  match: (pathname: string) => boolean;
};

const items: Item[] = [
  {
    href: "/",
    label: "Home",
    icon: "🏠",
    match: (pathname) => pathname === "/",
  },
  {
    href: "/messages",
    label: "Messages",
    icon: "💬",
    match: (pathname) => pathname.startsWith("/messages"),
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "🐎",
    match: (pathname) => pathname.startsWith("/dashboard"),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: "👤",
    match: (pathname) => pathname.startsWith("/profile"),
  },
];

export default function MobileTabBar() {
  const pathname = usePathname() || "/";

  return (
    <>
      <style>{`
        .pmp-mobileTabBar {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 8px 6px calc(8px + env(safe-area-inset-bottom));
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(12px);
          border-top: 1px solid rgba(0,0,0,0.08);
          box-shadow: 0 -8px 24px rgba(15,23,42,0.06);
        }

        .pmp-mobileTabItem {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          min-width: 0;
          padding: 4px 6px;
          color: rgba(15,23,42,0.62);
          text-decoration: none;
          font-size: 11px;
          font-weight: 800;
        }

        .pmp-mobileTabIcon {
          font-size: 18px;
          line-height: 1;
        }

        .pmp-mobileTabLabel {
          line-height: 1.1;
        }

        .pmp-mobileTabItem.is-active {
          color: #1F3D2B;
        }

        .pmp-mobileTabItem.is-active .pmp-mobileTabLabel {
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-thickness: 2px;
        }
      `}</style>

      <nav className="pmp-mobileTabBar" aria-label="Mobile navigation">
        {items.map((item) => {
          const active = item.match(pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`pmp-mobileTabItem${active ? " is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="pmp-mobileTabIcon" aria-hidden="true">
                {item.icon}
              </span>
              <span className="pmp-mobileTabLabel">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}