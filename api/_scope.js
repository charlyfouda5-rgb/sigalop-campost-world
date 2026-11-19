'use strict';
/* V40 — séparation des données côté serveur.
   view(state, auth) renvoie à un utilisateur connecté uniquement ce qui le concerne :
   son groupe de répétition / établissement, ses enfants, ses conversations, ses espaces.
   Le super administrateur reçoit tout. DATA_SCOPING=off (variable Vercel) désactive le filtrage (retour arrière rapide). */

const OFF = () => String(process.env.DATA_SCOPING || '').toLowerCase() === 'off';
const arr = x => Array.isArray(x) ? x : (x === undefined || x === null ? [] : [x]);
const has = (list, id) => arr(list).some(x => String(x) === String(id));

/* collections de configuration visibles par tous les comptes connectés */
const PASS = ['cfg', 'langs', 'rates'];
/* champs personnels retirés des fiches des autres utilisateurs pour élèves, parents et répétiteurs */
const PRIVATE_FIELDS = ['code', 'phone', 'email', 'matricule', 'isii', 'ISII', 'birth', 'birthDate', 'kids', 'monthly', 'orange', 'address', 'suiviMode'];
const LOW = ['eleve', 'parent', 'repetiteur'];

function redact(u) { const o = Object.assign({}, u); PRIVATE_FIELDS.forEach(k => { delete o[k]; }); return o; }

function view(state, auth) {
  if (OFF() || !auth || auth.r === 'super' || auth.r === 'guest' || !state || typeof state !== 'object') return state;
  const users = Array.isArray(state.users) ? state.users : [];
  const me = users.find(u => String(u.id) === String(auth.u));
  if (!me) { const o = {}; PASS.forEach(k => { if (state[k] !== undefined) o[k] = state[k]; }); return o; }
  const role = me.role, low = LOW.indexOf(role) >= 0, isParent = role === 'parent', isEleve = role === 'eleve', isRep = role === 'repetiteur';
  const byId = new Map(users.map(u => [String(u.id), u]));
  const kids = isParent ? arr(me.kids).map(k => byId.get(String(k))).filter(Boolean) : [];
  const kidIds = new Set(kids.map(k => String(k.id)));
  const schools = new Set();
  if (me.school) schools.add(String(me.school));
  kids.forEach(k => { if (k.school) schools.add(String(k.school)); });
  const inSchool = rec => !!rec && rec.school !== undefined && rec.school !== null && schools.has(String(rec.school));
  const mine = rec => !!rec && ['uid', 'from', 'by', 'requester', 'parent', 'user_id', 'userId'].some(f => rec[f] !== undefined && String(rec[f]) === String(me.id));
  const myRep = (state.reps || []).find(r => String(r.uid) === String(me.id));
  const myRepId = myRep ? myRep.id : null;
  const staff = !low;                                   // chef, enseignant, comptable, censeur…
  const studentIdsOfSchool = new Set(users.filter(u => u.role === 'eleve' && u.school && schools.has(String(u.school))).map(u => String(u.id)));

  const out = {}; PASS.forEach(k => { if (state[k] !== undefined) out[k] = state[k]; });
  const list = k => Array.isArray(state[k]) ? state[k] : [];
  const keep = (k, fn) => { if (Array.isArray(state[k])) out[k] = state[k].filter(fn); };
  const sidOf = r => r.sid !== undefined ? r.sid : (r.student !== undefined ? r.student : r.student_id);
  const mineOrKid = r => String(sidOf(r)) === String(me.id) || kidIds.has(String(sidOf(r)));

  /* --- données rattachées à un établissement --- */
  keep('classes', inSchool); keep('subjects', inSchool); keep('late', r => staff && inSchool(r));
  keep('grades', r => staff ? inSchool(r) : mineOrKid(r));
  keep('disc', r => staff ? inSchool(r) : mineOrKid(r));
  keep('dec', r => staff ? inSchool(r) : mineOrKid(r));
  keep('rat', r => staff ? inSchool(r) : (isEleve && String(r.sid) === String(me.id)));
  keep('fin', r => staff && inSchool(r));
  keep('acc', r => staff && inSchool(r));
  keep('renewRequests', r => staff && inSchool(r));
  keep('parentNotices', r => staff && inSchool(r));
  keep('dismissals', r => staff && inSchool(r));
  keep('groupRequests', r => mine(r) || (staff && inSchool(r)));
  keep('meetingRequests', r => mine(r) || (staff && inSchool(r)));
  keep('meetings', inSchool);
  keep('groups', r => inSchool(r) || has(r.members, me.id) || mine(r));
  keep('studentArchives', r => staff ? (inSchool(r) || (r.student !== undefined && studentIdsOfSchool.has(String(r.student)))) : mineOrKid(r));
  keep('studentTransfers', r => staff && (schools.has(String(r.fromSchool)) || schools.has(String(r.toSchool))));
  keep('gradeUnlockRequests', r => mine(r) || (r.user && String(r.user.id) === String(me.id)) || (staff && (inSchool(r) || (r.user && r.user.school && schools.has(String(r.user.school))))));
  keep('suiviOps', r => staff ? (r.student !== undefined && studentIdsOfSchool.has(String(r.student))) : mineOrKid(r));
  keep('suiviProgress', r => staff ? (sidOf(r) !== undefined && studentIdsOfSchool.has(String(sidOf(r)))) : mineOrKid(r));
  keep('nums', () => role === 'chef');
  keep('accessHistory', mine);   // chacun garde ses propres connexions (heure de déconnexion) ; l'historique complet reste au super administrateur

  /* --- messagerie et conversations --- */
  keep('msgs', r => String(r.from) === String(me.id) || has(r.to, me.id));
  const convIds = new Set(list('convs').filter(c => String(c.sid) === String(me.id) || (myRepId !== null && String(c.rid) === String(myRepId))).map(c => String(c.id)));
  keep('convs', c => convIds.has(String(c.id)));
  keep('cm', r => convIds.has(String(r.cid)));
  if (out.cm) out.cm = out.cm.map(r => { const o = Object.assign({}, r); delete o.raw; return o; });  // texte brut (numéros) réservé au super administrateur
  keep('dom', r => String(r.sid) === String(me.id) || (myRepId !== null && String(r.rid) === String(myRepId)));
  if (Array.isArray(state.reps)) out.reps = state.reps;

  /* --- envois, ressources, traductions --- */
  keep('shares', r => has(r.to, me.id) || String(r.from) === String(me.id));
  keep('shareReads', r => String(r.uid) === String(me.id));
  keep('resources', r => has(r.to, me.id) || String(r.from) === String(me.id));
  keep('resourceReads', r => mine(r) || String(r.rid) === String(me.id) || String(r.student) === String(me.id));
  keep('translationJobs', r => mine(r));
  keep('trReq', r => mine(r));
  keep('codeReqs', r => isParent && String(r.parent) === String(me.id));

  /* --- espaces collectifs (V38) et espaces de répétition (V37) --- */
  const gOk = s => has(s.students, me.id) || has(s.staff, me.id) || arr(s.students).some(x => kidIds.has(String(x)));
  const gIds = new Set(list('grpSpaces').filter(gOk).map(s => String(s.id)));
  keep('grpSpaces', s => gIds.has(String(s.id)));
  const silentSp = new Set(list('grpSpacePrefs').filter(p => String(p.uid) === String(me.id) && p.silent).map(p => String(p.space)));
  keep('grpSpaceMsgs', m => gIds.has(String(m.space)) && !silentSp.has(String(m.space)));   // V41 : un élève en mode silencieux ne reçoit pas la discussion
  keep('grpSpacePrefs', r => String(r.uid) === String(me.id));
  const rOk = s => String(s.student) === String(me.id) || has(s.members, me.id) || kidIds.has(String(s.student));
  const rIds = new Set(list('repSpaces').filter(rOk).map(s => String(s.id)));
  keep('repSpaces', s => rIds.has(String(s.id)));
  keep('repSpaceMsgs', m => rIds.has(String(m.space)));

  /* --- utilisateurs --- */
  const vis = new Map();               // id -> fiche (complète ou réduite)
  const add = (u, full) => { if (u && !vis.has(String(u.id))) vis.set(String(u.id), full ? u : redact(u)); };
  add(me, true);
  const supers = users.filter(u => u.role === 'super');
  supers.forEach(u => add(u, false));
  users.forEach(u => {
    if (u.school && schools.has(String(u.school)) && !(isParent && u.role === 'eleve')) add(u, !low || kidIds.has(String(u.id)));   // un parent ne voit que ses enfants et le personnel
  });
  kids.forEach(k => add(k, true));
  if (staff) users.filter(u => u.role === 'parent' && arr(u.kids).some(k => studentIdsOfSchool.has(String(k)))).forEach(u => add(u, true));
  arr(state.reps).forEach(r => add(byId.get(String(r.uid)), false));
  (out.msgs || []).forEach(m => { add(byId.get(String(m.from)), false); arr(m.to).forEach(t => add(byId.get(String(t)), false)); });
  (out.convs || []).forEach(c => { add(byId.get(String(c.sid)), false); const r = list('reps').find(x => String(x.id) === String(c.rid)); if (r) add(byId.get(String(r.uid)), false); });
  (out.dom || []).forEach(d => { add(byId.get(String(d.sid)), false); const r = list('reps').find(x => String(x.id) === String(d.rid)); if (r) add(byId.get(String(r.uid)), false); });
  (out.grpSpaces || []).forEach(s => { arr(s.students).concat(arr(s.staff), [s.by]).forEach(i => add(byId.get(String(i)), false)); });
  (out.repSpaces || []).forEach(s => { arr(s.members).concat([s.student]).forEach(i => add(byId.get(String(i)), false)); });
  (out.shares || []).forEach(s => add(byId.get(String(s.from)), false));
  (out.resources || []).forEach(s => add(byId.get(String(s.from)), false));
  out.users = users.filter(u => vis.has(String(u.id))).map(u => vis.get(String(u.id)));

  /* --- établissements : fiche complète pour les siens, fiche réduite pour les autres --- */
  if (Array.isArray(state.schools)) out.schools = state.schools.map(s => schools.has(String(s.id)) ? s : { id: s.id, name: s.name, country: s.country, region: s.region, ville: s.ville, city: s.city });
  const userIds = new Set(out.users.map(u => String(u.id)));
  keep('photos', r => userIds.has(String(r.uid)) || inSchool(r));
  /* tout le reste (journaux, positions GPS, historiques, doublons, instantanés de performance…) est réservé au super administrateur */
  return out;
}

/* périmètre d'écriture : l'utilisateur ne modifie que ce qui appartient à son établissement */
const SCHOOL_WRITE_KEYS = ['classes', 'subjects', 'grades', 'fin', 'disc', 'dec', 'late', 'parentNotices', 'dismissals', 'meetings'];
function writeScope(S, auth) {
  if (OFF() || !auth || auth.r === 'super' || auth.r === 'guest') return null;
  const me = (S.users || []).find(u => String(u.id) === String(auth.u));
  return me ? { school: me.school ? String(me.school) : '' } : null;
}
module.exports = { view, writeScope, SCHOOL_WRITE_KEYS };
