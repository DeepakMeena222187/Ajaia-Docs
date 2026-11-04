-- Greenleaf schema. Money is stored as integer paise (₹1 = 100 paise) to avoid float rounding.

CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));

-- Only the SHA-256 of the session token is stored, so a DB leak does not leak live sessions.
CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS plants (
  id              BIGSERIAL PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  scientific_name TEXT NOT NULL,
  category        TEXT NOT NULL,
  summary         TEXT NOT NULL,
  description     TEXT NOT NULL,
  benefits        TEXT[] NOT NULL DEFAULT '{}',
  light           TEXT NOT NULL,
  water           TEXT NOT NULL,
  difficulty      TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Moderate', 'Expert')),
  pet_safe        BOOLEAN NOT NULL DEFAULT false,
  air_purifying   BOOLEAN NOT NULL DEFAULT false,
  art             TEXT NOT NULL DEFAULT 'leafy',
  hue             INTEGER NOT NULL DEFAULT 140,
  image_url       TEXT,
  featured        BOOLEAN NOT NULL DEFAULT false,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plants_category_idx ON plants (category);

-- A variety/size of a plant. Each variant is a purchasable SKU with its own price and stock.
CREATE TABLE IF NOT EXISTS variants (
  id          BIGSERIAL PRIMARY KEY,
  plant_id    BIGINT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_paise INTEGER NOT NULL CHECK (price_paise >= 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  active      BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS variants_plant_idx ON variants (plant_id);

CREATE TABLE IF NOT EXISTS orders (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status          TEXT NOT NULL DEFAULT 'placed'
                  CHECK (status IN ('placed', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  subtotal_paise  INTEGER NOT NULL CHECK (subtotal_paise >= 0),
  shipping_paise  INTEGER NOT NULL CHECK (shipping_paise >= 0),
  total_paise     INTEGER NOT NULL CHECK (total_paise >= 0),
  payment_method  TEXT NOT NULL CHECK (payment_method IN ('cod', 'upi_on_delivery')),
  ship_name       TEXT NOT NULL,
  ship_phone      TEXT NOT NULL,
  ship_address    TEXT NOT NULL,
  ship_city       TEXT NOT NULL,
  ship_pincode    TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders (user_id, created_at DESC);

-- Names and prices are snapshotted so later catalogue edits never rewrite order history.
CREATE TABLE IF NOT EXISTS order_items (
  id               BIGSERIAL PRIMARY KEY,
  order_id         BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id       BIGINT REFERENCES variants(id) ON DELETE SET NULL,
  plant_name       TEXT NOT NULL,
  variant_name     TEXT NOT NULL,
  unit_price_paise INTEGER NOT NULL CHECK (unit_price_paise >= 0),
  quantity         INTEGER NOT NULL CHECK (quantity > 0)
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);

CREATE TABLE IF NOT EXISTS forum_threads (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  locked      BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS forum_threads_activity_idx ON forum_threads (last_activity DESC);

CREATE TABLE IF NOT EXISTS forum_posts (
  id         BIGSERIAL PRIMARY KEY,
  thread_id  BIGINT NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS forum_posts_thread_idx ON forum_posts (thread_id, created_at);

CREATE TABLE IF NOT EXISTS bookings (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service    TEXT NOT NULL CHECK (service IN ('consultation', 'nursery_visit', 'home_setup')),
  slot_date  DATE NOT NULL,
  slot_time  TEXT NOT NULL,
  notes      TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- One active booking per slot: enforced by the database, so two simultaneous requests cannot both win.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_slot_unique
  ON bookings (slot_date, slot_time) WHERE status <> 'cancelled';
CREATE INDEX IF NOT EXISTS bookings_user_idx ON bookings (user_id);

-- Fixed-window rate limiting kept in Postgres so it works across serverless instances.
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL,
  count        INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  name       TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
