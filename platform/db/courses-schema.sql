-- Course catalog table: real textbook chapter data, editable by admin
CREATE TABLE IF NOT EXISTS platform_courses (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  subject       TEXT NOT NULL,
  grade         TEXT NOT NULL,
  semester      TEXT DEFAULT '',
  textbook      TEXT DEFAULT '',
  description   TEXT DEFAULT '',
  outline       JSONB DEFAULT '[]'::jsonb,    -- [{section, points[]}]
  knowledge     JSONB DEFAULT '[]'::jsonb,    -- [string]
  objectives    JSONB DEFAULT '[]'::jsonb,    -- [string]
  source        TEXT DEFAULT '',              -- GitHub repo / 人教社
  is_published  BOOLEAN DEFAULT TRUE,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_subject ON platform_courses(subject);
CREATE INDEX IF NOT EXISTS idx_courses_grade ON platform_courses(grade);
CREATE INDEX IF NOT EXISTS idx_courses_published ON platform_courses(is_published);
