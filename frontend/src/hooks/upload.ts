import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export interface UploadSignature {
  signature: string;
  api_key: string;
  cloud_name: string;
  timestamp: number;
}

/**
 * Direct-to-Cloudinary upload credentials.
 *
 * The backend signs the request but does not proxy the bytes. That matters
 * more than it sounds: field teams on unreliable connections upload over the
 * same link they are already using, and a large photograph routed through
 * FastAPI ties up a worker for the duration. Going straight to the CDN keeps
 * the request short.
 *
 * Mirrors `GET /media/upload/signature` in `backend/app/api/media.py:506`.
 * `folder` is fixed server-side in the signed payload, so it is not sent here.
 */
export function useUploadSignature(enabled = true) {
  return useQuery({
    queryKey: ['media', 'upload-signature'],
    queryFn: async () => {
      const { data } = await api.get<UploadSignature>('/media/upload/signature');
      return data;
    },
    enabled,
    // A signature is only valid against its timestamp; caching it long enough
    // to be useful is fine, but it must be refetched for each session.
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export interface DirectUploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Sends the file straight to Cloudinary using the signed parameters.
 *
 * Returns the CDN's response shape rather than an asset record, because the
 * asset is created afterwards by the backend's webhook. Callers should treat
 * this as "the bytes landed", not "the asset is ready".
 */
export async function directUpload(
  signature: UploadSignature,
  file: File,
  signal?: AbortSignal,
): Promise<DirectUploadResult> {
  const body = new FormData();
  body.append('file', file);
  body.append('api_key', signature.api_key);
  body.append('timestamp', String(signature.timestamp));
  body.append('signature', signature.signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signature.cloud_name}/image/upload`,
    { method: 'POST', body, signal },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `Direct upload failed (${response.status})${detail ? `: ${detail.slice(0, 160)}` : ''}`,
    );
  }

  const json = (await response.json()) as {
    public_id: string;
    secure_url: string;
    width: number;
    height: number;
    bytes: number;
  };

  return {
    public_id: json.public_id,
    secure_url: json.secure_url,
    width: json.width,
    height: json.height,
    bytes: json.bytes,
  };
}
