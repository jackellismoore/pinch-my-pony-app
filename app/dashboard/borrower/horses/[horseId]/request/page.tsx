import { redirect } from "next/navigation";

export default async function LegacyHorseRequestPage({
  params,
}: {
  params: Promise<{ horseId: string }>;
}) {
  const { horseId } = await params;
  redirect(`/request?horseId=${encodeURIComponent(horseId)}`);
}
