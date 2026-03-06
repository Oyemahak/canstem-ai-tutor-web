const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
    credentials: "include", // ✅ important (httpOnly auth cookie)
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export async function apiForm(path, formData, options = {}) {
  return apiFetch(path, {
    method: "POST",
    body: formData,
    ...options,
  });
}