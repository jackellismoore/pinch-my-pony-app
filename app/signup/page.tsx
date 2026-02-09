import Link from "next/link";

export default function SignupPage() {
  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Sign up to Pinch My Pony</h1>
      <p>
        Join our trusted community of horse owners and borrowers.
      </p>

      {/* Role buttons */}
      <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
        <Link href="/signup/owner">
          <button>I am a Horse Owner</button>
        </Link>

        <Link href="/signup/borrower">
          <button>I am a Borrower</button>
        </Link>

        <Link href="/horse">
          <button>View a Horse</button>
        </Link>
      </div>

      {/* Placeholder images */}
      <div
        style={{
          marginTop: 40,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        <div style={cardStyle}>
          <img
            src="https://placehold.co/400x250?text=Horse+Profile"
            alt="Horse profile placeholder"
            style={imgStyle}
          />
          <p>Browse trusted horses</p>
        </div>

        <div style={cardStyle}>
          <img
            src="https://placehold.co/400x250?text=Owner+Dashboard"
            alt="Owner dashboard placeholder"
            style={imgStyle}
          />
          <p>Create and manage horse profiles</p>
        </div>

        <div style={cardStyle}>
          <img
            src="https://placehold.co/400x250?text=Borrow+Requests"
            alt="Borrow requests placeholder"
            style={imgStyle}
          />
          <p>Request or approve borrowing</p>
        </div>
      </div>
    </main>
  );
}

const cardStyle = {
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: 12,
  textAlign: "center" as const,
};

const imgStyle = {
  width: "100%",
  borderRadius: 6,
  marginBottom: 8,
};
