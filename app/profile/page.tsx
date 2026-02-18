'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type ProfileRow = {
  id: string;
  role: 'owner' | 'borrower' | null;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
  last_seen_at: string | null;
};

function safeTrim(v: string) {
  return v.trim();
}

function extFromFilename(name: string) {
  const parts = name.split('.');
  if (parts.length < 2) return 'png';
  const ext = parts[parts.length - 1].toLowerCase();
  return ext || 'png';
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  async function loadProfile() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr) throw userErr;

      if (!user) {
        setUserId(null);
        setProfile(null);
        return;
      }

      setUserId(user.id);

      const profRes = await supabase
        .from('profiles')
        .select('id,role,full_name,display_name,avatar_url,created_at,last_seen_at')
        .eq('id', user.id)
        .single();

      if (profRes.error && (profRes.error as any).code === 'PGRST116') {
        const upsertRes = await supabase.from('profiles').upsert(
          {
            id: user.id,
            full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
            display_name: user.user_metadata?.display_name ?? null,
            avatar_url: user.user_metadata?.avatar_url ?? null,
          },
          { onConflict: 'id' }
        );

        if (upsertRes.error) throw upsertRes.error;

        const retry = await supabase
          .from('profiles')
          .select('id,role,full_name,display_name,avatar_url,created_at,last_seen_at')
          .eq('id', user.id)
          .single();

        if (retry.error) throw retry.error;

        const p = (retry.data ?? null) as ProfileRow | null;
        setProfile(p);
        setFullName(p?.full_name ?? '');
        setDisplayName(p?.display_name ?? '');
        setAvatarUrl(p?.avatar_url ?? '');
        return;
      }

      if (profRes.error) throw profRes.error;

      const p = (profRes.data ?? null) as ProfileRow | null;
      setProfile(p);
      setFullName(p?.full_name ?? '');
      setDisplayName(p?.display_name ?? '');
      setAvatarUrl(p?.avatar_url ?? '');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load profile.');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (cancelled) return;
      await loadProfile();
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async () => {
      if (cancelled) return;
      await loadProfile();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const canSave = useMemo(() => {
    if (!profile) return false;
    if (saving) return false;
    if (!safeTrim(fullName)) return false;
    return true;
  }, [profile, saving, fullName]);

  async function save() {
    if (!profile) return;
    setError(null);
    setSuccess(null);

    const fn = safeTrim(fullName);
    if (!fn) {
      setError('Full name is required.');
      return;
    }

    const dn = safeTrim(displayName);
    const av = safeTrim(avatarUrl);

    try {
      setSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fn,
          display_name: dn || null,
          avatar_url: av || null,
        })
        .eq('id', profile.id);

      if (error) throw error;

      setSuccess('Profile saved.');
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar() {
    if (!userId) {
      setError('You must be logged in.');
      return;
    }
    if (!avatarFile) {
      setError('Choose an image first.');
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      setUploading(true);

      const ext = extFromFilename(avatarFile.name);
      const objectPath = `${userId}/avatar.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(objectPath, avatarFile, {
          upsert: true,
          contentType: avatarFile.type || 'image/*',
        });

      if (upErr) throw upErr;

      const { data } = supabase.storage.from('avatars').getPublicUrl(objectPath);
      const publicUrl = data?.publicUrl;

      if (!publicUrl) throw new Error('Could not resolve public avatar URL.');

      setAvatarUrl(publicUrl);
      setSuccess('Avatar uploaded. Click Save to apply.');
    } catch (e: any) {
      setError(e?.message ?? 'Avatar upload failed.');
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 40, fontSize: 13, color: 'rgba(0,0,0,0.6)' }}>Loading…</div>;
  }

  if (!userId) {
    return (
      <div style={{ padding: 40 }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>You’re not logged in</div>
        <div style={{ marginTop: 8 }}>
          <Link href="/login" style={{ textDecoration: 'none', fontWeight: 800 }}>
            Go to Login →
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ padding: 40 }}>
        <div style={{ fontSize: 16, fontWeight: 800 }}>Profile unavailable</div>
        {error ? (
          <div style={{ marginTop: 10, fontSize: 13, color: 'rgba(180,0,0,0.9)' }}>{error}</div>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>My Profile</h1>
          <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
            Role: <span style={{ fontWeight: 750 }}>{profile.role ?? '—'}</span>
          </div>
        </div>

        <button
          onClick={save}
          disabled={!canSave}
          style={{
            border: '1px solid rgba(0,0,0,0.14)',
            borderRadius: 12,
            padding: '10px 14px',
            background: canSave ? 'black' : 'rgba(0,0,0,0.05)',
            color: canSave ? 'white' : 'rgba(0,0,0,0.5)',
            cursor: canSave ? 'pointer' : 'not-allowed',
            fontWeight: 800,
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {error ? (
        <div
          style={{
            marginTop: 12,
            border: '1px solid rgba(255,0,0,0.25)',
            background: 'rgba(255,0,0,0.06)',
            padding: 12,
            borderRadius: 12,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          style={{
            marginTop: 12,
            border: '1px solid rgba(0,140,60,0.25)',
            background: 'rgba(0,140,60,0.06)',
            padding: 12,
            borderRadius: 12,
            fontSize: 13,
            color: 'rgba(0,120,50,0.95)',
          }}
        >
          {success}
        </div>
      ) : null}

      <div
        style={{
          marginTop: 14,
          border: '1px solid rgba(0,0,0,0.10)',
          borderRadius: 14,
          padding: 14,
          background: 'white',
          display: 'grid',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              overflow: 'hidden',
              background: 'rgba(0,0,0,0.06)',
              border: '1px solid rgba(0,0,0,0.10)',
              flexShrink: 0,
            }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : null}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 850, fontSize: 16 }}>
              {displayName.trim() || fullName.trim() || 'Your name'}
            </div>
            <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(0,0,0,0.65)' }}>
              Upload an avatar and set your public name.
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            Full name (required)
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{
                border: '1px solid rgba(0,0,0,0.14)',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 14,
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            Display name
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="What others will see"
              style={{
                border: '1px solid rgba(0,0,0,0.14)',
                borderRadius: 10,
                padding: '10px 12px',
                fontSize: 14,
              }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} />
          <button
            onClick={uploadAvatar}
            disabled={uploading || !avatarFile}
            style={{
              border: '1px solid rgba(0,0,0,0.14)',
              borderRadius: 12,
              padding: '10px 12px',
              background: uploading || !avatarFile ? 'rgba(0,0,0,0.05)' : 'white',
              color: 'black',
              cursor: uploading || !avatarFile ? 'not-allowed' : 'pointer',
              fontWeight: 850,
            }}
          >
            {uploading ? 'Uploading…' : 'Upload Avatar'}
          </button>
        </div>

        <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
          Avatar URL (auto-filled on upload)
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
            style={{
              border: '1px solid rgba(0,0,0,0.14)',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 14,
            }}
          />
        </label>
      </div>
    </div>
  );
}
