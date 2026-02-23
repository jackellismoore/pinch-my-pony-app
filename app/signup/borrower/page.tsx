"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import BorrowerSignupInner from "./BorrowerSignupInner";
import AuthPostAuthRedirect from "../../components/AuthPostAuthRedirect";

export default function BorrowerSignupPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <AuthPostAuthRedirect mode="signup" />
      <BorrowerSignupInner />
    </Suspense>
  );
}