import Link from "next/link";

export default function HorseProfilePage() {
  return (
    <main style={{ padding: 40 }}>
      <h1>Daisy</h1>
      <p>Calm • Cob • Suitable for beginners</p>

      <section
        style={{
          marginTop: 24,
          padding: 24,
          border: "2px dashed #ccc",
          borderRadius: 10,
          textAlign: "center",
        }}
      >
        <strong>Horse Photos</strong>
        <p style={{ fontSize: 14 }}>
          Upload clear photos (coming soon)
        </p>
        <button>Upload photos</button>
      </section>

      <section style={{ marginTop: 32 }}>
        <h3>About Daisy</h3>

        <p>
          Daisy is a calm, friendly cob who enjoys hacking and light schooling.
        </p>
      </section>

      <Link href="/request">
        <button style={{ marginTop: 32 }}>
          Request to Borrow
        </button>
      </Link>
    </main>
  );
}
