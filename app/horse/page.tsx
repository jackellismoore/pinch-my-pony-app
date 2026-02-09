import Link from "next/link";

export default function HorsePage() {
  return (
    <main style={{ padding: 40 }}>
      <h1>Available Horses</h1>
      <p>Browse horses shared by trusted owners.</p>

      <div style={gridStyle}>
        {["Bella", "Storm", "Willow"].map((name) => (
          <div key={name} style={cardStyle}>
            <img
              src={`https://placehold.co/400x250?text=${name}`}
              alt={`${name} the horse`}
              style={imgStyle}
            />

            <h3>{name}</h3>
            <p>Size: Medium</p>
            <p>Temperament: Calm</p>

            <Link href="/horse">
              <button disabled style={buttonStyle}>
                Request to Borrow (login required)
              </button>
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}

const gridStyle = {
  marginTop: 24,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: 20,
};

const cardStyle = {
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: 16,
};

const imgStyle = {
  width: "100%",
  borderRadius: 6,
  marginBottom: 12,
};

const buttonStyle = {
  marginTop: 8,
  padding: "6px 12px",
  opacity: 0.6,
  cursor: "not-allowed",
};
