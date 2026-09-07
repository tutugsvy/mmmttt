import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function pinataUpload(file) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) return null;
  const body = new FormData();
  body.append('file', file, file.name || 'token-logo');
  const response = await fetch('https://uploads.pinata.cloud/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
    body,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json?.data?.cid) throw new Error(json?.error?.reason || `IPFS upload failed (HTTP ${response.status})`);
  return `ipfs://${json.data.cid}`;
}

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get('image');
    if (!file || typeof file === 'string') return NextResponse.json({ error: 'image file is required' }, { status: 400 });
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return NextResponse.json({ error: 'Use PNG, JPG, or WEBP.' }, { status: 415 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Image must be under 5 MB.' }, { status: 413 });

    // Prefer the app's own Pinata account. The reference-compatible fallback keeps
    // the same public upload contract while deployment credentials are configured.
    let uri = await pinataUpload(file);
    if (!uri) {
      const upstream = new FormData();
      upstream.append('image', file, file.name || 'token-logo');
      const response = await fetch('https://pons-launcher.vercel.app/api/upload', { method: 'POST', body: upstream });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || !json?.uri) throw new Error(json?.error || `IPFS upload failed (HTTP ${response.status})`);
      uri = json.uri;
    }
    return NextResponse.json({ uri });
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'IPFS upload failed' }, { status: 500 });
  }
}
