"use client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import LoginInner from "./LoginInner";
import AuthPostAuthRedirect from "../components/AuthPostAuthRedirect";

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
      <AuthPostAuthRedirect mode="login" />
      <LoginInner />
    </Suspense>
  );
}