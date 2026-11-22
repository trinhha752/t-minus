-- schema.sql — Tiger Data (Postgres)
-- Run once:  npm run db:schema   (or psql "$DATABASE_URL" -f schema.sql)

-- prediction_snapshots is the time-series table. It is what makes the
-- Tiger Data entry real, and it is what the Delay Boss reads from.

CREATE EXTENSION IF NOT EXISTS timescaledb;

/* ---------- players ---------- */

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  team_line     TEXT NOT NULL CHECK (team_line IN ('Red','Orange','Blue','Green')),
  points        INTEGER NOT NULL DEFAULT 0,
  streak        INTEGER NOT NULL DEFAULT 0,
  last_ride_date DATE,
  co2_saved_kg  NUMERIC(10,3) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

/* ---------- world ---------- */

CREATE TABLE IF NOT EXISTS stations (
  id             TEXT PRIMARY KEY,          -- MBTA stop id, e.g. place-pktrm
  name           TEXT NOT NULL,
  routes         TEXT[] NOT NULL,
  lat            DOUBLE PRECISION NOT NULL,
  lon            DOUBLE PRECISION NOT NULL,
  character_name TEXT,
  persona        TEXT,                      -- system prompt for the agent
  legend         TEXT,
  quest_seeds    TEXT[]
);

CREATE TABLE IF NOT EXISTS checkins (
  id         BIGSERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  station_id TEXT NOT NULL REFERENCES stations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One check-in per station per day is what scores. Enforce it in the DB
-- so a double-tap cannot farm points.
CREATE UNIQUE INDEX IF NOT EXISTS checkins_one_per_day
  ON checkins (user_id, station_id, ((created_at AT TIME ZONE 'America/New_York')::date));

CREATE TABLE IF NOT EXISTS badges (
  id         BIGSERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  type       TEXT NOT NULL CHECK (type IN ('station','line','streak','boss')),
  label      TEXT NOT NULL,
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, type, label)
);

/* ---------- arrival guess ---------- */

CREATE TABLE IF NOT EXISTS guesses (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  station_id      TEXT NOT NULL REFERENCES stations(id),
  guess_minutes   NUMERIC(5,2) NOT NULL,
  target_arrival  TIMESTAMPTZ NOT NULL,
  actual_minutes  NUMERIC(5,2),
  points_earned   INTEGER,
  resolved        BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The guess follows one physical train, so a delay moves the target with it.
ALTER TABLE guesses ADD COLUMN IF NOT EXISTS trip_id TEXT;
ALTER TABLE guesses ADD COLUMN IF NOT EXISTS route TEXT;
-- One open guess per rider at a time.
CREATE UNIQUE INDEX IF NOT EXISTS guesses_one_open_per_user
  ON guesses (user_id) WHERE NOT resolved;

/* ---------- trivia ---------- */

CREATE TABLE IF NOT EXISTS trivia_questions (
  id           TEXT PRIMARY KEY,
  station_id   TEXT NOT NULL REFERENCES stations(id),
  question     TEXT NOT NULL,
  options      TEXT[] NOT NULL,
  answer_index INTEGER NOT NULL,
  explanation  TEXT,
  source_url   TEXT,
  -- verified=false means no human has checked the fact. The API must never
  -- serve these. Flip to true only after someone reads the source.
  verified     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS trivia_by_station
  ON trivia_questions (station_id) WHERE verified;

CREATE TABLE IF NOT EXISTS trivia_answers (
  id             BIGSERIAL PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id),
  question_id    TEXT NOT NULL REFERENCES trivia_questions(id),
  correct        BOOLEAN NOT NULL,
  boss_event_id  BIGINT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- "Already answered today?" lookup, so repeats can't farm points or boss damage.
CREATE INDEX IF NOT EXISTS trivia_answers_user_question
  ON trivia_answers (user_id, question_id, created_at DESC);

/* ---------- boss ---------- */

CREATE TABLE IF NOT EXISTS boss_events (
  id            BIGSERIAL PRIMARY KEY,
  line          TEXT NOT NULL CHECK (line IN ('Red','Orange','Blue','Green')),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at      TIMESTAMPTZ,
  hp_total      INTEGER NOT NULL,
  hp_remaining  INTEGER NOT NULL,
  defeated      BOOLEAN NOT NULL DEFAULT false
);

-- Gemini names each Delay Boss once, from the real delay numbers (lib/bossPersona.ts).
-- Stored on the boss so everyone on the line fights the same named boss.
ALTER TABLE boss_events ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE boss_events ADD COLUMN IF NOT EXISTS taunt TEXT;

-- At most one live boss per line.
CREATE UNIQUE INDEX IF NOT EXISTS one_live_boss_per_line
  ON boss_events (line) WHERE ended_at IS NULL;

/* ---------- time series: the Tiger Data centrepiece ---------- */

CREATE TABLE IF NOT EXISTS prediction_snapshots (
  observed_at    TIMESTAMPTZ NOT NULL,
  stop_id        TEXT NOT NULL,
  route          TEXT NOT NULL,
  direction_id   SMALLINT NOT NULL,
  predicted_at   TIMESTAMPTZ,
  scheduled_at   TIMESTAMPTZ,
  delay_seconds  INTEGER
);

SELECT create_hypertable(
  'prediction_snapshots', 'observed_at',
  if_not_exists => TRUE,
  chunk_time_interval => INTERVAL '1 hour'
);

CREATE INDEX IF NOT EXISTS snapshots_route_time
  ON prediction_snapshots (route, observed_at DESC);

-- Rolling average delay per route, 5-minute buckets.
-- This is what spawns a boss and what draws the delay chart.
CREATE MATERIALIZED VIEW IF NOT EXISTS delay_5m
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('5 minutes', observed_at) AS bucket,
  route,
  AVG(delay_seconds)        AS avg_delay_seconds,
  MAX(delay_seconds)        AS max_delay_seconds,
  COUNT(DISTINCT stop_id)   AS stops_sampled
FROM prediction_snapshots
WHERE delay_seconds IS NOT NULL
GROUP BY bucket, route
WITH NO DATA;

SELECT add_continuous_aggregate_policy('delay_5m',
  start_offset => INTERVAL '2 hours',
  end_offset   => INTERVAL '1 minute',
  schedule_interval => INTERVAL '1 minute',
  if_not_exists => TRUE);

-- Share of predictions running 5+ minutes late, per route, 5-minute buckets.
-- The Delay Boss spawns when about half a line's trains are this late, so this
-- is the chart shown when one appears (lib/delays.ts, /api/delays).
CREATE MATERIALIZED VIEW IF NOT EXISTS late_share_5m
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('5 minutes', observed_at) AS bucket,
  route,
  COUNT(*)                                        AS samples,
  COUNT(*) FILTER (WHERE delay_seconds >= 300)    AS late
FROM prediction_snapshots
WHERE delay_seconds IS NOT NULL
GROUP BY bucket, route
WITH NO DATA;

SELECT add_continuous_aggregate_policy('late_share_5m',
  start_offset => INTERVAL '2 hours',
  end_offset   => INTERVAL '1 minute',
  schedule_interval => INTERVAL '1 minute',
  if_not_exists => TRUE);

-- Compression keeps the free tier comfortable over a 24h hackathon.
ALTER TABLE prediction_snapshots SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'route'
);

SELECT add_compression_policy('prediction_snapshots', INTERVAL '6 hours',
  if_not_exists => TRUE);

/* ---------- boss detection state (added after the first live run) ---------- */

-- Where a boss came from. The poller only retires 'detected' bosses, so a
-- boss started by scripts/fake-boss.ts survives until kill-boss or defeat.
ALTER TABLE boss_events
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'detected'
  CHECK (source IN ('detected', 'manual'));

-- One row per line, rewritten every poll: the numbers the boss decision used.
-- /api/boss reads it for live counts; clean_polls is how many polls in a row
-- the line has been below the threshold, so a boss does not flicker off.
CREATE TABLE IF NOT EXISTS line_status (
  line                TEXT PRIMARY KEY CHECK (line IN ('Red','Orange','Blue','Green')),
  late_trains         INTEGER NOT NULL,
  trains_sampled      INTEGER NOT NULL,
  worst_delay_seconds INTEGER NOT NULL,
  delay_alert         BOOLEAN NOT NULL,
  clean_polls         INTEGER NOT NULL DEFAULT 0,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

/* ---------- progression: stations as levels, a boss at the end ---------- */

-- Every mini-game played. A second hypertable: it feeds progress, the
-- leaderboard and any "plays over time" chart.
CREATE TABLE IF NOT EXISTS minigame_runs (
  id            TEXT NOT NULL,
  user_id       TEXT NOT NULL REFERENCES users(id),
  station_id    TEXT NOT NULL REFERENCES stations(id),
  game_id       TEXT NOT NULL,
  score         INTEGER NOT NULL,
  cleared       BOOLEAN NOT NULL,
  duration_ms   INTEGER NOT NULL,
  points_earned INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

SELECT create_hypertable(
  'minigame_runs', 'created_at',
  if_not_exists => TRUE,
  chunk_time_interval => INTERVAL '1 day'
);

CREATE INDEX IF NOT EXISTS minigame_runs_by_user
  ON minigame_runs (user_id, station_id, created_at DESC);

-- A rider's end-of-chapter boss. Personal, unlike boss_events (the shared,
-- delay-spawned mini boss), so it lives in its own table keyed by rider.
CREATE TABLE IF NOT EXISTS final_boss_fights (
  id                BIGSERIAL PRIMARY KEY,
  user_id           TEXT NOT NULL REFERENCES users(id),
  chapter_id        TEXT NOT NULL,
  hp_total          INTEGER NOT NULL,
  hp_remaining      INTEGER NOT NULL,
  damage_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_hit_at       TIMESTAMPTZ,
  ended_at          TIMESTAMPTZ,
  defeated          BOOLEAN NOT NULL DEFAULT false
);

-- Final boss is a trivia fight: correct answers in a row multiply damage.
ALTER TABLE final_boss_fights ADD COLUMN IF NOT EXISTS combo INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS one_open_fight_per_chapter
  ON final_boss_fights (user_id, chapter_id) WHERE ended_at IS NULL;

-- Granted to everyone who fought a mini boss when it goes down. Spent when
-- the rider starts a final boss fight, or lost when it expires.
CREATE TABLE IF NOT EXISTS buffs (
  id                   BIGSERIAL PRIMARY KEY,
  user_id              TEXT NOT NULL REFERENCES users(id),
  type                 TEXT NOT NULL CHECK (type IN ('boss_damage')),
  value                NUMERIC(4,2) NOT NULL,
  source_boss_event_id BIGINT REFERENCES boss_events(id),
  granted_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at           TIMESTAMPTZ NOT NULL,
  used_in_fight_id     BIGINT REFERENCES final_boss_fights(id),
  UNIQUE (user_id, source_boss_event_id)
);
