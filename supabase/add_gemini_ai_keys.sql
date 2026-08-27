-- ============================================================
-- STEP 1: Create gemini_api_keys table
-- ============================================================
CREATE TABLE IF NOT EXISTS gemini_api_keys (
  id            SERIAL PRIMARY KEY,
  project_name  TEXT NOT NULL,
  api_key       TEXT NOT NULL,
  is_active     BOOLEAN DEFAULT true,
  last_used_at  TIMESTAMPTZ,
  usage_count   INTEGER DEFAULT 0,
  error_count   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gemini_api_keys ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 2: Add AI columns to initial_assessments
-- ============================================================
ALTER TABLE initial_assessments
  ADD COLUMN IF NOT EXISTS ai_analysis       TEXT,
  ADD COLUMN IF NOT EXISTS ai_analyzed_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_key_project    TEXT;

-- ============================================================
-- STEP 3: Atomic round-robin key selection RPC
-- ============================================================
CREATE OR REPLACE FUNCTION pick_next_gemini_key()
RETURNS TABLE(key_id INT, api_key TEXT, project_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
    UPDATE gemini_api_keys gk
    SET
      last_used_at = now(),
      usage_count  = gk.usage_count + 1
    WHERE gk.id = (
      SELECT k.id
      FROM gemini_api_keys k
      WHERE k.is_active = true
      ORDER BY k.last_used_at ASC NULLS FIRST
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING gk.id, gk.api_key, gk.project_name;
END;
$$;

-- ============================================================
-- STEP 4: Insert API keys (add your actual keys here - DO NOT commit)
-- Run this only in Supabase Studio SQL Editor, never in git
-- ============================================================
-- INSERT INTO gemini_api_keys (project_name, api_key) VALUES
--   ('evoluia-ai-1', 'YOUR_KEY_1_HERE'),
--   ('evoluia-ai-2', 'YOUR_KEY_2_HERE'),
--   ('evoluia-ai-3', 'YOUR_KEY_3_HERE'),
--   ('evoluia-ai-4', 'YOUR_KEY_4_HERE'),
--   ('evoluia-ai-5', 'YOUR_KEY_5_HERE');
