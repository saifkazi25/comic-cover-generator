import FormData from 'form-data';
import fetch from 'node-fetch';

// Takes a selfieUrl (Cloudinary, etc.), uploads to Replicate CDN, returns CDN URL
export async function uploadToReplicateCDN(selfieUrl: string): Promise<string> {
  // Download image as buffer
  const res = await fetch(selfieUrl);
  if (!res.ok) throw new Error('Failed to fetch selfie for CDN upload');
  const buffer = await res.buffer();

  // Prepare FormData
  const form = new FormData();
  form.append('file', buffer, { filename: 'selfie.png' });

  // Upload to Replicate CDN
  const uploadRes = await fetch(
    'https://dreambooth-api-experimental.replicate.com/v1/upload',
    {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_TOKEN}`,
        ...form.getHeaders(),
      },
      body: form,
    }
  );
  if (!uploadRes.ok) throw new Error('Failed to upload to Replicate CDN');
  type ReplicateUploadResponse = { upload_url: string };
  const data = (await uploadRes.json()) as ReplicateUploadResponse;
  if (!data.upload_url) throw new Error('No upload_url in Replicate response');
  return data.upload_url;
}
