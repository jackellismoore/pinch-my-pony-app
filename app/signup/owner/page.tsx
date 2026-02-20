"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import OwnerSignupInner from "./OwnerSignupInner";

export default function OwnerSignupPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <OwnerSignupInner />
    </Suspense>
  );
}