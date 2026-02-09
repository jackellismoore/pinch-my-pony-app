import Link from "next/link";

export default function SignupPage() {
  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Sign up to Pinch My Pony</h1>

      <p>
        Join our trusted community of horse owners and borrowers.
      </p>

      <div style={{ marginTop: 24 }}>
        <Link href="/signup/owner">
          <button style={{ marginRight: 12 }}>
            I am a Horse Owner
          </button>
        </Link>

        <Link href="/signup/borrower">
          <button>
            I am a Borrower
          </button>
        </Link>
        import Link from "next/link";

      <Link href="/horse">
        <button style={{ marginTop: 16 }}>
        View a Horse
        </button>
      </Link>

      </div>
    </main>
  );
}
