"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import LoginInner from "./LoginInner";

function LoadingFallback() {
  return (
    <div className="pmp-pageShell">
      <div className="pmp-sectionCard" style={{ textAlign: "center" }}>
        <div className="pmp-mutedText">Loading sign in…</div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <LoginInner />
    </Suspense>
  );
}