// Olympus — candado de acceso para /olympus
// ------------------------------------------------------------
// Solo corre en /olympus y sus subrutas (ver `config.matcher`).
// El resto de nextleveldemographic.com no pasa por aquí.
//
// Accesos: variable de entorno TOOLS_USERS en Vercel
// (Settings → Environment Variables), un usuario por línea o
// separados por coma, con el formato  correo:contraseña
//
//   luis@nextleveldemographic.com:UnaClaveLarga
//   ivette@nextleveldemographic.com:OtraClaveLarga
//
// Las contraseñas no pueden llevar comas. Cambiar o quitar un
// acceso cierra la sesión de todos (vuelven a entrar con su clave).
// Si TOOLS_USERS no existe, /olympus queda cerrado para todos.

import { next } from '@vercel/functions';

export const config = {
  matcher: ['/olympus', '/olympus/:path*'],
};

const SESSION_COOKIE = 'nld_tools_sesion';
const USER_COOKIE = 'nld_tools_usuario';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 días
const enc = new TextEncoder();

export default async function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const users = parseUsers(process.env.TOOLS_USERS);

  if (path === '/olympus/salir') {
    return new Response(null, {
      status: 303,
      headers: [
        ['Location', '/olympus'],
        ['Set-Cookie', clearCookie(SESSION_COOKIE)],
        ['Set-Cookie', clearCookie(USER_COOKIE)],
        ['Cache-Control', 'no-store'],
      ],
    });
  }

  if (path === '/olympus/entrar') {
    if (request.method !== 'POST') return redirect('/olympus');
    return handleLogin(request, users);
  }

  if (users.size && (await validSession(request, users))) {
    return next({
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  return loginPage({
    destino: safeNext(url.pathname + url.search),
    error: users.size ? '' : 'El acceso todavía no está configurado.',
    status: users.size ? 401 : 503,
  });
}

// ---------- login ----------

async function handleLogin(request, users) {
  let email = '';
  let password = '';
  let destino = '/olympus';
  try {
    const form = await request.formData();
    email = String(form.get('correo') || '').trim().toLowerCase();
    password = String(form.get('clave') || '');
    destino = safeNext(String(form.get('destino') || '/olympus'));
  } catch (e) {
    /* formulario vacío o mal formado */
  }

  if (!users.size) {
    return loginPage({ destino, error: 'El acceso todavía no está configurado.', status: 503 });
  }

  const expected = users.get(email);
  const ok = expected !== undefined && (await sameSecret(password, expected));
  if (!ok) {
    await sleep(700); // frena intentos repetidos
    return loginPage({ destino, correo: email, error: 'Correo o contraseña incorrectos.', status: 401 });
  }

  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const token = await signSession(email, exp, users);
  return new Response(null, {
    status: 303,
    headers: [
      ['Location', destino],
      ['Set-Cookie', cookie(SESSION_COOKIE, token, { httpOnly: true })],
      ['Set-Cookie', cookie(USER_COOKIE, encodeURIComponent(email), { httpOnly: false })],
      ['Cache-Control', 'no-store'],
    ],
  });
}

// ---------- sesión firmada ----------

function parseUsers(raw) {
  const map = new Map();
  if (!raw) return map;
  for (const entry of String(raw).split(/[\n\r,]+/)) {
    const i = entry.indexOf(':');
    if (i < 1) continue;
    const email = entry.slice(0, i).trim().toLowerCase();
    const pass = entry.slice(i + 1).trim();
    if (email && pass) map.set(email, pass);
  }
  return map;
}

async function signingKey(users) {
  const material = [...users].map(([e, p]) => e + ':' + p).sort().join('\n');
  const digest = await crypto.subtle.digest('SHA-256', enc.encode('nld-tools|' + material));
  return crypto.subtle.importKey('raw', digest, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function signSession(email, exp, users) {
  const payload = b64url(enc.encode(email)) + '.' + exp;
  const key = await signingKey(users);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(payload)));
  return payload + '.' + b64url(sig);
}

async function validSession(request, users) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [emailB64, expStr, sigB64] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  let email;
  let sig;
  try {
    email = new TextDecoder().decode(fromB64url(emailB64));
    sig = fromB64url(sigB64);
  } catch (e) {
    return false;
  }
  if (!users.has(email)) return false;
  const key = await signingKey(users);
  return crypto.subtle.verify('HMAC', key, sig, enc.encode(emailB64 + '.' + expStr));
}

async function sameSecret(a, b) {
  const [x, y] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const ax = new Uint8Array(x);
  const by = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < ax.length; i++) diff |= ax[i] ^ by[i];
  return diff === 0;
}

// ---------- utilidades ----------

function safeNext(value) {
  if (typeof value !== 'string') return '/olympus';
  if (!value.startsWith('/olympus')) return '/olympus';
  if (value.includes('//') || value.includes('\\')) return '/olympus';
  if (/^\/olympus\/(entrar|salir)\b/.test(value)) return '/olympus';
  return value;
}

function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

function cookie(name, value, { httpOnly }) {
  return `${name}=${value}; Path=/olympus; Max-Age=${MAX_AGE}; Secure; SameSite=Lax${httpOnly ? '; HttpOnly' : ''}`;
}

function clearCookie(name) {
  return `${name}=; Path=/olympus; Max-Age=0; Secure; SameSite=Lax`;
}

function redirect(location) {
  return new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } });
}

function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(str) {
  const s = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- pantalla de acceso ----------

function loginPage({ destino = '/olympus', correo = '', error = '', status = 401 }) {
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>Olympus · Acceso</title>
<link rel="icon" href="/assets/logo.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Olympus">
<link rel="apple-touch-icon" href="/assets/logo.png">
<script>try{if(localStorage.getItem('nld_tools_tema')==='oscuro')document.documentElement.setAttribute('data-tema','oscuro')}catch(e){}</script>
<style>
:root{color-scheme:light;--bg:#F5F5F7;--card:#FFFFFF;--line:#E5E5EA;--line-2:#D2D2D7;--fg:#1D1D1F;--muted:#6E6E73;--label:#86868B;
  --blue:#0071E3;--blue-h:#0077ED;--tint:#E8F1FE;--field:#FFFFFF;--shadow:0 1px 2px rgba(0,0,0,.04),0 12px 32px rgba(0,0,0,.06)}
:root[data-tema="oscuro"]{color-scheme:dark;--bg:#000000;--card:#1C1C1E;--line:#2C2C2E;--line-2:#3A3A3C;--fg:#F5F5F7;--muted:#A1A1A6;--label:#86868B;
  --blue:#2997FF;--blue-h:#5AB0FF;--tint:rgba(41,151,255,.13);--field:#000000;--shadow:none}
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{font-family:Arial,Helvetica,sans-serif;background:var(--bg);color:var(--fg);-webkit-font-smoothing:antialiased;
  display:flex;align-items:center;justify-content:center;min-height:100dvh;
  padding:max(24px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(24px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}
.card{width:100%;max-width:400px;background:var(--card);border:1px solid var(--line);border-radius:22px;padding:32px 28px 28px;box-shadow:var(--shadow);
  animation:up .7s cubic-bezier(.28,.16,.22,1) both}
@keyframes up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.card{animation:none}}
.brand{display:flex;align-items:center;gap:10px;margin-bottom:26px}
.logo{width:30px;height:30px;border-radius:50%;background:#000 url(/assets/logo.png) center/cover no-repeat;flex:none}
.brand b{font-size:15px;letter-spacing:-.01em}
.eyebrow{font-size:12.5px;font-weight:700;color:var(--blue);margin-bottom:6px}
h1{font-size:26px;line-height:1.15;font-weight:700;letter-spacing:-.02em;margin-bottom:8px}
.sub{font-size:14px;line-height:1.45;color:var(--muted);margin-bottom:24px}
label{display:block;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--label);margin:0 0 6px 2px}
input{width:100%;font:inherit;font-size:16px;color:var(--fg);background:var(--field);border:1px solid var(--line-2);border-radius:12px;padding:13px 14px;margin-bottom:16px;
  -webkit-appearance:none;appearance:none;transition:border-color .2s,box-shadow .2s}
input:focus{outline:none;border-color:var(--blue);box-shadow:0 0 0 4px var(--tint)}
button{width:100%;font:inherit;font-size:16px;font-weight:700;color:#fff;background:var(--blue);border:0;border-radius:980px;padding:14px;margin-top:6px;cursor:pointer;transition:background .2s}
button:hover{background:var(--blue-h)}
button:focus-visible{outline:2px solid var(--blue);outline-offset:3px}
.err{font-size:13.5px;line-height:1.4;color:var(--fg);background:var(--tint);border-radius:12px;padding:11px 14px;margin-bottom:18px}
.foot{font-size:12px;color:var(--label);margin-top:20px;text-align:center}
</style>
</head>
<body>
<main class="card">
  <div class="brand"><span class="logo" aria-hidden="true"></span><b>Next Level Demographic</b></div>
  <p class="eyebrow">Olympus</p>
  <h1>Acceso del equipo</h1>
  <p class="sub">Herramientas internas de NLD. Entra con tu correo y tu contraseña.</p>
  ${error ? `<p class="err" role="alert">${esc(error)}</p>` : ''}
  <form method="post" action="/olympus/entrar" autocomplete="on">
    <input type="hidden" name="destino" value="${esc(destino)}">
    <label for="correo">Correo</label>
    <input id="correo" name="correo" type="email" inputmode="email" autocomplete="username" autocapitalize="none" spellcheck="false" required value="${esc(correo)}"${correo ? '' : ' autofocus'}>
    <label for="clave">Contraseña</label>
    <input id="clave" name="clave" type="password" autocomplete="current-password" required${correo ? ' autofocus' : ''}>
    <button type="submit">Entrar</button>
  </form>
  <p class="foot">Uso interno. Si no tienes acceso, pídeselo a Luis.</p>
</main>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Frame-Options': 'DENY',
    },
  });
}
