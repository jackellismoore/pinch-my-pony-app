"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"owner" | "borrower">("borrower");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Create auth user
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !data.user) {
      setError(authError?.message || "Signup failed");
      setLoading(false);
      return;
    }

    // 2. Create profile
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: data.user.id,
        role,
      });

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    // 3. Redirect based on role
    if (role === "owner") {
      router.push("/horse");
    } else {
      router.push("/browse");
    }
  }

  return (
    <main style={{ padding: 40, maxWidth: 400, margin: "0 auto" }}>
      <h1>Sign up</h1>

      <form onSubmit={handleSignup}>
        <label>Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label style={{ marginTop: 16 }}>Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <label style={{ marginTop: 16 }}>I am a</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
        >
          <option value="borrower">Borrower</option>
          <option value="owner">Horse Owner</option>
        </select>

        {error && (
          <p style={{ color: "red", marginTop: 12 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ marginTop: 24 }}
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </main>
  );
}
