import { Suspense } from "react";
import RequestForm from "./request-form";

export default function RequestPage() {
  return (
    <Suspense fallback={<p style={{ padding: 32 }}>Loading request form…</p>}>
      <RequestForm />
    </Suspense>
  );
}
