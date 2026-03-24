-- ============================================================
-- Must-IQ — Hybrid Search (Dense + Sparse/BM25)
-- Adds a tsvector column to document_chunks for full-text
-- keyword search using PostgreSQL's built-in text search.
-- The GIN index makes BM25-style ts_rank queries very fast.
-- ============================================================

-- 1. Add the tsvector column (generated, always kept in sync with content)
ALTER TABLE document_chunks
  ADD COLUMN IF NOT EXISTS content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english'::regconfig, content)) STORED;

-- 2. Create a GIN index for fast full-text search lookups
CREATE INDEX IF NOT EXISTS idx_document_chunks_content_tsv
  ON document_chunks USING GIN (content_tsv);
