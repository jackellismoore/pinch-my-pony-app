import Link from "next/link";

export default function HorseProfilePage() {
  return (
    <main style={{ padding: 40, fontFamily: "sans-serif", maxWidth: 600 }}>
      <h1>Horse Profile</h1>
      <p>This horse is available for borrowing.</p>

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
        <input style={{ width: "100%", padding: 8 }} value="Daisy" readOnly />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label>Size</label>
        <input style={{ width: "100%", padding: 8 }} value="Cob" readOnly />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label>Temperament</label>
        <input style={{ width: "100%", padding: 8 }} value="Calm" readOnly />
      </div>

      <Link href="/request">
        <button style={{ marginTop: 24 }}>
          Request to Borrow
        </button>
      </Link>
    </main>
  );
}
