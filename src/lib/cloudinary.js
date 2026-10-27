import crypto from 'crypto';

// Upload d'une image vers Cloudinary via l'API REST (pas de SDK).
// Signature HMAC-SHA1 des paramètres, comme requis par l'upload signé.
export async function uploadImage(buffer, { folder = 'shetech/avatars' } = {}) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Configuration Cloudinary manquante (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).');
  }

  const timestamp = Math.floor(Date.now() / 1000);

  // Les paramètres signés doivent être triés par ordre alphabétique.
  const paramsToSign = { folder, timestamp };
  const toSign = Object.keys(paramsToSign)
    .sort()
    .map((k) => `${k}=${paramsToSign[k]}`)
    .join('&');
  const signature = crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');

  const dataUri = `data:image/*;base64,${buffer.toString('base64')}`;

  const form = new URLSearchParams();
  form.append('file', dataUri);
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Erreur Cloudinary : ${data?.error?.message || res.status}`);
  }
  return data.secure_url;
}
