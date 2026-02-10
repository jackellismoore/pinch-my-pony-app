import { getCurrentUser } from "../lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <main style={{ padding: 32 }}>
      <h1>Dashboard</h1>

      {user ? (
        <>
          <p>✅ You are logged in</p>
          <p>
            <strong>Email:</strong> {user.email}
          </p>
        </>
      ) : (
        <>
          <p>❌ You are not logged in</p>
          <p>Please log in to access your dashboard.</p>
        </>
      )}
    </main>
  );
}
