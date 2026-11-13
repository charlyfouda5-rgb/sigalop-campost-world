# BILLIONS SCHOOL V17 — GitHub + PostgreSQL (Neon) + Vercel

Base : V14 (tout est conservé). Nouveautés :

1. **Données en ligne** : toutes les données sont enregistrées dans PostgreSQL (Neon) et retrouvées sur n'importe quel téléphone après connexion (`sync.js`, `api/login.js`, `api/sync.js`).
2. **Numéro de suivi automatique** : à l'inscription d'un élève, le chef saisit le contact du parent ; le numéro est envoyé dans la messagerie du parent et l'enfant est ajouté à « Mes enfants ». Si le parent n'a pas encore de compte, l'envoi se fait dès qu'il en crée un (`features.js`).
3. **Recherche de répétiteurs** (élèves et parents) : champs matière, ville, région, quartier, mode, bouton « Rechercher », résultats affichés.

Déploiement : voir `GUIDE_DEPLOIEMENT_V15.md`. Sécurité et limites connues : section 5 du guide.

## Ajouts V16
4. **Traduction de fichiers volumineux** : envoi par morceaux vers Cloudflare R2 (`api/media.js`, `extras.js`) puis traitement par le worker Cloud Run (`worker/`). Limite réglable (`MAX_UPLOAD_GB`, 50 Go par défaut).
5. **Code de suivi introuvable** : le parent écrit au super administrateur depuis « Mes enfants » ; le super voit la demande dans l'onglet « Codes de suivi », vérifie l'élève et envoie le code (l'enfant est lié au compte du parent).
6. **Historique GPS** (super administrateur) : filtres utilisateur / profil / groupe de répétition / période, carte des positions filtrées avec trajet, export CSV.

Mise en place : `GUIDE_V16_TRADUCTION_ET_GPS.md`.

## Ajouts V17
7. **Bibliothèque** : le super administrateur envoie livres, vidéos, documents et autres fichiers (gros fichiers inclus) aux utilisateurs de son choix (par profil, groupe de répétition, recherche ou un par un). Les destinataires les retrouvent dans l'onglet « Bibliothèque », regardent les vidéos directement ou les téléchargent ; le super voit qui a ouvert quoi. Mise en place : `GUIDE_V17_BIBLIOTHEQUE.md`.

## Ajout V18
8. **Comptes de test** (super administrateur, onglet « Comptes de test ») : crée un groupe de répétition d’exemple avec un compte par profil (groupe de répétition, professeur, comptable, élève, parent, répétiteur), mots de passe aléatoires affichés sur l’appareil, suppression en un clic.

## Ajout V19
9. **Bibliothèque par lien** : le super administrateur peut envoyer un lien (YouTube, Google Drive, site) à la place d’un fichier — aucun stockage R2 requis.

## Ajout V20
10. **Google Traduction** : carte « Traduire avec Google Traduction » (documents, textes) dans Langues ; l’envoi de fichiers à traduire n’apparaît que si le stockage R2 est configuré.

## Ajout V21
11. **Performances (super administrateur)** : classements des groupes de répétition par quartier/ville/région/pays et par période (séquence, trimestre, semestre, année), progression et archives conservées, meilleurs et plus faibles élèves (matières faibles, notes, enseignants), effectifs des abonnés, alertes aux élèves/parents/groupes de répétition, renvois avec demande de motif. Chef : onglet « Renvois & localisation ».


## V36 — Groupe de répétition et numéro de suivi unique
Voir `GUIDE_V36_GROUPE_REPETITION_SUIVI_UNIQUE.md` : compte chef renommé « Groupe de répétition », nouveau logo, un seul numéro de suivi par élève, suivi direct par le super administrateur pour les élèves sans groupe.

## V37 — Envois, effectifs, abonnements, espaces de répétition, indicateurs
Voir `GUIDE_V37_ESPACES_EFFECTIFS_ABONNEMENTS.md`.

## V38 — Espaces collectifs et messagerie parents
Voir `GUIDE_V38_ESPACES_COLLECTIFS_MESSAGERIE_PARENTS.md`.

## V39 — Variables du super administrateur
Voir `GUIDE_V39_VARIABLES_SUPER_ADMIN.md` : `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` et `SESSION_SECRET` donnent toujours accès au compte super administrateur.
