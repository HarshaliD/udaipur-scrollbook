/**
 * test-endpoints.mjs
 *
 * Manual end-to-end verification script for the Udaipur Scrollbook backend.
 * Walks through the full happy-path:
 *
 *   Step 1  – Health check  (GET  /api/test/health)
 *   Step 2  – Dev login     (POST /api/test/auth)      → JWT
 *   Step 3  – Upload photo  (POST /api/photos)          → Cloudinary URL + DB record
 *   Step 4  – Fetch all     (GET  /api/photos/all)      → map contains new entry
 *   Step 5  – Fetch by slug (GET  /api/photos?placeSlug=city-palace) → list not empty
 *
 * Run with:  node scripts/test-endpoints.mjs
 * Requires:  Node 18+ (uses built-in fetch + FormData), backend running on :5000
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Blob } from 'node:buffer';

const BASE  = 'http://localhost:5000';
const BOLD  = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED   = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN  = '\x1b[36m';
const RESET = '\x1b[0m';

// ── helpers ───────────────────────────────────────────────────────────────────

let passCount = 0;
let failCount = 0;

function log(label, msg) {
  console.log(`${CYAN}[${label}]${RESET} ${msg}`);
}

function pass(label, msg) {
  passCount++;
  console.log(`${GREEN}✔ ${BOLD}${label}${RESET}${GREEN} — ${msg}${RESET}`);
}

function fail(label, msg) {
  failCount++;
  console.error(`${RED}✘ ${BOLD}${label}${RESET}${RED} — ${msg}${RESET}`);
}

function header(title) {
  console.log(`\n${YELLOW}${'─'.repeat(60)}${RESET}`);
  console.log(`${BOLD}${YELLOW}  ${title}${RESET}`);
  console.log(`${YELLOW}${'─'.repeat(60)}${RESET}`);
}

async function apiGet(path, token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${BASE}${path}`, { headers });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function apiPost(path, payload, token) {
  const isForm = payload instanceof FormData;
  const headers = {};
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (token)   headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers,
    body: isForm ? payload : JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

// ── Step 1: Health check ──────────────────────────────────────────────────────

async function step1_health() {
  header('STEP 1 — Health Check  /api/test/health');
  try {
    const { status, body } = await apiGet('/api/test/health');
    log('health', `HTTP ${status} → ${JSON.stringify(body, null, 2)}`);

    if (status !== 200) { fail('health', `Expected 200, got ${status}`); return false; }
    if (!body.database?.ready) { fail('db-ready', `MongoDB not connected: state="${body.database?.state}"`); return false; }
    if (!body.cloudinary?.configured) { fail('cloudinary-config', 'Cloudinary env vars missing'); return false; }

    pass('health', 'Server is up');
    pass('db-ready', `MongoDB state: ${body.database.state}`);
    pass('cloudinary-config', 'Cloudinary credentials present');
    return true;
  } catch (err) {
    fail('health', `Network error — is the backend running on :5000? (${err.message})`);
    return false;
  }
}

// ── Step 2: Dev login ─────────────────────────────────────────────────────────

async function step2_auth() {
  header('STEP 2 — Dev Auth  POST /api/test/auth');
  try {
    const { status, body } = await apiPost('/api/test/auth', {});
    log('auth', `HTTP ${status} → user: ${JSON.stringify(body?.user)}`);

    if (status !== 200)  { fail('auth-status', `Expected 200, got ${status} — ${body?.error}`); return null; }
    if (!body?.token)    { fail('auth-token',  'No token in response'); return null; }
    if (!body?.user?.id) { fail('auth-user',   'No user.id in response'); return null; }

    pass('auth-status', `HTTP 200`);
    pass('auth-token',  `JWT received (${body.token.length} chars)`);
    pass('auth-user',   `User: "${body.user.name}" <${body.user.email}>`);
    return body.token;
  } catch (err) {
    fail('auth', `Request failed: ${err.message}`);
    return null;
  }
}

// ── Step 3: Upload a photo ────────────────────────────────────────────────────

async function step3_upload(token) {
  header('STEP 3 — Upload Photo  POST /api/photos');

  // Fetch a small public test image (Picsum 300×200)
  const testImageUrl = 'https://picsum.photos/300/200';
  let imageBlob;

  try {
    log('upload-fetch', `Fetching test image from ${testImageUrl} …`);
    const imgRes = await fetch(testImageUrl);
    if (!imgRes.ok) { fail('upload-fetch', `Could not fetch test image (${imgRes.status})`); return null; }
    const buf = await imgRes.arrayBuffer();
    imageBlob = new Blob([buf], { type: 'image/jpeg' });
    log('upload-fetch', `Image ready, size: ${imageBlob.size} bytes`);
  } catch (err) {
    fail('upload-fetch', `Image fetch failed: ${err.message}`);
    return null;
  }

  try {
    const form = new FormData();
    form.append('file', imageBlob, 'test-photo.jpg');
    form.append('placeSlug', 'city-palace');
    form.append('placeName', 'City Palace');

    log('upload-post', 'POSTing to /api/photos …');
    const { status, body } = await apiPost('/api/photos', form, token);
    log('upload-post', `HTTP ${status} → ${JSON.stringify(body, null, 2)}`);

    if (status !== 201) { fail('upload-status', `Expected 201, got ${status} — ${body?.error}`); return null; }
    if (!body?.cloudinaryUrl) { fail('upload-url', 'No cloudinaryUrl in response'); return null; }
    if (!body?._id)           { fail('upload-id',  'No _id (MongoDB) in response');  return null; }

    pass('upload-status', `HTTP 201`);
    pass('upload-url',    `Cloudinary URL: ${body.cloudinaryUrl}`);
    pass('upload-id',     `MongoDB _id: ${body._id}`);
    return body;
  } catch (err) {
    fail('upload', `Request failed: ${err.message}`);
    return null;
  }
}

// ── Step 4: Fetch all photos grouped ─────────────────────────────────────────

async function step4_fetchAll(uploadedPhoto) {
  header('STEP 4 — Fetch All Photos  GET /api/photos/all');
  try {
    const { status, body } = await apiGet('/api/photos/all');
    log('fetch-all', `HTTP ${status} → keys: [${Object.keys(body ?? {}).join(', ')}]`);

    if (status !== 200) { fail('fetch-all-status', `Expected 200, got ${status}`); return false; }

    const slugKey = uploadedPhoto?.placeSlug ?? 'city-palace';
    const urls    = body?.[slugKey];

    if (!Array.isArray(urls) || urls.length === 0) {
      fail('fetch-all-entry', `Expected "${slugKey}" key with URLs in response`);
      return false;
    }

    const found = urls.includes(uploadedPhoto?.cloudinaryUrl);
    pass('fetch-all-status', `HTTP 200`);
    pass('fetch-all-entry',  `"${slugKey}" → ${urls.length} photo(s) returned`);
    if (found) {
      pass('fetch-all-match', 'Uploaded URL is present in /all response ✓');
    } else {
      fail('fetch-all-match', 'Uploaded URL NOT found in /all response');
    }
    return true;
  } catch (err) {
    fail('fetch-all', `Request failed: ${err.message}`);
    return false;
  }
}

// ── Step 5: Fetch by slug ─────────────────────────────────────────────────────

async function step5_fetchBySlug(uploadedPhoto) {
  const slug = uploadedPhoto?.placeSlug ?? 'city-palace';
  header(`STEP 5 — Fetch By Slug  GET /api/photos?placeSlug=${slug}`);
  try {
    const { status, body } = await apiGet(`/api/photos?placeSlug=${slug}`);
    log('fetch-slug', `HTTP ${status} → ${Array.isArray(body) ? body.length : '?'} records`);

    if (status !== 200)         { fail('fetch-slug-status', `Expected 200, got ${status}`); return false; }
    if (!Array.isArray(body))   { fail('fetch-slug-type',   'Response is not an array'); return false; }
    if (body.length === 0)      { fail('fetch-slug-empty',  'Array is empty'); return false; }

    const found = body.some((p) => p.cloudinaryUrl === uploadedPhoto?.cloudinaryUrl);

    pass('fetch-slug-status', `HTTP 200`);
    pass('fetch-slug-count',  `${body.length} photo(s) for "${slug}"`);
    if (found) {
      pass('fetch-slug-match', 'Uploaded photo found in slug query ✓');
    } else {
      fail('fetch-slug-match', 'Uploaded photo NOT found in slug query');
    }
    return true;
  } catch (err) {
    fail('fetch-slug', `Request failed: ${err.message}`);
    return false;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${BOLD}Udaipur Scrollbook — Backend E2E Test Script${RESET}`);
  console.log(`Target: ${CYAN}${BASE}${RESET}   Node: ${process.version}\n`);

  const healthOk = await step1_health();
  if (!healthOk) {
    console.log(`\n${RED}${BOLD}Aborted — fix health issues first.${RESET}\n`);
    process.exit(1);
  }

  const token = await step2_auth();
  if (!token) {
    console.log(`\n${RED}${BOLD}Aborted — auth failed.${RESET}\n`);
    process.exit(1);
  }

  const uploadedPhoto = await step3_upload(token);
  if (!uploadedPhoto) {
    console.log(`\n${RED}${BOLD}Aborted — upload failed.${RESET}\n`);
    process.exit(1);
  }

  await step4_fetchAll(uploadedPhoto);
  await step5_fetchBySlug(uploadedPhoto);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n${YELLOW}${'═'.repeat(60)}${RESET}`);
  console.log(`${BOLD}  TEST SUMMARY${RESET}`);
  console.log(`${GREEN}  ✔ Passed: ${passCount}${RESET}`);
  if (failCount > 0) {
    console.log(`${RED}  ✘ Failed: ${failCount}${RESET}`);
  } else {
    console.log(`  ✘ Failed: ${failCount}`);
  }
  console.log(`${YELLOW}${'═'.repeat(60)}${RESET}\n`);

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`${RED}Unexpected error:${RESET}`, err);
  process.exit(1);
});
