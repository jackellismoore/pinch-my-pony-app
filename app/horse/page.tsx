export default function HorseProfilePage() {
  return (
    <main style={{ padding: 40, fontFamily: "sans-serif", maxWidth: 600 }}>
      <h1>Horse Profile</h1>
      <p>Create or view a horse listing.</p>

      <form style={{ marginTop: 24 }}>
        <div
          style={{
            marginBottom: 24,
            padding: 16,
            border: "2px dashed #ccc",
            borderRadius: 8,
            textAlign: "center",
          }}
        >
          <strong>Horse Photos</strong>
          <p style={{ fontSize: 14, color: "#555" }}>
            Upload clear photos of your horse (coming soon)
          </p>
          <button type="button">Upload photos</button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Horse Name</label>
          <input style={{ width: "100%", padding: 8 }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Size</label>
          <select style={{ width: "100%", padding: 8 }}>
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
            <option>Spirited</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Rules & Notes</label>
          <textarea style={{ width: "100%", padding: 8 }} />
        </div>

        <button>Save Horse</button>
      </form>
    </main>
  );
}
