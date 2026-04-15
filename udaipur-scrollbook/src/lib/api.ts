// ─── Typed API Client ────────────────────────────────────────────────────────
// All backend calls go through here. Every function:
//   - Attaches the Bearer JWT automatically
//   - Throws an ApiError (not a raw Response) so callers know what went wrong
//   - Never leaks raw fetch/response objects to the UI layer

import { getToken } from './auth';

// ── Error shape ───────────────────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Internal fetch wrapper ────────────────────────────────────────────────────
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  // Only add JSON content-type when we are NOT sending FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = await res.json();
      message = body.error ?? body.message ?? message;
    } catch {
      // response body wasn't JSON — keep the generic message
    }
    throw new ApiError(res.status, message);
  }

  // 204 No Content — nothing to parse
  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ── Public types ──────────────────────────────────────────────────────────────
export interface ApiUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface AuthResponse {
  token: string;
  user: ApiUser;
}

export interface ApiPhoto {
  _id: string;
  cloudinaryUrl: string;
  placeSlug: string;
  placeName: string;
  uploaderName: string;
  uploaderAvatar: string;
  uploadedAt: string;
}

export interface GroupedPhotos {
  placeSlug: string;
  photos: ApiPhoto[];
}

// ── Auth ──────────────────────────────────────────────────────────────────────
/** Exchange a Google credential JWT for our own backend JWT + user profile */
export async function loginWithGoogle(credential: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ token: credential }),
  });
}

/** Verify current stored JWT and return the user profile */
export async function fetchMe(): Promise<ApiUser> {
  return request<ApiUser>('/api/auth/me');
}

// ── Photos ────────────────────────────────────────────────────────────────────
/** Fetch all photos for a specific place slug */
export async function fetchPhotosByPlace(placeSlug: string): Promise<ApiPhoto[]> {
  return request<ApiPhoto[]>(`/api/photos?placeSlug=${encodeURIComponent(placeSlug)}`);
}

/** Fetch ALL photos grouped by place slug into a lookup map */
export async function fetchAllPhotosGrouped(): Promise<Record<string, string[]>> {
  // Backend returns: Array<{ placeSlug, photoCount }> for the summary,
  // so we individually fetch per-place to get full URLs.
  // We fetch per location using parallel requests for the initial load.
  return request<Record<string, string[]>>('/api/photos/all');
}

/** Upload a single photo for a location.  Returns the saved Photo document. */
export async function uploadPhoto(
  file: File,
  placeSlug: string,
  placeName: string,
): Promise<ApiPhoto> {
  if (!file) throw new ApiError(400, 'No file selected');
  if (file.size > 5 * 1024 * 1024) {
    throw new ApiError(413, 'Photo must be smaller than 5 MB');
  }

  const form = new FormData();
  form.append('file', file);
  form.append('placeSlug', placeSlug);
  form.append('placeName', placeName);

  return request<ApiPhoto>('/api/photos', {
    method: 'POST',
    body: form,
  });
}
