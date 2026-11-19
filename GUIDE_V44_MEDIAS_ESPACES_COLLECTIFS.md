# DELTA SCHOOL V44 — Envoi et lecture fiables dans les espaces collectifs

Cette version corrige le stockage des médias et la réception dans les groupes collectifs créés par le superadministrateur.

## Fonctions disponibles pour les élèves membres d'un espace
- Envoyer un message texte.
- Prendre une photo avec l'appareil photo ou choisir une image dans la galerie.
- Envoyer une vidéo depuis la galerie ou filmer avec le téléphone.
- Enregistrer et envoyer un message vocal (jusqu'à 2 minutes).
- Joindre un document accepté par l'interface.
- Voir les messages et médias envoyés par les autres membres.
- Ouvrir les photos, lire les vidéos avec les commandes du lecteur et écouter les vocaux avec les commandes audio.

Les messages restent dans l'espace collectif. Les membres autorisés les reçoivent par synchronisation automatique, environ toutes les 3 secondes lorsque l'espace est ouvert. Les droits de membre, le verrouillage, le mode silencieux et les blocages décidés par le superadministrateur restent appliqués.

## Correction technique V44
Les identifiants des comptes et espaces sont générés avec une valeur de date très élevée. Les anciennes tables multimédias utilisaient des colonnes PostgreSQL `INTEGER` (32 bits), ce qui provoquait des erreurs d'enregistrement et le message « Serveur indisponible ». V44 convertit ces colonnes en `BIGINT`, aussi bien sur les nouvelles installations que sur les tables déjà existantes.

V44 préserve également la position de lecture d'un message vocal ou d'une vidéo lorsqu'un nouveau message est reçu et que l'interface se rafraîchit.

## Installation
1. Remplacer les fichiers du projet par ceux de cette archive (ou téléverser les fichiers modifiés en conservant les autres fichiers).
2. Déployer le projet sur Vercel.
3. La correction des types de colonnes est appliquée automatiquement au premier appel à `/api/spaceio`. Il est aussi possible d'exécuter manuellement `backend/neon/migration_v44_media_bigint.sql` dans Neon SQL Editor.
4. Vérifier que `DATABASE_URL` et `SESSION_SECRET` sont bien définies dans Vercel.

## Limites de stockage
- Sans Cloudflare R2 : les photos, vocaux et vidéos courtes passent par le stockage Neon. Limites applicatives : photo 2 Mo, vocal 2,5 Mo, vidéo 3 Mo.
- Avec Cloudflare R2 configuré : les vidéos et documents volumineux sont envoyés directement par morceaux au stockage R2. Les variables requises sont `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` et `R2_BUCKET`. Le bucket doit autoriser CORS pour le domaine Vercel et exposer l'en-tête `ETag`.
- Une connexion Internet est nécessaire pour envoyer et recevoir les fichiers. Les membres doivent être connectés et appartenir à l'espace.

## Test de validation conseillé
1. Le superadministrateur crée un espace et y ajoute deux élèves.
2. Élève A envoie un texte, une photo, un vocal puis une vidéo.
3. Élève B garde le même espace ouvert : les nouveaux messages doivent apparaître automatiquement.
4. Élève B ouvre la photo, écoute le vocal et lance la vidéo.
5. Le superadministrateur vérifie que les messages sont visibles depuis son compte.
6. Répéter le test avec un enseignant ou un répétiteur membre de l'espace.
