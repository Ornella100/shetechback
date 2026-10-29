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

// Stocke les modèles PDF de certificats sur Cloudinary (le disque Render est éphémère).
export async function uploadPdf(buffer, { folder = 'shetech/certificats/parcours', publicId } = {}) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Configuration Cloudinary manquante (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = { folder, public_id: publicId, timestamp };
  const toSign = Object.keys(paramsToSign).sort().map((key) => `${key}=${paramsToSign[key]}`).join('&');
  const signature = crypto.createHash('sha1').update(toSign + apiSecret).digest('hex');
  const form = new URLSearchParams();
  form.append('file', `data:application/pdf;base64,${buffer.toString('base64')}`);
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('public_id', publicId);
  form.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`, {
    method: 'POST', body: form,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`Erreur Cloudinary : ${result?.error?.message || response.status}`);
  return result.secure_url;
}
