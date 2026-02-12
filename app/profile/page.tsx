"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    setProfile(data);
  };

  if (!profile) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ padding: 40 }}>
      <h1>{profile.full_name}</h1>

      <p><strong>Stable:</strong> {profile.stable_name}</p>
      <p><strong>Age:</strong> {profile.age}</p>
      <p><strong>Location:</strong> {profile.location}</p>
      <p>{profile.bio}</p>
    </div>
  );
}
