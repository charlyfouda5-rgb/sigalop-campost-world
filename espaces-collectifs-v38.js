/* DELTA SCHOOL V38 — Espaces collectifs (classe / catégorie) et messagerie parent ↔ groupe/enseignants.
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
    if (l && !/^https?:\/\/\S+$/i.test(l)) return alert('Le lien doit commencer par http:// ou https://');
    if (item && !title) return alert('Donnez un titre à l’élément partagé (ex. Épreuve de maths).'); if (!t && !l) return alert('Écrivez un message' + (r === 'eleve' ? '' : ' ou ajoutez un lien') + '.');
    S.grpSpaceMsgs.push({ id: nid(arr('grpSpaceMsgs')), space: sp.id, from: me.id, text: t, link: l, item: item, title: item ? title : '', kind: item ? kind : '', ts: now() });
    if (item) sp.students.forEach(function (i) { var u = U(i); if (u && u.noLogin) parentsOf(u).forEach(function (p) { notify(p.id, '📌 Nouvel élément dans l’espace « ' + sp.title + ' » : ' + title); }); });
    save(); render();
  };
  window.dsV38Back = function () { GS.open = 0; render(); };
  window.dsV38OpenSpace = function (id) { GS.open = id; render(); };

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
    h += '<div class="card"><b>💬 Discussion</b>' + (chat.map(function (m) {
      var mineM = m.from == me.id, u = U(m.from) || {};
      return '<div class="row" style="align-items:flex-start;' + (mineM ? 'background:rgba(20,163,143,.08);border-radius:10px;padding:6px' : 'padding:6px') + '"><span style="display:flex;gap:8px;align-items:flex-start">' + av(m.from, 34) + '<span><b>' + E(u.name || '?') + '</b> <span class="mu">' + E(RL[u.role] || '') + '</span><div style="white-space:pre-wrap">' + E(m.text || '') + '</div>' + (m.link ? '<div><a href="' + E(m.link) + '" target="_blank" rel="noopener noreferrer">🔗 ' + E(m.link) + '</a></div>' : '') + '<div class="mu">' + E(m.ts || '') + '</div></span></span></div>';
    }).join('') || '<div class="mu" style="margin-top:6px">Aucun message pour le moment.</div>') + '</div>';
    if (open && r && r !== 'parent') {
      if (r === 'eleve' && sp.locked) h += '<div class="card mu">🔒 La discussion est verrouillée par le super administrateur.</div>';
      else h += '<div class="card"><textarea id="gs_msg" rows="3" placeholder="Votre message…" style="width:100%;padding:10px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx)"></textarea>' + (r === 'eleve' ? '' : '<input id="gs_link" placeholder="Lien (facultatif) https://…"><div class="mu">Partager comme élément épinglé :</div><input id="gs_ititle" placeholder="Titre de l’élément (ex. Épreuve de maths)"><select id="gs_ikind">' + Object.keys(KIND).map(function (k) { return '<option value="' + k + '">' + KIND[k][0] + ' ' + KIND[k][1] + '</option>'; }).join('') + '</select>')
        + '<button onclick="dsV38Send(' + Number(sp.id) + ',false)">Envoyer le message</button>' + (r === 'eleve' ? '' : ' <button onclick="dsV38Send(' + Number(sp.id) + ',true)">📌 Partager l’élément</button>') + '</div>';
    } else if (!open) h += '<div class="card mu">Cet espace est terminé : il n’accepte plus de messages.</div>';
    if (su) {
      var counts = {}; ms.forEach(function (m) { counts[m.from] = (counts[m.from] || 0) + 1; }); var act = sp.students.filter(function (x) { return counts[x]; }), silent = sp.students.filter(function (x) { return !counts[x]; });
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
