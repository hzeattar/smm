#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8080}"
sed -ri "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:[0-9]+>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

export APP_ENV="${APP_ENV:-production}"
export APP_DEBUG="${APP_DEBUG:-false}"
export LOG_CHANNEL="${LOG_CHANNEL:-stderr}"
export APP_NAME="${APP_NAME:-البطة الصفرا لخدمات السوشيال ميديا}"
export APP_URL="${APP_URL:-${RAILWAY_PUBLIC_DOMAIN:+https://${RAILWAY_PUBLIC_DOMAIN}}}"
export DB_CONNECTION="mysql"

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache public

if [ -z "${APP_KEY:-}" ]; then
  KEY_FILE="storage/.runtime_app_key"
  if [ -f "$KEY_FILE" ]; then
    export APP_KEY="$(cat "$KEY_FILE")"
  else
    export APP_KEY="base64:$(php -r 'echo base64_encode(random_bytes(32));')"
    printf '%s' "$APP_KEY" > "$KEY_FILE"
  fi
fi

# Railway MySQL references are the single source of truth for production.
export DB_HOST="${MYSQLHOST:-${DB_HOST:-}}"
export DB_PORT="${MYSQLPORT:-${DB_PORT:-3306}}"
export DB_DATABASE="${MYSQLDATABASE:-${DB_DATABASE:-}}"
export DB_USERNAME="${MYSQLUSER:-${DB_USERNAME:-}}"
export DB_PASSWORD="${MYSQLPASSWORD:-${DB_PASSWORD:-}}"
unset DATABASE_URL || true

if [ -z "${DB_HOST:-}" ] || [ -z "${DB_DATABASE:-}" ] || [ -z "${DB_USERNAME:-}" ]; then
  echo "FATAL: Railway MySQL references are missing. Refusing Laravel placeholder defaults." >&2
  exit 1
fi

# Persist the normalized runtime environment so Apache/PHP requests and Artisan
# use exactly the same database settings. No secrets are printed to logs.
php <<'PHP'
<?php
$names = [
    'APP_NAME','APP_ENV','APP_KEY','APP_DEBUG','APP_URL','LOG_CHANNEL',
    'DB_CONNECTION','DB_HOST','DB_PORT','DB_DATABASE','DB_USERNAME','DB_PASSWORD'
];
$escape = static function (string $value): string {
    $value = str_replace(['\\', '"', '$', "\r", "\n"], ['\\\\', '\\"', '\\$', '', '\\n'], $value);
    return '"'.$value.'"';
};
$lines = [];
foreach ($names as $name) {
    $value = getenv($name);
    if ($value !== false) {
        $lines[] = $name.'='.$escape((string) $value);
    }
}
file_put_contents('.env', implode(PHP_EOL, $lines).PHP_EOL);
PHP
chmod 600 .env
chown www-data:www-data .env
chown -R www-data:www-data storage bootstrap/cache

# Wait for the existing Railway database. This startup path is deliberately
# read-only: it never runs migrations, seeders, schema recovery, or provider sync.
DB_OK=0
for i in $(seq 1 30); do
  if php -r '
    try {
      $pdo = new PDO(
        "mysql:host=".getenv("DB_HOST").";port=".(getenv("DB_PORT") ?: 3306).";dbname=".getenv("DB_DATABASE").";charset=utf8mb4",
        getenv("DB_USERNAME"), getenv("DB_PASSWORD"),
        [PDO::ATTR_TIMEOUT => 3, PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
      );
      $pdo->query("SELECT 1");
      exit(0);
    } catch (Throwable $e) { exit(1); }
  '; then
    DB_OK=1
    break
  fi
  sleep 2
done

if [ "$DB_OK" -ne 1 ]; then
  echo "FATAL: Could not connect to Railway MySQL using normalized MYSQL* references." >&2
  exit 1
fi

# Verify the existing application schema without changing it.
php -r '
  $pdo = new PDO(
    "mysql:host=".getenv("DB_HOST").";port=".(getenv("DB_PORT") ?: 3306).";dbname=".getenv("DB_DATABASE").";charset=utf8mb4",
    getenv("DB_USERNAME"), getenv("DB_PASSWORD"),
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
  );
  $required = ["users","admins","orders","services","categories","settings"];
  $stmt = $pdo->prepare("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ? AND table_name = ?");
  foreach ($required as $table) {
    $stmt->execute([getenv("DB_DATABASE"), $table]);
    if ((int)$stmt->fetchColumn() !== 1) {
      fwrite(STDERR, "FATAL: Required application table is missing: {$table}\n");
      exit(1);
    }
  }
'

touch storage/installed
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true
php artisan --version

cat > public/boot-health.json <<'EOF'
{"service":"yellow-duck-smm","runtime":"restored","database":"connected","schema":"existing","mutations":"disabled"}
EOF

echo "Stable Yellow Duck runtime ready. Existing database preserved; migrations disabled."
exec "$@"
