"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import UnifiedSignupInner from "../borrower/BorrowerSignupInner";
import AuthPostAuthRedirect from "../../components/AuthPostAuthRedirect";

export default function OwnerSignupPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <AuthPostAuthRedirect mode="signup" />
      <UnifiedSignupInner />
    </Suspense>
  );
}
