-- DELTA SCHOOL V36 : numéro de suivi UNIQUE par élève, groupes de répétition et suivi direct par le super administrateur.
-- À exécuter dans Neon SQL Editor après les migrations V30 à V35.
-- Le rôle technique « chef » est conservé : seul son libellé (« Groupe de répétition ») change dans l'application.

-- 1. Un seul numéro de suivi par élève, jamais réutilisé.
CREATE TABLE IF NOT EXISTS student_tracking_numbers (
  student_id    TEXT PRIMARY KEY,
  tracking_number TEXT NOT NULL UNIQUE,
  mode          TEXT NOT NULL DEFAULT 'groupe' CHECK (mode IN ('groupe','super')),
  group_id      TEXT,              -- groupe de répétition où le numéro est enregistré (NULL = suivi direct)
  responsible_id TEXT,             -- super administrateur responsable si mode = 'super'
  parent_contact TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    TEXT
);
CREATE INDEX IF NOT EXISTS student_tracking_group_idx ON student_tracking_numbers(group_id);

-- 2. Les anciens numéros d'opération ne sont plus générés : on les conserve en archive.
ALTER TABLE IF EXISTS tracking_records ADD COLUMN IF NOT EXISTS archived_v36 BOOLEAN NOT NULL DEFAULT TRUE;

-- 3. Opérations consignées sous le numéro unique de l'élève (sans nouveau numéro).
CREATE TABLE IF NOT EXISTS student_operations (
  id           BIGSERIAL PRIMARY KEY,
  student_id   TEXT NOT NULL,
  tracking_number TEXT NOT NULL REFERENCES student_tracking_numbers(tracking_number),
  operation_type TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'En attente',
  group_id     TEXT,
  created_by   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS student_operations_student_idx ON student_operations(student_id, created_at DESC);

-- 4. Journal de progression tenu par le super administrateur pour les élèves sans groupe de répétition.
CREATE TABLE IF NOT EXISTS direct_follow_progress (
  id          BIGSERIAL PRIMARY KEY,
  student_id  TEXT NOT NULL,
  tracking_number TEXT,
  entry_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  rubric      TEXT NOT NULL DEFAULT 'Progression',
  score       NUMERIC(4,2) CHECK (score IS NULL OR (score >= 0 AND score <= 20)),
  comment     TEXT,
  created_by  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS direct_follow_progress_student_idx ON direct_follow_progress(student_id, entry_date DESC);
