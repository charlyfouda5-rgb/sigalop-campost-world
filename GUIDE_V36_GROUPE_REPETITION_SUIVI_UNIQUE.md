# DELTA SCHOOL V36 — Groupe de répétition et numéro de suivi unique

## Ce qui change
1. **Compte « Chef d'établissement » → « Groupe de répétition »** : tous les libellés visibles changent (rôle, onglets, messages, comptes démo, traductions). Le rôle technique reste `chef` en interne pour ne casser ni la base de données ni l'API. Tout le reste du fonctionnement est conservé.
2. **Nouveau logo** (bleu/turquoise, « Une école, un monde, une plateforme ») : logo de l'application, icônes PWA, favicon, icône d'installation.
3. **Un seul numéro de suivi par élève** (`SUI-######`) :
   - créé à l'inscription dans le compte du groupe de répétition et envoyé automatiquement au parent ;
   - le parent le saisit dans « Mes enfants » (ou le retrouve déjà ajouté) pour suivre les informations de l'élève dans le groupe ;
   - il ne change jamais : le rattachement à un groupe, un transfert, un passage de classe ou de cycle ne créent plus de nouveau numéro ;
   - les opérations (inscription, transfert, bulletin, redoublement…) sont consignées dans le dossier de l'élève, sous ce numéro (onglet « Matricules & suivi ») ;
   - les anciens numéros d'opération sont archivés, plus générés ;
   - l'API refuse un numéro déjà utilisé et empêche son remplacement par un autre rôle que le super administrateur.
4. **Élève sans groupe de répétition** (onglet « Suivi direct », super administrateur) :
   - le super administrateur crée le dossier (ou attribue un numéro à un compte élève sans groupe) ;
   - le numéro arrive dans la messagerie du parent et l'enfant est ajouté à « Mes enfants » (ou à son arrivée si le parent n'a pas encore de compte) ;
   - le super administrateur est responsable du suivi : il tient le journal de progression (rubrique, note /20, commentaire) visible du parent et de l'élève ; le parent est notifié à chaque entrée ;
   - le parent peut aussi demander ce suivi depuis « Mes enfants » ;
   - si l'élève est ensuite rattaché à un groupe de répétition, il **garde le même numéro**.

## Inchangés
Matricule (propre au groupe) et ISII (identifiant international permanent) ne sont pas des numéros de suivi et restent tels quels.

## Déploiement
- Exécuter `backend/neon/migration_v36_suivi_unique_groupe_repetition.sql` (registre unique, opérations, progression).
- Remplacer les fichiers de l'application (le cache hors ligne passe en `delta-school-v36-shell`).
- Nouvelles collections synchronisées : `suiviOps`, `suiviProgress`.
