"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("borrower");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role, // 👈 goes into raw_user_meta_data for trigger
        },
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
  }

  return (
    <main style={{ maxWidth: 400, margin: "60px auto" }}>
      <h1>Sign up</h1>

      <form onSubmit={handleSignup}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="borrower">Borrower</option>
          <option value="owner">Horse Owner</option>
        </select>

        <button type="submit">Create account</button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && (
        <p style={{ color: "green" }}>
          Account created! Check your email to confirm.
        </p>
      )}
    </main>
  );
}
