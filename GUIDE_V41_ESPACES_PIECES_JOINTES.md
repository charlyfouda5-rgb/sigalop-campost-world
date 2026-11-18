# V41/V42 — Espaces collectifs : pièces jointes, corrections, mode silencieux, blocage, « écrit… »

## Ce que les élèves peuvent envoyer (dans « Mes espaces » → Discussion)
| Bouton | Action |
|---|---|
| 📷 Photo | ouvre l'appareil photo (photo de l'exercice dans le cahier) |
| 🖼️ Galerie | choisit une photo existante |
| 📄 PDF / Word | envoie un .pdf, .doc ou .docx |
| 🎤 Vocal | enregistre un message vocal (2 minutes maximum) |
| 🎥 Vidéo | filme ou choisit une vidéo courte (3 Mo maximum, environ 10 secondes) |

Les photos sont réduites automatiquement (1280 px). Une pièce jointe peut être envoyée avec ou sans texte.
Tailles maximales : photo 2 Mo, vocal 2,5 Mo, vidéo 3 Mo, document 3 Mo. Au-delà, un message explique quoi faire.

## Corrections
Le super administrateur et les intervenants cochent **« ✅ Ceci est une correction »** et choisissent l'exercice corrigé (ou « correction générale »). Ils peuvent joindre photo, PDF, vocal ou vidéo. Le message apparaît en vert avec la mention de l'exercice concerné, l'exercice reçoit l'étiquette « ✅ Corrigé », et l'élève est prévenu par la messagerie (quand c'est le super administrateur qui corrige). Un élève ne peut pas poster de fausse correction (refusé par le serveur).

## Mode silencieux (élève)
Bouton « 🔕 Ne plus participer à la discussion » : l'élève ne reçoit plus les messages de la discussion (le serveur ne les lui envoie plus) et ne peut plus écrire. Il garde les éléments partagés. Il ne peut **pas quitter** l'espace : seul le super administrateur le retire. Il peut reprendre la discussion à tout moment ; le super administrateur voit l'étiquette « 🔕 silencieux ».

## Blocage par le super administrateur (lecteurs)
Dans l'espace, carte **« 🔇 Qui peut écrire ? »** : bloquer ou autoriser un membre (élève ou intervenant), ou « Tout le monde en lecture seule » / « Autoriser tout le monde ». Le membre bloqué voit tout mais n'écrit plus, jusqu'à autorisation ; il est prévenu. Seul le super administrateur peut le faire (refusé par le serveur pour les autres). Le verrouillage existant (🔒 élèves seulement) reste disponible.

## Indicateur « X écrit… »
Quand un membre tape, les autres voient « ✍️ Nom écrit… » (ou « Nom1, Nom2 écrivent… ») sous le titre de la discussion. Pendant qu'un espace est ouvert, l'écran se rafraîchit toutes les 3 secondes, sans effacer le message en cours de saisie.

## Écriture simultanée
Tous les membres peuvent écrire en même temps : chaque message est enregistré séparément (test : 5 envois simultanés, 5 messages enregistrés).

## Déploiement
- Aucune migration SQL : les tables `space_media` et `space_typing` se créent automatiquement au premier envoi.
- Fichiers : `api/spaceio.js` (nouveau), `api/_lib.js`, `api/_scope.js`, `sync.js`, `espaces-collectifs-v38.js` (même nom, contenu V41).
- Les fichiers sont stockés dans Neon (plan gratuit : 0,5 Go). Surveillez l'espace dans le tableau de bord Neon ; au-delà de quelques centaines de photos/vocaux, prévoir le stockage R2.

## À savoir
- Les pièces jointes d'un élève sont visibles par tous les membres de l'espace et par les parents des élèves membres. Pour un exercice personnel, mieux vaut un petit espace.
- Les vidéos de téléphone dépassent vite 3 Mo : filmer environ 10 secondes en qualité basse. Pour des vidéos longues, il faudra configurer Cloudflare R2.
- Limite de 60 fichiers par utilisateur et par jour.
- Pas de suppression automatique des fichiers quand un espace est supprimé.

## Tests conseillés
1. Super administrateur : créer un espace avec 2 élèves, 1 enseignant.
2. Élève 1 : envoyer une photo (appareil photo), un PDF, un vocal, une vidéo courte.
3. Élève 2 : voir « ✍️ Élève 1 écrit… » et recevoir les envois en quelques secondes ; écrire en même temps.
4. Enseignant ou super administrateur : poster une correction liée à un exercice.
5. Élève 2 : activer « Ne plus participer », vérifier que la discussion disparaît, puis reprendre.
6. Super administrateur : bloquer l'élève 1, vérifier qu'il est en lecture seule, puis l'autoriser.

## V42 — Liens pour les fichiers volumineux
- Quand un fichier dépasse la limite (3 Mo), un message propose d'envoyer **un lien** à la place (Google Drive, YouTube, autre site) et place le curseur dans le champ **« 🔗 Lien »**.
- Chaque membre (élève, enseignant, répétiteur, super administrateur) peut coller un lien dans la discussion ; tous les membres de l'espace le voient et peuvent l'ouvrir.
- L'auteur doit régler le partage du fichier sur **« toute personne disposant du lien »**, sinon les autres ne pourront pas l'ouvrir.
- Protection des enfants : le lien d'un élève doit commencer par **https://** ; adresses IP, identifiants dans l'adresse et liens `javascript:` sont refusés par le serveur (aussi pour le personnel). Avant d'ouvrir un lien, un message prévient l'utilisateur qu'il quitte la plateforme et affiche le site.
- Le super administrateur peut **suspendre ou rétablir les liens des élèves** dans la carte « 🔇 Qui peut écrire ? » de chaque espace (bouton « 🔗 Suspendre les liens des élèves »).
- Fichiers modifiés : `api/_lib.js` et `espaces-collectifs-v38.js`.
- Attention : la plateforme ne contrôle pas le contenu du site vers lequel pointe un lien. Pour des mineurs, gardez la possibilité de suspendre les liens.
