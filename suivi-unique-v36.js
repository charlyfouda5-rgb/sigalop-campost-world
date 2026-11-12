/* DELTA SCHOOL V36 — Groupe de répétition, numéro de suivi unique et suivi direct par le super administrateur.
 *
 * Règles :
 *  1. Chaque élève n'a qu'UN SEUL numéro de suivi (SUI-…). Il est enregistré dans le compte du groupe de répétition
 *     auquel l'élève appartient ; le parent le saisit dans « Mes enfants » pour suivre les informations de l'élève.
 *  2. Si l'élève n'est dans aucun groupe de répétition, c'est le super administrateur qui lui attribue ce numéro. Le numéro
 *     arrive dans le compte du parent, l'élève n'est pas isolé : le parent et le super administrateur le suivent, et le
 *     super administrateur prend la responsabilité de montrer sa progression (journal de progression visible du parent).
 *  3. Quand un élève suivi en direct est ensuite rattaché à un groupe, il GARDE son numéro (voir linkE dans index.html).
 *
 * Le rôle technique « chef » est conservé en interne (compatibilité base de données et API) : seul son libellé change
 * (« Groupe de répétition »).
 */
(function () {
  'use strict';
  function arr(k) { if (!Array.isArray(S[k])) S[k] = []; return S[k]; }
  function E(x) { return typeof esc === 'function' ? esc(String(x == null ? '' : x)) : String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function isSuper() { return !!me && me.role === 'super'; }
  function stu(id) { return (S.users || []).filter(function (x) { return x.id == id && x.role === 'eleve'; })[0]; }
  function direct(u) { return !!u && u.role === 'eleve' && !u.school; }
  function val(id) { var el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; }
  function iso() { return new Date().toISOString(); }
  function day() { return new Date().toISOString().slice(0, 10); }
  function rnd(n) { var a = new Uint8Array(n); if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a); else for (var i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256); return Array.prototype.map.call(a, function (b) { return b.toString(16).padStart(2, '0'); }).join(''); }
  function respName(u) { var r = u && u.responsableId ? (S.users || []).filter(function (x) { return x.id == u.responsableId; })[0] : null; return r ? r.name : 'Super administrateur'; }
  function parentsOf(u) { return (S.users || []).filter(function (p) { return p.role === 'parent' && (p.kids || []).indexOf(u.id) >= 0; }); }
  var SD = { sel: 0, pre: null };

  /* ---------- migration légère des données déjà enregistrées ---------- */
  var migrated = false;
  function migrate() {
    if (migrated || typeof S === 'undefined' || !S) return; migrated = true;
    arr('suiviOps'); arr('suiviProgress');
    (S.users || []).forEach(function (u) {
      if (u.role === 'chef' && /^Chef(\s|$|–)/.test(u.name || '')) u.name = String(u.name).replace(/^Chef/, 'Groupe');
      if (u.role === 'eleve' && u.code && !u.suiviMode) u.suiviMode = u.school ? 'groupe' : 'super';
    });
  }
  var _render = window.render;
  if (typeof _render === 'function') window.render = function () { migrate(); return _render.apply(this, arguments); };

  /* ---------- progression suivie par le super administrateur ---------- */
  function progressOf(u) { return arr('suiviProgress').filter(function (x) { return x.student == u.id; }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)) || (b.id - a.id); }); }
  function hasScore(x) { return typeof x.score === 'number' && !isNaN(x.score); }
  function average(list) { var n = 0, t = 0; list.forEach(function (x) { if (hasScore(x)) { n++; t += x.score; } }); return n ? t / n : null; }
  function bars(list) {
    var pts = list.filter(hasScore).slice(0, 8).reverse(); if (!pts.length) return '';
    return '<div style="display:flex;gap:4px;align-items:flex-end;height:60px;margin:8px 0">' + pts.map(function (x) { var h = Math.max(4, Math.round(x.score / 20 * 56)); return '<div title="' + E(x.date + ' · ' + x.rubric + ' : ' + x.score + '/20') + '" style="flex:1;max-width:28px;height:' + h + 'px;background:var(--ac);border-radius:4px 4px 0 0"></div>'; }).join('') + '</div>';
  }
  function entry(x, canDel) {
    return '<div class="row"><span><b>' + E(x.rubric || 'Progression') + '</b> · ' + E(x.date) + (x.comment ? '<div class="mu">' + E(x.comment) + '</div>' : '') + '</span><span>' + (hasScore(x) ? '<b>' + x.score + '/20</b>' : '') + (canDel ? ' <button class="s" style="padding:4px 8px;font-size:12px" onclick="dsV36DelProgress(' + Number(x.id) + ')">✕</button>' : '') + '</span></div>';
  }
  function stats(p, a) { return '<div style="margin:8px 0"><b style="font-size:20px">' + (a == null ? '—' : a.toFixed(1) + '/20') + '</b> <span class="mu">moyenne suivie · ' + p.filter(hasScore).length + ' évaluation(s) · mise à jour ' + E(p[0].date) + '</span></div>'; }
  function directCard(u, self) {
    var p = progressOf(u), a = average(p), who = respName(u);
    var intro = self
      ? 'Vous n’êtes dans aucun groupe de répétition : votre suivi est assuré directement par le super administrateur (' + E(who) + '), qui est responsable de montrer votre progression. Votre parent la suit aussi dans son compte.'
      : 'Cet élève n’est dans aucun groupe de répétition : son suivi est assuré directement par le super administrateur (' + E(who) + '), qui est responsable de montrer sa progression.';
    return '<div class="card"><b>' + E(u.name) + '</b> <span class="tag">Suivi direct</span>'
      + '<div class="mu">N° de suivi unique : <b>' + E(u.code || 'en attente d’attribution') + '</b>' + (u.niveau ? ' · ' + E(u.niveau) : '') + '</div>'
      + '<div class="mu">' + intro + '</div>'
      + (p.length ? stats(p, a) + bars(p) + p.slice(0, 15).map(function (x) { return entry(x, false); }).join('')
        : '<div class="mu" style="margin-top:6px">Aucune progression publiée pour le moment : le super administrateur l’affichera ici.</div>')
      + (!self && me && me.role === 'parent' ? '<div style="margin-top:8px">' + btn('Retirer cet enfant', 'unlinkKid(' + Number(u.id) + ')') + '</div>' : '')
      + '</div>';
  }

  /* ---------- affichages parent / élève ---------- */
  function run(fn, args, ctx) {
    var all = (me.kids || []).slice(), dk = [], keep = [];
    all.forEach(function (id) { var u = stu(id); if (u && direct(u)) dk.push(u); else keep.push(id); });
    if (!dk.length) return { html: fn.apply(ctx, args), dk: dk };
    me.kids = keep; var html;
    try { html = fn.apply(ctx, args); } finally { me.kids = all; }
    return { html: html, dk: dk };
  }
  function directRequestCard() {
    return '<div class="card"><b>🧭 Mon enfant n’est dans aucun groupe de répétition</b><div class="mu">Demandez un suivi direct : le super administrateur attribue à votre enfant son numéro de suivi unique, vous l’envoie dans votre messagerie, ajoute l’enfant à votre compte et prend la responsabilité de montrer sa progression.</div>'
      + '<input id="sdq_name" placeholder="Nom complet de l’enfant"><input id="sdq_level" placeholder="Classe ou niveau (facultatif)"><input id="sdq_birth" type="date" title="Date de naissance (facultatif)"><input id="sdq_note" placeholder="Précisions utiles (facultatif)">'
      + '<button onclick="dsV36RequestDirect()">Envoyer ma demande</button></div>';
  }
  var _enf = VIEWS.enf;
  if (typeof _enf === 'function') VIEWS.enf = function () {
    if (!me || me.role !== 'parent') return _enf.apply(this, arguments);
    var r = run(_enf, arguments, this), html = r.html;
    if (r.dk.length) html = html.replace(/<div class="card mu">Aucun enfant lié[^<]*<\/div>/, '') + '<h3>🧭 Suivi direct par le super administrateur</h3>' + r.dk.map(function (u) { return directCard(u, false); }).join('');
    return html + directRequestCard();
  };
  ['dash', 'eval'].forEach(function (k) {
    var f = VIEWS[k]; if (typeof f !== 'function') return;
    VIEWS[k] = function () {
      if (me && me.role === 'parent') {
        var r = run(f, arguments, this);
        if (!r.dk.length) return r.html;
        return r.html.replace(/<div class="card mu">(Pour voir les notes|Ajoutez un enfan)[^<]*<\/div>/, '') + '<h3>🧭 Suivi direct</h3>' + r.dk.map(function (u) { return directCard(u, false); }).join('');
      }
      if (me && me.role === 'eleve' && direct(me)) return f.apply(this, arguments) + directCard(me, true);
      return f.apply(this, arguments);
    };
  });

  window.dsV36RequestDirect = function () {
    if (!me || me.role !== 'parent') return;
    var c = val('sdq_name'); if (!c) return alert('Indiquez le nom complet de l’enfant.');
    var contact = me.phone || me.email || '';
    var r = { id: nid(arr('codeReqs')), parent: me.id, parentName: me.name, contact: contact, child: c, school: '—', cls: val('sdq_level'), birth: val('sdq_birth'), note: val('sdq_note'), ts: now(), status: 'attente', direct: true };
    S.codeReqs.push(r);
    (S.users || []).filter(function (u) { return u.role === 'super'; }).forEach(function (u) {
      S.msgs.push({ id: nid(S.msgs), from: me.id, to: u.id, kind: 'text', readAt: '', ts: now(), text: '🧭 Demande de suivi direct (élève sans groupe de répétition)\nParent : ' + me.name + ' (' + contact + ')\nEnfant : ' + c + (r.cls ? '\nClasse/niveau : ' + r.cls : '') + (r.note ? '\nPrécisions : ' + r.note : '') + '\n→ Onglet « Suivi direct ».' });
    });
    L('Demande de suivi direct : ' + c); save();
    alert('Demande envoyée au super administrateur. Vous recevrez le numéro de suivi unique dans votre messagerie.'); render();
  };

  /* ---------- super administrateur : onglet « Suivi direct » ---------- */
  function newPw() { return rnd(8); }
  function sendNumber(u, contact) {
    var r = typeof window.sendTracking === 'function' ? window.sendTracking(u, contact) : '';
    arr('identifierAudit').push({ type: 'numéro de suivi unique envoyé', student: u.id, value: u.code, by: me.id, at: iso() });
    return r;
  }
  function report(u, r, contact) {
    alert((r === 'direct' ? 'Numéro de suivi unique ' + u.code + ' envoyé dans le compte du parent ; l’enfant est ajouté à « Mes enfants ».' : 'Numéro de suivi unique ' + u.code + ' attribué. Le parent n’a pas encore de compte : il le recevra automatiquement dès qu’il en créera un avec ' + contact + '.') + '\nVous êtes responsable du suivi de la progression de ' + u.name + '.');
  }
  window.dsV36CreateDirect = function () {
    if (!isSuper()) return alert('Réservé au super administrateur.');
    var name = val('sd_name'), level = val('sd_level'), birth = val('sd_birth'), contact = val('sd_contact');
    if (!name || !contact) return alert('Indiquez le nom de l’élève et le téléphone ou l’e-mail du parent.');
    var dup = (S.users || []).filter(function (x) { return x.role === 'eleve' && !x.school && x.name.toLowerCase() === name.toLowerCase() && String(x.parentContact || '') === contact; })[0];
    if (dup) { SD.sel = dup.id; render(); return alert('Un dossier de suivi direct existe déjà pour cet élève (numéro ' + (dup.code || 'à attribuer') + ').'); }
    var u = { id: nid(S.users), name: name, email: 'suivi.' + rnd(6) + '@suivi.delta', pw: newPw(), role: 'eleve', school: 0, classId: 0, matricule: '', naissance: birth, niveau: level, parentContact: contact, active: true, noLogin: true, suiviMode: 'super', responsableId: me.id, abs: 0, conduite: 15 };
    S.users.push(u); window.dsStudentNumber(u);
    var r = sendNumber(u, contact);
    if (SD.pre && SD.pre.reqId) { var q = arr('codeReqs').filter(function (x) { return x.id == SD.pre.reqId; })[0]; if (q) { q.status = 'traitee'; q.answeredAt = now(); q.by = me.id; q.student = u.id; } }
    SD.pre = null; SD.sel = u.id;
    L('Suivi direct ouvert : ' + name + ' — numéro ' + u.code); save(); render(); report(u, r, contact);
  };
  window.dsV36Assign = function (id) {
    if (!isSuper()) return alert('Réservé au super administrateur.');
    var u = stu(id); if (!u) return alert('Élève introuvable.');
    if (u.school) return alert('Cet élève est dans un groupe de répétition : son numéro de suivi est géré par ce groupe.');
    var c = prompt('Téléphone ou e-mail du parent (' + (u.code ? 'renvoi du numéro ' + u.code : 'le numéro de suivi unique sera créé et envoyé') + ') — laissez vide pour créer le numéro sans l’envoyer :', u.parentContact || ''); if (c === null) return; c = c.trim();
    window.dsStudentNumber(u); u.suiviMode = 'super'; u.responsableId = u.responsableId || me.id;
    if (!c) { SD.sel = u.id; save(); render(); return alert('Numéro de suivi unique ' + u.code + ' attribué à ' + u.name + '. Envoyez-le au parent avec « Renvoyer » dès que vous avez son contact.'); }
    u.parentContact = c; var r = sendNumber(u, c); SD.sel = u.id; L('Numéro de suivi unique envoyé : ' + u.name); save(); render(); report(u, r, c);
  };
  window.dsV36Select = function (id) { SD.sel = id; render(); };
  window.dsV36Open = function (reqId) {
    var q = arr('codeReqs').filter(function (x) { return x.id == reqId; })[0]; if (!q) return;
    SD.pre = { reqId: q.id, name: q.child, level: q.cls || '', birth: q.birth || '', contact: q.contact || '' }; render();
  };
  window.dsV36AddProgress = function () {
    if (!isSuper()) return alert('Réservé au super administrateur.');
    var u = stu(SD.sel); if (!u || !direct(u)) return alert('Choisissez d’abord un élève suivi en direct.');
    var date = val('sd_p_date') || day(), rub = val('sd_p_rub'), sc = val('sd_p_score'), com = val('sd_p_com');
    if (!rub && !com) return alert('Indiquez une rubrique (matière, période…) ou un commentaire.');
    var score = null; if (sc !== '') { score = parseFloat(sc.replace(',', '.')); if (isNaN(score) || score < 0 || score > 20) return alert('La note doit être comprise entre 0 et 20.'); }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return alert('Date invalide.');
    arr('suiviProgress').push({ id: nid(S.suiviProgress), student: u.id, number: u.code || '', by: me.id, date: date, rubric: rub || 'Progression', score: score, comment: com, createdAt: iso() });
    parentsOf(u).forEach(function (p) { S.msgs.push({ id: nid(S.msgs), from: me.id, to: p.id, kind: 'text', readAt: '', ts: now(), text: '📈 Nouvelle information de progression pour ' + u.name + ' (' + (rub || 'Progression') + (score != null ? ' : ' + score + '/20' : '') + '). Voir « Mes enfants ».' }); });
    L('Progression enregistrée : ' + u.name); save(); render();
  };
  window.dsV36DelProgress = function (id) {
    if (!isSuper()) return; if (!confirm('Supprimer cette entrée de progression ?')) return;
    S.suiviProgress = arr('suiviProgress').filter(function (x) { return x.id != id; }); save(); render();
  };

  function fi(id, ph, t, v) { return '<input id="' + id + '" placeholder="' + E(ph) + '"' + (t ? ' type="' + t + '"' : '') + ' value="' + E(v || '') + '">'; }
  function superView() {
    if (!isSuper()) return '<h2>🧭 Suivi direct</h2><div class="card mu">Réservé au super administrateur.</div>';
    var pre = SD.pre || {}, reqs = arr('codeReqs').filter(function (r) { return r.direct && r.status === 'attente'; });
    var list = (S.users || []).filter(function (u) { return u.role === 'eleve' && !u.school; });
    var sel = stu(SD.sel); if (sel && !direct(sel)) sel = null;
    var h = '<h2>🧭 Suivi direct des élèves sans groupe de répétition</h2><div class="sim">Un élève qui n’est dans aucun groupe de répétition n’est jamais isolé : vous lui attribuez son numéro de suivi unique, il arrive dans le compte de son parent, et vous prenez la responsabilité de montrer sa progression. S’il est ensuite rattaché à un groupe de répétition, il garde le même numéro.</div>';
    if (reqs.length) h += '<div class="card"><b>Demandes des parents (' + reqs.length + ')</b>' + reqs.map(function (r) { return '<div class="row"><span><b>' + E(r.child) + '</b><div class="mu">Parent : ' + E(r.parentName) + ' · ' + E(r.contact) + (r.cls ? ' · ' + E(r.cls) : '') + (r.note ? '<br>' + E(r.note) : '') + '</div></span>' + btn('Ouvrir le dossier', 'dsV36Open(' + Number(r.id) + ')', 'p') + '</div>'; }).join('') + '</div>';
    h += '<div class="card"><b>' + (pre.reqId ? 'Ouvrir le dossier demandé' : 'Nouveau dossier de suivi direct') + '</b>' + fi('sd_name', 'Nom complet de l’élève', '', pre.name) + fi('sd_level', 'Classe ou niveau (facultatif)', '', pre.level) + fi('sd_birth', 'Date de naissance', 'date', pre.birth) + fi('sd_contact', 'Téléphone ou e-mail du parent', '', pre.contact) + '<button onclick="dsV36CreateDirect()">Créer et envoyer le numéro au parent</button></div>';
    h += '<div class="card"><b>Élèves suivis directement (' + list.length + ')</b>' + (list.map(function (u) {
      var ps = parentsOf(u).map(function (p) { return p.name; });
      return '<div class="row"><span><b>' + E(u.name) + '</b>' + (sel && sel.id === u.id ? ' <span class="tag">ouvert</span>' : '') + '<div class="mu">' + (u.code ? 'N° ' + E(u.code) : 'Aucun numéro attribué') + ' · Parent : ' + E(ps.length ? ps.join(', ') : (u.parentContact || 'non renseigné')) + '</div></span><span>' + btn(u.code ? '📨 Renvoyer' : '🔢 Attribuer', 'dsV36Assign(' + Number(u.id) + ')') + ' ' + btn('📈 Progression', 'dsV36Select(' + Number(u.id) + ')', 'p') + '</span></div>';
    }).join('') || '<div class="mu" style="margin-top:6px">Aucun élève sans groupe de répétition pour le moment.</div>') + '</div>';
    if (sel) {
      var p = progressOf(sel), a = average(p);
      h += '<div class="card"><b>📈 Progression de ' + E(sel.name) + '</b><div class="mu">Numéro de suivi unique : ' + E(sel.code || 'à attribuer') + ' · Responsable : ' + E(respName(sel)) + '. Le parent voit ces informations dans « Mes enfants ».</div>'
        + fi('sd_p_date', 'Date', 'date', day()) + fi('sd_p_rub', 'Rubrique (matière, période, compétence…)') + fi('sd_p_score', 'Note sur 20 (facultatif)', 'number') + '<textarea id="sd_p_com" rows="3" placeholder="Commentaire ou observation (facultatif)" style="width:100%;padding:10px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx)"></textarea>'
        + '<button style="margin-top:6px" onclick="dsV36AddProgress()">Enregistrer la progression</button>'
        + (p.length ? stats(p, a) + bars(p) + p.map(function (x) { return entry(x, true); }).join('') : '<div class="mu" style="margin-top:6px">Aucune progression enregistrée.</div>') + '</div>';
    }
    return h;
  }
  VIEWS.suividirect = superView;
  var _tabs = window.tabsOf;
  if (typeof _tabs === 'function') window.tabsOf = function () {
    var t = _tabs.apply(this, arguments) || [];
    if (isSuper() && !t.some(function (x) { return x[0] === 'suividirect'; })) {
      var n = arr('codeReqs').filter(function (r) { return r.direct && r.status === 'attente'; }).length, i = t.findIndex(function (x) { return x[0] === 'codes'; });
      if (i < 0) i = t.findIndex(function (x) { return x[0] === 'req'; });
      t.splice(i < 0 ? 1 : i + 1, 0, ['suividirect', '🧭', 'Suivi direct' + (n ? ' (' + n + ')' : '')]);
    }
    return t;
  };
})();
