import RequestClient from "./request-client";

export default function RequestPage({
  searchParams,
}: {
  searchParams: { horseId?: string };
}) {
  const horseId = searchParams.horseId;

  if (!horseId) {
    return <p style={{ padding: 40 }}>Invalid request.</p>;
  }

  return <RequestClient horseId={horseId} />;
}
