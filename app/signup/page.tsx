"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import SignupInner from "./SignupInner";
import AuthPostAuthRedirect from "../components/AuthPostAuthRedirect";

function LoadingFallback() {
  return (
    <div className="pmp-pageShell">
      <div className="pmp-sectionCard" style={{ textAlign: "center" }}>
        <div className="pmp-mutedText">Loading sign up…</div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthPostAuthRedirect mode="signup" />
      <SignupInner />
    </Suspense>
  );
}