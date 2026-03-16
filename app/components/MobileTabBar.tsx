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
    href: "/browse",
    label: "Browse",
    icon: "🗺️",
    match: (pathname) => pathname.startsWith("/browse") || pathname.startsWith("/horse/"),
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
    match: (pathname) =>
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/owner") ||
      pathname.startsWith("/request"),
  },
  {
    href: "/profile",
    label: "Profile",
    icon: "👤",
    match: (pathname) => pathname.startsWith("/profile") || pathname.startsWith("/verify"),
  },
];

export default function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="pmp-mobileTabBar" aria-label="Mobile navigation">
      {items.map((item) => {
        const active = item.match(pathname);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`pmp-mobileTabItem${active ? " is-active" : ""}`}
          >
            <span className="pmp-mobileTabIcon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="pmp-mobileTabLabel">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}