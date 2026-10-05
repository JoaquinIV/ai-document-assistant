import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { AppDocument } from "../types";
import { useAuth } from "../auth/AuthContext";

type LoadState = "loading" | "error" | "ready";

export function DocumentsPage() {
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function fetchDocuments() {
    setLoadState("loading");
    try {
      const { documents } = await api.listDocuments();
      setDocuments(documents);
      setLoadState("ready");
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Failed to load documents.");
      setLoadState("error");
    }
  }

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const { document } = await api.uploadDocument(file);
      setDocuments((prev) => [document, ...prev]);
      setFile(null);
    } catch (err) {
      setUploadError(
        err instanceof ApiError ? err.message : "Upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Your documents</h1>
          <p className="muted">Upload a document, then ask questions about it.</p>
        </div>
        <div className="header-actions">
          <span className="muted">{user?.email}</span>
          <button className="link-button" onClick={logout}>Log out</button>
        </div>
      </header>

      <form className="upload-card" onSubmit={handleUpload}>
        <input
          type="file"
          accept=".pdf,.txt,application/pdf,text/plain"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button type="submit" disabled={!file || uploading}>
          {uploading ? "Uploading & processing…" : "Upload"}
        </button>
        {uploadError && <p className="form-error" role="alert">{uploadError}</p>}
        <p className="hint">PDF or plain text, up to 10MB.</p>
      </form>

      {loadState === "loading" && <p className="muted">Loading documents…</p>}

      {loadState === "error" && (
        <div className="empty-state error-state">
          <p>{loadError}</p>
          <button onClick={fetchDocuments}>Retry</button>
        </div>
      )}

      {loadState === "ready" && documents.length === 0 && (
        <div className="empty-state">
          <p>No documents yet. Upload one above to get started.</p>
        </div>
      )}

      {loadState === "ready" && documents.length > 0 && (
        <ul className="document-list">
          {documents.map((doc) => (
            <li key={doc.id} className="document-row">
              <div>
                <strong>{doc.filename}</strong>
                <span className={`status-badge status-${doc.status}`}>
                  {statusLabel(doc.status)}
                </span>
              </div>
              <button
                disabled={doc.status !== "ready"}
                onClick={() => navigate(`/documents/${doc.id}`)}
                title={doc.status !== "ready" ? "Document is still processing" : undefined}
              >
                {doc.status === "ready" ? "Ask questions →" : statusLabel(doc.status)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function statusLabel(status: AppDocument["status"]): string {
  switch (status) {
    case "processing":
      return "Processing…";
    case "ready":
      return "Ready";
    case "failed":
      return "Failed to process";
  }
}
