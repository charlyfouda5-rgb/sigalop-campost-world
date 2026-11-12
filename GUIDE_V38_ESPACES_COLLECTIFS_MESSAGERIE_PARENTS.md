# DELTA SCHOOL V38 — Espaces collectifs et messagerie parents

## 1. Espaces de classe / catégorie (super administrateur)
Onglet « Espaces de classe » :
1. Donner un nom à l'espace (ex. « 3ème A — Maths »).
2. Sélectionner les élèves avec les filtres : groupe de répétition (ou **sans groupe**), classe, section, système, élèves/étudiants, recherche par nom ; cocher tout ou choisir un par un.
3. Créer : chaque élève est prévenu et retrouve l'espace dans « Mes espaces ».

Dans l'espace :
- **Éléments partagés** : cours, épreuve, photo, document, vidéo, lien, exercice — épinglés avec titre et lien.
- **Discussion** : les élèves échangent entre eux, avec photos de profil, sans quitter la plateforme.
- **Intervenants** : seul le super administrateur ajoute ou retire des enseignants et répétiteurs. La liste montre 🟢 connecté / ⚪ hors ligne et un indicateur de performance (enseignant : moyenne des élèves dans ses matières ; répétiteur : accompagnements et abonnement). Les intervenants peuvent partager des éléments et répondre.
- **Participation** : élèves actifs, messages, éléments, élèves qui ne sont pas encore intervenus.
- **Gestion** : ajouter/retirer des élèves, 🔒 verrouiller la discussion des élèves, terminer/rouvrir, supprimer.

Protection des enfants : les élèves n'écrivent que du texte (pas de lien) ; les parents des élèves membres suivent l'espace en lecture seule ; un élève ne voit que les espaces dont il est membre. Le serveur applique les mêmes règles.

## 2. Messagerie parents
- Un parent peut écrire au groupe de répétition et aux enseignants de **son** enfant.
- Les enseignants et le groupe de répétition peuvent écrire aux parents de leurs élèves.
- Les messages directs répétiteur ↔ élève et élève ↔ élève ne sont pas ouverts.

## Déploiement
Exécuter `backend/neon/migration_v38_espaces_collectifs.sql`. Nouvelles collections synchronisées : `grpSpaces`, `grpSpaceMsgs`. Cache hors ligne : `delta-school-v38-shell`.
