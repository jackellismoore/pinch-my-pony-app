import { Suspense } from "react";
import RequestClient from "./request-client";

export default function RequestPage() {
  return (
    <Suspense fallback={<p style={{ padding: 32 }}>Loading request form…</p>}>
      <RequestClient />
    </Suspense>
  );
}
