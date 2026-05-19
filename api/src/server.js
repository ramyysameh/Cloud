import bcrypt from 'bcrypt';
import cors from 'cors';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool, closePool } from './db.js';
import { normalizeLanguage, parseExpiry } from './expiry.js';

const app = express();
const port = Number(process.env.PORT || 3000);
const bcryptRounds = Number(process.env.BCRYPT_ROUNDS || 12);
const corsOrigin = process.env.CORS_ORIGIN || '*';

app.set('trust proxy', true);
app.use(cors({ origin: corsOrigin === '*' ? '*' : corsOrigin }));
app.use(express.json({ limit: '5mb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/notes', async (req, res, next) => {
  try {
    const { content, language, password, expiry, expiresAt } = req.body ?? {};

    if (typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'content is required' });
    }

    const expiryValue = parseExpiry(expiresAt || expiry);
    if (expiryValue === undefined) {
      return res.status(400).json({ error: 'expiry must be never, 1h, 6h, 1d, 7d, 30d, or a future ISO timestamp' });
    }

    const id = uuidv4();
    const passwordHash = password
      ? await bcrypt.hash(String(password), bcryptRounds)
      : null;

    await pool.query(
      `INSERT INTO notes (id, content, language, password_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, content, normalizeLanguage(language), passwordHash, expiryValue]
    );

    return res.status(201).json({ id });
  } catch (error) {
    return next(error);
  }
});

app.get('/notes/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const password = req.get('x-note-password');

    const result = await pool.query(
      `SELECT id, content, language, password_hash, created_at, expires_at
       FROM notes
       WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Paste not found' });
    }

    const note = result.rows[0];
    if (note.expires_at && new Date(note.expires_at) <= new Date()) {
      return res.status(404).json({ error: 'Paste expired' });
    }

    if (note.password_hash) {
      if (!password) {
        return res.status(401).json({ error: 'Password required' });
      }

      const passwordOk = await bcrypt.compare(password, note.password_hash);
      if (!passwordOk) {
        return res.status(401).json({ error: 'Wrong password' });
      }
    }

    return res.json({
      id: note.id,
      content: note.content,
      language: note.language,
      createdAt: note.created_at,
      expiresAt: note.expires_at,
      passwordProtected: Boolean(note.password_hash)
    });
  } catch (error) {
    if (error.code === '22P02') {
      return res.status(404).json({ error: 'Paste not found' });
    }
    return next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`CloudPaste API listening on port ${port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down API`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));