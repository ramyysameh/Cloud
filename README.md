# CloudPaste

CloudPaste is a self-hosted collaborative note and code-snippet sharing app. It runs as four containers managed by Docker Compose:

- `reverse-proxy`: public Nginx entrypoint on host port `80`
- `frontend`: Nginx serving static HTML/CSS/JS
- `api`: Node.js/Express application service
- `db`: PostgreSQL data service with persistent storage

The reverse proxy and application-facing services communicate through the custom bridge network `pastenet`. PostgreSQL is isolated on the internal `cloudpaste_dbnet` bridge with only the API attached, because Docker does not provide per-container access control when every service shares the same bridge network.

## Project Structure

```text
Cloud/
├── reverse-proxy/
│   ├── Dockerfile        # Builds the public Nginx reverse proxy container.
│   └── nginx.conf        # Routes /api/ to api:3000 and all other traffic to frontend:80.
├── frontend/
│   ├── Dockerfile        # Builds the static Nginx frontend container.
│   ├── nginx.conf        # Serves the SPA and falls back to index.html for shared links.
│   ├── index.html        # CloudPaste browser UI.
│   ├── styles.css        # Mobile-friendly Pastebin/Gist-inspired styling.
│   └── app.js            # Frontend view switching and /api calls.
├── api/
│   ├── Dockerfile        # Builds the Node.js/Express API container.
│   ├── package.json      # API dependencies and scripts.
│   └── src/
│       ├── db.js         # PostgreSQL connection pool using Docker hostname db.
│       ├── expiry.js     # Expiry parsing helpers.
│       └── server.js     # Express routes: /health, /notes, /notes/:id.
├── database/
│   ├── Dockerfile        # Extends official postgres image and installs init.sql.
│   └── init.sql          # Creates the notes table and required indexes.
├── docker-compose.yml    # Four-service Docker Compose deployment.
├── .env.example          # Template for secrets and environment-specific values.
└── DEMO.md               # Live presentation script.
```

## Run Locally

1. Create the environment file:

```powershell
Copy-Item .env.example .env
```

2. Start all containers:

```powershell
docker compose up --build -d
```

3. Open the app:

```powershell
start http://localhost
```

4. Check service status:

```powershell
docker compose ps
```

## API Endpoints

- `GET /api/health`: reverse-proxied to API `/health`, returns `{ "status": "ok" }`
- `POST /api/notes`: creates a paste
- `GET /api/notes/:id`: fetches a paste; send password as `x-note-password` when required

## Network And Persistence Notes

- Only `reverse-proxy` publishes a host port: `80:80`.
- `frontend` and `api` are only exposed inside Docker networks.
- `db` is not attached to `pastenet`; it is attached only to internal `cloudpaste_dbnet`, shared with `api`.
- API-to-database traffic uses Docker DNS hostname `db`, never a hardcoded IP.
- PostgreSQL data is stored in the named volume `cloudpaste_postgres_data`.

## Development Notes

The frontend intentionally calls relative URLs such as `/api/notes`. The reverse proxy strips `/api/` and forwards the request to `api:3000`, so the API receives `/notes` and `/health` exactly as implemented.