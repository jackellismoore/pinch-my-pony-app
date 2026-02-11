import RequestClient from "./request-client";

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<{ horseId?: string }>;
}) {
  const params = await searchParams;
  const horseId = params?.horseId;

  if (!horseId) {
    return <p style={{ padding: 40 }}>Invalid request.</p>;
  }

  return <RequestClient horseId={horseId} />;
}
