export default function BorrowerSignupPage() {
  return (
    <main style={{ padding: 40, fontFamily: "sans-serif", maxWidth: 500 }}>
      <h1>Borrower Sign Up</h1>
      <p>Tell us about your experience and preferences.</p>

      <form style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <label>Your Name</label>
          <input
            type="text"
            placeholder="Alex Taylor"
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Email</label>
          <input
            type="email"
            placeholder="alex@example.com"
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Age</label>
          <input
            type="number"
            placeholder="25"
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Riding Experience</label>
          <select style={{ width: "100%", padding: 8 }}>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Experienced</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Preferred Horse Size</label>
          <select style={{ width: "100%", padding: 8 }}>
            <option>Pony</option>
            <option>Cob</option>
            <option>Horse</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Availability</label>
          <textarea
            placeholder="e.g. weekends, 2 evenings a week"
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <button style={{ padding: "8px 16px" }}>
          Continue
        </button>
      </form>
    </main>
  );
}
