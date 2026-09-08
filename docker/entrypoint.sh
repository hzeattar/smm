#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8080}"
sed -ri "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:[0-9]+>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

export APP_ENV="${APP_ENV:-production}"
export APP_DEBUG="${APP_DEBUG:-false}"
export LOG_CHANNEL="${LOG_CHANNEL:-stderr}"
export APP_NAME="${APP_NAME:-البطة الصفرا لخدمات السوشيال ميديا}"
export DB_CONNECTION="${DB_CONNECTION:-mysql}"

if [ -z "${APP_URL:-}" ] && [ -n "${RAILWAY_PUBLIC_DOMAIN:-}" ]; then
  export APP_URL="https://${RAILWAY_PUBLIC_DOMAIN}"
fi

if [ -z "${APP_KEY:-}" ]; then
  RUNTIME_KEY_FILE="storage/.runtime_app_key"
  if [ -f "$RUNTIME_KEY_FILE" ]; then
    export APP_KEY="$(cat "$RUNTIME_KEY_FILE")"
  else
    export APP_KEY="base64:$(php -r 'echo base64_encode(random_bytes(32));')"
    printf '%s' "$APP_KEY" > "$RUNTIME_KEY_FILE"
    echo "WARNING: APP_KEY is not configured as a persistent Railway variable."
  fi
fi

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache public
chown -R www-data:www-data storage bootstrap/cache

touch storage/logs/laravel.log
# Mirror file-based Laravel errors to Railway deploy logs when packages ignore LOG_CHANNEL.
tail -n 0 -F storage/logs/laravel.log >&2 &

php -r 'require "vendor/autoload.php"; if (!class_exists("Illuminate\\Support\\Collection")) { fwrite(STDERR, "Illuminate Collection autoload preflight failed\n"); exit(1); }'
php artisan --version
php artisan package:discover --ansi
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true

ORIGINAL_DATABASE_URL="${DATABASE_URL:-}"
RAW_DB_HOST="${DB_HOST:-${MYSQLHOST:-}}"

HAS_DATABASE_URL=false; [ -n "$ORIGINAL_DATABASE_URL" ] && HAS_DATABASE_URL=true
HAS_MYSQL_URL=false; [ -n "${MYSQL_URL:-}" ] && HAS_MYSQL_URL=true
HAS_MYSQL_PUBLIC_URL=false; [ -n "${MYSQL_PUBLIC_URL:-}" ] && HAS_MYSQL_PUBLIC_URL=true
HAS_HOST=false; [ -n "$RAW_DB_HOST" ] && HAS_HOST=true
HAS_USER=false; [ -n "${DB_USERNAME:-${MYSQLUSER:-}}" ] && HAS_USER=true
HAS_PASSWORD=false; [ -n "${DB_PASSWORD:-${MYSQLPASSWORD:-}}" ] && HAS_PASSWORD=true
HAS_DATABASE=false; [ -n "${DB_DATABASE:-${MYSQLDATABASE:-}}" ] && HAS_DATABASE=true

if [ -n "$RAW_DB_HOST" ]; then
  export DB_HOST="$RAW_DB_HOST"
  export DB_PORT="${DB_PORT:-${MYSQLPORT:-3306}}"
  export DB_DATABASE="${DB_DATABASE:-${MYSQLDATABASE:-railway}}"
  export DB_USERNAME="${DB_USERNAME:-${MYSQLUSER:-root}}"
  export DB_PASSWORD="${DB_PASSWORD:-${MYSQLPASSWORD:-}}"
fi

DB_SOURCE="none"
DB_READY=0

write_health() {
  local connection="$1"
  cat > public/boot-health.json <<EOF
{"service":"yellow-duck-smm","framework":"ok","database_source":"${DB_SOURCE}","database_url_ref":${HAS_DATABASE_URL},"mysql_url_ref":${HAS_MYSQL_URL},"mysql_public_url_ref":${HAS_MYSQL_PUBLIC_URL},"host_ref":${HAS_HOST},"user_ref":${HAS_USER},"password_ref":${HAS_PASSWORD},"database_ref":${HAS_DATABASE},"connection":"${connection}"}
EOF
}

start_setup_mode() {
  local reason="$1"
  shift
  write_health "$reason"
  echo "Starting safe setup mode: ${reason}"
  rm -f public/index.html
  if [ -f public/index.php ]; then
    mv public/index.php public/index.laravel.php
  fi
  cp public/setup.html public/index.html
  exec "$@"
}

test_url_connection() {
  local candidate="$1"
  DB_TEST_URL="$candidate" php -r '
    try {
      $url = getenv("DB_TEST_URL");
      $p = parse_url($url);
      if (!$p || empty($p["host"])) { exit(1); }
      $host = $p["host"];
      $port = $p["port"] ?? 3306;
      $db = ltrim($p["path"] ?? "", "/");
      $user = urldecode($p["user"] ?? "");
      $pass = urldecode($p["pass"] ?? "");
      $pdo = new PDO(
        "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4",
        $user,
        $pass,
        [PDO::ATTR_TIMEOUT => 3, PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
      );
      $pdo->query("SELECT 1");
      exit(0);
    } catch (Throwable $e) { exit(1); }
  '
}

test_individual_connection() {
  php -r '
    try {
      $pdo = new PDO(
        "mysql:host=".getenv("DB_HOST").";port=".(getenv("DB_PORT") ?: 3306).";dbname=".getenv("DB_DATABASE").";charset=utf8mb4",
        getenv("DB_USERNAME"),
        getenv("DB_PASSWORD"),
        [PDO::ATTR_TIMEOUT => 3, PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
      );
      $pdo->query("SELECT 1");
      exit(0);
    } catch (Throwable $e) { exit(1); }
  '
}

schema_is_ready() {
  php -r '
    try {
      require "vendor/autoload.php";
      $app = require "bootstrap/app.php";
      $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
      $kernel->bootstrap();
      foreach (["users","admins","orders","services","categories","settings","languages","language_values"] as $table) {
        if (!Illuminate\Support\Facades\Schema::hasTable($table)) { exit(1); }
      }
      exit(0);
    } catch (Throwable $e) {
      fwrite(STDERR, "Schema readiness check failed: ".get_class($e).": ".$e->getMessage()."\n");
      exit(1);
    }
  '
}

write_health "checking"

if [ -z "$ORIGINAL_DATABASE_URL" ] && [ -z "${MYSQL_URL:-}" ] && [ -z "${MYSQL_PUBLIC_URL:-}" ] && [ -z "$RAW_DB_HOST" ]; then
  start_setup_mode "not_configured" "$@"
fi

echo "Testing Railway MySQL connection references..."
for round in $(seq 1 10); do
  if [ -n "$ORIGINAL_DATABASE_URL" ] && test_url_connection "$ORIGINAL_DATABASE_URL"; then
    export DATABASE_URL="$ORIGINAL_DATABASE_URL"
    DB_SOURCE="DATABASE_URL"
    DB_READY=1
    break
  fi

  if [ -n "${MYSQL_URL:-}" ] && test_url_connection "$MYSQL_URL"; then
    export DATABASE_URL="$MYSQL_URL"
    DB_SOURCE="MYSQL_URL"
    DB_READY=1
    break
  fi

  if [ -n "$RAW_DB_HOST" ] && test_individual_connection; then
    unset DATABASE_URL || true
    DB_SOURCE="individual_vars"
    DB_READY=1
    break
  fi

  if [ -n "${MYSQL_PUBLIC_URL:-}" ] && test_url_connection "$MYSQL_PUBLIC_URL"; then
    export DATABASE_URL="$MYSQL_PUBLIC_URL"
    DB_SOURCE="MYSQL_PUBLIC_URL"
    DB_READY=1
    break
  fi

  sleep 2
done

if [ "$DB_READY" -ne 1 ]; then
  start_setup_mode "unreachable" "$@"
fi

write_health "connected"

echo "Checking database schema..."
if schema_is_ready; then
  echo "Existing SMM schema detected; skipping Laravel migrations."
else
  echo "Schema is incomplete. Attempting Laravel migrations once..."
  if ! php artisan migrate --force --no-interaction; then
    echo "Laravel migration failed; attempting schema-only recovery from the pinned upstream dump."
    if ! php scripts/bootstrap-schema.php; then
      start_setup_mode "schema_failed" "$@"
    fi
  fi
fi

write_health "seeding"
echo "Checking and initializing required SMM data..."
if ! php scripts/bootstrap-db.php; then
  start_setup_mode "seed_failed" "$@"
fi

php -r '
  require "vendor/autoload.php";
  $app = require "bootstrap/app.php";
  $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
  $kernel->bootstrap();
  $settings = [
    "website_title" => "البطة الصفرا لخدمات السوشيال ميديا",
    "website_name_1" => "البطة",
    "website_name_2" => "الصفرا",
    "website_desc" => "منصة عربية سهلة وسريعة لإدارة وطلب خدمات السوشيال ميديا من مكان واحد.",
    "website_keywords" => "خدمات السوشيال ميديا, SMM, التسويق الرقمي, إدارة الخدمات",
    "site_base_color" => "#F6C90E",
    "site_secondary_color" => "#171717"
  ];
  foreach ($settings as $name => $value) {
    Illuminate\Support\Facades\DB::table("settings")->where("name", $name)->update(["value" => $value]);
  }
' || true

echo "Checking SMM provider configuration..."
php scripts/sync-smmfansfaster.php || true

touch storage/installed
chown www-data:www-data storage/installed
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true
php artisan --version

write_health "ready"

if [ "${SMM_STATUS_SYNC_ENABLED:-true}" = "true" ] && [ -n "${SMMFANSFASTER_API_URL:-}" ] && [ -n "${SMMFANSFASTER_API_KEY:-}" ]; then
  SYNC_INTERVAL="${SMM_STATUS_SYNC_INTERVAL:-120}"
  case "$SYNC_INTERVAL" in
    ''|*[!0-9]*) SYNC_INTERVAL=120 ;;
  esac
  if [ "$SYNC_INTERVAL" -lt 60 ]; then SYNC_INTERVAL=60; fi
  echo "Starting provider status sync loop every ${SYNC_INTERVAL}s."
  (
    while true; do
      php scripts/sync-smm-orders.php || true
      sleep "$SYNC_INTERVAL"
    done
  ) &
fi

echo "Starting Apache on port ${PORT}..."
exec "$@"
