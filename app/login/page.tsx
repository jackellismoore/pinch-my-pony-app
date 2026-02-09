export default function LoginPage() {
  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Log in to Pinch My Pony</h1>

      <p>
        Welcome back! Please log in to manage your ponies or rentals.
      </p>

      <form style={{ marginTop: 24, maxWidth: 320 }}>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Password</label>
          <input
            type="password"
            placeholder="••••••••"
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <button style={{ padding: "8px 16px" }}>
          Log in
        </button>
      </form>
    </main>
  );
}
