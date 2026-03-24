import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://liveclick-ai-production.up.railway.app';

const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: false,
});

// Return data directly so callers can do `res.users` instead of `res.data.users`
axiosInstance.interceptors.response.use((response) => response.data);

export const api = axiosInstance as unknown as {
  get: (url: string, config?: object) => Promise<any>;
  post: (url: string, data?: unknown, config?: object) => Promise<any>;
  put: (url: string, data?: unknown, config?: object) => Promise<any>;
  delete: (url: string, config?: object) => Promise<any>;
};

export async function uploadTrack(file: File, token: string) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_URL}/api/v1/jobs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getJobs(token: string) {
  const res = await fetch(`${API_URL}/api/v1/jobs`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getJob(jobId: string, token: string) {
  const res = await fetch(`${API_URL}/api/v1/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function createSSEConnection(
  jobId: string,
  token: string,
  onProgress: (data: Record<string, unknown>) => void
) {
  const url = `${API_URL}/api/v1/sse/jobs/${jobId}?token=${token}`
  const es = new EventSource(url)
  es.onmessage = (e) => {
    try { onProgress(JSON.parse(e.data)) } catch {}
  }
  es.onerror = () => es.close()
  return es
}
