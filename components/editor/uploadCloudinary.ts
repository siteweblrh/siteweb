/**
 * Upload direct signé vers Cloudinary depuis un client. Renvoie la `secure_url`
 * pour insertion immédiate (par ex. dans l'éditeur TipTap).
 *
 * Réutilise la route signée `/api/upload/cloudinary` (mêmes garanties auth
 * que `ImageUploader`). Pas de transformation par défaut — l'article gère
 * son propre rendu responsive.
 */
export async function uploadImageToCloudinary(file: File): Promise<string> {
  const sigRes = await fetch('/api/upload/cloudinary', { method: 'POST' });
  if (!sigRes.ok) {
    const data = await sigRes.json().catch(() => ({}));
    throw new Error(
      data?.error ||
        (sigRes.status === 503
          ? 'Cloudinary non configuré côté serveur.'
          : `HTTP ${sigRes.status}`),
    );
  }
  const { signature, timestamp, apiKey, cloudName, folder } = (await sigRes.json()) as {
    signature: string;
    timestamp: number;
    apiKey: string;
    cloudName: string;
    folder: string;
  };

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);
  form.append('folder', folder);

  const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  if (!upRes.ok) {
    const text = await upRes.text().catch(() => '');
    throw new Error(`Cloudinary a refusé l'upload (${upRes.status}). ${text.slice(0, 200)}`);
  }
  const data = (await upRes.json()) as { secure_url?: string; error?: { message: string } };
  if (!data.secure_url) {
    throw new Error(data.error?.message ?? 'Réponse Cloudinary inattendue.');
  }
  return data.secure_url;
}
