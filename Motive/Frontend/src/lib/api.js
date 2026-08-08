// Central place for the backend base URL so every page hits the same API.
// Set VITE_API_BASE_URL in a .env file (see .env.example) to point at your
// deployed FastAPI backend; falls back to localhost for local dev.

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const WS_BASE = API_BASE.replace(/^http/, 'ws');

async function handle(res) {
  if (!res.ok) {
    let detail = res.statusText;
    try { detail = (await res.json()).detail || detail; } catch { /* ignore */ }
    throw new Error(detail);
  }
  return res.json();
}

export const api = {
  chat: (message, sessionId, imageBase64 = null, mimeType = 'image/jpeg') =>
    fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, session_id: sessionId, image_base64: imageBase64, mime_type: mimeType }),
    }).then(handle),

  submitCrimeRecord: (record) =>
    fetch(`${API_BASE}/crime-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    }).then(handle),

  listCases: (limit = 30) =>
    fetch(`${API_BASE}/cases?limit=${limit}`).then(handle),

  getCaseReport: (caseId) =>
    fetch(`${API_BASE}/cases/${caseId}/report`).then(handle),
};

// Reads a browser File as a bare base64 string (no `data:...;base64,` prefix)
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
