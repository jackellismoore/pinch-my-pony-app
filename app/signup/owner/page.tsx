export default function OwnerSignupPage() {
  return (
    <main style={{ padding: 40, fontFamily: "sans-serif", maxWidth: 500 }}>
      <h1>Horse Owner Sign Up</h1>
      <p>Create your owner and horse profile.</p>

      <form style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <label>Your Name</label>
          <input
            type="text"
            placeholder="Jane Smith"
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Email</label>
          <input
            type="email"
            placeholder="jane@example.com"
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Horse Name</label>
          <input
            type="text"
            placeholder="Daisy"
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Horse Size</label>
          <select style={{ width: "100%", padding: 8 }}>
            <option>Small pony</option>
            <option>Pony</option>
            <option>Cob</option>
            <option>Horse</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Temperament</label>
          <select style={{ width: "100%", padding: 8 }}>
            <option>Calm</option>
            <option>Forward</option>
            <option>Green</option>
            <option>Spirited</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>What help are you looking for?</label>
          <textarea
            placeholder="e.g. light riding, grooming, companionship"
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <a href="/horse">
  <button style={{ padding: "8px 16px" }}>
    Continue to Horse Profile
  </button>
</a>
      </form>
    </main>
  );
}
