export default function HorsePage() {
  return (
    <main style={{ padding: 40 }}>
      <h1>🐎 Horses</h1>

      <p style={{ maxWidth: 600 }}>
        Browse horses shared by owners in the community. More listings will
        appear as owners sign up.
      </p>

      <div
        style={{
          marginTop: 48,
          padding: 32,
          border: "2px dashed #ddd",
          borderRadius: 12,
          maxWidth: 600,
          background: "#fafafa",
        }}
      >
        <h3>No live listings yet</h3>
        <p>
          This is a demo view. Once the backend is connected, available horses
          will appear here automatically.
        </p>

        <p style={{ marginTop: 12, fontStyle: "italic", color: "#666" }}>
          Interested in sharing your horse? Sign up as an owner to get started.
        </p>
      </div>
    </main>
  );
}
