export default function SignupPage() {
  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Sign up to Pinch My Pony</h1>
      <p>Join our trusted community of horse owners and borrowers.</p>

      <div style={{ marginTop: 24 }}>
        <button style={{ marginRight: 12 }}>
          I am a Horse Owner
        </button>
        <button>
          I am a Borrower
        </button>
      </div>
    </main>
  );
}
