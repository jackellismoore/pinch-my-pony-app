import Link from "next/link";

export default function BrowseHorsesPage() {
  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>Browse Horses</h1>
      <p>Find a horse that matches your experience and availability.</p>

      <section
        style={{
          marginTop: 24,
          marginBottom: 32,
          padding: 16,
          border: "1px solid #ddd",
          borderRadius: 8,
          maxWidth: 600,
        }}
      >
        <h3>Filters</h3>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <select style={{ padding: 8 }}>
            <option>Any size</option>
            <option>Pony</option>
            <option>Cob</option>
            <option>Horse</option>
          </select>

          <select style={{ padding: 8 }}>
            <option>Any temperament</option>
            <option>Calm</option>
            <option>Forward</option>
            <option>Spirited</option>
          </select>

          <select style={{ padding: 8 }}>
            <option>Any experience</option>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Experienced</option>
          </select>
        </div>
      </section>

      <section style={{ maxWidth: 600, display: "grid", gap: 16 }}>
        <HorseCard
          name="Daisy"
          size="Cob"
          temperament="Calm"
          suitability="Beginner"
        />

        <HorseCard
          name="Apollo"
          size="Horse"
          temperament="Forward"
          suitability="Experienced"
        />
      </section>
    </main>
  );
}

function HorseCard({
  name,
  size,
  temperament,
  suitability,
}: {
  name: string;
  size: string;
  temperament: string;
  suitability: string;
}) {
  return (
    <div
      style={{
        padding: 16,
        border: "1px solid #ddd",
        borderRadius: 8,
      }}
    >
      <h4>{name}</h4>
      <p>Size: {size}</p>
      <p>Temperament: {temperament}</p>
      <p>Suitable for: {suitability}</p>

      <Link href="/horse">
        <button style={{ marginTop: 8 }}>
          View Profile
        </button>
      </Link>
    </div>
  );
}
