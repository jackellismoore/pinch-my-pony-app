"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

type Profile = {
  full_name: string | null;
  role: string | null;
};

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    setEmail(user.email || "");

    const { data } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data);
      setFullName(data.full_name || "");
    }
  };

  const updateProfile = async () => {
    setStatus(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", user.id);

    if (error) {
      setStatus(error.message);
    } else {
      setStatus("Profile updated!");
    }
  };

  if (!profile) {
    return <p style={{ padding: 40 }}>Loading profile...</p>;
  }

  return (
    <main style={{ padding: 40, maxWidth: 500 }}>
      <h1>My Profile</h1>

      <div style={{ marginBottom: 20 }}>
        <label>Email</label>
        <input
          value={email}
          disabled
          style={{ width: "100%", padding: 8 }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label>Full Name</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          style={{ width: "100%", padding: 8 }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label>Role</label>
        <input
          value={profile.role || ""}
          disabled
          style={{ width: "100%", padding: 8 }}
        />
      </div>

      <button onClick={updateProfile}>
        Save Changes
      </button>

      {status && (
        <p
          style={{
            marginTop: 15,
            color: status === "Profile updated!" ? "green" : "red",
          }}
        >
          {status}
        </p>
      )}
    </main>
  );
}
