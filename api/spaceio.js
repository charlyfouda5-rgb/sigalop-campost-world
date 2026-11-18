'use strict';
/* V41 — espaces collectifs : pièces jointes (photo, document, vocal, vidéo courte) et indicateur « X écrit… ».
   Les tables sont créées automatiquement au premier appel (aucune migration SQL à lancer).
   Actions : upload (POST) | file (GET) | typing (POST) | who (GET) */
const L = require('./_lib');

const MAX = { image: 2.0e6, audio: 2.5e6, video: 3.0e6, doc: 3.0e6 };           // octets (limite Vercel : 4,5 Mo par requête)
const MIME = {
  image: /^image\/(jpeg|png|webp|gif)$/, audio: /^audio\/(webm|ogg|mp4|mpeg|aac|wav|x-m4a|m4a)(;.*)?$/,
  video: /^video\/(mp4|webm|quicktime)(;.*)?$/,
  doc: /^application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/
};
let ready = false;
async function tables() {
  if (ready) return; const q = L.db();
  await q`CREATE TABLE IF NOT EXISTS space_media (id BIGSERIAL PRIMARY KEY, space_id INTEGER NOT NULL, owner INTEGER NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL, kind TEXT NOT NULL, size INTEGER NOT NULL, data_b64 TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await q`CREATE INDEX IF NOT EXISTS space_media_owner_idx ON space_media(owner, created_at)`;
  await q`CREATE TABLE IF NOT EXISTS space_typing (space_id INTEGER NOT NULL, uid INTEGER NOT NULL, name TEXT NOT NULL, at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (space_id, uid))`;
  ready = true;
}
const kindOf = mime => Object.keys(MIME).find(k => MIME[k].test(String(mime || '').toLowerCase())) || '';
function magicOk(kind, mime, buf) {
  const h = buf.slice(0, 8).toString('hex');
  if (kind === 'image') return /^ffd8ff/.test(h) || h.startsWith('89504e47') || (buf.slice(0, 4).toString() === 'RIFF') || buf.slice(0, 3).toString() === 'GIF';
  if (mime === 'application/pdf') return buf.slice(0, 5).toString() === '%PDF-';
  if (/openxml/.test(mime)) return h.startsWith('504b');
  if (mime === 'application/msword') return h.startsWith('d0cf11e0');
  return true;
}
/* rôle de l'utilisateur dans l'espace, et droits d'écriture / lecture */
function access(S, auth, spaceId) {
  const sp = (S.grpSpaces || []).find(x => x.id === spaceId); if (!sp) return null;
  const u = (S.users || []).find(x => x.id === auth.u); if (!u) return null;
  let role = '';
  if (auth.r === 'super') role = 'super';
  else if ((sp.students || []).includes(auth.u)) role = 'eleve';
  else if ((sp.staff || []).includes(auth.u)) role = 'staff';
  else if (u.role === 'parent' && (u.kids || []).some(k => (sp.students || []).includes(k))) role = 'parent';
  if (!role) return null;
  const silent = role === 'eleve' && (S.grpSpacePrefs || []).some(p => p.space === sp.id && p.uid === auth.u && p.silent);
  const blocked = (sp.blocked || []).includes(auth.u);
  const canWrite = role === 'super' ? true : (role !== 'parent' && sp.status === 'ouvert' && !silent && !blocked && !(role === 'eleve' && sp.locked));
  return { sp, role, user: u, silent, canRead: !silent, canWrite };
}

module.exports = async function handler(req, res) {
  try {
    const auth = L.verify(L.bearer(req));
    if (!auth || auth.r === 'guest' || auth.r === 'anon') return L.send(res, 401, { ok: false, error: 'Connexion requise.' });
    const q = req.query || Object.fromEntries(new URL(req.url, 'http://x').searchParams), action = q.action || '';
    await tables();
    const sql = L.db();

    if (action === 'file') {                                                      // téléchargement d'une pièce jointe
      if (req.method !== 'GET') return L.send(res, 405, { ok: false, error: 'Méthode non autorisée' });
      const id = Number(q.id), rows = Number.isFinite(id) ? await sql`SELECT space_id, name, mime, kind, data_b64 FROM space_media WHERE id=${id}` : [];
      if (!rows[0]) return L.send(res, 404, { ok: false, error: 'Fichier introuvable.' });
      const st = await L.ensureState(), a = access(st.data, auth, rows[0].space_id);
      if (!a || !a.canRead) return L.send(res, 403, { ok: false, error: 'Accès refusé.' });
      const buf = Buffer.from(rows[0].data_b64, 'base64');
      res.statusCode = 200; res.setHeader('Content-Type', rows[0].mime); res.setHeader('Content-Length', buf.length);
      res.setHeader('Cache-Control', 'private, max-age=3600'); res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', (rows[0].kind === 'doc' && rows[0].mime !== 'application/pdf' ? 'attachment' : 'inline') + '; filename="' + String(rows[0].name).replace(/[^\w.\-]+/g, '_').slice(0, 100) + '"');
      return res.end(buf);
    }

    if (action === 'who') {                                                       // qui est en train d'écrire
      const sid = Number(q.space), st = await L.ensureState(), a = access(st.data, auth, sid);
      if (!a || !a.canRead) return L.send(res, 200, { ok: true, who: [] });
      const rows = await sql`SELECT uid, name FROM space_typing WHERE space_id=${sid} AND uid<>${auth.u} AND at > now() - interval '6 seconds' ORDER BY at DESC LIMIT 8`;
      return L.send(res, 200, { ok: true, who: rows.map(r => ({ uid: r.uid, name: r.name })) });
    }

    if (req.method !== 'POST') return L.send(res, 405, { ok: false, error: 'Méthode non autorisée' });
    const b = await L.body(req), sid = Number(b.space);
    const st = await L.ensureState(), a = access(st.data, auth, sid);
    if (!a) return L.send(res, 403, { ok: false, error: 'Vous ne faites pas partie de cet espace.' });
    if (!a.canWrite) return L.send(res, 403, { ok: false, error: a.silent ? 'Vous êtes en mode silencieux.' : 'Écriture non autorisée dans cet espace (lecture seule, verrouillé ou terminé).' });

    if (action === 'typing') {
      await sql`INSERT INTO space_typing(space_id, uid, name, at) VALUES (${sid}, ${auth.u}, ${String(a.user.name || '?').slice(0, 60)}, now()) ON CONFLICT (space_id, uid) DO UPDATE SET at=now(), name=EXCLUDED.name`;
      return L.send(res, 200, { ok: true });
    }

    if (action === 'upload') {
      const mime = String(b.mime || '').toLowerCase().trim(), kind = kindOf(mime);
      if (!kind) return L.send(res, 415, { ok: false, error: 'Type de fichier non accepté (photo, PDF, Word, message vocal ou vidéo).' });
      const buf = Buffer.from(String(b.data || ''), 'base64');
      if (!buf.length) return L.send(res, 400, { ok: false, error: 'Fichier vide.' });
      if (buf.length > MAX[kind]) return L.send(res, 413, { ok: false, error: 'Fichier trop lourd (maximum ' + (MAX[kind] / 1e6).toFixed(0) + ' Mo pour ce type). Réduisez-le puis réessayez.' });
      if (!magicOk(kind, mime, buf)) return L.send(res, 415, { ok: false, error: 'Le contenu du fichier ne correspond pas à son type.' });
      const n = await sql`SELECT count(*)::int AS n FROM space_media WHERE owner=${auth.u} AND created_at > now() - interval '1 day'`;
      if (n[0].n >= 60) return L.send(res, 429, { ok: false, error: 'Limite de 60 envois de fichiers par jour atteinte.' });
      const name = String(b.name || 'fichier').replace(/[\r\n]+/g, ' ').slice(0, 120);
      const r = await sql`INSERT INTO space_media(space_id, owner, name, mime, kind, size, data_b64) VALUES (${sid}, ${auth.u}, ${name}, ${mime}, ${kind}, ${buf.length}, ${buf.toString('base64')}) RETURNING id`;
      return L.send(res, 200, { ok: true, fid: Number(r[0].id), kind, name, mime, size: buf.length });
    }
    return L.send(res, 400, { ok: false, error: 'Action inconnue.' });
  } catch (e) {
    console.error('spaceio', e && e.message);
    return L.send(res, 500, { ok: false, error: 'Serveur indisponible.' });
  }
};
