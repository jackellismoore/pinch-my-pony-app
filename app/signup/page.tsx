"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("borrower");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setLoading(true);
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
    }

    setLoading(false);
  };

  return (
    <main style={{ maxWidth: 400, margin: "60px auto" }}>
      <h1>Sign up</h1>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="borrower">Borrower</option>
        <option value="owner">Horse Owner</option>
      </select>

      <button onClick={handleSignup} disabled={loading}>
        {loading ? "Creating account..." : "Create account"}
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </main>
  );
}
