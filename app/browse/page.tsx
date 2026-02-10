import Link from "next/link";

const horses = [
  {
    id: "bella",
    name: "Bella",
    location: "Surrey",
    temperament: "Calm & friendly",
  },
  {
    id: "storm",
    name: "Storm",
    location: "Kent",
    temperament: "Energetic",
  },
  {
    id: "willow",
    name: "Willow",
    location: "Hampshire",
    temperament: "Gentle",
  },
];

export default function BrowsePage() {
  return (
    <main style={{ padding: 40 }}>
      <h1 style={{ marginBottom: 24 }}>Browse Horses 🐎</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 24,
        }}
      >
        {horses.map((horse) => (
          <div
            key={horse.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 16,
            }}
          >
            {/* Image placeholder */}
            <div
              style={{
                height: 160,
                background: "#f3f3f3",
                borderRadius: 6,
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
              }}
            >
              🐴
            </div>

            <h3>{horse.name}</h3>
            <p>{horse.location}</p>
            <p style={{ color: "#555" }}>{horse.temperament}</p>

            <Link href="/horse">
              <button style={{ marginTop: 12 }}>View horse</button>
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
