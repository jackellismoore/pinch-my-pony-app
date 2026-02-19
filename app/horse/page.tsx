import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function HorseIndexPage() {
  // /horse should not be a real page – users should go to /horse/[id]
  redirect("/browse");
}
