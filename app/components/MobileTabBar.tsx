"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Home" },
  { href: "/messages", label: "Messages" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "Profile" },
];

export default function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "#fff",
        borderTop: "1px solid #eee",
        display: "flex",
        justifyContent: "space-around",
        padding: "10px 0",
        zIndex: 1000,
      }}
    >
      {items.map((item) => (
        <Link key={item.href} href={item.href}>
          <span style={{ fontWeight: pathname === item.href ? "bold" : "normal" }}>
            {item.label}
          </span>
        </Link>
      ))}
    </nav>
  );
}