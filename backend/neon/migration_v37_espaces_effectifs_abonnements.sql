-- DELTA SCHOOL V37 : espaces de répétition, abonnements des utilisateurs, étudiants.
-- À exécuter dans Neon SQL Editor après la migration V36.

CREATE TABLE IF NOT EXISTS repetition_spaces (
  id           BIGINT PRIMARY KEY,
  student_id   TEXT NOT NULL,
  subject      TEXT NOT NULL,
  level        TEXT,
  note         TEXT,
  status       TEXT NOT NULL DEFAULT 'attente' CHECK (status IN ('attente','ouvert','ferme','refuse')),
  opened_by    TEXT,              -- super administrateur qui a accepté
  refuse_reason TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_at    TIMESTAMPTZ,
  closed_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS repetition_spaces_status_idx ON repetition_spaces(status, created_at DESC);

-- Répétiteurs délégués par le super administrateur à un espace.
CREATE TABLE IF NOT EXISTS repetition_space_members (
  space_id     BIGINT NOT NULL REFERENCES repetition_spaces(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL,
  delegated_by TEXT NOT NULL,
  delegated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (space_id, user_id)
);

CREATE TABLE IF NOT EXISTS repetition_space_messages (
  id        BIGINT PRIMARY KEY,
  space_id  BIGINT NOT NULL REFERENCES repetition_spaces(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,
  body      TEXT,
  link      TEXT,
  sent_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS repetition_space_messages_idx ON repetition_space_messages(space_id, id);

-- Abonnements individuels (comptes sans groupe de répétition) et statut élève/étudiant.
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS sub_exp DATE;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS sub_reminded_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS student_status TEXT CHECK (student_status IN ('eleve','etudiant'));
