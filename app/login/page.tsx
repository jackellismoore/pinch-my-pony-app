"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import LoginInner from "./LoginInner";
import AuthPostAuthRedirect from "../components/AuthPostAuthRedirect";

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <AuthPostAuthRedirect mode="login" />
      <LoginInner />
    </Suspense>
  );
}