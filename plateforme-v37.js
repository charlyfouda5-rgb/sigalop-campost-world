/* DELTA SCHOOL V37 — Espaces de répétition, effectifs, abonnements des utilisateurs, tableaux de bord et indicateurs.
 *
 *  1. Espaces de répétition : élèves/étudiants (avec ou sans groupe de répétition) demandent une répétition au super
 *     administrateur. S'il accepte, un espace de discussion s'ouvre dans la plateforme (photos de profil de part et d'autre).
 *     Le super administrateur peut déléguer un répétiteur connecté et apte à rejoindre l'espace.
 *  2. Effectifs (super administrateur) : élèves/étudiants par section, système, classe et groupe de répétition ; personnel,
 *     répétiteurs, parents, groupes et super administrateurs.
 *  3. Abonnements des utilisateurs : rappel des abonnements terminés (ou proches de la fin), réactivation.
 *  4. Tableaux de bord et indicateurs de performance dans chaque type de compte.
 */
(function () {
  'use strict';
  function arr(k) { if (!Array.isArray(S[k])) S[k] = []; return S[k]; }
  function E(x) { return typeof esc === 'function' ? esc(String(x == null ? '' : x)) : String(x == null ? '' : x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function val(id) { var el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; }
  function nrm(t) { return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  function isSuper() { return !!me && me.role === 'super'; }
  function U(id) { return (S.users || []).filter(function (x) { return x.id == id; })[0]; }
  function supers() { return (S.users || []).filter(function (u) { return u.role === 'super' && u.active !== false; }); }
  function notify(to, text) { S.msgs.push({ id: nid(S.msgs), from: me.id, to: to, text: text, kind: 'text', readAt: '', ts: now() }); }
  function grpName(u) { var s = u && u.school ? sch(u.school) : null; return s ? s.name : 'Sans groupe de répétition'; }
  function bar(label, value, max, col, shown) {
    var p = max > 0 ? Math.max(2, Math.min(100, Math.round(value / max * 100))) : 0; if (!value) p = 0;
    return '<div style="margin:6px 0"><div style="display:flex;justify-content:space-between;gap:8px"><span class="mu">' + E(label) + '</span><b>' + E(shown != null ? shown : value) + '</b></div><div style="height:8px;background:var(--bd);border-radius:6px"><div style="height:8px;width:' + p + '%;background:' + (col || 'var(--ac)') + ';border-radius:6px"></div></div></div>';
  }
  function spark(vals) {
    if (!vals.length) return '';
    return '<div style="display:flex;gap:4px;align-items:flex-end;height:56px;margin:6px 0">' + vals.map(function (v) { var h = Math.max(4, Math.round(Math.min(20, v[1]) / 20 * 52)); return '<div title="' + E(v[0] + ' : ' + v[1].toFixed(1) + '/20') + '" style="flex:1;max-width:30px;height:' + h + 'px;background:var(--ac);border-radius:4px 4px 0 0"></div>'; }).join('') + '</div>';
  }
  function tabAfter(t, key, entry) { var i = t.findIndex(function (x) { return x[0] === key; }); t.splice(i < 0 ? Math.max(1, t.length - 1) : i + 1, 0, entry); }

  /* ======================================================================
     1. ESPACES DE RÉPÉTITION
     ====================================================================== */
  var SP = { open: 0 };
  function spaces() { return arr('repSpaces'); }
  function msgsOf(id) { return arr('repSpaceMsgs').filter(function (m) { return m.space == id; }).sort(function (a, b) { return a.id - b.id; }); }
  function canSee(sp) { return !!me && (me.role === 'super' || sp.student == me.id || (sp.members || []).indexOf(me.id) >= 0); }
  function readsMap() { try { return JSON.parse(localStorage.getItem('ds37reads_' + me.id) || '{}'); } catch (e) { return {}; } }
  function setRead(sp) { try { var r = readsMap(), l = msgsOf(sp.id); r[sp.id] = l.length ? l[l.length - 1].id : 0; localStorage.setItem('ds37reads_' + me.id, JSON.stringify(r)); } catch (e) { } }
  function unread(sp) { var last = readsMap()[sp.id] || 0; return msgsOf(sp.id).filter(function (m) { return m.id > last && m.from != me.id; }).length; }
  function stLbl(st) { return { attente: '⏳ En attente', ouvert: '🟢 Ouvert', ferme: '⚪ Terminé', refuse: '❌ Refusé' }[st] || st; }
  function mySpaces() { return spaces().filter(canSee).sort(function (a, b) { return b.id - a.id; }); }
  function repRec(uidv) { return (S.reps || []).filter(function (r) { return r.uid == uidv; })[0]; }
  function online(uidv) { try { var rows = typeof accSrc === 'function' ? accSrc() : []; return (rows || []).some(function (x) { return x.uid == uidv && isOnline(x); }); } catch (e) { return false; } }
  function apt(r, sp) {
    if (!r || !repOk(r)) return false; if (r.all) return true;
    var tk = nrm(sp.subject).split(/\s+/).filter(function (w) { return w.length > 2; }); if (!tk.length) return true;
    var h = nrm((r.m1 || '') + ' ' + (r.m2 || '') + ' ' + (r.niveau || ''));
    return tk.some(function (w) { return h.indexOf(w) >= 0; });
  }
  function who(x) { var u = U(x) || {}; return '<span style="display:inline-flex;gap:6px;align-items:center;margin-right:10px">' + av(x, 30) + '<span>' + E(u.name || '?') + ' <span class="mu">' + E(RL[u.role] || u.role || '') + '</span></span></span>'; }

  function chatView(sp) {
    setRead(sp);
    var ms = msgsOf(sp.id), st = U(sp.student) || {}, su = isSuper(), open = sp.status === 'ouvert';
    var members = '<div style="margin:6px 0">' + who(sp.student) + (supers()[0] ? who(sp.by || supers()[0].id) : '') + (sp.members || []).map(who).join('') + '</div>';
    var h = '<div>' + btn('← Retour', 'dsV37Back()') + '</div><div class="card"><b>🎓 ' + E(sp.subject) + '</b> <span class="tag">' + stLbl(sp.status) + '</span><div class="mu">Élève/étudiant : ' + E(st.name || '?') + (sp.level ? ' · ' + E(sp.level) : '') + ' · ' + E(grpName(st)) + '</div>' + members + '</div>';
    h += '<div class="card">' + (ms.map(function (m) {
      var mine = m.from == me.id, u = U(m.from) || {};
      return '<div class="row" style="align-items:flex-start;' + (mine ? 'background:rgba(20,163,143,.08);border-radius:10px;padding:6px' : 'padding:6px') + '"><span style="display:flex;gap:8px;align-items:flex-start">' + av(m.from, 36) + '<span><b>' + E(u.name || '?') + '</b> <span class="mu">' + E(RL[u.role] || '') + '</span><div style="white-space:pre-wrap">' + E(m.text || '') + '</div>' + (m.link ? '<div><a href="' + E(m.link) + '" target="_blank" rel="noopener noreferrer">🔗 ' + E(m.link) + '</a></div>' : '') + '<div class="mu">' + E(m.ts || '') + '</div></span></span></div>';
    }).join('') || '<div class="mu">Aucun message pour le moment.</div>') + '</div>';
    if (open) h += '<div class="card"><textarea id="sp_msg" rows="3" placeholder="Votre message…" style="width:100%;padding:10px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx)"></textarea><input id="sp_link" placeholder="Lien à partager (facultatif) https://…"><button onclick="dsV37Send(' + Number(sp.id) + ')">Envoyer</button></div>';
    else h += '<div class="card mu">Cet espace n’est pas ouvert : il n’accepte plus de messages.</div>';
    if (su && open) {
      var reps = (S.reps || []).filter(function (r) { return (sp.members || []).indexOf(r.uid) < 0; }).map(function (r) { return { r: r, on: online(r.uid), ok: apt(r, sp) }; }).sort(function (a, b) { return (b.on - a.on) || (b.ok - a.ok); });
      h += '<div class="card"><b>👨‍🏫 Déléguer un répétiteur</b><div class="mu">Choisissez un répétiteur connecté et apte à répondre au besoin de l’élève (🟢 connecté · ✔ apte : matière ou niveau compatible et abonnement actif).</div>'
        + (reps.slice(0, 30).map(function (x) { return '<div class="row"><span style="display:flex;gap:8px;align-items:center">' + av(x.r.uid, 34) + '<span><b>' + E((x.r.prenom || '') + ' ' + (x.r.nom || '')) + '</b><div class="mu">' + (x.on ? '🟢 connecté' : '⚪ hors ligne') + ' · ' + (x.ok ? '✔ apte' : '⚠️ à vérifier') + ' · ' + E(x.r.all ? 'Toutes matières' : [x.r.m1, x.r.m2].filter(Boolean).join(', ')) + '</div></span></span>' + btn('Ajouter', 'dsV37Delegate(' + Number(sp.id) + ',' + Number(x.r.uid) + ')', 'p') + '</div>'; }).join('') || '<div class="mu">Aucun répétiteur disponible.</div>') + '</div>';
      if ((sp.members || []).length) h += '<div class="card"><b>Répétiteurs de cet espace</b>' + sp.members.map(function (m) { return '<div class="row"><span>' + who(m) + '</span>' + btn('Retirer', 'dsV37Remove(' + Number(sp.id) + ',' + Number(m) + ')') + '</div>'; }).join('') + '</div>';
      h += '<div class="card">' + btn('Terminer l’espace', 'dsV37Close(' + Number(sp.id) + ')') + '</div>';
    }
    return h;
  }
  function spaceRow(sp) {
    var st = U(sp.student) || {}, n = unread(sp);
    var act = '';
    if (isSuper() && sp.status === 'attente') act = btn('Accepter', 'dsV37Accept(' + Number(sp.id) + ')', 'p') + ' ' + btn('Refuser', 'dsV37Refuse(' + Number(sp.id) + ')');
    else if (sp.status === 'ouvert' || (sp.status === 'ferme')) act = btn(sp.status === 'ouvert' ? 'Ouvrir' : 'Consulter', 'dsV37OpenSpace(' + Number(sp.id) + ')', 'p');
    return '<div class="row"><span style="display:flex;gap:8px;align-items:center">' + av(sp.student, 38) + '<span><b>' + E(sp.subject) + '</b>' + (n ? ' <span style="background:#e11d48;color:#fff;border-radius:8px;padding:1px 7px;font-size:12px">' + n + '</span>' : '') + '<div class="mu">' + E(st.name || '?') + (sp.level ? ' · ' + E(sp.level) : '') + ' · ' + stLbl(sp.status) + ' · ' + E(grpName(st)) + (sp.note ? '<br>' + E(sp.note) : '') + (sp.refuseReason ? '<br>Motif : ' + E(sp.refuseReason) : '') + '</div></span></span><span>' + act + '</span></div>';
  }
  function spacesView() {
    if (SP.open) { var cur = spaces().filter(function (s) { return s.id == SP.open; })[0]; if (cur && canSee(cur)) return chatView(cur); SP.open = 0; }
    var list = mySpaces(), h = '<h2>🎓 ' + (me.role === 'eleve' ? 'Répétitions' : isSuper() ? 'Espaces de répétition' : 'Mes espaces de répétition') + '</h2>';
    if (me.role === 'eleve') {
      h += '<div class="sim">Besoin d’aide ? Que vous soyez dans un groupe de répétition ou non, élève ou étudiant, envoyez une demande au super administrateur. S’il l’accepte, un espace de discussion s’ouvre ici, dans la plateforme.</div>'
        + '<div class="card"><b>Je suis</b><select id="sp_statut"><option value="eleve"' + (me.statut !== 'etudiant' ? ' selected' : '') + '>Élève</option><option value="etudiant"' + (me.statut === 'etudiant' ? ' selected' : '') + '>Étudiant</option></select>' + btn('Enregistrer', 'dsV37Statut()') + '</div>'
        + '<div class="card"><b>Nouvelle demande de répétition</b><input id="rq_sub" placeholder="Matière ou besoin (ex. Mathématiques, probabilités)"><input id="rq_lvl" placeholder="Classe ou niveau (facultatif)" value="' + E((cls(me.classId) || {}).name || '') + '"><textarea id="rq_note" rows="3" placeholder="Expliquez votre besoin (facultatif)" style="width:100%;padding:10px;border:1px solid var(--bd);border-radius:10px;background:var(--bg);color:var(--tx)"></textarea><button onclick="dsV37Request()">Envoyer ma demande au super administrateur</button></div>';
    }
    var wait = list.filter(function (s) { return s.status === 'attente'; }), open = list.filter(function (s) { return s.status === 'ouvert'; }), rest = list.filter(function (s) { return s.status === 'ferme' || s.status === 'refuse'; });
    function block(t, l, e) { return '<div class="card"><b>' + t + ' (' + l.length + ')</b>' + (l.map(spaceRow).join('') || '<div class="mu" style="margin-top:6px">' + e + '</div>') + '</div>'; }
    if (isSuper()) h += kgrid([kpi('Demandes en attente', wait.length), kpi('Espaces ouverts', open.length), kpi('Terminés / refusés', rest.length)]);
    return h + block('Demandes en attente', wait, 'Aucune demande en attente.') + block('Espaces ouverts', open, me.role === 'repetiteur' ? 'Le super administrateur vous délègue ici les espaces à suivre.' : 'Aucun espace ouvert.') + block('Terminés et refusés', rest, 'Rien pour le moment.');
  }
  window.dsV37Back = function () { SP.open = 0; render(); };
  window.dsV37OpenSpace = function (id) { SP.open = id; render(); };
  window.dsV37Statut = function () { if (!me || me.role !== 'eleve') return; me.statut = val('sp_statut') === 'etudiant' ? 'etudiant' : 'eleve'; save(); alert('Statut enregistré : ' + (me.statut === 'etudiant' ? 'étudiant' : 'élève') + '.'); render(); };
  window.dsV37Request = function () {
    if (!me || me.role !== 'eleve') return;
    var sub = val('rq_sub'); if (!sub) return alert('Indiquez la matière ou le besoin.');
    var dup = spaces().filter(function (s) { return s.student == me.id && s.status === 'attente' && nrm(s.subject) === nrm(sub); })[0]; if (dup) return alert('Vous avez déjà une demande en attente pour ce besoin.');
    var sp = { id: nid(spaces()), student: me.id, subject: sub, level: val('rq_lvl'), note: val('rq_note'), status: 'attente', members: [], createdAt: new Date().toISOString() };
    S.repSpaces.push(sp);
    supers().forEach(function (s) { notify(s.id, '🎓 Demande de répétition de ' + me.name + ' (' + grpName(me) + ') : ' + sub + (sp.level ? ' — ' + sp.level : '') + '\n→ Onglet « Espaces de répétition ».'); });
    L('Demande de répétition : ' + me.name + ' — ' + sub); save(); alert('Demande envoyée au super administrateur. Vous serez averti dès qu’il l’acceptera.'); render();
  };
  function sysMsg(sp, text) { S.repSpaceMsgs.push({ id: nid(arr('repSpaceMsgs')), space: sp.id, from: me.id, text: text, link: '', ts: now() }); }
  window.dsV37Accept = function (id) {
    if (!isSuper()) return; var sp = spaces().filter(function (s) { return s.id == id; })[0]; if (!sp || sp.status !== 'attente') return;
    sp.status = 'ouvert'; sp.openedAt = new Date().toISOString(); sp.by = me.id; arr('repSpaceMsgs');
    sysMsg(sp, 'Bonjour ! Votre demande de répétition « ' + sp.subject + ' » est acceptée. Expliquez-moi votre besoin ici ; je pourrai aussi inviter un répétiteur à nous rejoindre.');
    notify(sp.student, '✅ Votre demande de répétition « ' + sp.subject + ' » est acceptée : un espace de discussion est ouvert dans « Répétitions ».');
    L('Espace de répétition ouvert : ' + sp.subject); SP.open = sp.id; save(); render();
  };
  window.dsV37Refuse = function (id) {
    if (!isSuper()) return; var sp = spaces().filter(function (s) { return s.id == id; })[0]; if (!sp) return;
    var r = prompt('Motif du refus (facultatif) :', ''); if (r === null) return;
    sp.status = 'refuse'; sp.refuseReason = r; notify(sp.student, '❌ Votre demande de répétition « ' + sp.subject + ' » n’a pas pu être acceptée' + (r ? ' : ' + r : '.'));
    L('Demande de répétition refusée : ' + sp.subject); save(); render();
  };
  window.dsV37Close = function (id) {
    if (!isSuper() || !confirm('Terminer cet espace ? Il n’acceptera plus de messages.')) return; var sp = spaces().filter(function (s) { return s.id == id; })[0]; if (!sp) return;
    sp.status = 'ferme'; sp.closedAt = new Date().toISOString(); sysMsg(sp, 'Espace terminé par le super administrateur.'); notify(sp.student, '⚪ Votre espace de répétition « ' + sp.subject + ' » est terminé.'); SP.open = 0; save(); render();
  };
  window.dsV37Delegate = function (id, ruid) {
    if (!isSuper()) return; var sp = spaces().filter(function (s) { return s.id == id; })[0], r = repRec(ruid), u = U(ruid); if (!sp || sp.status !== 'ouvert' || !u) return;
    var on = online(ruid), ok = apt(r, sp);
    if ((!on || !ok) && !confirm((on ? '' : 'Ce répétiteur ne semble pas connecté. ') + (ok ? '' : 'Son profil ne correspond pas clairement au besoin ou son abonnement est inactif. ') + 'L’ajouter quand même ?')) return;
    sp.members = (sp.members || []).concat([ruid]); sp.delegations = (sp.delegations || []).concat([{ rep: ruid, at: new Date().toISOString(), by: me.id }]);
    sysMsg(sp, '👨‍🏫 ' + u.name + ' (répétiteur) rejoint l’espace pour répondre à la demande « ' + sp.subject + ' ».');
    notify(ruid, '🎓 Le super administrateur vous a délégué à l’espace de répétition de ' + ((U(sp.student) || {}).name || 'un élève') + ' (' + sp.subject + '). Ouvrez « Mes espaces de répétition ».');
    notify(sp.student, '👨‍🏫 ' + u.name + ' (répétiteur) a rejoint votre espace « ' + sp.subject + ' ».');
    L('Répétiteur délégué : ' + u.name + ' → ' + sp.subject); save(); render();
  };
  window.dsV37Remove = function (id, ruid) { if (!isSuper()) return; var sp = spaces().filter(function (s) { return s.id == id; })[0]; if (!sp) return; sp.members = (sp.members || []).filter(function (x) { return x != ruid; }); sysMsg(sp, ((U(ruid) || {}).name || 'Un répétiteur') + ' quitte l’espace.'); save(); render(); };
  window.dsV37Send = function (id) {
    var sp = spaces().filter(function (s) { return s.id == id; })[0]; if (!sp || sp.status !== 'ouvert' || !canSee(sp)) return;
    var t = val('sp_msg'), l = val('sp_link'); if (!t && !l) return alert('Écrivez un message ou ajoutez un lien.');
    if (l && !/^https?:\/\/\S+$/i.test(l)) return alert('Le lien doit commencer par http:// ou https://');
    arr('repSpaceMsgs').push({ id: nid(S.repSpaceMsgs), space: sp.id, from: me.id, text: t, link: l, ts: now() }); save(); render();
  };
  VIEWS.espacesrep = spacesView;

  /* ======================================================================
     2. EFFECTIFS (super administrateur)
     ====================================================================== */
  function isEtu(u) { return u.statut === 'etudiant' || ((cls(u.classId) || {}).system === 'Université'); }
  function effectifs() {
    var us = S.users || [], el = us.filter(function (u) { return u.role === 'eleve'; });
    var by = { section: {}, systeme: {}, groupe: {} }, classes = {};
    function inc(o, k) { o[k] = (o[k] || 0) + 1; }
    el.forEach(function (u) {
      var c = cls(u.classId), g = u.school ? ((sch(u.school) || {}).name || 'Groupe supprimé') : 'Sans groupe de répétition';
      inc(by.section, c ? (c.section || 'Non renseignée') : (u.school ? 'Sans classe' : 'Sans groupe de répétition'));
      inc(by.systeme, c ? (c.system || 'Non renseigné') : (u.school ? 'Sans classe' : 'Sans groupe de répétition'));
      inc(by.groupe, g); var ck = g + '||' + (c ? c.name : 'Sans classe'); classes[ck] = (classes[ck] || 0) + 1;
    });
    function n(role) { return us.filter(function (u) { return u.role === role; }).length; }
    var staff = ['prof', 'comptable', 'censeur'], staffByGroup = {};
    us.filter(function (u) { return staff.indexOf(u.role) >= 0; }).forEach(function (u) { inc(staffByGroup, grpName(u)); });
    var reps = (S.reps || []), repActive = reps.filter(repOk).length;
    return { total: el.length, etu: el.filter(isEtu).length, sans: el.filter(function (u) { return !u.school; }).length, by: by, classes: classes, staffByGroup: staffByGroup, staff: staff.reduce(function (s, r) { return s + n(r); }, 0), prof: n('prof'), comptable: n('comptable'), censeur: n('censeur'), parents: n('parent'), chefs: n('chef'), supers: n('super'), reps: n('repetiteur'), repActive: repActive, groups: (S.schools || []).length };
  }
  function table(title, obj, total) {
    var keys = Object.keys(obj).sort(function (a, b) { return obj[b] - obj[a]; });
    return '<div class="card"><b>' + title + '</b>' + (keys.map(function (k) { return bar(k, obj[k], total, 'var(--ac)', obj[k]); }).join('') || '<div class="mu">Aucune donnée.</div>') + '</div>';
  }
  function effectifsView() {
    if (!isSuper()) return '<h2>📊 Effectifs</h2><div class="card mu">Réservé au super administrateur.</div>';
    var e = effectifs(), h = '<h2>📊 Effectifs de la plateforme</h2>' + kgrid([kpi('Élèves et étudiants', e.total, e.etu + ' étudiant(s) · ' + e.sans + ' sans groupe'), kpi('Personnel', e.staff, e.prof + ' enseignants · ' + e.comptable + ' comptables · ' + e.censeur + ' censeurs'), kpi('Répétiteurs', e.reps, e.repActive + ' abonnés actifs'), kpi('Super administrateurs', e.supers)]) + kgrid([kpi('Groupes de répétition', e.groups, e.chefs + ' compte(s) groupe'), kpi('Parents', e.parents)]);
    h += '<div>' + btn('⬇️ Exporter en CSV', 'dsV37ExportEffectifs()', 'p') + '</div>';
    h += table('Élèves et étudiants par section', e.by.section, e.total) + table('Par système', e.by.systeme, e.total) + table('Par groupe de répétition', e.by.groupe, e.total);
    var groups = Object.keys(e.by.groupe).sort();
    h += '<div class="card"><b>Détail par classe</b>' + groups.map(function (g) {
      var cl = Object.keys(e.classes).filter(function (k) { return k.split('||')[0] === g; });
      return '<details style="margin:6px 0"><summary><b>' + E(g) + '</b> — ' + e.by.groupe[g] + ' élève(s)' + (e.staffByGroup[g] ? ' · ' + e.staffByGroup[g] + ' personnel' : '') + '</summary>' + cl.map(function (k) { return bar(k.split('||')[1], e.classes[k], e.by.groupe[g], '#f97316', e.classes[k]); }).join('') + '</details>';
    }).join('') + '</div>';
    h += table('Personnel par groupe de répétition', e.staffByGroup, e.staff);
    return h;
  }
  window.dsV37ExportEffectifs = function () {
    if (!isSuper()) return; var e = effectifs(), rows = [['Catégorie', 'Libellé', 'Effectif']];
    Object.keys(e.by.section).forEach(function (k) { rows.push(['Section', k, e.by.section[k]]); });
    Object.keys(e.by.systeme).forEach(function (k) { rows.push(['Système', k, e.by.systeme[k]]); });
    Object.keys(e.by.groupe).forEach(function (k) { rows.push(['Groupe de répétition', k, e.by.groupe[k]]); });
    Object.keys(e.classes).forEach(function (k) { var p = k.split('||'); rows.push(['Classe', p[0] + ' — ' + p[1], e.classes[k]]); });
    Object.keys(e.staffByGroup).forEach(function (k) { rows.push(['Personnel', k, e.staffByGroup[k]]); });
    rows.push(['Total', 'Élèves et étudiants', e.total], ['Total', 'Étudiants', e.etu], ['Total', 'Personnel', e.staff], ['Total', 'Répétiteurs', e.reps], ['Total', 'Parents', e.parents], ['Total', 'Super administrateurs', e.supers]);
    var csv = '\ufeff' + rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(';'); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'effectifs-delta-school.csv'; document.body.appendChild(a); a.click(); a.remove();
  };
  VIEWS.effectifs = effectifsView;

  /* ======================================================================
     3. ABONNEMENTS DES UTILISATEURS
     ====================================================================== */
  var AB = { f: 'tous', r: '' };
  function subOf(u) {
    if (u.role === 'chef' && u.school) { var s = sch(u.school); return s ? { exp: s.exp, kind: 'groupe', label: 'Groupe : ' + s.name } : null; }
    if (u.role === 'repetiteur') { var r = repRec(u.id); return r ? { exp: r.exp, kind: 'rep', label: 'Répétiteur' } : null; }
    if (u.role === 'super') return null;
    if (!u.school || u.subExp || Number(u.monthly) > 0) return { exp: u.subExp || '', kind: 'user', label: u.school ? grpName(u) : 'Compte individuel' };
    return null;
  }
  function subState(x) { if (!x.exp) return 'none'; var d = daysLeft(x.exp); return d < 0 ? 'exp' : d <= 7 ? 'soon' : 'ok'; }
  function subRows() { return (S.users || []).map(function (u) { var s = subOf(u); return s ? { u: u, s: s, st: subState(s), d: s.exp ? daysLeft(s.exp) : null } : null; }).filter(Boolean); }
  function remindText(u, x) {
    return '⏰ Rappel du super administrateur : votre abonnement ' + (x.d == null ? 'n’a pas d’échéance enregistrée' : x.d < 0 ? 'est terminé depuis le ' + fdate(x.s.exp) : 'expire dans ' + x.d + ' jour(s), le ' + fdate(x.s.exp)) + '. Merci de le renouveler (paiement puis signalement au super administrateur) pour continuer à utiliser la plateforme.';
  }
  function remind(x) { notify(x.u.id, remindText(x.u, x)); x.u.subRemindedAt = new Date().toISOString(); }
  function absView() {
    if (!isSuper()) return '<h2>🔔 Abonnements des utilisateurs</h2><div class="card mu">Réservé au super administrateur.</div>';
    var all = subRows(), exp = all.filter(function (x) { return x.st === 'exp'; }), soon = all.filter(function (x) { return x.st === 'soon'; }), ok = all.filter(function (x) { return x.st === 'ok'; }), none = all.filter(function (x) { return x.st === 'none'; });
    var list = all.filter(function (x) { return (AB.f === 'tous' || x.st === AB.f) && (!AB.r || x.u.role === AB.r); }).sort(function (a, b) { return (a.d == null ? 9999 : a.d) - (b.d == null ? 9999 : b.d); });
    var roles = Object.keys(all.reduce(function (o, x) { o[x.u.role] = 1; return o; }, {}));
    return '<h2>🔔 Abonnements des utilisateurs</h2>' + kgrid([kpi('Comptes suivis', all.length), kpi('Abonnements terminés', exp.length), kpi('Fin sous 7 jours', soon.length), kpi('Sans échéance', none.length)])
      + '<div class="card"><div>' + btn('🔔 Rappeler tous les terminés (' + exp.length + ')', 'dsV37RemindAll(\'exp\')', 'p') + ' ' + btn('🔔 Rappeler ceux qui finissent sous 7 j (' + soon.length + ')', 'dsV37RemindAll(\'soon\')') + '</div><div class="mu" style="margin-top:6px">Les membres d’un groupe de répétition suivent l’abonnement de leur groupe : gérez-le via le compte « Groupe de répétition » ou l’onglet « Renouvellements ».</div>'
      + '<select id="ab_f" onchange="dsV37AbFilter()">' + [['tous', 'Tous les états'], ['exp', 'Terminés'], ['soon', 'Finissent sous 7 jours'], ['ok', 'Actifs'], ['none', 'Sans échéance']].map(function (o) { return '<option value="' + o[0] + '"' + (AB.f === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'
      + '<select id="ab_r" onchange="dsV37AbFilter()"><option value="">Tous les profils</option>' + roles.map(function (r) { return '<option value="' + r + '"' + (AB.r === r ? ' selected' : '') + '>' + E(RL[r] || r) + '</option>'; }).join('') + '</select></div>'
      + '<div class="card"><b>Utilisateurs (' + list.length + ')</b>' + (list.slice(0, 150).map(function (x) {
        var badge = { exp: '🔴 Terminé', soon: '🟠 Bientôt', ok: '🟢 Actif', none: '⚪ Sans échéance' }[x.st];
        return '<div class="row"><span style="display:flex;gap:8px;align-items:center">' + av(x.u.id, 34) + '<span><b>' + E(x.u.name) + '</b> <span class="mu">' + E(RL[x.u.role] || x.u.role) + '</span><div class="mu">' + badge + (x.s.exp ? ' · ' + (x.d < 0 ? 'terminé depuis ' + (-x.d) + ' j' : x.d + ' j restants') + ' (' + E(x.s.exp) + ')' : '') + ' · ' + E(x.s.label) + (x.u.subRemindedAt ? ' · rappelé le ' + E(String(x.u.subRemindedAt).slice(0, 10)) : '') + '</div></span></span><span>' + btn('🔔', 'dsV37Remind(' + Number(x.u.id) + ')') + ' ' + btn('✅ Réactiver', 'dsV37Reactivate(' + Number(x.u.id) + ')', 'p') + '</span></div>';
      }).join('') || '<div class="mu" style="margin-top:6px">Aucun utilisateur pour ce filtre.</div>') + '</div>';
  }
  window.dsV37AbFilter = function () { AB.f = val('ab_f') || 'tous'; AB.r = val('ab_r'); render(); };
  window.dsV37Remind = function (id) { if (!isSuper()) return; var x = subRows().filter(function (r) { return r.u.id == id; })[0]; if (!x) return; remind(x); L('Rappel d’abonnement : ' + x.u.name); save(); render(); alert('Rappel envoyé à ' + x.u.name + '.'); };
  window.dsV37RemindAll = function (st) {
    if (!isSuper()) return; var l = subRows().filter(function (x) { return x.st === st; }); if (!l.length) return alert('Aucun utilisateur concerné.');
    if (!confirm('Envoyer un rappel à ' + l.length + ' utilisateur(s) ?')) return; l.forEach(remind); L('Rappels d’abonnement (' + l.length + ')'); save(); render(); alert(l.length + ' rappel(s) envoyé(s).');
  };
  window.dsV37Reactivate = function (id) {
    if (!isSuper()) return; var x = subRows().filter(function (r) { return r.u.id == id; })[0]; if (!x) return;
    var m = parseInt(prompt('Nombre de mois payés pour réactiver l’abonnement de ' + x.u.name + ' :', '1'), 10); if (!(m > 0)) return;
    if (x.s.kind === 'groupe') { var s = sch(x.u.school); if (typeof doRenew === 'function') doRenew(s, 30 * m); else { var b = daysLeft(s.exp) >= 0 ? new Date(s.exp) : new Date(); b.setDate(b.getDate() + 30 * m); s.exp = b.toISOString().slice(0, 10); s.status = 'actif'; } }
    else if (x.s.kind === 'rep') { var r = repRec(x.u.id), b2 = daysLeft(r.exp) >= 0 ? new Date(r.exp) : new Date(); b2.setDate(b2.getDate() + 30 * m); r.exp = b2.toISOString().slice(0, 10); r.status = 'actif'; r.renewedAt = new Date().toISOString(); }
    else { var base = x.s.exp && daysLeft(x.s.exp) >= 0 ? new Date(x.s.exp) : new Date(); base.setDate(base.getDate() + 30 * m); x.u.subExp = base.toISOString().slice(0, 10); }
    x.u.active = true; var nx = subOf(x.u);
    notify(x.u.id, '✅ Votre abonnement est réactivé jusqu’au ' + fdate(nx.exp) + '. Merci !'); L('Abonnement réactivé : ' + x.u.name + ' (+' + m + ' mois)'); save(); render();
  };
  VIEWS.abosusers = absView;

  /* ======================================================================
     4. ONGLETS
     ====================================================================== */
  var _tabs = window.tabsOf;
  if (typeof _tabs === 'function') window.tabsOf = function () {
    var t = _tabs.apply(this, arguments) || []; if (!me) return t;
    function has(k) { return t.some(function (x) { return x[0] === k; }); }
    if (isSuper()) {
      var pend = spaces().filter(function (s) { return s.status === 'attente'; }).length;
      if (!has('effectifs')) tabAfter(t, 'perf', ['effectifs', '📊', 'Effectifs']);
      if (!has('abosusers')) tabAfter(t, 'renouv', ['abosusers', '⏳', 'Abonnements des utilisateurs']);
      if (!has('espacesrep')) tabAfter(t, 'msg', ['espacesrep', '🎓', 'Espaces de répétition' + (pend ? ' (' + pend + ')' : '')]);
    } else if ((me.role === 'eleve' || me.role === 'repetiteur') && !has('espacesrep')) {
      var n = mySpaces().reduce(function (s, sp) { return s + unread(sp); }, 0);
      tabAfter(t, 'msg', ['espacesrep', '🎓', (me.role === 'eleve' ? 'Répétitions' : 'Mes espaces de répétition') + (n ? ' (' + n + ')' : '')]);
    }
    return t;
  };

  /* messages de masse supplémentaires (super administrateur) */
  var _targets = window.targets;
  if (typeof _targets === 'function') window.targets = function () {
    var t = _targets.apply(this, arguments);
    if (isSuper()) { [['all:repetiteur', '📢 Tous les répétiteurs'], ['all:prof', '📢 Tous les enseignants']].forEach(function (x) { if (!t.some(function (y) { return y[0] === x[0]; })) t.splice(4, 0, x); }); }
    else if ((me.role === 'eleve' || me.role === 'parent' || me.role === 'repetiteur') && !t.some(function (y) { var u = U(y[0]); return u && u.role === 'super'; })) { /* le super administrateur reste joignable via 🔱 */ }
    return t;
  };

  /* ======================================================================
     5. TABLEAUX DE BORD ET INDICATEURS
     ====================================================================== */
  function avgOf(uidv) { var g = gof(uidv); return g.length ? wavg(g) : null; }
  function f1(x) { return x == null ? '—' : x.toFixed(1); }
  function byKey(list, key) { var o = {}; list.forEach(function (g) { var k = g[key] || '—'; (o[k] = o[k] || []).push(g); }); return o; }
  function subBanner() {
    var s = subOf(me); if (!s || !s.exp || s.kind === 'groupe' && me.role !== 'chef') return '';
    var d = daysLeft(s.exp); if (d > 7) return '';
    return '<div class="card" style="border-left:6px solid ' + (d < 0 ? '#e11d48' : '#f59e0b') + '"><b>' + (d < 0 ? '🔴 Votre abonnement est terminé' : '🟠 Votre abonnement se termine bientôt') + '</b><div class="mu">' + (d < 0 ? 'Terminé depuis le ' : 'Fin le ') + E(fdate(s.exp)) + '. Pour le renouveler, payez puis informez le super administrateur.</div>' + btn('Écrire au super administrateur', 'contactSuper()', 'p') + '</div>';
  }
  function dashSuper() {
    var e = effectifs(), ab = subRows(), exp = ab.filter(function (x) { return x.st === 'exp'; }).length, soon = ab.filter(function (x) { return x.st === 'soon'; }).length;
    var pend = (S.reqs || []).filter(function (r) { return r.st === 'attente'; }).length + (S.codeReqs || []).filter(function (r) { return r.status === 'attente'; }).length + spaces().filter(function (s) { return s.status === 'attente'; }).length;
    var unreadN = (S.msgs || []).filter(function (m) { return m.to == me.id && !m.readAt; }).length, sh = arr('shares'), reads = arr('shareReads'), dest = sh.reduce(function (s, x) { return s + (x.to || []).length; }, 0);
    var perG = {}; (S.users || []).filter(function (u) { return u.role === 'eleve' && u.school; }).forEach(function (u) { var a = avgOf(u.id); if (a != null) { var k = grpName(u); (perG[k] = perG[k] || []).push(a); } });
    var gk = Object.keys(perG).map(function (k) { return [k, avg(perG[k])]; }).sort(function (a, b) { return b[1] - a[1]; });
    var spOpen = spaces().filter(function (s) { return s.status === 'ouvert'; }).length;
    return '<h3>📈 Indicateurs de la plateforme</h3>' + kgrid([kpi('Élèves et étudiants', e.total, e.sans + ' sans groupe'), kpi('Répétiteurs actifs', e.repActive, 'sur ' + e.reps), kpi('Demandes à traiter', pend), kpi('Espaces de répétition ouverts', spOpen)])
      + kgrid([kpi('Abonnements terminés', exp, soon + ' finissent sous 7 j'), kpi('Envois de contenus', sh.length, unreadN + ' message(s) non lu(s)'), kpi('Taux d’ouverture des envois', dest ? Math.round(reads.length / dest * 100) + ' %' : '—', dest + ' destinataire(s)'), kpi('Groupes de répétition', e.groups)])
      + '<div class="card"><b>Moyenne générale par groupe de répétition</b>' + (gk.slice(0, 8).map(function (x) { return bar(x[0], x[1], 20, x[1] >= 10 ? '#22a559' : '#e11d48', f1(x[1]) + '/20'); }).join('') || '<div class="mu">Aucune note enregistrée.</div>') + '</div>'
      + '<div class="card"><b>Répartition des élèves par groupe</b>' + Object.keys(e.by.groupe).sort(function (a, b) { return e.by.groupe[b] - e.by.groupe[a]; }).slice(0, 8).map(function (k) { return bar(k, e.by.groupe[k], e.total, '#f97316', e.by.groupe[k]); }).join('') + '</div>'
      + '<div>' + btn('📊 Effectifs détaillés', "go('effectifs')", 'p') + ' ' + btn('🔔 Abonnements', "go('abosusers')") + '</div>';
  }
  function dashChef() {
    var els = (S.users || []).filter(function (u) { return u.role === 'eleve' && u.school == me.school; }), cl = (S.classes || []).filter(function (c) { return c.school == me.school; });
    var av_ = els.map(function (u) { return { u: u, a: avgOf(u.id) }; }), with_ = av_.filter(function (x) { return x.a != null; });
    var mean = with_.length ? avg(with_.map(function (x) { return x.a; })) : null, pass = with_.length ? Math.round(with_.filter(function (x) { return x.a >= 10; }).length / with_.length * 100) : null;
    var weak = with_.filter(function (x) { return x.a < 10; }).length, linked = els.filter(function (u) { return (S.users || []).some(function (p) { return p.role === 'parent' && (p.kids || []).indexOf(u.id) >= 0; }); }).length;
    var staff = (S.users || []).filter(function (u) { return u.school == me.school && ['prof', 'comptable', 'censeur'].indexOf(u.role) >= 0; }).length, s = sch(me.school), d = s ? daysLeft(s.exp) : null;
    var cond = els.length ? avg(els.map(function (u) { return Number(u.conduite) || 0; })) : null, abs = els.reduce(function (t, u) { return t + (Number(u.abs) || 0); }, 0);
    var perC = cl.map(function (c) { var l = with_.filter(function (x) { return x.u.classId == c.id; }); return [c.name, l.length ? avg(l.map(function (x) { return x.a; })) : null, els.filter(function (u) { return u.classId == c.id; }).length]; });
    return '<h3>📈 Indicateurs de mon groupe de répétition</h3>' + kgrid([kpi('Élèves inscrits', els.length, cl.length + ' classe(s)'), kpi('Moyenne générale', f1(mean) + (mean != null ? '/20' : '')), kpi('Taux de réussite (≥ 10)', pass == null ? '—' : pass + ' %', weak + ' élève(s) en difficulté'), kpi('Personnel', staff)])
      + kgrid([kpi('Parents liés (n° de suivi)', els.length ? Math.round(linked / els.length * 100) + ' %' : '—', linked + '/' + els.length), kpi('Conduite moyenne', f1(cond) + (cond != null ? '/20' : '')), kpi('Absences cumulées', abs), kpi('Abonnement', d == null ? '—' : d < 0 ? 'Terminé' : d + ' j', s ? s.plan : '')])
      + '<div class="card"><b>Moyenne par classe</b>' + (perC.map(function (x) { return bar(x[0] + ' (' + x[2] + ' élève(s))', x[1] || 0, 20, x[1] != null && x[1] < 10 ? '#e11d48' : '#22a559', f1(x[1]) + (x[1] != null ? '/20' : '')); }).join('') || '<div class="mu">Aucune classe.</div>') + '</div>';
  }
  function dashProf() {
    var mat = me.matieres || [], cls_ = me.classes || [], g = (S.grades || []).filter(function (x) { return x.school == me.school && (!mat.length || mat.indexOf(x.subject) >= 0) && (!cls_.length || cls_.indexOf((U(x.sid) || {}).classId) >= 0); });
    var students = (S.users || []).filter(function (u) { return u.role === 'eleve' && u.school == me.school && (!cls_.length || cls_.indexOf(u.classId) >= 0); }).length, bs = byKey(g, 'subject'), keys = Object.keys(bs);
    var tot = g.length ? wavg(g) : null, pass = g.length ? Math.round(g.filter(function (x) { return x.score >= 10; }).length / g.length * 100) : null;
    return '<h3>📈 Mes indicateurs</h3>' + kgrid([kpi('Élèves concernés', students), kpi('Notes saisies', g.length), kpi('Moyenne des notes', f1(tot) + (tot != null ? '/20' : '')), kpi('Notes ≥ 10', pass == null ? '—' : pass + ' %')])
      + '<div class="card"><b>Moyenne par matière</b>' + (keys.map(function (k) { var m = wavg(bs[k]); return bar(k + ' (' + bs[k].length + ' note(s))', m, 20, m >= 10 ? '#22a559' : '#e11d48', f1(m) + '/20'); }).join('') || '<div class="mu">Aucune note pour le moment.</div>') + '</div>';
  }
  function dashEleve() {
    if (!me.school) { var p = arr('suiviProgress').filter(function (x) { return x.student == me.id; }).length, sp = mySpaces(); return '<h3>📈 Mes indicateurs</h3>' + kgrid([kpi('Évaluations de progression', p), kpi('Espaces de répétition', sp.filter(function (s) { return s.status === 'ouvert'; }).length, sp.length + ' demande(s)'), kpi('Numéro de suivi', E(me.code || '—'))]); }
    var g = gof(me.id), a = g.length ? wavg(g) : null, bs = byKey(g, 'subject'), bp = byKey(g, 'period'), pk = Object.keys(bp);
    var subj = Object.keys(bs).map(function (k) { return [k, wavg(bs[k])]; }).sort(function (x, y) { return y[1] - x[1]; });
    var sp = mySpaces().filter(function (s) { return s.status === 'ouvert'; }).length;
    return '<h3>📈 Mes indicateurs</h3>' + kgrid([kpi('Moyenne générale', f1(a) + (a != null ? '/20' : '')), kpi('Rang', a != null ? rank(me.id) : '—'), kpi('Absences', Number(me.abs) || 0), kpi('Conduite', (Number(me.conduite) || 0) + '/20')])
      + (subj.length ? '<div class="card"><b>Mes matières</b>' + subj.map(function (x) { return bar(x[0], x[1], 20, x[1] >= 10 ? '#22a559' : '#e11d48', f1(x[1]) + '/20'); }).join('') + (subj.length ? '<div class="mu">Point fort : ' + E(subj[0][0]) + ' · À renforcer : ' + E(subj[subj.length - 1][0]) + '</div>' : '') + '</div>' : '')
      + (pk.length > 1 ? '<div class="card"><b>Ma progression par période</b>' + spark(pk.map(function (k) { return [k, wavg(bp[k])]; })) + '</div>' : '')
      + (sp ? '<div class="mu">🎓 ' + sp + ' espace(s) de répétition ouvert(s).</div>' : '');
  }
  function dashParent() {
    var ks = (me.kids || []).map(U).filter(function (u) { return u && u.school; }); if (!ks.length) return '';
    return '<h3>📈 Indicateurs de mes enfants</h3><div class="card">' + ks.map(function (u) { var a = avgOf(u.id); return bar(u.name + ' — rang ' + (a != null ? rank(u.id) : '—') + ' · ' + (Number(u.abs) || 0) + ' abs.', a || 0, 20, a != null && a < 10 ? '#e11d48' : '#22a559', f1(a) + (a != null ? '/20' : '')); }).join('') + '</div>';
  }
  function dashRep() {
    var r = repRec(me.id), sp = mySpaces(), open = sp.filter(function (s) { return s.status === 'ouvert'; }), students = {}; sp.forEach(function (s) { students[s.student] = 1; });
    var d = r ? daysLeft(r.exp) : null, unreadMsgs = (S.msgs || []).filter(function (m) { return m.to == me.id && !m.readAt; }).length;
    return '<h3>📈 Mes indicateurs</h3>' + kgrid([kpi('Espaces ouverts', open.length), kpi('Élèves accompagnés', Object.keys(students).length), kpi('Messages non lus', unreadMsgs), kpi('Abonnement', d == null ? '—' : d < 0 ? 'Terminé' : d + ' j', r ? (r.status || '') : '')]);
  }
  var _dash = VIEWS.dash;
  if (typeof _dash === 'function') VIEWS.dash = function () {
    var h = _dash.apply(this, arguments); if (!me) return h;
    var x = '';
    try { x = { super: dashSuper, chef: dashChef, prof: dashProf, eleve: dashEleve, parent: dashParent, repetiteur: dashRep }[me.role]; x = x ? x() : ''; } catch (e) { x = ''; }
    return subBanner() + h + x;
  };
})();
