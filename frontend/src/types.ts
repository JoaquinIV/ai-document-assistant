export interface User {
  id: string;
  email: string;
}

export type DocumentStatus = "processing" | "ready" | "failed";

export interface AppDocument {
  id: string;
  filename: string;
  status: DocumentStatus;
  createdAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  // Present only on freshly-received assistant answers (not on history replay),
  // since the backend only computes these at answer time.
  citedExcerpts?: number[];
  lowConfidence?: boolean;
}
