"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import LoginInner from "./LoginInner";

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <LoginInner />
    </Suspense>
  );
}