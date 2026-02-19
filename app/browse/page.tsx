'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardShell from '@/components/DashboardShell';
import { supabase } from '@/lib/supabaseClient';

function safeExt(name: string) {
  const parts = name.split('.');
  const ext = (parts[parts.length - 1] ?? '').toLowerCase();
  if (ext && ext.length <= 8) return ext;
  return 'png';
}

export default function AddHorsePage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [name, setName] = useState('');
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [isActive, setIsActive] = useState(true);

  const [imageUrl, setImageUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingUser(true);
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      setUserId(data.user?.id ?? null);
      setLoadingUser(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canSave = useMemo(() => {
    if (!userId) return false;
    if (saving || uploading) return false;
    if (!name.trim()) return false;
    // lat/lng optional in your app, but map wants them. We'll allow blank but recommend.
    return true;
  }, [userId, saving, uploading, name]);

  async function onUpload(file: File) {
    setUploading(true);
    setError(null);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error('Not logged in');

      const ext = safeExt(file.name);
      const path = `horses/${uid}/${crypto.randomUUID()}.${ext}`;

      const up = await supabase.storage.from('horses').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });

      if (up.error) throw up.error;

      const pub = supabase.storage.from('horses').getPublicUrl(path);
      const url = pub.data.publicUrl;
      if (!url) throw new Error('Could not create public URL for image');

      setImageUrl(url);
    } catch (e: any) {
      setError(e?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setError(null);

    if (!userId) {
      setError('You must be logged in.');
      return;
    }

    try {
      setSaving(true);

      const payload: any = {
        owner_id: userId,
        name: name.trim(),
        is_active: isActive,
      };

      const latNum = lat.trim() ? Number(lat) : null;
      const lngNum = lng.trim() ? Number(lng) : null;

      if (latNum !== null && !Number.isFinite(latNum)) throw new Error('Latitude must be a number');
      if (lngNum !== null && !Number.isFinite(lngNum)) throw new Error('Longitude must be a number');

      payload.lat = latNum;
      payload.lng = lngNum;

      if (imageUrl.trim()) payload.image_url = imageUrl.trim();

      const { data, error } = await supabase.from('horses').insert(payload).select('id').single();
      if (error) throw error;

      router.push('/dashboard/owner/horses');
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create horse');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <div style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Add Horse</h1>
        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.7 }}>
          Add a listing. Include a photo so it shows on the map.
        </div>

        {loadingUser ? (
          <div style={{ marginTop: 14, fontSize: 13, opacity: 0.7 }}>Loading…</div>
        ) : null}

        {!loadingUser && !userId ? (
          <div style={{ marginTop: 14, fontSize: 13, color: 'rgba(180,0,0,0.9)' }}>You’re not logged in.</div>
        ) : null}

        {error ? (
          <div
            style={{
              marginTop: 14,
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

        <div
          style={{
            marginTop: 14,
            border: '1px solid rgba(0,0,0,0.10)',
            borderRadius: 14,
            background: 'white',
            padding: 14,
            display: 'grid',
            gap: 12,
          }}
        >
          <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
            Horse name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                border: '1px solid rgba(0,0,0,0.14)',
                borderRadius: 12,
                padding: '10px 12px',
                fontSize: 14,
              }}
              placeholder="e.g. Daisy"
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              Latitude (optional)
              <input
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                style={{
                  border: '1px solid rgba(0,0,0,0.14)',
                  borderRadius: 12,
                  padding: '10px 12px',
                  fontSize: 14,
                }}
                placeholder="51.5074"
              />
            </label>

            <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              Longitude (optional)
              <input
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                style={{
                  border: '1px solid rgba(0,0,0,0.14)',
                  borderRadius: 12,
                  padding: '10px 12px',
                  fontSize: 14,
                }}
                placeholder="-0.1278"
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active listing
            </label>
          </div>

          <div
            style={{
              borderTop: '1px solid rgba(0,0,0,0.08)',
              paddingTop: 12,
              display: 'grid',
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 13 }}>Photo</div>

            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Horse"
                style={{
                  width: 220,
                  height: 140,
                  objectFit: 'cover',
                  borderRadius: 12,
                  border: '1px solid rgba(0,0,0,0.10)',
                }}
              />
            ) : (
              <div style={{ fontSize: 13, opacity: 0.7 }}>No photo yet.</div>
            )}

            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                cursor: uploading ? 'not-allowed' : 'pointer',
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(file);
                }}
                style={{ display: 'none' }}
              />
              <span
                style={{
                  border: '1px solid rgba(0,0,0,0.14)',
                  background: 'white',
                  padding: '10px 12px',
                  borderRadius: 12,
                }}
              >
                {uploading ? 'Uploading…' : 'Upload image'}
              </span>

              <span style={{ opacity: 0.7, fontWeight: 600 }}>Stored in bucket: <b>horses</b></span>
            </label>

            <label style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              Or paste Image URL
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                style={{
                  border: '1px solid rgba(0,0,0,0.14)',
                  borderRadius: 12,
                  padding: '10px 12px',
                  fontSize: 14,
                }}
                placeholder="https://..."
              />
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              onClick={() => router.back()}
              style={{
                border: '1px solid rgba(0,0,0,0.14)',
                background: 'white',
                borderRadius: 12,
                padding: '10px 14px',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              onClick={save}
              disabled={!canSave}
              style={{
                border: '1px solid rgba(0,0,0,0.14)',
                background: !canSave ? 'rgba(0,0,0,0.06)' : 'black',
                color: !canSave ? 'rgba(0,0,0,0.45)' : 'white',
                borderRadius: 12,
                padding: '10px 14px',
                fontWeight: 900,
                cursor: !canSave ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Create horse'}
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
