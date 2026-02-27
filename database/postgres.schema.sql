-- ============================================================
-- TrackIT – PostgreSQL Production Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────────────────
-- Bets
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code TEXT        NOT NULL,
  platform     TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending',   -- pending | live | settled
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- Selections (one row per leg of the bet)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS selections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id           UUID        NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
  match_id         TEXT,
  home_team        TEXT        NOT NULL DEFAULT 'Unknown',
  away_team        TEXT        NOT NULL DEFAULT 'Unknown',
  market_type      TEXT        NOT NULL DEFAULT 'Unknown',
  selection        TEXT        NOT NULL DEFAULT 'Unknown',
  odds             NUMERIC(8,2) NOT NULL DEFAULT 0,
  start_time       TIMESTAMPTZ,
  source_platform  TEXT,
  result           TEXT,   -- win | loss | void | pending
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- Notification subscriptions
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id     UUID        NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
  channel    TEXT        NOT NULL DEFAULT 'console',   -- console | email | sms | push
  target     TEXT        NOT NULL,                     -- email address, phone number, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- Event log (audit trail)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT        NOT NULL,
  payload    JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────
-- Indexes
-- ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_selections_bet_id     ON selections(bet_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_bet_id  ON subscriptions(bet_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_created_at ON event_logs(created_at DESC);
