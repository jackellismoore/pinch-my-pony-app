"use client";

import { useState, type CSSProperties } from "react";
import { Icon } from "@/components/Icon";

type Props = { src?: string | null; alt: string; className?: string; style?: CSSProperties };

export function HorseImage({ src, alt, className, style }: Props) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={className} role="img" aria-label={`${alt || "Horse"} photo not added`} style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#1F4B36", background: "linear-gradient(145deg, #F7F3E9, #E8EFEA)", ...style }}>
        <Icon name="horseshoe" size={34} />
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} style={style} onError={() => setFailed(true)} />;
}
