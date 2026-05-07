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

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ── Public types ──────────────────────────────────────────────────────────────
export interface ApiUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  cloudinaryName: string;
  cloudinaryPreset: string;
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

export interface IItineraryItem {
  placeSlug: string;
  placeName: string;
  order: number;
  plannedDate?: string;
}

export interface ApiTrip {
  _id: string;
  name: string;
  adminId: string;
  members: string[];
  inviteCode: string;
  itinerary: IItineraryItem[];
  createdAt: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function loginWithGoogle(credential: string): Promise<AuthResponse> {
  return request<AuthResponse>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ token: credential }),
  });
}

export async function fetchMe(): Promise<ApiUser> {
  return request<ApiUser>('/api/auth/me');
}

export async function updateMe(cloudinaryName: string, cloudinaryPreset: string): Promise<ApiUser> {
  return request<ApiUser>('/api/auth/me', {
    method: 'PATCH',
    body: JSON.stringify({ cloudinaryName, cloudinaryPreset }),
  });
}

// ── Trips ─────────────────────────────────────────────────────────────────────
export async function createTrip(name: string, itinerary: IItineraryItem[]): Promise<ApiTrip> {
  return request<ApiTrip>('/api/trips', {
    method: 'POST',
    body: JSON.stringify({ name, itinerary }),
  });
}

export async function joinTrip(inviteCode: string): Promise<ApiTrip> {
  return request<ApiTrip>('/api/trips/join', {
    method: 'POST',
    body: JSON.stringify({ inviteCode }),
  });
}

export async function fetchMyTrips(): Promise<ApiTrip[]> {
  return request<ApiTrip[]>('/api/trips');
}

export async function updateItinerary(tripId: string, itinerary: IItineraryItem[]): Promise<ApiTrip> {
  return request<ApiTrip>(`/api/trips/${tripId}/itinerary`, {
    method: 'PUT',
    body: JSON.stringify({ itinerary }),
  });
}

export async function deleteTrip(tripId: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/trips/${tripId}`, {
    method: 'DELETE',
  });
}

// ── Photos ────────────────────────────────────────────────────────────────────
/** Fetch ALL photos for a trip, grouped by placeSlug */
export async function fetchAllPhotosGrouped(tripId: string): Promise<Record<string, ApiPhoto[]>> {
  return request<Record<string, ApiPhoto[]>>(`/api/photos/all?tripId=${encodeURIComponent(tripId)}`);
}

/**
 * Step 1: Upload the file directly to the user's own Cloudinary account (browser→Cloudinary).
 * Returns the secure URL of the uploaded image.
 */
export async function uploadToCloudinary(
  file: File,
  cloudName: string,
  uploadPreset: string,
  folderPath: string,
): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', uploadPreset);
  form.append('folder', folderPath);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    let message = 'Cloudinary upload failed';
    try {
      const body = await res.json();
      message = body.error?.message ?? message;
    } catch { /* ignore */ }
    throw new ApiError(res.status, message);
  }

  const data = await res.json();
  return data.secure_url as string;
}

/**
 * Test Cloudinary credentials by attempting a tiny test upload.
 * Throws ApiError if credentials are invalid.
 */
export async function testCloudinaryCredentials(
  cloudName: string,
  uploadPreset: string,
): Promise<void> {
  // Create a minimal 1x1 transparent PNG
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, 1, 1);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/png');
  });

  if (!blob) throw new ApiError(500, 'Could not create test image');

  const file = new File([blob], 'test.png', { type: 'image/png' });

  // Attempt upload
  try {
    await uploadToCloudinary(file, cloudName, uploadPreset, 'scrollbook_test');
  } catch (err) {
    throw err;
  }
}

/**
 * Step 2: Tell our backend about the uploaded photo (URL only — no file sent).
 */
export async function uploadPhoto(
  cloudinaryUrl: string,
  placeSlug: string,
  placeName: string,
  tripId: string,
): Promise<ApiPhoto> {
  return request<ApiPhoto>('/api/photos', {
    method: 'POST',
    body: JSON.stringify({ cloudinaryUrl, placeSlug, placeName, tripId }),
  });
}
