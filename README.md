# canstem-ai-tutor-web

Voice-first AI Tutor web app for CanSTEM students (testing scaffold).
This repo contains the frontend (Next.js) UI: login page, student dashboard, course tutor page, and admin pages.

> Note: This version runs fully in "mock mode" (no real OpenAI calls).  
> Later, you’ll connect it to `canstem-ai-tutor-api` and enable real AI + RAG.

---

## Tech Stack
- Next.js (App Router)
- React
- Mobile-first UI (voice-first tutor experience)
- Works with backend: `canstem-ai-tutor-api`

---

## Features (Scaffold)
- Auth pages (UI scaffold)
- Student dashboard (course cards)
- Tutor page
  - Voice UI (mic button + transcript + send)
  - Chat UI (messages)
  - Auto-read answer toggle (browser TTS)
- Admin pages scaffold (courses/uploads/users)

---

## Project Structure