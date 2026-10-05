# Frontend — AI Document Assistant

React + TypeScript + Vite. Talks to the backend in `../backend`.

## Structure

```
src/
  api/client.ts         Typed fetch wrapper (auth header injection, error normalization)
  auth/AuthContext.tsx   Login/register/logout, token persisted in localStorage
  auth/RequireAuth.tsx   Route guard, redirects to /login if unauthenticated
  pages/AuthPage.tsx      Login / sign up
  pages/DocumentsPage.tsx "Input" page — upload a document, see your document list
  pages/ChatPage.tsx      "Results" page — ask questions about one document, see history
  types.ts
```

## AI-aware UX decisions

- **Model status is explicit**: while `/api/chat/ask` is in flight, a dedicated
  "Thinking…" bubble is shown (not just a disabled button) so the user knows the
  assistant is actually working, not stalled.
- **Re-ask / refine**: on a failed ask, the question is restored to the input instead of
  being lost, so the user can tweak and resubmit without retyping.
- **Uncertainty is visually distinct**: answers the backend flags as `lowConfidence`
  (e.g. "I don't have enough information…") render with a warning note and muted style,
  instead of looking as authoritative as a grounded answer.
- **Citations**: every answer shows which retrieved excerpt(s) it's based on
  ("Sources: Excerpt 0, 2"), so the user can verify a claim rather than trust it blindly.
- **Loading / error / empty states** are handled distinctly on both pages: a documents
  list that's loading looks different from one that errored, which looks different from
  one that's genuinely empty — same pattern on the chat history.

## Run locally

```bash
cp .env.example .env     # VITE_API_URL, defaults to http://localhost:3000
npm install
npm run dev
```

Requires the backend (see `../backend/README` section in the repo root `README.md`)
running and reachable at `VITE_API_URL`.

## Build

```bash
npm run build   # type-checks (tsc -b) then builds with Vite into dist/
```
