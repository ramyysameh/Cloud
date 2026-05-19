const app = document.querySelector('#app');
const createTemplate = document.querySelector('#create-template');
const viewTemplate = document.querySelector('#view-template');

function setMessage(text, isSuccess = false) {
  const message = document.querySelector('#message');
  if (!message) return;
  message.textContent = text || '';
  message.classList.toggle('success', isSuccess);
}

function getPasteIdFromPath() {
  const match = window.location.pathname.match(/^\/notes\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function formatDate(value) {
  if (!value) return 'never';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

async function parseApiError(response) {
  try {
    const body = await response.json();
    return body.error || 'Request failed';
  } catch {
    return 'Request failed';
  }
}

function showCreateView() {
  app.replaceChildren(createTemplate.content.cloneNode(true));

  const form = document.querySelector('#create-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage('');

    const payload = {
      content: form.content.value,
      language: form.language.value,
      expiry: form.expiry.value
    };

    if (form.password.value) {
      payload.password = form.password.value;
    }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Creating...';

    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      const { id } = await response.json();
      const pasteUrl = `${window.location.origin}/notes/${encodeURIComponent(id)}`;
      history.pushState({}, '', pasteUrl);
      showViewPaste(id);
    } catch (error) {
      setMessage(error.message || 'Could not create paste');
    } finally {
      button.disabled = false;
      button.textContent = 'Create paste';
    }
  });
}

function renderPaste(note) {
  document.querySelector('#paste-id').textContent = note.id;
  document.querySelector('#paste-meta').textContent = `Language: ${note.language} | Created: ${formatDate(note.createdAt)} | Expires: ${formatDate(note.expiresAt)}`;

  const codeWrap = document.querySelector('#code-wrap');
  const code = document.querySelector('#paste-content');
  code.className = `language-${note.language || 'plaintext'}`;
  code.textContent = note.content;
  codeWrap.classList.remove('hidden');

  if (window.hljs) {
    hljs.highlightElement(code);
  }
}

async function fetchPaste(id, password) {
  const headers = password ? { 'x-note-password': password } : {};
  const response = await fetch(`/api/notes/${encodeURIComponent(id)}`, { headers });

  if (response.status === 401) {
    const error = await parseApiError(response);
    return { needsPassword: true, error };
  }

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return { note: await response.json() };
}

function showPasswordPrompt(id, messageText = 'Password required') {
  const passwordCard = document.querySelector('#password-card');
  const input = document.querySelector('#view-password');
  const unlock = document.querySelector('#unlock');

  passwordCard.classList.remove('hidden');
  setMessage(messageText);
  input.focus();

  async function unlockPaste() {
    if (!input.value) {
      setMessage('Enter the paste password');
      return;
    }

    unlock.disabled = true;
    unlock.textContent = 'Checking...';
    try {
      const result = await fetchPaste(id, input.value);
      if (result.needsPassword) {
        setMessage(result.error || 'Wrong password');
        return;
      }
      passwordCard.classList.add('hidden');
      setMessage('Paste unlocked', true);
      renderPaste(result.note);
    } catch (error) {
      setMessage(error.message || 'Could not load paste');
    } finally {
      unlock.disabled = false;
      unlock.textContent = 'Unlock';
    }
  }

  unlock.addEventListener('click', unlockPaste);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') unlockPaste();
  });
}

async function showViewPaste(id) {
  app.replaceChildren(viewTemplate.content.cloneNode(true));
  document.querySelector('#paste-id').textContent = id;

  document.querySelector('#copy-link').addEventListener('click', async () => {
    await navigator.clipboard.writeText(window.location.href);
    setMessage('Link copied', true);
  });

  try {
    const result = await fetchPaste(id);
    if (result.needsPassword) {
      showPasswordPrompt(id, result.error);
      return;
    }
    renderPaste(result.note);
  } catch (error) {
    setMessage(error.message || 'Paste not found');
  }
}

function route() {
  const pasteId = getPasteIdFromPath();
  if (pasteId) {
    showViewPaste(pasteId);
  } else {
    showCreateView();
  }
}

window.addEventListener('popstate', route);
route();
