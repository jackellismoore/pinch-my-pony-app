"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import SignupInner from "./SignupInner";
import AuthPostAuthRedirect from "../components/AuthPostAuthRedirect";

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <AuthPostAuthRedirect mode="signup" />
      <SignupInner />
    </Suspense>
  );
}