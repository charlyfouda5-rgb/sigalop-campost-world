-- DELTA SCHOOL V38 : espaces collectifs (classe / catégorie) créés par le super administrateur.
-- À exécuter dans Neon SQL Editor après la migration V37.

CREATE TABLE IF NOT EXISTS group_spaces (
  id          BIGINT PRIMARY KEY,
  title       TEXT NOT NULL,
  category    TEXT,                -- description du regroupement (groupe, classe, section, système, étudiants…)
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'ouvert' CHECK (status IN ('ouvert','ferme')),
  locked      BOOLEAN NOT NULL DEFAULT FALSE,   -- discussion des élèves verrouillée
  created_by  TEXT NOT NULL,       -- super administrateur
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_space_members (
  space_id   BIGINT NOT NULL REFERENCES group_spaces(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL,
  member_role TEXT NOT NULL CHECK (member_role IN ('eleve','staff')),  -- staff = enseignant ou répétiteur ajouté par le super administrateur
  added_by   TEXT NOT NULL,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (space_id, user_id)
);
CREATE INDEX IF NOT EXISTS group_space_members_user_idx ON group_space_members(user_id);

CREATE TABLE IF NOT EXISTS group_space_messages (
  id        BIGINT PRIMARY KEY,
  space_id  BIGINT NOT NULL REFERENCES group_spaces(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  body      TEXT,
  link      TEXT,
  is_item   BOOLEAN NOT NULL DEFAULT FALSE,   -- élément épinglé (cours, épreuve, photo, lien…)
  item_title TEXT,
  item_kind  TEXT,
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS group_space_messages_idx ON group_space_messages(space_id, id);
