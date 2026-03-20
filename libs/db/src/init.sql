-- ============================================================
-- Must-IQ Database Initialization
-- Runs automatically on first docker-compose up
-- Enables pgvector extension so Prisma migrations can use VECTOR type
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Confirm extensions loaded
DO $$
BEGIN
  RAISE NOTICE 'pgvector extension enabled — Must-IQ DB ready';
END $$;
