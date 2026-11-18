'use strict';
/* V41 — espaces collectifs : pièces jointes (photo, document, vocal, vidéo courte) et indicateur « X écrit… ».
   Les tables sont créées automatiquement au premier appel (aucune migration SQL à lancer).
   Actions : upload (POST) | file (GET) | typing (POST) | who (GET) | translate (POST) */
const crypto = require('crypto');
const L = require('./_lib');

const MAX = { image: 2.0e6, audio: 2.5e6, video: 3.0e6, doc: 3.0e6 };           // octets (limite Vercel : 4,5 Mo par requête)
const MIME = {
  image: /^image\/(jpeg|png|webp|gif)$/, audio: /^audio\/(webm|ogg|mp4|mpeg|aac|wav|x-m4a|m4a)(;.*)?$/,
  video: /^video\/(mp4|webm|quicktime)(;.*)?$/,
  doc: /^application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/
};
/* V43 — gros fichiers (jusqu'à 250 Go par défaut, MAX_SPACE_UPLOAD_GB) : envoi direct navigateur -> Cloudflare R2 par morceaux. Nécessite les 4 variables R2. */
const GiB = 1024 ** 3, MiB = 1024 ** 2;
const r2on = () => !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET);
const maxBig = () => (Number(process.env.MAX_SPACE_UPLOAD_GB) || 250) * GiB;
let _c; const sdk = () => _c || (_c = { s3: require('@aws-sdk/client-s3'), sign: require('@aws-sdk/s3-request-presigner') });
let _cl; const client = () => _cl || (_cl = new (sdk().s3.S3Client)({ region: 'auto', endpoint: 'https://' + process.env.R2_ACCOUNT_ID + '.r2.cloudflarestorage.com', credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } }));
const EXT = { jpg: 'image', jpeg: 'image', png: 'image', webp: 'image', gif: 'image', mp4: 'video', mov: 'video', webm: 'video', m4v: 'video', mkv: 'video', mp3: 'audio', m4a: 'audio', wav: 'audio', ogg: 'audio', aac: 'audio',
  pdf: 'doc', doc: 'doc', docx: 'doc', ppt: 'doc', pptx: 'doc', xls: 'doc', xlsx: 'doc', txt: 'doc', zip: 'doc' };
const kindBig = (mime, name) => { const m = String(mime || '').toLowerCase(), e = (String(name).split('.').pop() || '').toLowerCase();
  if (/^image\/(jpeg|png|webp|gif)$/.test(m)) return 'image'; if (/^video\//.test(m)) return EXT[e] === 'video' || !EXT[e] ? 'video' : ''; if (/^audio\//.test(m)) return 'audio';
  if (/^application\/(pdf|msword|zip|x-zip-compressed|vnd\.)/.test(m) || m === 'text/plain') return EXT[e] === 'doc' ? 'doc' : ''; return m ? '' : (EXT[e] || ''); };
const safeName = n => String(n || 'fichier').normalize('NFKD').replace(/[^\w.\-]+/g, '_').replace(/^\.+/, '').slice(0, 120) || 'fichier';
let ready = false;
async function tables() {
  if (ready) return; const q = L.db();
  await q`CREATE TABLE IF NOT EXISTS space_media (id BIGSERIAL PRIMARY KEY, space_id INTEGER NOT NULL, owner INTEGER NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL, kind TEXT NOT NULL, size INTEGER NOT NULL, data_b64 TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
  await q`CREATE INDEX IF NOT EXISTS space_media_owner_idx ON space_media(owner, created_at)`;
  await q`CREATE TABLE IF NOT EXISTS space_typing (space_id INTEGER NOT NULL, uid INTEGER NOT NULL, name TEXT NOT NULL, at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (space_id, uid))`;
  await q`CREATE TABLE IF NOT EXISTS space_trans (msg_id INTEGER NOT NULL, target TEXT NOT NULL, h TEXT NOT NULL, title TEXT, body TEXT, detected TEXT, at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (msg_id, target))`;
  await q`CREATE TABLE IF NOT EXISTS space_tr_usage (uid INTEGER NOT NULL, day DATE NOT NULL, chars INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (uid, day))`;
  await q`CREATE TABLE IF NOT EXISTS space_files (id BIGSERIAL PRIMARY KEY, space_id INTEGER NOT NULL, owner INTEGER NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL, kind TEXT NOT NULL, size BIGINT NOT NULL, object_key TEXT NOT NULL, upload_id TEXT NOT NULL, part_size BIGINT NOT NULL, status TEXT NOT NULL DEFAULT 'awaiting', created_at TIMESTAMPTZ NOT NULL DEFAULT now())`;
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

/* V43 — traduction d'un message de l'espace dans la langue de l'utilisateur (Google Cloud Translation, côté serveur).
   Seuls les textes des messages de l'espace sont traduits (pas de texte libre). Résultat mis en cache et partagé entre
   tous les utilisateurs de la même langue ; quota quotidien par utilisateur. */
async function translate(res, sql, S, auth, a, b) {
  if (!a.canRead) return L.send(res, 403, { ok: false, error: 'Accès refusé.' });
  const mid = Number(b.msg), target = String(b.target || '').trim();
  if (!Number.isInteger(mid) || !/^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$/.test(target)) return L.send(res, 400, { ok: false, error: 'Message ou langue invalide.' });
  const m = (S.grpSpaceMsgs || []).find(x => x.id === mid && x.space === a.sp.id);
  if (!m || (!m.text && !m.title)) return L.send(res, 404, { ok: false, error: 'Message introuvable ou sans texte.' });
  const src = [String(m.title || '').slice(0, 500), String(m.text || '').slice(0, 5000)];
  const h = crypto.createHash('sha1').update(JSON.stringify(src)).digest('hex');
  const hit = await sql`SELECT title, body, detected FROM space_trans WHERE msg_id=${mid} AND target=${target} AND h=${h}`;
  if (hit[0]) return L.send(res, 200, { ok: true, title: hit[0].title || '', text: hit[0].body || '', src: hit[0].detected || '', cached: true });
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) return L.send(res, 503, { ok: false, error: 'engine' });
  const chars = src[0].length + src[1].length, limit = Number(process.env.TRANSLATE_DAILY_CHARS) || 30000;
  const u = await sql`SELECT chars FROM space_tr_usage WHERE uid=${auth.u} AND day=current_date`;
  if (((u[0] && u[0].chars) || 0) + chars > limit) return L.send(res, 429, { ok: false, error: 'quota' });
  const q = src.filter(x => x), r = await fetch('https://translation.googleapis.com/language/translate/v2?key=' + encodeURIComponent(key), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q, target, format: 'text' }) });
  if (!r.ok) return L.send(res, 502, { ok: false, error: 'engine' });
  const d = await r.json(), tr = (d.data && d.data.translations) || [];
  if (tr.length !== q.length) return L.send(res, 502, { ok: false, error: 'engine' });
  let k = 0; const title = src[0] ? tr[k++].translatedText : '', text = src[1] ? tr[k++].translatedText : '', det = (tr[0] && tr[0].detectedSourceLanguage) || '';
  await sql`INSERT INTO space_tr_usage(uid, day, chars) VALUES (${auth.u}, current_date, ${chars}) ON CONFLICT (uid, day) DO UPDATE SET chars = space_tr_usage.chars + EXCLUDED.chars`;
  await sql`INSERT INTO space_trans(msg_id, target, h, title, body, detected) VALUES (${mid}, ${target}, ${h}, ${title}, ${text}, ${det}) ON CONFLICT (msg_id, target) DO UPDATE SET h=EXCLUDED.h, title=EXCLUDED.title, body=EXCLUDED.body, detected=EXCLUDED.detected, at=now()`;
  return L.send(res, 200, { ok: true, title, text, src: det });
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

    if (action === 'mdownload') {                                                 // lien signé vers un gros fichier R2
      if (req.method !== 'GET') return L.send(res, 405, { ok: false, error: 'Méthode non autorisée' });
      if (!r2on()) return L.send(res, 503, { ok: false, error: 'r2' });
      const id = Number(q.id), rows = Number.isFinite(id) ? await sql`SELECT space_id, name, mime, kind, object_key FROM space_files WHERE id=${id} AND status='ready'` : [];
      if (!rows[0]) return L.send(res, 404, { ok: false, error: 'Fichier introuvable.' });
      const st = await L.ensureState(), a = access(st.data, auth, rows[0].space_id);
      const bound = (st.data.grpSpaceMsgs || []).some(m => m.space === rows[0].space_id && m.att && m.att.store === 'r2' && Number(m.att.fid) === id);
      if (!a || !a.canRead || !bound) return L.send(res, 403, { ok: false, error: 'Accès refusé.' });
      const inline = q.mode === 'view' && rows[0].kind !== 'doc';
      const url = await sdk().sign.getSignedUrl(client(), new (sdk().s3.GetObjectCommand)({ Bucket: process.env.R2_BUCKET, Key: rows[0].object_key, ResponseContentDisposition: (inline ? 'inline' : 'attachment') + '; filename="' + safeName(rows[0].name) + '"', ResponseContentType: rows[0].mime }), { expiresIn: 3600 });
      return L.send(res, 200, { ok: true, url, name: rows[0].name });
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
    if (action === 'translate') return translate(res, sql, st.data, auth, a, b);
    if (!a.canWrite) return L.send(res, 403, { ok: false, error: a.silent ? 'Vous êtes en mode silencieux.' : 'Écriture non autorisée dans cet espace (lecture seule, verrouillé ou terminé).' });

    if (action === 'mstart' || action === 'msign' || action === 'mcomplete') {    // envoi par morceaux vers R2
      if (!r2on()) return L.send(res, 503, { ok: false, error: 'r2' });
      if (action === 'mstart') {
        const size = Number(b.size), name = safeName(b.name), mime = String(b.mime || '').toLowerCase().trim(), kind = kindBig(mime, b.name);
        if (!Number.isFinite(size) || size <= 0) return L.send(res, 400, { ok: false, error: 'Fichier vide ou invalide.' });
        if (!kind) return L.send(res, 415, { ok: false, error: 'Type de fichier non accepté (photo, vidéo, audio, PDF, Word, PowerPoint, Excel, texte ou ZIP).' });
        if (size > maxBig()) return L.send(res, 413, { ok: false, error: 'Fichier trop volumineux (maximum ' + Math.round(maxBig() / GiB) + ' Go).' });
        const n = await sql`SELECT count(*)::int AS n FROM space_files WHERE owner=${auth.u} AND created_at > now() - interval '1 day'`;
        if (n[0].n >= 40) return L.send(res, 429, { ok: false, error: 'Limite de 40 gros fichiers par jour atteinte.' });
        const partSize = Math.max(64 * MiB, Math.ceil(size / 9000 / MiB) * MiB), key = 'spaces/' + sid + '/' + require('crypto').randomUUID() + '/' + name;
        const mp = await client().send(new (sdk().s3.CreateMultipartUploadCommand)({ Bucket: process.env.R2_BUCKET, Key: key, ContentType: mime || 'application/octet-stream' }));
        const r = await sql`INSERT INTO space_files(space_id, owner, name, mime, kind, size, object_key, upload_id, part_size) VALUES (${sid}, ${auth.u}, ${name}, ${mime || 'application/octet-stream'}, ${kind}, ${size}, ${key}, ${mp.UploadId}, ${partSize}) RETURNING id`;
        return L.send(res, 200, { ok: true, fileId: Number(r[0].id), partSize, totalParts: Math.ceil(size / partSize), kind });
      }
      const f = (await sql`SELECT id, size, part_size, object_key, upload_id, status, kind, name, mime FROM space_files WHERE id=${Number(b.fileId)} AND owner=${auth.u} AND space_id=${sid}`)[0];
      if (!f) return L.send(res, 404, { ok: false, error: 'Envoi introuvable.' });
      if (f.status !== 'awaiting') return L.send(res, 409, { ok: false, error: 'Envoi déjà terminé.' });
      const total = Math.ceil(Number(f.size) / Number(f.part_size));
      if (action === 'msign') {
        const urls = {};
        for (const n of (Array.isArray(b.parts) ? b.parts : []).slice(0, 50)) if (Number.isInteger(n) && n >= 1 && n <= total) urls[n] = await sdk().sign.getSignedUrl(client(), new (sdk().s3.UploadPartCommand)({ Bucket: process.env.R2_BUCKET, Key: f.object_key, UploadId: f.upload_id, PartNumber: n }), { expiresIn: 3600 });
        return L.send(res, 200, { ok: true, urls });
      }
      const parts = (Array.isArray(b.parts) ? b.parts : []).map(p => ({ PartNumber: Number(p.n), ETag: String(p.etag) })).sort((x, y) => x.PartNumber - y.PartNumber);
      if (parts.length !== total || parts.some((p, i) => p.PartNumber !== i + 1 || !p.ETag)) return L.send(res, 400, { ok: false, error: 'Liste des morceaux incomplète.' });
      await client().send(new (sdk().s3.CompleteMultipartUploadCommand)({ Bucket: process.env.R2_BUCKET, Key: f.object_key, UploadId: f.upload_id, MultipartUpload: { Parts: parts } }));
      const h = await client().send(new (sdk().s3.HeadObjectCommand)({ Bucket: process.env.R2_BUCKET, Key: f.object_key }));
      if (Number(h.ContentLength) !== Number(f.size)) { await sql`UPDATE space_files SET status='cancelled' WHERE id=${f.id}`; return L.send(res, 422, { ok: false, error: 'Envoi incomplet, recommencez.' }); }
      await sql`UPDATE space_files SET status='ready' WHERE id=${f.id}`;
      return L.send(res, 200, { ok: true, fid: Number(f.id), kind: f.kind, name: f.name, mime: f.mime, size: Number(f.size), store: 'r2' });
    }

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
