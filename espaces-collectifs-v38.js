/* DELTA SCHOOL V41 (module des espaces collectifs, ex-V38) — Espaces collectifs (classe / catégorie) et messagerie parent ↔ groupe/enseignants.
 *
 *  1. Le super administrateur regroupe plusieurs élèves d'une même classe ou catégorie (groupe de répétition, classe,
 *     section, système, étudiants, élèves sans groupe) dans UN espace de la plateforme. Il y partage des éléments (cours,
 *     épreuves, photos, liens…) ; les élèves y échangent et discutent sans quitter la plateforme.
 *  2. Seul le super administrateur ajoute ou retire des enseignants et des répétiteurs (il voit leurs indicateurs de
 *     performance et leur présence) ; seul lui crée, verrouille ou termine un espace.
 *  3. Protection des enfants : les élèves n'écrivent que du texte (pas de lien), le super administrateur peut verrouiller
 *     la discussion, et les parents des élèves membres peuvent suivre l'espace en lecture seule.
 *  4. Messagerie : un parent peut écrire au groupe de répétition et aux enseignants de SON enfant ; les enseignants et le
 *     groupe peuvent écrire aux parents de leurs élèves.
 */
(function () {
  'use strict';
  function arr(k) { if (!Array.isArray(S[k])) S[k] = []; return S[k]; }
  function E(x) { return typeof esc === 'function' ? esc(String(x == null ? '' : x)) : String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function val(id) { var el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; }
  function nrm(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  function isSuper() { return !!me && me.role === 'super'; }
  function U(id) { return (S.users || []).filter(function (x) { return x.id == id; })[0]; }
  function notify(to, text) { S.msgs.push({ id: nid(S.msgs), from: me.id, to: to, text: text, kind: 'text', readAt: '', ts: now() }); }
  function grpName(u) { var s = u && u.school ? sch(u.school) : null; return s ? s.name : 'Sans groupe de répétition'; }
  function isEtu(u) { return u.statut === 'etudiant' || ((cls(u.classId) || {}).system === 'Université'); }
  function parentsOf(u) { return (S.users || []).filter(function (p) { return p.role === 'parent' && (p.kids || []).indexOf(u.id) >= 0; }); }
  function tabAfter(t, key, entry) { var i = t.findIndex(function (x) { return x[0] === key; }); t.splice(i < 0 ? Math.max(1, t.length - 1) : i + 1, 0, entry); }
  function who(x, sz) { var u = U(x) || {}; return '<span style="display:inline-flex;gap:6px;align-items:center;margin:2px 10px 2px 0">' + av(x, sz || 28) + '<span>' + E(u.name || '?') + ' <span class="mu">' + E(RL[u.role] || u.role || '') + '</span></span></span>'; }
  function online(uidv) { try { var rows = typeof accSrc === 'function' ? accSrc() : []; return (rows || []).some(function (x) { return x.uid == uidv && isOnline(x); }); } catch (e) { return false; } }
  var KIND = { cours: ['🎓', 'Cours'], epreuve: ['📝', 'Épreuve'], photo: ['🖼️', 'Photo'], document: ['📄', 'Document'], video: ['🎬', 'Vidéo'], lien: ['🔗', 'Lien'], exercice: ['✏️', 'Exercice'], autre: ['📎', 'Autre'] };

  var GS = { open: 0, f: { school: '', cls: '', section: '', system: '', statut: '', q: '' }, sel: {}, sq: '' };
  function spaces() { return arr('grpSpaces'); }
  function msgsOf(id) { return arr('grpSpaceMsgs').filter(function (m) { return m.space == id; }).sort(function (a, b) { return a.id - b.id; }); }
  function role(sp) { if (!me) return ''; if (me.role === 'super') return 'super'; if ((sp.students || []).indexOf(me.id) >= 0) return 'eleve'; if ((sp.staff || []).indexOf(me.id) >= 0) return 'staff'; if (me.role === 'parent' && (me.kids || []).some(function (k) { return (sp.students || []).indexOf(k) >= 0; })) return 'parent'; return ''; }
  function mine() { return spaces().filter(function (s) { return role(s); }).sort(function (a, b) { return b.id - a.id; }); }
  function readsMap() { try { return JSON.parse(localStorage.getItem('ds38reads_' + me.id) || '{}'); } catch (e) { return {}; } }
  function setRead(sp) { try { var r = readsMap(), l = msgsOf(sp.id); r[sp.id] = l.length ? l[l.length - 1].id : 0; localStorage.setItem('ds38reads_' + me.id, JSON.stringify(r)); } catch (e) { } }
  function unread(sp) { var last = readsMap()[sp.id] || 0; return msgsOf(sp.id).filter(function (m) { return m.id > last && m.from != me.id; }).length; }

  /* ---------------- sélection des élèves (super) ---------------- */
  function pool() {
    var f = GS.f, tk = nrm(f.q).split(/\s+/).filter(Boolean);
    return (S.users || []).filter(function (u) {
      if (u.role !== 'eleve' || u.active === false) return false;
      var c = cls(u.classId) || {};
      if (f.school === '0' && u.school) return false; if (f.school && f.school !== '0' && String(u.school) !== f.school) return false;
      if (f.cls && nrm(c.name) !== nrm(f.cls)) return false; if (f.section && c.section !== f.section) return false; if (f.system && c.system !== f.system) return false;
      if (f.statut === 'etudiant' && !isEtu(u)) return false; if (f.statut === 'eleve' && isEtu(u)) return false;
      if (!tk.length) return true; var h = nrm(u.name + ' ' + (u.matricule || '') + ' ' + (u.code || '')); return tk.every(function (x) { return h.indexOf(x) >= 0; });
    });
  }
  function selCount() { return Object.keys(GS.sel).length; }
  window.dsV38Refresh = function () {
    var m = pool(), c = document.getElementById('gsCount'), l = document.getElementById('gsList'); if (c) c.textContent = selCount(); if (!l) return;
    l.innerHTML = '<div class="mu" style="margin:6px 0">' + m.length + ' élève(s) correspondant(s)' + (m.length > 150 ? ' (150 affichés)' : '') + '</div><div>' + btn('☑ Cocher les ' + m.length, 'dsV38All(true)', 's') + ' ' + btn('☐ Décocher ces résultats', 'dsV38All(false)', 's') + ' ' + btn('Tout décocher', 'dsV38Clear()', 's') + '</div><div style="max-height:260px;overflow:auto;margin-top:6px">'
      + m.slice(0, 150).map(function (u) { return '<label class="row" style="display:flex;gap:8px;align-items:center"><input type="checkbox" ' + (GS.sel[u.id] ? 'checked ' : '') + 'onchange="dsV38Tog(' + Number(u.id) + ',this.checked)"><span>' + E(u.name) + ' <span class="mu">· ' + E((cls(u.classId) || {}).name || 'Sans classe') + ' · ' + E(grpName(u)) + '</span></span></label>'; }).join('') + '</div>';
  };
  window.dsV38Tog = function (id, on) { if (on) GS.sel[id] = 1; else delete GS.sel[id]; var c = document.getElementById('gsCount'); if (c) c.textContent = selCount(); };
  window.dsV38All = function (on) { pool().forEach(function (u) { if (on) GS.sel[u.id] = 1; else delete GS.sel[u.id]; }); dsV38Refresh(); };
  window.dsV38Clear = function () { GS.sel = {}; dsV38Refresh(); };
  window.dsV38Filter = function () { GS.f = { school: val('gs_school'), cls: val('gs_cls'), section: val('gs_section'), system: val('gs_system'), statut: val('gs_statut'), q: val('gs_q') }; dsV38Refresh(); };
  function opts(list, cur) { return list.map(function (x) { var a = Array.isArray(x) ? x : [x, x]; return '<option value="' + E(a[0]) + '"' + (String(a[0]) === String(cur) ? ' selected' : '') + '>' + E(a[1]) + '</option>'; }).join(''); }
  function describe() {
    var f = GS.f, p = []; if (f.school === '0') p.push('Sans groupe de répétition'); else if (f.school) p.push((sch(+f.school) || {}).name || ''); if (f.cls) p.push(f.cls); if (f.section) p.push(f.section); if (f.system) p.push(f.system);
    if (f.statut) p.push(f.statut === 'etudiant' ? 'Étudiants' : 'Élèves'); return p.filter(Boolean).join(' · ') || 'Sélection manuelle';
  }

  /* ---------------- création / gestion (super) ---------------- */
  window.dsV38Create = function () {
    if (!isSuper()) return alert('Réservé au super administrateur.');
    var title = val('gs_title'), ids = Object.keys(GS.sel).map(Number); if (!title) return alert('Donnez un nom à l’espace.'); if (!ids.length) return alert('Sélectionnez au moins un élève.');
    if (!confirm('Créer l’espace « ' + title + ' » avec ' + ids.length + ' élève(s) ?')) return;
    var sp = { id: nid(spaces()), title: title, desc: val('gs_desc'), category: describe(), students: ids, staff: [], status: 'ouvert', locked: false, by: me.id, createdAt: new Date().toISOString() };
    S.grpSpaces.push(sp); arr('grpSpaceMsgs');
    S.grpSpaceMsgs.push({ id: nid(S.grpSpaceMsgs), space: sp.id, from: me.id, text: 'Bienvenue dans l’espace « ' + title + ' ». Vous pouvez échanger ici, entre élèves, sans quitter la plateforme. Je partagerai ici des cours, des épreuves et des liens.', link: '', ts: now() });
    ids.forEach(function (i) { notify(i, '👥 Vous êtes ajouté(e) à l’espace « ' + title + ' » (' + sp.category + '). Ouvrez « Mes espaces ».'); var u = U(i); if (u && u.noLogin) parentsOf(u).forEach(function (p) { notify(p.id, '👥 ' + u.name + ' a été ajouté(e) à l’espace « ' + title + ' ».'); }); });
    L('Espace collectif créé : ' + title + ' (' + ids.length + ' élèves)'); GS.sel = {}; GS.open = sp.id; save(); render();
  };
  function mySp(id) { return spaces().filter(function (s) { return s.id == id; })[0]; }
  window.dsV38Lock = function (id) { if (!isSuper()) return; var sp = mySp(id); if (!sp) return; sp.locked = !sp.locked; S.grpSpaceMsgs.push({ id: nid(S.grpSpaceMsgs), space: sp.id, from: me.id, text: sp.locked ? '🔒 La discussion des élèves est verrouillée par le super administrateur.' : '🔓 La discussion est rouverte.', link: '', ts: now() }); save(); render(); };
  window.dsV38Close = function (id) { if (!isSuper()) return; var sp = mySp(id); if (!sp) return; var re = sp.status === 'ferme'; if (!confirm(re ? 'Rouvrir cet espace ?' : 'Terminer cet espace ? Il n’acceptera plus de messages.')) return; sp.status = re ? 'ouvert' : 'ferme'; save(); render(); };
  window.dsV38Delete = function (id) { if (!isSuper() || !confirm('Supprimer définitivement cet espace et ses messages ?')) return; S.grpSpaces = spaces().filter(function (s) { return s.id != id; }); S.grpSpaceMsgs = arr('grpSpaceMsgs').filter(function (m) { return m.space != id; }); GS.open = 0; save(); render(); };
  window.dsV38AddStudent = function (id, uidv) { if (!isSuper()) return; var sp = mySp(id), u = U(uidv); if (!sp || !u || sp.students.indexOf(uidv) >= 0) return; sp.students.push(uidv); notify(uidv, '👥 Vous êtes ajouté(e) à l’espace « ' + sp.title + ' ».'); S.grpSpaceMsgs.push({ id: nid(S.grpSpaceMsgs), space: sp.id, from: me.id, text: u.name + ' rejoint l’espace.', link: '', ts: now() }); save(); render(); };
  window.dsV38RemoveStudent = function (id, uidv) { if (!isSuper()) return; var sp = mySp(id); if (!sp) return; sp.students = sp.students.filter(function (x) { return x != uidv; }); save(); render(); };
  window.dsV38AddStaff = function (id, uidv) {
    if (!isSuper()) return; var sp = mySp(id), u = U(uidv); if (!sp || !u || (u.role !== 'prof' && u.role !== 'repetiteur') || sp.staff.indexOf(uidv) >= 0) return;
    sp.staff.push(uidv); notify(uidv, '👥 Le super administrateur vous a ajouté(e) à l’espace « ' + sp.title + ' » (' + sp.category + ') pour aider les élèves. Ouvrez « Mes espaces ».');
    S.grpSpaceMsgs.push({ id: nid(S.grpSpaceMsgs), space: sp.id, from: me.id, text: '👨‍🏫 ' + u.name + ' (' + (RL[u.role] || u.role) + ') rejoint l’espace pour aider les élèves.', link: '', ts: now() }); L('Intervenant ajouté : ' + u.name + ' → ' + sp.title); save(); render();
  };
  window.dsV38RemoveStaff = function (id, uidv) { if (!isSuper()) return; var sp = mySp(id); if (!sp) return; sp.staff = sp.staff.filter(function (x) { return x != uidv; }); save(); render(); };
  window.dsV38Send = function (id, asItem) {
    var sp = mySp(id), r = sp && role(sp); if (!sp || sp.status !== 'ouvert' || !r || r === 'parent') return;
    var t = val('gs_msg'), l = (r === 'eleve') ? '' : val('gs_link'), title = val('gs_ititle'), kind = val('gs_ikind') || 'autre', item = !!asItem && r !== 'eleve';
    if (r === 'eleve' && sp.locked) return alert('La discussion est verrouillée par le super administrateur.');
    if (l && !(r === 'eleve' ? /^https:\/\/[^\s\/]+\.[^\s\/]+\S*$/i : /^https?:\/\/\S+$/i).test(l)) return alert(r === 'eleve' ? 'Le lien doit commencer par https:// (exemple : un lien Google Drive ou YouTube).' : 'Le lien doit commencer par http:// ou https://');
    if (item && !title) return alert('Donnez un titre à l’élément partagé (ex. Épreuve de maths).'); if (!t && !l) return alert('Écrivez un message' + (r === 'eleve' ? '' : ' ou ajoutez un lien') + '.');
    S.grpSpaceMsgs.push({ id: nid(arr('grpSpaceMsgs')), space: sp.id, from: me.id, text: t, link: l, item: item, title: item ? title : '', kind: item ? kind : '', ts: now() });
    if (item) sp.students.forEach(function (i) { var u = U(i); if (u && u.noLogin) parentsOf(u).forEach(function (p) { notify(p.id, '📌 Nouvel élément dans l’espace « ' + sp.title + ' » : ' + title); }); });
    save(); render();
  };
  window.dsV38Back = function () { GS.open = 0; render(); };
  window.dsV38OpenSpace = function (id) { GS.open = id; render(); };

  /* ====================== V41 : pièces jointes, corrections, mode silencieux, blocage, « écrit… » ====================== */
  var X = { att: null, busy: false, rec: null, recT: 0, recI: 0, tAt: 0 }, BL = {}, MAXB = { image: 2e6, audio: 2.5e6, video: 3e6, doc: 3e6 };
  function prefOf(sp) { return arr('grpSpacePrefs').filter(function (p) { return p.space == sp.id && p.uid == me.id; })[0]; }
  function isSilent(sp) { var p = prefOf(sp); return !!(p && p.silent) && role(sp) === 'eleve'; }
  function isBlocked(sp) { return role(sp) !== 'super' && (sp.blocked || []).indexOf(me.id) >= 0; }
  function ko(n) { return n >= 1e6 ? (n / 1e6).toFixed(1) + ' Mo' : Math.max(1, Math.round(n / 1e3)) + ' Ko'; }
  function msgById(id) { return arr('grpSpaceMsgs').filter(function (m) { return m.id == id; })[0]; }
  function attHtml(m) {
    var a = m.att; if (!a) return ''; var f = Number(a.fid);
    if (a.kind === 'image') return '<div><img data-fid="' + f + '" alt="' + E(a.name) + '" onclick="dsV41Zoom(this)" style="max-width:100%;max-height:320px;border-radius:10px;background:rgba(127,127,127,.15);min-height:60px"></div>';
    if (a.kind === 'audio') return '<div>🎤 Message vocal<br><audio data-fid="' + f + '" controls preload="none" style="width:100%"></audio></div>';
    if (a.kind === 'video') return '<div><video data-fid="' + f + '" controls playsinline preload="metadata" style="max-width:100%;max-height:320px;border-radius:10px;background:#000"></video></div>';
    return '<div><a href="#" data-fid="' + f + '" data-name="' + E(a.name) + '" onclick="return dsV41Open(this)">📄 ' + E(a.name) + ' · ' + ko(a.size || 0) + '</a></div>';
  }
  function chatHtml(sp, chat) {
    var all = msgsOf(sp.id), fixed = {}; all.forEach(function (m) { if (m.corr && m.replyTo) fixed[m.replyTo] = 1; });
    return chat.map(function (m) {
      var mineM = m.from == me.id, u = U(m.from) || {}, o = m.corr && m.replyTo ? msgById(m.replyTo) : null;
      var bg = m.corr ? 'background:rgba(34,197,94,.12);border-left:4px solid #22c55e;border-radius:10px;padding:6px' : (mineM ? 'background:rgba(20,163,143,.08);border-radius:10px;padding:6px' : 'padding:6px');
      return '<div class="row" style="align-items:flex-start;' + bg + '"><span style="display:flex;gap:8px;align-items:flex-start;width:100%">' + av(m.from, 34) + '<span style="min-width:0;flex:1"><b>' + E(u.name || '?') + '</b> <span class="mu">' + E(RL[u.role] || '') + '</span>'
        + (m.corr ? ' <span class="tag">✅ Correction</span>' : '') + (fixed[m.id] ? ' <span class="tag">✅ Corrigé</span>' : '')
        + (o ? '<div class="mu" style="border-left:3px solid #94a3b8;padding-left:6px;margin:3px 0">↪ ' + E((U(o.from) || {}).name || '?') + ' : ' + E(String(o.text || (o.att ? 'pièce jointe' : '')).slice(0, 80)) + '</div>' : '')
        + (m.text ? '<div style="white-space:pre-wrap;overflow-wrap:anywhere">' + E(m.text) + '</div>' : '') + attHtml(m)
        + (m.link ? '<div style="overflow-wrap:anywhere"><a href="' + E(m.link) + '" target="_blank" rel="noopener noreferrer" onclick="return dsV42Link(this)">🔗 ' + E(m.link) + '</a></div>' : '') + '<div class="mu">' + E(m.ts || '') + '</div></span></span></div>';
    }).join('') || '<div class="mu" style="margin-top:6px">Aucun message pour le moment.</div>';
  }
  /* pièces jointes : chargement avec le jeton de connexion, puis affichage local */
  function getBlob(fid) {
    if (BL[fid]) return Promise.resolve(BL[fid]); var io = window.dsIO; if (!io || !io.token()) return Promise.resolve(null);
    return fetch(io.api + '/spaceio?action=file&id=' + fid, { headers: { Authorization: 'Bearer ' + io.token() }, cache: 'no-store' })
      .then(function (r) { return r.ok ? r.blob() : null; }).then(function (b) { return b ? (BL[fid] = URL.createObjectURL(b)) : null; }).catch(function () { return null; });
  }
  function hydrate() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-fid]:not([data-ok])'), function (el) {
      el.setAttribute('data-ok', '1');
      getBlob(el.getAttribute('data-fid')).then(function (u) {
        if (u) { if (el.tagName !== 'A') el.src = u; } else setTimeout(function () { el.removeAttribute('data-ok'); }, 8000);
      });
    });
  }
  var hyT = 0; try { new MutationObserver(function () { clearTimeout(hyT); hyT = setTimeout(hydrate, 120); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
  window.dsV42Link = function (a) { return confirm('Vous quittez DELTA SCHOOL pour ouvrir un site externe :\n' + (a.hostname || a.href) + '\n\nN’ouvrez que les liens de personnes de confiance. Continuer ?'); };
  window.dsV42Links = function (id) {
    if (!isSuper()) return; var sp = mySp(id); if (!sp) return; sp.noLinks = !sp.noLinks;
    S.grpSpaceMsgs.push({ id: nid(S.grpSpaceMsgs), space: sp.id, from: me.id, text: sp.noLinks ? '🔗 Le partage de liens par les élèves est suspendu.' : '🔗 Les élèves peuvent partager des liens (fichiers volumineux).', link: '', ts: now() });
    L((sp.noLinks ? 'Liens des élèves suspendus : ' : 'Liens des élèves autorisés : ') + sp.title); save(); render();
  };
  window.dsV41Zoom = function (img) { if (img && img.src) window.open(img.src, '_blank'); };
  window.dsV41Open = function (a) {
    var name = a.getAttribute('data-name') || 'document'; getBlob(a.getAttribute('data-fid')).then(function (u) {
      if (!u) return alert('Fichier indisponible pour le moment.'); var l = document.createElement('a'); l.href = u; l.target = '_blank'; l.download = name; document.body.appendChild(l); l.click(); l.remove();
    }); return false;
  };
  /* envoi d'un fichier */
  function attChip() { var el = document.getElementById('gs_att'); if (!el) return; el.innerHTML = X.busy ? '⏳ Envoi du fichier…' : (X.att ? '📎 ' + E(X.att.name) + ' (' + ko(X.att.size) + ') <a href="#" onclick="return dsV41Unatt()">✕ retirer</a>' : ''); }
  window.dsV41Unatt = function () { X.att = null; attChip(); return false; };
  function up(blob, name, mime) {
    var sp = GS.open && mySp(GS.open); if (!sp || !window.dsIO) return alert('Connexion au serveur indisponible.');
    X.busy = true; attChip(); var fr = new FileReader();
    fr.onload = function () {
      var b64 = String(fr.result).split(',')[1] || '';
      window.dsIO.call('POST', '/spaceio?action=upload', { space: sp.id, name: name, mime: mime, data: b64 }).then(function (r) {
        X.busy = false;
        if (r.ok && r.j.ok) X.att = { fid: r.j.fid, kind: r.j.kind, name: r.j.name, mime: r.j.mime, size: r.j.size }; else if (r.status === 413) tooBig('Fichier', blob.size); else alert((r.j && r.j.error) || 'Envoi impossible (vérifiez votre connexion).');
        attChip();
      });
    };
    fr.onerror = function () { X.busy = false; attChip(); alert('Fichier illisible.'); }; fr.readAsDataURL(blob);
  }
  function shrink(file, cb) {
    var img = new Image(), u = URL.createObjectURL(file);
    img.onload = function () { var k = Math.min(1, 1280 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); c.toBlob(cb, 'image/jpeg', 0.72); };
    img.onerror = function () { URL.revokeObjectURL(u); cb(null); }; img.src = u;
  }
  function tooBig(what, size) {
    var sp = GS.open && mySp(GS.open), can = sp && !sp.noLinks;
    alert(what + ' trop lourd (' + ko(size) + ', maximum 3 Mo).' + (can ? '\n\nEnvoyez plutôt un lien : mettez le fichier sur Google Drive, YouTube ou un autre site, activez le partage « toute personne disposant du lien », puis collez le lien dans le champ « 🔗 Lien ».' : '\n\nRéduisez le fichier ou filmez une séquence plus courte.'));
    var el = document.getElementById('gs_link'); if (can && el) { try { el.focus(); } catch (e) {} }
  }
  window.dsV41File = function (input, kind) {
    var f = input.files && input.files[0]; input.value = ''; try { input.blur(); } catch (e) {} if (!f) return;
    if (kind === 'image') return shrink(f, function (b) { if (!b) return alert('Photo illisible. Choisissez une photo JPEG ou PNG.'); up(b, (f.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg', 'image/jpeg'); });
    var mime = f.type || (/\.pdf$/i.test(f.name) ? 'application/pdf' : /\.docx$/i.test(f.name) ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : /\.doc$/i.test(f.name) ? 'application/msword' : '');
    if (kind === 'doc' && !/^application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/.test(mime)) return alert('Seuls les fichiers PDF ou Word (.doc, .docx) sont acceptés.');
    if (f.size > MAXB[kind]) return tooBig(kind === 'video' ? 'Vidéo' : 'Fichier', f.size);
    up(f, f.name || 'fichier', mime);
  };
  window.dsV41Pick = function (id) { var el = document.getElementById(id); if (el) el.click(); };
  function recBtn(sec) { var b = document.getElementById('gs_rec'); if (b) b.textContent = X.rec ? '⏹ Arrêter (' + (sec || 0) + ' s)' : '🎤 Vocal'; }
  window.dsV41Rec = function () {
    if (X.rec) { X.rec.stop(); return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) return alert('L’enregistrement vocal n’est pas pris en charge sur cet appareil.');
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
      var ch = [], opt = { audioBitsPerSecond: 24000 }; try { if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) opt.mimeType = 'audio/webm;codecs=opus'; } catch (e) {}
      var mr = new MediaRecorder(stream, opt); X.rec = mr; X.recT = Date.now();
      mr.ondataavailable = function (e) { if (e.data && e.data.size) ch.push(e.data); };
      mr.onstop = function () { stream.getTracks().forEach(function (t) { t.stop(); }); clearInterval(X.recI); X.rec = null; recBtn(); var type = String(mr.mimeType || 'audio/webm').split(';')[0]; if (ch.length) up(new Blob(ch, { type: type }), 'vocal.' + (type.indexOf('mp4') >= 0 ? 'm4a' : 'webm'), type); };
      mr.start(); recBtn(0); X.recI = setInterval(function () { var s = Math.round((Date.now() - X.recT) / 1000); recBtn(s); if (s >= 120) mr.stop(); }, 500);
    }).catch(function () { alert('Autorisez le micro pour enregistrer un message vocal.'); });
  };
  /* indicateur « X écrit… » et rafraîchissement rapide pendant qu'un espace est ouvert */
  window.dsV41Typing = function (id) { if (Date.now() - X.tAt < 3000 || !window.dsIO) return; X.tAt = Date.now(); window.dsIO.call('POST', '/spaceio?action=typing', { space: id }); };
  window.dsLiveUpdate = function () {
    try { var el = document.getElementById('gs_chat'); if (!el || !GS.open) return; var sp = mySp(GS.open); if (!sp || isSilent(sp)) return; var par = el.parentNode, near = par.scrollHeight - par.scrollTop - par.clientHeight < 60 || true;
      el.innerHTML = chatHtml(sp, msgsOf(sp.id).filter(function (m) { return !m.item; }).slice(-120)); setRead(sp); hydrate(); } catch (e) {}
  };
  setInterval(function () {
    if (!GS.open || document.hidden || typeof me === 'undefined' || !me || !window.dsIO || !document.getElementById('gs_chat')) return;
    var sp = mySp(GS.open); if (!sp) return; window.dsIO.pull();
    window.dsIO.call('GET', '/spaceio?action=who&space=' + sp.id).then(function (r) {
      var el = document.getElementById('gs_typing'); if (!el) return; var w = (r.j && r.j.who) || [];
      el.textContent = w.length ? '✍️ ' + w.map(function (x) { return x.name; }).join(', ') + (w.length > 1 ? ' écrivent…' : ' écrit…') : '';
    });
  }, 3000);
  /* mode silencieux (élève) : il ne voit plus la discussion, ne peut pas écrire ni quitter l'espace */
  window.dsV41Silent = function (id, on) {
    var sp = mySp(id); if (!sp || role(sp) !== 'eleve') return;
    if (on && !confirm('Ne plus participer à la discussion ?\nVous ne verrez plus ce qui s’y dit et vous ne pourrez plus écrire. Vous ne pouvez pas quitter l’espace : seul le super administrateur peut vous retirer. Vous pouvez reprendre la discussion quand vous voulez.')) return;
    var p = prefOf(sp); if (!p) { p = { id: nid(arr('grpSpacePrefs')), space: sp.id, uid: me.id, silent: !!on, ts: now() }; arr('grpSpacePrefs').push(p); } else { p.silent = !!on; p.ts = now(); }
    save(); render();
  };
  /* blocage par le super administrateur : membres en lecture seule jusqu'à autorisation */
  window.dsV41Block = function (id, uidv, on) {
    if (!isSuper()) return; var sp = mySp(id), u = U(uidv); if (!sp || !u) return;
    sp.blocked = (sp.blocked || []).filter(function (x) { return x != uidv; }); if (on) sp.blocked.push(uidv);
    S.grpSpaceMsgs.push({ id: nid(S.grpSpaceMsgs), space: sp.id, from: me.id, text: on ? '🔇 ' + u.name + ' est en lecture seule (écriture bloquée par le super administrateur).' : '🔊 ' + u.name + ' peut de nouveau écrire.', link: '', ts: now() });
    notify(uidv, on ? '🔇 Le super administrateur a mis votre écriture en pause dans l’espace « ' + sp.title + ' » : vous pouvez lire seulement.' : '🔊 Vous pouvez de nouveau écrire dans l’espace « ' + sp.title + ' ».');
    L((on ? 'Écriture bloquée : ' : 'Écriture autorisée : ') + u.name + ' → ' + sp.title); save(); render();
  };
  window.dsV41BlockAll = function (id, on) {
    if (!isSuper()) return; var sp = mySp(id); if (!sp) return;
    if (on && !confirm('Mettre tous les membres en lecture seule ?')) return;
    sp.blocked = on ? (sp.students || []).concat(sp.staff || []) : [];
    S.grpSpaceMsgs.push({ id: nid(S.grpSpaceMsgs), space: sp.id, from: me.id, text: on ? '🔇 Tous les membres sont en lecture seule (décision du super administrateur).' : '🔊 Tous les membres peuvent de nouveau écrire.', link: '', ts: now() });
    L((on ? 'Espace en lecture seule : ' : 'Espace réouvert à l’écriture : ') + sp.title); save(); render();
  };
  /* envoi d'un message : texte, pièce jointe, correction */
  window.dsV38Send = function (id, asItem) {
    var sp = mySp(id), r = sp && role(sp); if (!sp || sp.status !== 'ouvert' || !r || r === 'parent') return;
    if (isBlocked(sp)) return alert('Le super administrateur a bloqué votre écriture : vous êtes en lecture seule.');
    if (r === 'eleve' && isSilent(sp)) return alert('Vous êtes en mode silencieux.');
    if (r === 'eleve' && sp.locked) return alert('La discussion est verrouillée par le super administrateur.');
    if (X.busy) return alert('Envoi du fichier en cours, patientez un instant.');
    var t = val('gs_msg'), l = (r === 'eleve' && sp.noLinks) ? '' : val('gs_link'), title = val('gs_ititle'), kind = val('gs_ikind') || 'autre', item = !!asItem && r !== 'eleve';
    var corr = r !== 'eleve' && !!(document.getElementById('gs_corr') || {}).checked, rt = Number(val('gs_reply')) || 0, att = X.att;
    if (l && !(r === 'eleve' ? /^https:\/\/[^\s\/]+\.[^\s\/]+\S*$/i : /^https?:\/\/\S+$/i).test(l)) return alert(r === 'eleve' ? 'Le lien doit commencer par https:// (exemple : un lien Google Drive ou YouTube).' : 'Le lien doit commencer par http:// ou https://');
    if (item && !title) return alert('Donnez un titre à l’élément partagé (ex. Épreuve de maths).');
    if (!t && !l && !att) return alert('Écrivez un message, ajoutez une pièce jointe' + (r === 'eleve' ? '.' : ' ou un lien.'));
    var m = { id: nid(arr('grpSpaceMsgs')), space: sp.id, from: me.id, text: t, link: l, item: item, title: item ? title : '', kind: item ? kind : '', ts: now() };
    if (att) m.att = att; if (corr) { m.corr = true; if (rt) m.replyTo = rt; }
    S.grpSpaceMsgs.push(m); X.att = null;
    if (corr && rt) { var o = msgById(rt); if (o && o.from != me.id && isSuper()) notify(o.from, '✅ Votre exercice a été corrigé dans l’espace « ' + sp.title + ' ».'); }
    if (item) sp.students.forEach(function (i) { var u = U(i); if (u && u.noLogin) parentsOf(u).forEach(function (p) { notify(p.id, '📌 Nouvel élément dans l’espace « ' + sp.title + ' » : ' + title); }); });
    save(); render();
  };

  /* ---------------- affichages ---------------- */
  function staffCandidates(sp) {
    function profStat(u) { var mat = u.matieres || [], g = (S.grades || []).filter(function (x) { return x.school == u.school && (!mat.length || mat.indexOf(x.subject) >= 0); }); return g.length ? { avg: wavg(g), n: g.length } : null; }
    function repStat(u) { return (S.repSpaces || []).filter(function (s) { return (s.members || []).indexOf(u.id) >= 0; }).length + spaces().filter(function (s) { return (s.staff || []).indexOf(u.id) >= 0; }).length; }
    return (S.users || []).filter(function (u) { return (u.role === 'prof' || u.role === 'repetiteur') && u.active !== false && sp.staff.indexOf(u.id) < 0; }).map(function (u) {
      var on = online(u.id), st = u.role === 'prof' ? profStat(u) : null, rep = u.role === 'repetiteur' ? (S.reps || []).filter(function (r) { return r.uid === u.id; })[0] : null, nb = u.role === 'repetiteur' ? repStat(u) : 0;
      var perf = u.role === 'prof' ? (st ? 'Moyenne des élèves dans ses matières : ' + st.avg.toFixed(1) + '/20 (' + st.n + ' notes)' : 'Aucune note saisie') : ('Accompagnements : ' + nb + (rep ? ' · abonnement ' + (repOk(rep) ? 'actif' : 'inactif') : ''));
      var score = u.role === 'prof' ? (st ? st.avg : 0) : nb * 2 + (rep && repOk(rep) ? 5 : 0);
      return { u: u, on: on, perf: perf, score: score, ok: u.role === 'prof' ? true : !!(rep && repOk(rep)) };
    }).sort(function (a, b) { return (b.on - a.on) || (b.score - a.score); });
  }
  function spaceView(sp) {
    setRead(sp); var r = role(sp), su = r === 'super', open = sp.status === 'ouvert', ms = msgsOf(sp.id), items = ms.filter(function (m) { return m.item; }).reverse(), chat = ms.filter(function (m) { return !m.item; }).slice(-120);
    var h = '<div>' + btn('← Retour', 'dsV38Back()') + '</div><div class="card"><b>👥 ' + E(sp.title) + '</b> <span class="tag">' + (open ? '🟢 Ouvert' : '⚪ Terminé') + '</span>' + (sp.locked ? ' <span class="tag">🔒 Discussion verrouillée</span>' : '') + '<div class="mu">' + E(sp.category) + (sp.desc ? ' — ' + E(sp.desc) : '') + '</div>'
      + '<div style="margin-top:6px">' + who(sp.by) + (sp.staff || []).map(function (x) { return who(x); }).join('') + '</div><details style="margin-top:4px"><summary class="mu">' + sp.students.length + ' élève(s)</summary>' + sp.students.map(function (x) { return who(x, 24) + (su ? btn('✕', 'dsV38RemoveStudent(' + Number(sp.id) + ',' + Number(x) + ')') : ''); }).join('<br>') + '</details>' + (r === 'parent' ? '<div class="mu" style="margin-top:6px">👁 Vous suivez cet espace en lecture seule, car votre enfant en est membre.</div>' : '') + '</div>';
    h += '<div class="card"><b>📌 Éléments partagés (' + items.length + ')</b>' + (items.map(function (m) { var k = KIND[m.kind] || KIND.autre; return '<div class="row" style="align-items:flex-start"><span><b>' + k[0] + ' ' + E(m.title) + '</b> <span class="mu">' + k[1] + ' · ' + E((U(m.from) || {}).name || '') + ' · ' + E(m.ts) + '</span>' + (m.text ? '<div style="white-space:pre-wrap">' + E(m.text) + '</div>' : '') + (m.link ? '<div><a href="' + E(m.link) + '" target="_blank" rel="noopener noreferrer">🔗 Ouvrir</a></div>' : '') + '</span></div>'; }).join('') || '<div class="mu" style="margin-top:6px">Aucun élément partagé pour le moment.</div>') + '</div>';
    var silentMe = r === 'eleve' && isSilent(sp), blockedMe = isBlocked(sp);
    if (silentMe) {
      h += '<div class="card"><b>🔕 Mode silencieux</b><div class="mu">Vous ne voyez pas la discussion et vous n’écrivez pas. Les éléments partagés restent visibles. Vous ne pouvez pas quitter cet espace : seul le super administrateur peut vous retirer.</div>' + btn('💬 Reprendre la discussion', 'dsV41Silent(' + Number(sp.id) + ',false)', 'p') + '</div>';
    } else {
      h += '<div class="card"><b>💬 Discussion</b><div id="gs_typing" class="mu" style="min-height:18px"></div><div id="gs_chat">' + chatHtml(sp, chat) + '</div>' + (r === 'eleve' ? '<div style="margin-top:8px">' + btn('🔕 Ne plus participer à la discussion', 'dsV41Silent(' + Number(sp.id) + ',true)') + '</div>' : '') + '</div>';
    }
    if (open && r && r !== 'parent' && !silentMe) {
      if (blockedMe) h += '<div class="card mu">🔇 Lecture seule : le super administrateur a suspendu votre écriture. Vous pourrez écrire dès qu’il l’autorisera.</div>';
      else if (r === 'eleve' && sp.locked) h += '<div class="card mu">🔒 La discussion est verrouillée par le super administrateur.</div>';
      else {
        var sid = Number(sp.id), cands = ms.filter(function (m) { return !m.item && !m.corr && (sp.students || []).indexOf(m.from) >= 0; }).slice(-30).reverse();
        h += '<div class="card"><textarea id="gs_msg" rows="3" oninput="dsV41Typing(' + sid + ')" placeholder="Votre message…" style="width:100%;padding:10px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx)"></textarea>'
          + '<div id="gs_att" class="mu"></div><div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0">'
          + btn('📷 Photo', "dsV41Pick('gs_f_cam')") + btn('🖼️ Galerie', "dsV41Pick('gs_f_gal')") + btn('📄 PDF / Word', "dsV41Pick('gs_f_doc')")
          + '<button class="s" id="gs_rec" style="padding:6px 10px;font-size:13px" onclick="dsV41Rec()">🎤 Vocal</button>' + btn('🎥 Vidéo', "dsV41Pick('gs_f_vid')") + '</div>'
          + '<input type="file" id="gs_f_cam" accept="image/*" capture="environment" style="display:none" onchange="dsV41File(this,\'image\')">'
          + '<input type="file" id="gs_f_gal" accept="image/*" style="display:none" onchange="dsV41File(this,\'image\')">'
          + '<input type="file" id="gs_f_doc" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style="display:none" onchange="dsV41File(this,\'doc\')">'
          + '<input type="file" id="gs_f_vid" accept="video/*" capture="environment" style="display:none" onchange="dsV41File(this,\'video\')">'
          + (r === 'eleve' ? (sp.noLinks ? '<div class="mu">🔗 Le partage de liens est suspendu dans cet espace.</div>' : '<input id="gs_link" placeholder="🔗 Fichier trop lourd ? Collez un lien https:// (Drive, YouTube…)"><div class="mu">Le lien doit être partagé en « toute personne disposant du lien » pour que tous puissent l’ouvrir.</div>') : '<label class="mu" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="gs_corr" style="width:auto;margin:0"> ✅ Ceci est une correction</label><select id="gs_reply"><option value="">Correction générale (non liée à un message)</option>' + cands.map(function (m) { return '<option value="' + Number(m.id) + '">' + E(((U(m.from) || {}).name || '?') + ' — ' + (m.att ? '📎 ' : '') + String(m.text || 'pièce jointe').slice(0, 40)) + '</option>'; }).join('') + '</select>'
            + '<input id="gs_link" placeholder="Lien (facultatif) https://…"><div class="mu">Partager comme élément épinglé :</div><input id="gs_ititle" placeholder="Titre de l’élément (ex. Épreuve de maths)"><select id="gs_ikind">' + Object.keys(KIND).map(function (k) { return '<option value="' + k + '">' + KIND[k][0] + ' ' + KIND[k][1] + '</option>'; }).join('') + '</select>')
          + '<button onclick="dsV38Send(' + sid + ',false)">Envoyer</button>' + (r === 'eleve' ? '' : ' <button onclick="dsV38Send(' + sid + ',true)">📌 Partager l’élément</button>') + '</div>';
      }
    } else if (!open) h += '<div class="card mu">Cet espace est terminé : il n’accepte plus de messages.</div>';
    if (su) {
      var counts = {}; ms.forEach(function (m) { counts[m.from] = (counts[m.from] || 0) + 1; }); var act = sp.students.filter(function (x) { return counts[x]; }), silent = sp.students.filter(function (x) { return !counts[x]; });
      var mem = (sp.students || []).concat(sp.staff || []), blk = sp.blocked || [], silentIds = arr('grpSpacePrefs').filter(function (p) { return p.space == sp.id && p.silent; }).map(function (p) { return p.uid; });
      h += '<div class="card"><b>🔇 Qui peut écrire ?</b><div class="mu">Un membre bloqué devient lecteur : il voit tout mais n’écrit plus, jusqu’à ce que vous l’autorisiez. Vous seul pouvez bloquer.</div><div style="margin:6px 0">' + btn('🔇 Tout le monde en lecture seule', 'dsV41BlockAll(' + Number(sp.id) + ',true)') + ' ' + btn('🔊 Autoriser tout le monde', 'dsV41BlockAll(' + Number(sp.id) + ',false)', 'p') + ' ' + btn(sp.noLinks ? '🔗 Autoriser les liens des élèves' : '🔗 Suspendre les liens des élèves', 'dsV42Links(' + Number(sp.id) + ')') + '</div>'
        + (mem.map(function (x) { var b = blk.indexOf(x) >= 0; return '<div class="row"><span>' + who(x, 24) + (b ? ' <span class="tag">🔇 lecture seule</span>' : '') + (silentIds.indexOf(x) >= 0 ? ' <span class="tag">🔕 silencieux</span>' : '') + '</span>' + btn(b ? '🔊 Autoriser' : '🔇 Bloquer', 'dsV41Block(' + Number(sp.id) + ',' + Number(x) + ',' + (b ? 'false' : 'true') + ')', b ? 'p' : 's') + '</div>'; }).join('') || '<div class="mu">Aucun membre.</div>') + '</div>';
      h += '<div class="card"><b>📊 Participation</b>' + kgrid([kpi('Élèves actifs', act.length + '/' + sp.students.length), kpi('Messages', ms.length), kpi('Éléments partagés', items.length)]) + (silent.length ? '<div class="mu">Pas encore intervenus : ' + silent.slice(0, 12).map(function (x) { return E((U(x) || {}).name || '?'); }).join(', ') + (silent.length > 12 ? '…' : '') + '</div>' : '') + '</div>';
      var cand = staffCandidates(sp).slice(0, 20);
      h += '<div class="card"><b>👨‍🏫 Ajouter un enseignant ou un répétiteur</b><div class="mu">Vous seul pouvez ajouter des intervenants. La liste montre ceux qui sont connectés (🟢) et leurs indicateurs de performance.</div>' + (cand.map(function (x) { return '<div class="row"><span style="display:flex;gap:8px;align-items:center">' + av(x.u.id, 34) + '<span><b>' + E(x.u.name) + '</b> <span class="mu">' + E(RL[x.u.role]) + '</span><div class="mu">' + (x.on ? '🟢 connecté' : '⚪ hors ligne') + ' · ' + E(x.perf) + (x.ok ? '' : ' · ⚠️ abonnement inactif') + '</div></span></span>' + btn('Ajouter', 'dsV38AddStaff(' + Number(sp.id) + ',' + Number(x.u.id) + ')', 'p') + '</div>'; }).join('') || '<div class="mu">Aucun enseignant ou répétiteur disponible.</div>') + '</div>';
      if ((sp.staff || []).length) h += '<div class="card"><b>Intervenants de cet espace</b>' + sp.staff.map(function (x) { return '<div class="row"><span>' + who(x) + '</span>' + btn('Retirer', 'dsV38RemoveStaff(' + Number(sp.id) + ',' + Number(x) + ')') + '</div>'; }).join('') + '</div>';
      var inSp = sp.students, add = (S.users || []).filter(function (u) { return u.role === 'eleve' && u.active !== false && inSp.indexOf(u.id) < 0 && (!GS.sq || nrm(u.name + ' ' + (cls(u.classId) || {}).name).indexOf(nrm(GS.sq)) >= 0); }).slice(0, 15);
      h += '<div class="card"><b>➕ Ajouter des élèves</b><input id="gs_sq" placeholder="Rechercher un nom ou une classe" value="' + E(GS.sq) + '" onchange="GS38Search()">' + (add.map(function (u) { return '<div class="row"><span>' + who(u.id, 26) + '<span class="mu">' + E((cls(u.classId) || {}).name || '') + ' · ' + E(grpName(u)) + '</span></span>' + btn('Ajouter', 'dsV38AddStudent(' + Number(sp.id) + ',' + Number(u.id) + ')') + '</div>'; }).join('') || '<div class="mu">Aucun autre élève.</div>') + '</div>';
      h += '<div class="card">' + btn(sp.locked ? '🔓 Rouvrir la discussion des élèves' : '🔒 Verrouiller la discussion des élèves', 'dsV38Lock(' + Number(sp.id) + ')') + ' ' + btn(open ? 'Terminer l’espace' : 'Rouvrir l’espace', 'dsV38Close(' + Number(sp.id) + ')') + ' ' + btn('🗑️ Supprimer', 'dsV38Delete(' + Number(sp.id) + ')') + '</div>';
    }
    return h;
  }
  window.GS38Search = function () { GS.sq = val('gs_sq'); render(); };
  function row(sp) { var n = unread(sp); return '<div class="row"><span><b>👥 ' + E(sp.title) + '</b>' + (n ? ' <span style="background:#e11d48;color:#fff;border-radius:8px;padding:1px 7px;font-size:12px">' + n + '</span>' : '') + '<div class="mu">' + E(sp.category) + ' · ' + sp.students.length + ' élève(s)' + ((sp.staff || []).length ? ' · ' + sp.staff.length + ' intervenant(s)' : '') + ' · ' + (sp.status === 'ouvert' ? '🟢 Ouvert' : '⚪ Terminé') + '</div></span>' + btn('Ouvrir', 'dsV38OpenSpace(' + Number(sp.id) + ')', 'p') + '</div>'; }
  function listView() {
    if (GS.open) { var cur = mySp(GS.open); if (cur && role(cur)) return spaceView(cur); GS.open = 0; }
    var l = mine(), h = '<h2>👥 ' + (isSuper() ? 'Espaces de classe et de catégorie' : 'Mes espaces') + '</h2>';
    if (isSuper()) {
      var schools = (S.schools || []).map(function (s) { return [s.id, s.name]; }), cn = {}; (S.classes || []).forEach(function (c) { if (!GS.f.school || GS.f.school === '0' || String(c.school) === GS.f.school) cn[c.name] = 1; });
      h += '<div class="sim">Regroupez des élèves d’une même classe ou catégorie dans un espace de la plateforme : vous leur envoyez des éléments, ils échangent entre eux, et vous seul ajoutez des enseignants ou répétiteurs pour les aider.</div>'
        + '<div class="card"><b>1. L’espace</b><input id="gs_title" placeholder="Nom (ex. 3ème A — Maths)"><input id="gs_desc" placeholder="Description (facultatif)"></div>'
        + '<div class="card"><b>2. Les élèves</b> — <b id="gsCount">' + selCount() + '</b> sélectionné(s)<select id="gs_school" onchange="dsV38Filter()"><option value="">Tous les groupes de répétition</option><option value="0"' + (GS.f.school === '0' ? ' selected' : '') + '>Sans groupe de répétition</option>' + opts(schools, GS.f.school) + '</select>'
        + '<select id="gs_cls" onchange="dsV38Filter()"><option value="">Toutes les classes</option>' + opts(Object.keys(cn).sort(), GS.f.cls) + '</select><select id="gs_section" onchange="dsV38Filter()"><option value="">Toutes les sections</option>' + opts((S.cfg && S.cfg.sections) || [], GS.f.section) + '</select><select id="gs_system" onchange="dsV38Filter()"><option value="">Tous les systèmes</option>' + opts((S.cfg && S.cfg.systems) || [], GS.f.system) + '</select>'
        + '<select id="gs_statut" onchange="dsV38Filter()"><option value="">Élèves et étudiants</option><option value="eleve"' + (GS.f.statut === 'eleve' ? ' selected' : '') + '>Élèves</option><option value="etudiant"' + (GS.f.statut === 'etudiant' ? ' selected' : '') + '>Étudiants</option></select><input id="gs_q" value="' + E(GS.f.q) + '" placeholder="Rechercher un nom, matricule…" oninput="dsV38Filter()"><div id="gsList"></div></div>'
        + '<div class="card"><button onclick="dsV38Create()">👥 Créer l’espace avec la sélection</button></div>';
      setTimeout(dsV38Refresh, 30);
    }
    return h + '<div class="card"><b>' + (isSuper() ? 'Espaces créés' : 'Mes espaces') + ' (' + l.length + ')</b>' + (l.map(row).join('') || '<div class="mu" style="margin-top:6px">Aucun espace pour le moment.</div>') + '</div>';
  }
  VIEWS.espclasse = listView;

  /* ---------------- onglets ---------------- */
  var _tabs = window.tabsOf;
  if (typeof _tabs === 'function') window.tabsOf = function () {
    var t = _tabs.apply(this, arguments) || []; if (!me) return t; var has = t.some(function (x) { return x[0] === 'espclasse'; }); if (has) return t;
    if (isSuper()) tabAfter(t, 'espacesrep', ['espclasse', '👥', 'Espaces de classe']);
    else { var l = mine(); if (l.length) { var n = l.reduce(function (s, sp) { return s + unread(sp); }, 0); tabAfter(t, 'msg', ['espclasse', '👥', 'Mes espaces' + (n ? ' (' + n + ')' : '')]); } }
    return t;
  };

  /* ---------------- messagerie parent ↔ groupe/enseignants ---------------- */
  var _targets = window.targets;
  if (typeof _targets === 'function') window.targets = function () {
    var t = _targets.apply(this, arguments) || []; if (!me || me.role === 'super') return t;
    var extra = [], m = function (u) { return [u.id, u.name + ' (' + (RL[u.role] || u.role) + ')']; };
    var all = S.users || [];
    if (me.role === 'parent') {
      (me.kids || []).map(U).filter(function (k) { return k && k.school; }).forEach(function (k) {
        all.filter(function (u) { return u.active !== false && u.school == k.school && (u.role === 'chef' || (u.role === 'prof' && (!(u.classes || []).length || (u.classes || []).indexOf(k.classId) >= 0))); }).forEach(function (u) { extra.push(m(u)); });
      });
    } else if (me.role === 'prof' || me.role === 'chef') {
      var ids = all.filter(function (u) { return u.role === 'eleve' && u.school == me.school && (me.role === 'chef' || !(me.classes || []).length || (me.classes || []).indexOf(u.classId) >= 0); }).map(function (u) { return u.id; });
      all.filter(function (p) { return p.role === 'parent' && p.active !== false && (p.kids || []).some(function (k) { return ids.indexOf(k) >= 0; }); }).forEach(function (p) { extra.push(m(p)); });
    }
    return t.concat(extra).filter(function (x, i, a) { return a.findIndex(function (y) { return y[0] === x[0]; }) === i; });
  };

  /* ---------------- indicateur sur le tableau de bord du super administrateur ---------------- */
  var _dash = VIEWS.dash;
  if (typeof _dash === 'function') VIEWS.dash = function () {
    var h = _dash.apply(this, arguments);
    if (isSuper()) { try { var sp = spaces(), op = sp.filter(function (s) { return s.status === 'ouvert'; }), st = {}; op.forEach(function (s) { s.students.forEach(function (i) { st[i] = 1; }); }); h += '<h3>👥 Espaces de classe</h3>' + kgrid([kpi('Espaces ouverts', op.length), kpi('Élèves regroupés', Object.keys(st).length), kpi('Messages échangés', arr('grpSpaceMsgs').length)]) + '<div>' + btn('Gérer les espaces', "go('espclasse')", 'p') + '</div>'; } catch (e) { } }
    return h;
  };
})();
