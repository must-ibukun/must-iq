-- ============================================================
-- Must-IQ — Restore HNSW Vector Index
--
-- The HNSW index on document_chunks.embedding was dropped in
-- migration 20260309230123 (dept → workspace rename) and was
-- never re-created. This migration restores it.
--
-- HNSW is critical for fast cosine-similarity retrieval in the
-- RAG pipeline. Without it, every query is a full sequential scan.
--
-- Index params (same as original):
--   m = 16            — connections per layer (accuracy/memory tradeoff)
--   ef_construction = 64 — search depth during build (quality)
-- ============================================================

CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
  ON document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

COMMENT ON INDEX document_chunks_embedding_hnsw_idx IS
  'HNSW index for cosine similarity search — Must-IQ RAG retrieval';
