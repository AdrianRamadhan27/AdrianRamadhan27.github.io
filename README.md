# Adrian Ramadhan — Portfolio

A 3D interactive portfolio (React + Three.js) with a Supabase-backed CMS and
an in-browser AI chatbot rendered onto the desktop monitor's screen.

## Stack

- React 18 + TypeScript + Vite
- `@react-three/fiber` / `@react-three/drei` / `three` for the 3D scene
- Tailwind CSS
- Supabase (Postgres + Auth + Storage + Edge Functions) for content and the chatbot
- Deployed to GitHub Pages via GitHub Actions

## Local development

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY once you have a project
npm run dev
```

Without Supabase configured, the site still runs — every section falls back
to the bundled default content in `src/constants/`.

## Supabase setup (one-time)

1. Create a project at supabase.com.
2. **Authentication → Providers → Email → turn OFF "Allow new users to sign
   up."** Do this before anything else — it's what keeps the CMS single-user.
3. **Authentication → Users → Add user** — create your own login manually.
4. **SQL Editor** → paste and run `supabase/schema.sql`.
5. **Storage** → create a bucket named `public-assets`, public read.
6. Install the Supabase CLI, then from the repo root:
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase functions deploy chat
   supabase functions deploy models
   supabase functions deploy save-chat-key
   ```
7. Project Settings → API → copy the Project URL and `anon public` key into
   `.env` (and into the `SUPABASE_URL` / `SUPABASE_ANON_KEY` GitHub Actions
   secrets for deployment).

## Editing content

Click the footer copyright text **5 times within 2 seconds** to open
`/#/admin`. Log in with the user created above to edit your profile, photo,
CV, experience, projects, skills, social links, and the chatbot's provider,
model, and system prompt.

## Chatbot

Any OpenAI-compatible provider works (Groq, OpenAI, OpenRouter, DeepSeek,
Together, local Ollama, …) — set its base URL and API key in the CMS, click
"Refresh models" to populate the model dropdown from that provider's
`/models` endpoint, then pick one. The API key is never sent to the browser;
`supabase/functions/chat` proxies the request server-side.

## Deployment

Push to `main` — `.github/workflows/deploy.yml` builds and publishes to the
`gh-pages` branch. Required repo secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
and (optional, for the contact form) `EMAILJS_SERVICE_ID`,
`EMAILJS_TEMPLATE_ID`, `EMAILJS_ACCESS_TOKEN`.

`.github/workflows/keepalive.yml` pings the Supabase REST endpoint daily so
the free-tier project doesn't pause from inactivity.
