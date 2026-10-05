import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { ChatMessage } from "../types";

type HistoryState = "loading" | "error" | "ready";

export function ChatPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyState, setHistoryState] = useState<HistoryState>("loading");
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadHistory() {
    if (!documentId) return;
    setHistoryState("loading");
    try {
      const { messages } = await api.getHistory(documentId);
      setMessages(
        messages.map((m) => ({ role: m.role, content: m.content, createdAt: m.created_at }))
      );
      setHistoryState("ready");
    } catch (err) {
      setHistoryError(
        err instanceof ApiError ? err.message : "Failed to load conversation history."
      );
      setHistoryState("error");
    }
  }

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, asking]);

  async function handleAsk(e: FormEvent) {
    e.preventDefault();
    if (!question.trim() || !documentId) return;

    const asked = question.trim();
    setAskError(null);
    setAsking(true);
    // Optimistically show the user's turn immediately; the question stays in
    // the input (not cleared) until we know whether it succeeded, so a
    // failed request doesn't make the user retype it.
    setMessages((prev) => [...prev, { role: "user", content: asked }]);

    try {
      const result = await api.askQuestion(documentId, asked);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.answer,
          citedExcerpts: result.citedExcerpts,
          lowConfidence: result.lowConfidence,
        },
      ]);
      setQuestion("");
    } catch (err) {
      // Roll back the optimistic user message so the thread doesn't show an
      // unanswered question hanging forever.
      setMessages((prev) => prev.slice(0, -1));
      setAskError(
        err instanceof ApiError ? err.message : "Something went wrong answering that."
      );
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="page chat-page">
      <header className="page-header">
        <Link to="/documents" className="back-link">← Documents</Link>
      </header>

      <div className="chat-thread">
        {historyState === "loading" && <p className="muted">Loading conversation…</p>}

        {historyState === "error" && (
          <div className="empty-state error-state">
            <p>{historyError}</p>
            <button onClick={loadHistory}>Retry</button>
          </div>
        )}

        {historyState === "ready" && messages.length === 0 && (
          <div className="empty-state">
            <p>No questions yet. Ask anything about this document below.</p>
          </div>
        )}

        {historyState === "ready" &&
          messages.map((m, i) => (
            <div key={i} className={`chat-bubble chat-${m.role}`}>
              <div className="chat-bubble-label">
                {m.role === "user" ? "You" : "Assistant"}
              </div>
              <p className={m.lowConfidence ? "low-confidence" : undefined}>
                {m.content}
              </p>
              {m.lowConfidence && (
                <p className="low-confidence-note">
                  ⚠ The assistant isn't confident this is fully supported by the document.
                </p>
              )}
              {!!m.citedExcerpts?.length && (
                <p className="citations">
                  Sources: {m.citedExcerpts.map((n) => `Excerpt ${n}`).join(", ")}
                </p>
              )}
            </div>
          ))}

        {asking && (
          <div className="chat-bubble chat-assistant chat-thinking">
            <div className="chat-bubble-label">Assistant</div>
            <p className="thinking-indicator">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
              Thinking…
            </p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <form className="ask-form" onSubmit={handleAsk}>
        <input
          type="text"
          placeholder="Ask a question about this document…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={asking}
          maxLength={2000}
        />
        <button type="submit" disabled={asking || !question.trim()}>
          {asking ? "Asking…" : "Ask"}
        </button>
      </form>
      {askError && <p className="form-error" role="alert">{askError}</p>}
    </div>
  );
}
