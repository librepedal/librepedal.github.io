-- Base D1 del sobrevuelo 3D (2026-10-07). Aplicar: npx wrangler d1 migrations apply librepedal-sobrevuelo --remote
-- rutas: la línea pegada al camino de cada ruta, una vez (clave = SHA-256 de los puntos; sin datos de la persona).
CREATE TABLE IF NOT EXISTS rutas (
  clave   TEXT PRIMARY KEY,
  datos   TEXT NOT NULL,      -- JSON {c:[[lon,lat]...], m, t}
  metodo  TEXT NOT NULL,      -- valhalla | parcial
  creada  INTEGER NOT NULL,   -- ms
  expira  INTEGER NOT NULL    -- ms (180 días); D1 no vence solo: se filtra al leer y se borra al guardar
);
CREATE INDEX IF NOT EXISTS rutas_expira ON rutas (expira);
-- limites: rutas NUEVAS por día (hora de Chile) y conexión; la IP va como hash del día (no se guarda tal cual).
CREATE TABLE IF NOT EXISTS limites (
  dia     TEXT NOT NULL,      -- AAAA-MM-DD
  ip      TEXT NOT NULL,      -- primeros 8 bytes de SHA-256(dia|ip)
  cuenta  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dia, ip)
);
