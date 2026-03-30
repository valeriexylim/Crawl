# Crawl

YouTube comment analyzer for content creators. Paste a video URL and get AI-powered insights into what your audience is actually saying — themes, sentiment, recurring feedback, and engagement patterns.

## What it does

- Fetches up to 100 top-level comments from any public YouTube video
- Analyzes them with Gemini AI to surface the top 5 audience insights — specific opinions, requests, and reactions rather than generic positive/negative labels
- Shows overall sentiment tone and recurring feedback themes
- Visualizes engagement peaks and drop-offs inferred from timestamps mentioned in comments
- Exports results as PDF or CSV

## Who it's for

YouTube creators who want to understand their audience without reading every comment manually.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Tailwind CSS 4, Recharts, Motion |
| Backend | Node.js, Express |
| AI | Google Gemini (`gemini-3.1-pro-preview`) |
| Data | YouTube Data API v3 |
| Build | Vite 6, TypeScript |

## Running locally

**Prerequisites:** Node.js 18+, a Gemini API key, a YouTube Data API key

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the example env file and fill in your keys:
   ```bash
   cp .env.example .env.local
   ```

   | Variable | Where to get it |
   |----------|----------------|
   | `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) |
   | `YOUTUBE_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/apis/library/youtube.googleapis.com) |
   | `APP_URL` | Optional — your deployment URL |

3. Start the dev server:
   ```bash
   npm run dev
   ```
   App runs at `http://localhost:3000`.

## Project structure

```
├── server.ts                       # Express server — YouTube comment proxy + static serving
├── src/
│   ├── App.tsx                     # Main UI — input, results dashboard, PDF/CSV export
│   ├── analysis/
│   │   └── commentAnalysis.ts      # Gemini prompt, response schema, and domain types
│   └── lib/
│       └── utils.ts                # Tailwind class merge utility
└── vite.config.ts
```

## Design decisions

**Comment fetching is proxied through the Express server.** The YouTube Data API key stays server-side; the frontend only calls `/api/comments`. This avoids exposing credentials in the browser bundle.

**AI analysis runs client-side via the Gemini SDK.** The `GEMINI_API_KEY` is injected at build time by Vite and used directly from the browser. This trades key exposure for simpler architecture — acceptable for a single-user or self-hosted tool, worth revisiting for a multi-tenant deployment.

**Structured JSON output is enforced via Gemini's response schema.** Rather than parsing free-text AI output, the prompt requests a typed JSON object and the schema is passed directly to the model config. This eliminates a class of parsing errors and makes the response shape predictable.

**Engagement timeline is inferred, not measured.** The app has no access to YouTube's actual retention analytics. The timeline is derived from timestamps that viewers mention in comments — a signal, not a precise metric. The UI labels these as "inferred" accordingly.

**100-comment limit is a single-request constraint.** The YouTube Data API returns at most 100 results per `commentThreads` call. Pagination is not implemented; the analysis reflects the top 100 comments as ranked by the API's default sort.
