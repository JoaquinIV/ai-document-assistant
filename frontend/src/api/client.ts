const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  // Don't force Content-Type when sending FormData — the browser needs to
  // set its own multipart boundary.
  if (!(options.body instanceof FormData) && options.body) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection and try again.",
      0
    );
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // response had no JSON body; keep the generic message
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  register: (email: string, password: string) =>
    request<{ token: string; user: { id: string; email: string } }>(
      "/api/auth/register",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),

  login: (email: string, password: string) =>
    request<{ token: string; user: { id: string; email: string } }>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),

  listDocuments: () =>
    request<{ documents: import("../types").AppDocument[] }>(
      "/api/documents"
    ),

  uploadDocument: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{ document: import("../types").AppDocument }>(
      "/api/documents",
      { method: "POST", body: formData }
    );
  },

  askQuestion: (documentId: string, question: string) =>
    request<{
      answer: string;
      citedExcerpts: number[];
      lowConfidence: boolean;
      tokensUsed: number;
      model: string;
    }>("/api/chat/ask", {
      method: "POST",
      body: JSON.stringify({ documentId, question }),
    }),

  getHistory: (documentId: string) =>
    request<{
      messages: { role: "user" | "assistant"; content: string; created_at: string }[];
    }>(`/api/chat/${documentId}/history`),
};
