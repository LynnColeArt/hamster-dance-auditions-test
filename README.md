# Hamster Dance Auditions

Built by Fleet Kitty per issue tickets on LynnColeArt/fleet-kitty (2026-11-09).

## Stack

- **Client:** React 19 + TypeScript, built and served in development by Vite.
- **Server:** Node.js/Express with SQLite through Node's built-in `node:sqlite`.
  Run the server on Node.js 24 or newer.
- **Database:** a single `auditions` table. By default the API creates and opens
  `auditions.sqlite3` in the working directory; set `DATABASE_PATH` to use a
  different file.

## Run

1. Install dependencies: `npm install`
2. Start the API: `npm run server`
3. In a second terminal, start the client: `npm run dev`
4. Open the Vite URL, normally `http://localhost:5173`

Vite proxies `/api` to the API server on `127.0.0.1:4000`.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/healthz` | Readiness check |
| `GET` | `/api/auditions` | List auditions; use `?status=posted` to filter |
| `POST` | `/api/auditions` | Create an audition |
| `GET` | `/api/auditions/:id` | Read one audition |
| `PATCH` | `/api/auditions/:id` | Update fields or transition status |
| `POST` | `/api/auditions/:id/post` | Post an audition; only from `scheduled` |
| `DELETE` | `/api/auditions/:id` | Delete an audition |

Create payload fields: `hamster_name`, `dance_style`, `scheduled_at`, and an
optional `status` that defaults to `draft`. Allowed statuses are `draft`,
`scheduled`, and `posted`.

## End-to-end check

Run this against a server started with `npm run server`:

```sh
curl -d '{"hamster_name":"Pickle","dance_style":"moonwalk","scheduled_at":"2026-11-09T15:00:00Z"}' \
  -H 'content-type: application/json' \
  http://127.0.0.1:4000/api/auditions

curl http://127.0.0.1:4000/api/auditions
```

The public, read-only audition list is available at `http://localhost:5173/auditions`
in development.
