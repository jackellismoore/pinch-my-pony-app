import { Suspense } from "react";
import HorseClient from "./horse-client";

export default function HorsePage() {
  return (
    <Suspense fallback={<p style={{ padding: 24 }}>Loading horse…</p>}>
      <HorseClient />
    </Suspense>
  );
}
