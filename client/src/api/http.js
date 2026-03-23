async function request(path, options) {
  const res = await fetch(path, options);

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
    const message = messageFromJson || messageFromText || `${options.method} ${path} failed: ${res.status}`;
    throw new Error(message);
  }

  return payload;
}

export async function apiGet(path) {
  return request(path, { method: "GET" });
}

export async function apiPost(path, body) {
  return request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function apiPostFormData(path, formData) {
  return request(path, {
    method: "POST",
    body: formData,
  });
}