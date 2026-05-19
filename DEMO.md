# CloudPaste Live Demo Script

Target duration: under 8 minutes.

## 1. Start all containers

Command:

```powershell
Copy-Item .env.example .env -Force
docker compose up --build -d
docker compose ps
```

What the grader should see:

- Four services: `reverse-proxy`, `frontend`, `api`, and `db`.
- Only `cloudpaste_reverse_proxy` has `0.0.0.0:80->80/tcp` published.
- `cloudpaste_api` shows `Up` and eventually `healthy`.
- `cloudpaste_db` shows `Up` and eventually `healthy`.

Open the app:

```powershell
start http://localhost
```

What the grader should see:

- The CloudPaste create page with textarea, language selector, optional password, expiry selector, and Create paste button.

## 2. Create a plain text note and share the link

Command:

```powershell
$plain = Invoke-RestMethod -Method Post -Uri http://localhost/api/notes -ContentType 'application/json' -Body (@{
  content = 'CloudPaste demo note: this text survives container restarts.'
  language = 'plaintext'
  expiry = 'never'
} | ConvertTo-Json)
$plainUrl = "http://localhost/notes/$($plain.id)"
$plainUrl
start $plainUrl
```

What the grader should see:

- Terminal prints a shareable URL like `http://localhost/notes/<uuid>`.
- Browser opens the paste view.
- The note content is visible without a password prompt.
- The Copy link button is visible.

## 3. Create a password-protected note and verify access control

Command:

```powershell
$secret = Invoke-RestMethod -Method Post -Uri http://localhost/api/notes -ContentType 'application/json' -Body (@{
  content = 'Secret CloudPaste note for the password demo.'
  language = 'plaintext'
  password = 'class-demo'
  expiry = 'never'
} | ConvertTo-Json)
$secretUrl = "http://localhost/notes/$($secret.id)"
$secretUrl
curl.exe -i http://localhost/api/notes/$($secret.id)
curl.exe -i -H "x-note-password: wrong" http://localhost/api/notes/$($secret.id)
curl.exe -i -H "x-note-password: class-demo" http://localhost/api/notes/$($secret.id)
start $secretUrl
```

What the grader should see:

- First `curl` returns `HTTP/1.1 401 Unauthorized` with `Password required`.
- Second `curl` returns `HTTP/1.1 401 Unauthorized` with `Wrong password`.
- Third `curl` returns `HTTP/1.1 200 OK` and the secret note JSON.
- Browser opens a password prompt first; entering `class-demo` reveals the paste.

## 4. Demonstrate high availability with API restart

Command:

```powershell
# Kill the Node.js process inside the container (PID 1), which Docker treats as a crash and triggers the restart policy.
docker exec cloudpaste_api kill -9 1
Start-Sleep -Seconds 8
docker compose ps api
curl.exe -i http://localhost/api/health
```

What the grader should see:

- Killing PID 1 crashes the API process inside the container.
- Docker Compose shows `cloudpaste_api` back `Up` because `restart: always` restarted it.
- API status returns healthy after the healthcheck has time to pass.
- `curl` returns `HTTP/1.1 200 OK` and `{ "status": "ok" }`.

## 5. Demonstrate PostgreSQL data persistence

Command:

```powershell
docker compose stop db
docker compose start db
Start-Sleep -Seconds 10
curl.exe -i http://localhost/api/notes/$($plain.id)
start $plainUrl
```

What the grader should see:

- The database container stops and starts again.
- The previous plain text note is still returned with `HTTP/1.1 200 OK`.
- Browser still shows the same note content.
- This demonstrates that data survived because PostgreSQL stores files in the named `cloudpaste_postgres_data` volume.

Cleanup after demo:

```powershell
docker compose down
```

Keep the volume for persistence evidence. If you need a completely fresh database later, run:

```powershell
docker compose down -v
```
