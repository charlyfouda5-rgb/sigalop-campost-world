# DELTA SCHOOL V37 — Envois, effectifs, abonnements, espaces de répétition, indicateurs

## 1. Envoyer liens, photos, épreuves, cours (super administrateur)
Onglet « Envoyer des contenus » : types Livre, Vidéo, Document, **Photo, Épreuve, Cours, Lien**, Autre ; fichier et/ou lien.
Destinataires : élèves et étudiants **avec ou sans groupe de répétition** (filtre « Sans groupe de répétition », bouton « Élèves sans groupe »), parents, répétiteurs, groupes de répétition, personnel.
Un élève suivi en direct sans accès de connexion : le contenu est aussi envoyé à son parent. Chaque destinataire peut **répondre au super administrateur** depuis sa bibliothèque.

## 2. Effectifs (super administrateur) — onglet « Effectifs »
Élèves et étudiants par **section**, **système**, **groupe de répétition** et **classe** (détail dépliable) ; élèves sans groupe ; personnel (enseignants, comptables, censeurs) total et par groupe ; répétiteurs (et abonnés actifs) ; parents ; groupes ; super administrateurs. Export CSV.

## 3. Abonnements des utilisateurs — onglet « Abonnements des utilisateurs »
États : terminé, fin sous 7 jours, actif, sans échéance. Actions : **rappeler** (un utilisateur, tous les terminés, ou ceux qui finissent sous 7 jours) et **réactiver** (nombre de mois payés). Couvre les groupes de répétition, les répétiteurs et les comptes individuels. L'utilisateur voit une bannière sur son tableau de bord quand son abonnement est terminé ou proche de la fin.
Note : les groupes de répétition et répétiteurs sont bloqués automatiquement à l'expiration (comportement existant) ; pour les autres comptes, le rappel et la réactivation sont manuels.

## 4. Étudiants et recherche de répétiteurs
Un compte élève peut se déclarer « Étudiant » (onglet Répétitions). La recherche de répétiteurs par besoin reste disponible ; le super administrateur peut leur envoyer messages, liens et documents.

## 5. Espaces de répétition
1. L'élève/étudiant (avec ou sans groupe) envoie une demande (matière/besoin, niveau, précisions).
2. Le super administrateur **accepte** : un espace de discussion s'ouvre dans la plateforme (photos de profil visibles de part et d'autre), ou **refuse** avec un motif.
3. Il peut **déléguer un répétiteur** : la liste montre 🟢 connecté / ⚪ hors ligne et ✔ apte (matière ou niveau compatible, abonnement actif). Le répétiteur reçoit l'espace dans « Mes espaces de répétition ».
4. Le super administrateur peut retirer un répétiteur ou terminer l'espace.
Seuls l'élève, le super administrateur et les répétiteurs délégués voient un espace.

## 6. Tableaux de bord et indicateurs
Super administrateur (effectifs, demandes, abonnements, taux d'ouverture des envois, moyenne par groupe), groupe de répétition (moyenne, taux de réussite, élèves en difficulté, parents liés, conduite, absences, abonnement, moyenne par classe), enseignant (notes, moyenne par matière), élève (moyenne, rang, matières fortes/faibles, progression par période), parent (indicateurs par enfant), répétiteur (espaces, élèves accompagnés, abonnement).

## Déploiement
Exécuter `backend/neon/migration_v37_espaces_effectifs_abonnements.sql`. Nouvelles collections synchronisées : `repSpaces`, `repSpaceMsgs`. L'API refuse qu'un élève ouvre lui-même un espace ou écrive au nom d'un autre.
