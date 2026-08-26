import type { CSSProperties, ReactNode, SVGProps } from "react";

export type IconName =
  | "home" | "messages" | "horse" | "user" | "menu" | "calendar"
  | "compass" | "shield" | "lock" | "mail" | "document" | "receipt"
  | "search" | "check" | "warning" | "credit-card" | "camera" | "pin"
  | "id-card" | "sparkles" | "arrow-left" | "arrow-right" | "close"
  | "heart" | "settings" | "bell" | "plus" | "horseshoe" | "star";

type Props = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
  size?: number;
  decorative?: boolean;
};

const paths: Record<IconName, ReactNode> = {
  home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5M9 21v-7h6v7"/></>,
  messages: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></>,
  horse: <><path d="M6 20v-5l2-3-1-5 4-4 5 2 3 4-2 3v8"/><path d="M8 12h8M9 20v-4m6 4v-4M13 6l3-1"/><circle cx="15.5" cy="8" r=".5" fill="currentColor" stroke="none"/></>,
  horseshoe: <><path d="M5.5 4.5v7.25a6.5 6.5 0 0 0 13 0V4.5h-4v7.25a2.5 2.5 0 0 1-5 0V4.5Z"/><circle cx="7.5" cy="7" r=".65" fill="currentColor" stroke="none"/><circle cx="16.5" cy="7" r=".65" fill="currentColor" stroke="none"/><circle cx="7.8" cy="11" r=".65" fill="currentColor" stroke="none"/><circle cx="16.2" cy="11" r=".65" fill="currentColor" stroke="none"/><path d="M7.4 17.1 5 19.5M16.6 17.1l2.4 2.4"/></>,
  star: <path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.4 6.3-.9Z" fill="currentColor" stroke="currentColor"/>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  compass: <><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/></>,
  shield: <><path d="M12 3 4.5 6v5.5c0 4.8 3.2 8 7.5 9.5 4.3-1.5 7.5-4.7 7.5-9.5V6Z"/><path d="m9 12 2 2 4-4"/></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
  document: <><path d="M6 2h8l4 4v16H6Z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></>,
  receipt: <><path d="M6 3v18l3-2 3 2 3-2 3 2V3l-3 2-3-2-3 2Z"/><path d="M9 10h6M9 14h6"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  warning: <><path d="M12 3 2.8 20h18.4Z"/><path d="M12 9v4M12 17h.01"/></>,
  "credit-card": <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></>,
  camera: <><path d="M4 7h4l2-3h4l2 3h4v13H4Z"/><circle cx="12" cy="13" r="4"/></>,
  pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  "id-card": <><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M5 16a3 3 0 0 1 6 0M14 10h5M14 14h5"/></>,
  sparkles: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2ZM5 14l.8 2.2L8 17l-2.2.8L5 20l-.8-2.2L2 17l2.2-.8Z"/></>,
  "arrow-left": <><path d="m15 18-6-6 6-6M9 12h11"/></>,
  "arrow-right": <><path d="m9 18 6-6-6-6M4 12h11"/></>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  heart: <path d="M20.8 5.8a5.5 5.5 0 0 0-7.8 0L12 6.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"/>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
};

export function Icon({ name, size = 22, decorative = true, style, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={decorative ? "true" : undefined}
      focusable="false"
      style={{ flex: "0 0 auto", ...(style as CSSProperties) }}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
