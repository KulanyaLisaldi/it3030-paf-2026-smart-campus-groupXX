const AUTH_TOKEN_KEY = "smartCampusAuthToken";

export function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

async function request(path, options) {
  const headers = { ...(options.headers || {}) };
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers });

  const contentType = res.headers.get("content-type") || "";
  let payload = null;

  if (contentType.includes("application/json")) {
    payload = await res.json().catch(() => null);
  } else {
    payload = await res.text().catch(() => null);
  }

  if (!res.ok) {
    const messageFromJson = payload && typeof payload === "object" ? payload.message : "";
    const messageFromText = typeof payload === "string" ? payload : "";
    let message = messageFromJson || messageFromText;
    if (!message) {
      if (res.status === 404) {
        message = `${options.method} ${path} failed: 404`;
      } else if (res.status === 401) {
        message = `${options.method} ${path} failed: 401`;
      } else if (res.status === 403) {
        message = `${options.method} ${path} failed: 403`;
      } else {
        message = `${options.method} ${path} failed: ${res.status}`;
      }
    }
    const err = new Error(message);
    err.status = res.status;
    err.path = path;
    err.method = options.method;
    throw err;
  }

  return payload;
}

export async function apiGet(path, extraOptions = {}) {
  return request(path, { method: "GET", ...extraOptions });
}

export async function apiPost(path, body) {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiPut(path, body) {
  if (body instanceof FormData) {
    return request(path, {
      method: "PUT",
      body,
    });
  }
  return request(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiPatch(path, body) {
  return request(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiDelete(path) {
  return request(path, { method: "DELETE" });
}

export async function apiPostFormData(path, formData) {
  return request(path, {
    method: "POST",
    body: formData,
  });
}