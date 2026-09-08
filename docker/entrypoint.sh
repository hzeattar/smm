#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8080}"
sed -ri "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:[0-9]+>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

export APP_ENV="${APP_ENV:-production}"
export APP_DEBUG="${APP_DEBUG:-false}"
export LOG_CHANNEL="${LOG_CHANNEL:-stderr}"
export APP_NAME="${APP_NAME:-البطة الصفرا لخدمات السوشيال ميديا}"
export DB_CONNECTION="mysql"

if [ -z "${APP_URL:-}" ] && [ -n "${RAILWAY_PUBLIC_DOMAIN:-}" ]; then
  export APP_URL="https://${RAILWAY_PUBLIC_DOMAIN}"
fi

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache public

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

# Normalize Railway MySQL references into Laravel's DB_* variables before any
# Artisan command or Apache worker starts. Never allow Laravel's legacy
# 'forge' placeholders to be used in production.
export DB_HOST="${DB_HOST:-${MYSQLHOST:-}}"
export DB_PORT="${DB_PORT:-${MYSQLPORT:-3306}}"
export DB_DATABASE="${DB_DATABASE:-${MYSQLDATABASE:-}}"
export DB_USERNAME="${DB_USERNAME:-${MYSQLUSER:-}}"
export DB_PASSWORD="${DB_PASSWORD:-${MYSQLPASSWORD:-}}"

write_runtime_env() {
  php <<'PHP'
<?php
$names = [
    'APP_NAME','APP_ENV','APP_KEY','APP_DEBUG','APP_URL','LOG_CHANNEL',
    'DB_CONNECTION','DB_HOST','DB_PORT','DB_DATABASE','DB_USERNAME','DB_PASSWORD',
    'SMMFANSFASTER_API_URL','SMMFANSFASTER_API_KEY','SMMFANSFASTER_MARGIN_PERCENT',
    'SMMFANSFASTER_PROVIDER_STATUS','SMM_STATUS_SYNC_ENABLED','SMM_STATUS_SYNC_INTERVAL'
];

$escape = static function (string $value): string {
    $value = str_replace(
        ['\\', '"', '$', "\r", "\n"],
        ['\\\\', '\\"', '\\$', '', '\\n'],
        $value
    );
    return '"' . $value . '"';
};

$lines = [];
foreach ($names as $name) {
    $value = getenv($name);
    if ($value === false) {
        continue;
    }
    $lines[] = $name . '=' . $escape((string) $value);
}
file_put_contents('.env', implode(PHP_EOL, $lines) . PHP_EOL);
PHP
  chmod 600 .env
  chown www-data:www-data .env
}

write_runtime_env
chown -R www-data:www-data storage bootstrap/cache

touch storage/logs/laravel.log
tail -n 0 -F storage/logs/laravel.log >&2 &

php -r 'require "vendor/autoload.php"; if (!class_exists("Illuminate\\Support\\Collection")) { fwrite(STDERR, "Illuminate Collection autoload preflight failed\n"); exit(1); }'
php artisan --version
php artisan package:discover --ansi
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true

DB_SOURCE="individual_vars"
DB_READY=0

write_health() {
  local connection="$1"
  local has_host=false has_db=false has_user=false
  [ -n "${DB_HOST:-}" ] && has_host=true
  [ -n "${DB_DATABASE:-}" ] && has_db=true
  [ -n "${DB_USERNAME:-}" ] && has_user=true
  cat > public/boot-health.json <<EOF
{"service":"yellow-duck-smm","framework":"ok","database_source":"${DB_SOURCE}","host_ref":${has_host},"database_ref":${has_db},"user_ref":${has_user},"connection":"${connection}"}
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

test_db_connection() {
  php -r '
    try {
      $host = getenv("DB_HOST");
      $port = getenv("DB_PORT") ?: 3306;
      $db = getenv("DB_DATABASE");
      $user = getenv("DB_USERNAME");
      $pass = getenv("DB_PASSWORD");
      if (!$host || !$db || !$user) { exit(1); }
      $pdo = new PDO(
        "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4",
        $user,
        $pass,
        [PDO::ATTR_TIMEOUT => 3, PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
      );
      $pdo->query("SELECT 1");
      exit(0);
    } catch (Throwable $e) {
      fwrite(STDERR, "Database connectivity check failed: ".get_class($e)."\n");
      exit(1);
    }
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

if [ -z "${DB_HOST:-}" ] || [ -z "${DB_DATABASE:-}" ] || [ -z "${DB_USERNAME:-}" ]; then
  echo "Required Railway MySQL references are missing; refusing to fall back to Laravel placeholders."
  start_setup_mode "not_configured" "$@"
fi

echo "Testing normalized Railway MySQL connection..."
for round in $(seq 1 15); do
  if test_db_connection; then
    DB_READY=1
    break
  fi
  sleep 2
done

if [ "$DB_READY" -ne 1 ]; then
  start_setup_mode "unreachable" "$@"
fi

write_health "connected"
echo "MySQL connection ready; database name is configured (value intentionally not logged)."

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

# Rewrite the runtime env once more after all normalized values are final.
write_runtime_env
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
