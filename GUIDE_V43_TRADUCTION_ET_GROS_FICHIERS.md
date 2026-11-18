# V43 — Traduction dans les espaces collectifs + très gros fichiers

## 1. Traduction (langues différentes dans un même espace)
Chaque utilisateur a sa langue (profil). Chacun écrit dans sa langue ; chaque message garde la langue de son auteur.
- Sous chaque message écrit dans une autre langue : bouton **« 🌐 Traduire en <ma langue> »** (et retour à l'original au second appui).
- Case **« Traduire automatiquement les messages des autres dans ma langue »** (choix personnel, retenu sur l'appareil).
- **Liens** : « 🌐 Ouvrir la page traduite » (page web traduite par Google Traduction).
- **Documents** (PDF, Word…) : lien vers Google Traduction (le fichier doit y être déposé).
- Fonctionne pour élèves, parents (même en lecture seule), enseignants, répétiteurs, super administrateur.
- Exemple : un enseignant chinois écrit en 中文, les élèves français lisent en un appui (ou automatiquement) en français, et répondent en français que l'enseignant traduit en 中文.

### Sans aucune configuration (dès le dépôt sur GitHub)
Un service gratuit (MyMemory) est utilisé depuis le navigateur. Limites : environ 5 000 caractères par jour et par connexion Internet, qualité correcte mais inférieure à Google.

### Meilleure qualité (une seule fois, facultatif)
Créer une clé **Google Cloud Translation** (Basic v2) et la mettre dans Vercel : `GOOGLE_TRANSLATE_API_KEY`. Le serveur traduit alors chaque message une seule fois par langue (résultat partagé entre tous les élèves de la même langue) avec un quota par utilisateur (`TRANSLATE_DAILY_CHARS`, 30 000 par défaut).
Coût indicatif Google : 500 000 caractères gratuits par mois, puis environ 20 $ le million.

### Limites
- Texte, titres et messages : traduits dans la plateforme.
- Liens et documents : traduction par Google Traduction dans un nouvel onglet.
- Photos (texte écrit à la main), messages vocaux et vidéos : **pas de traduction automatique** (nécessite reconnaissance de texte / de voix, non incluse).

## 2. Très gros fichiers (jusqu'à 250 Go par défaut)
### Sans configuration
- Photos (réduites), PDF/Word, vocal 2 minutes, vidéo courte : jusqu'à **3 Mo** par fichier, stockés dans Neon.
- **Liens** (Google Drive, YouTube…) : **aucune limite de taille**, disponibles immédiatement pour tous.

### Pour envoyer directement des fichiers de 3 Mo jusqu'à 250 Go (une seule fois)
Cela demande un espace de stockage externe : GitHub seul ne peut pas stocker ces fichiers. Utiliser **Cloudflare R2** :
1. Créer un compte Cloudflare, puis **R2 → Create bucket** (ex. `delta-school-fichiers`).
2. **R2 → Manage API tokens** : créer une clé *Object Read & Write* sur ce bucket. Noter Account ID, Access Key ID, Secret Access Key.
3. Dans le bucket → **Settings → CORS policy**, coller (en remplaçant l'adresse par celle de votre site) :
```
[{"AllowedOrigins":["https://VOTRE-SITE.vercel.app"],"AllowedMethods":["PUT","GET","HEAD"],"AllowedHeaders":["*"],"ExposeHeaders":["ETag"],"MaxAgeSeconds":3600}]
```
4. Dans Vercel → Environment Variables : `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (facultatif : `MAX_SPACE_UPLOAD_GB`). Puis Redeploy.
5. Vérifier : `/api/health` affiche `"r2_configured":true`.
Ensuite, les boutons 🎥 Vidéo et 📄 Document envoient automatiquement par morceaux de 64 Mo (3 en parallèle, 5 essais par morceau) avec barre de progression, et la lecture se fait directement depuis R2.
Coût indicatif R2 : 10 Go gratuits puis environ 0,015 $ par Go et par mois (200 Go ≈ 3 $ par mois) ; pas de frais de téléchargement.

### À savoir
- L'application doit rester ouverte pendant un très gros envoi ; en cas de coupure, relancer l'envoi (un envoi interrompu n'est pas repris automatiquement).
- La durée dépend de la connexion : 200 Go à 20 Mbit/s prennent environ 22 heures.
- Types acceptés : photo, vidéo, audio, PDF, Word, PowerPoint, Excel, texte, ZIP. Limite de 40 gros fichiers par jour et par utilisateur.
- Les tables nécessaires se créent automatiquement.

## Fichiers à déposer sur GitHub (depuis la V42)
`api/spaceio.js`, `api/_lib.js`, `espaces-collectifs-v38.js` (+ `.env.example`, ce guide, `README.md`).
