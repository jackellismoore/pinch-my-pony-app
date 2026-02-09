export default function HorseProfilePage() {
  return (
    <main style={{ padding: 40, fontFamily: "sans-serif", maxWidth: 600 }}>
      <h1>Horse Profile</h1>
      <p>Tell borrowers about your horse.</p>

      <form style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <label>Horse Name</label>
          <input
            type="text"
            placeholder="Daisy"
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Breed (optional)</label>
          <input
            type="text"
            placeholder="Welsh Cob"
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Height / Size</label>
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
            <option>Very calm</option>
            <option>Calm</option>
            <option>Forward</option>
            <option>Green / young</option>
            <option>Spirited</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Suitable For</label>
          <select style={{ width: "100%", padding: 8 }}>
            <option>Beginner</option>
            <option>Intermediate</option>
            <option>Experienced riders only</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>What can borrowers help with?</label>
          <textarea
            placeholder="e.g. hacking, schooling, grooming, stable help"
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Rules & Requirements</label>
          <textarea
            placeholder="e.g. must wear helmet, no jumping, max weight"
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label>Availability</label>
          <textarea
            placeholder="e.g. weekdays, weekends, evenings"
            style={{ width: "100%", padding: 8 }}
          />
        </div>

        <button style={{ padding: "8px 16px" }}>
          Save Horse Profile
        </button>
      </form>
    </main>
  );
}
