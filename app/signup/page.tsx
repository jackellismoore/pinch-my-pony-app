"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("borrower");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setError("");
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message || "Signup failed");
      setLoading(false);
      return;
    }

    const user = data.user;

    // 🔑 CREATE / UPDATE PROFILE
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        role,
      });

    if (profileError) {
      setError(profileError.message);
    }

    setLoading(false);
  };

  return (
    <main style={{ maxWidth: 480, margin: "0 auto", padding: 32 }}>
      <h1>Sign up</h1>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      />

      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 16 }}
      >
        <option value="borrower">Borrower</option>
        <option value="owner">Owner</option>
      </select>

      <button onClick={handleSignup} disabled={loading}>
        {loading ? "Creating account..." : "Create account"}
      </button>

      {error && (
        <p style={{ color: "red", marginTop: 16 }}>{error}</p>
      )}
    </main>
  );
}
