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

# Keep the app bootable before a permanent APP_KEY is configured in Railway.
if [ -z "${APP_KEY:-}" ]; then
  RUNTIME_KEY_FILE="storage/.runtime_app_key"
  if [ -f "$RUNTIME_KEY_FILE" ]; then
    export APP_KEY="$(cat "$RUNTIME_KEY_FILE")"
  else
    export APP_KEY="base64:$(php -r 'echo base64_encode(random_bytes(32));')"
    printf '%s' "$APP_KEY" > "$RUNTIME_KEY_FILE"
  fi
fi

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache public
chown -R www-data:www-data storage bootstrap/cache

# Runtime framework preflight. These failures must remain fatal because they mean
# the image/framework itself is broken, not merely an unavailable database.
php -r 'require "vendor/autoload.php"; if (!class_exists("Illuminate\\Support\\Collection")) { fwrite(STDERR, "Illuminate Collection autoload preflight failed\n"); exit(1); }'
php artisan --version
php artisan package:discover --ansi
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true

# Detect every common Railway MySQL reference style. Laravel natively understands
# DATABASE_URL, so prefer a single URL reference when Railway provides one.
HAS_DATABASE_URL=false; [ -n "${DATABASE_URL:-}" ] && HAS_DATABASE_URL=true
HAS_MYSQL_URL=false; [ -n "${MYSQL_URL:-}" ] && HAS_MYSQL_URL=true
HAS_MYSQL_PUBLIC_URL=false; [ -n "${MYSQL_PUBLIC_URL:-}" ] && HAS_MYSQL_PUBLIC_URL=true
HAS_HOST=false; [ -n "${DB_HOST:-${MYSQLHOST:-}}" ] && HAS_HOST=true
HAS_USER=false; [ -n "${DB_USERNAME:-${MYSQLUSER:-}}" ] && HAS_USER=true
HAS_PASSWORD=false; [ -n "${DB_PASSWORD:-${MYSQLPASSWORD:-}}" ] && HAS_PASSWORD=true
HAS_DATABASE=false; [ -n "${DB_DATABASE:-${MYSQLDATABASE:-}}" ] && HAS_DATABASE=true

DB_SOURCE="none"
DB_CONFIGURED=0
RAW_DB_HOST="${DB_HOST:-${MYSQLHOST:-}}"

if [ -n "${DATABASE_URL:-}" ]; then
  DB_SOURCE="DATABASE_URL"
  DB_CONFIGURED=1
elif [ -n "${MYSQL_URL:-}" ]; then
  export DATABASE_URL="$MYSQL_URL"
  DB_SOURCE="MYSQL_URL"
  DB_CONFIGURED=1
elif [ -n "${MYSQL_PUBLIC_URL:-}" ]; then
  export DATABASE_URL="$MYSQL_PUBLIC_URL"
  DB_SOURCE="MYSQL_PUBLIC_URL"
  DB_CONFIGURED=1
elif [ -n "$RAW_DB_HOST" ]; then
  export DB_HOST="$RAW_DB_HOST"
  export DB_PORT="${DB_PORT:-${MYSQLPORT:-3306}}"
  export DB_DATABASE="${DB_DATABASE:-${MYSQLDATABASE:-railway}}"
  export DB_USERNAME="${DB_USERNAME:-${MYSQLUSER:-root}}"
  export DB_PASSWORD="${DB_PASSWORD:-${MYSQLPASSWORD:-}}"
  DB_SOURCE="individual_vars"
  DB_CONFIGURED=1
fi

write_health() {
  local connection="$1"
  cat > public/boot-health.json <<EOF
{"service":"yellow-duck-smm","framework":"ok","database_source":"${DB_SOURCE}","database_url_ref":${HAS_DATABASE_URL},"mysql_url_ref":${HAS_MYSQL_URL},"mysql_public_url_ref":${HAS_MYSQL_PUBLIC_URL},"host_ref":${HAS_HOST},"user_ref":${HAS_USER},"password_ref":${HAS_PASSWORD},"database_ref":${HAS_DATABASE},"connection":"${connection}"}
EOF
}

start_setup_mode() {
  local reason="$1"
  write_health "$reason"
  echo "Starting safe setup mode: ${reason}"
  rm -f public/index.html
  if [ -f public/index.php ]; then
    mv public/index.php public/index.laravel.php
  fi
  cp public/setup.html public/index.html
  exec "$@"
}

write_health "checking"

if [ "$DB_CONFIGURED" -ne 1 ]; then
  start_setup_mode "not_configured" "$@"
fi

echo "Database reference detected via ${DB_SOURCE}. Waiting for MySQL..."
DB_READY=0
for i in $(seq 1 15); do
  if php -r '
    try {
      $url = getenv("DATABASE_URL");
      if ($url) {
        $p = parse_url($url);
        if (!$p || empty($p["host"])) { throw new RuntimeException("Invalid database URL"); }
        $host = $p["host"];
        $port = $p["port"] ?? 3306;
        $db = ltrim($p["path"] ?? "", "/");
        $user = urldecode($p["user"] ?? "");
        $pass = urldecode($p["pass"] ?? "");
      } else {
        $host = getenv("DB_HOST");
        $port = getenv("DB_PORT") ?: 3306;
        $db = getenv("DB_DATABASE");
        $user = getenv("DB_USERNAME");
        $pass = getenv("DB_PASSWORD");
      }
      $pdo = new PDO(
        "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4",
        $user,
        $pass,
        [PDO::ATTR_TIMEOUT => 3, PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
      );
      $pdo->query("SELECT 1");
      exit(0);
    } catch (Throwable $e) {
      exit(1);
    }
  '; then
    DB_READY=1
    break
  fi
  sleep 2
done

if [ "$DB_READY" -ne 1 ]; then
  start_setup_mode "unreachable" "$@"
fi

write_health "connected"
echo "MySQL connected. Running migrations..."
if ! php artisan migrate --force; then
  start_setup_mode "migration_failed" "$@"
fi

# Seed upstream data only when the admins table is empty.
if ! php -r '
  require "vendor/autoload.php";
  $app = require "bootstrap/app.php";
  $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
  $kernel->bootstrap();
  exit(Illuminate\Support\Facades\DB::table("admins")->exists() ? 0 : 1);
'; then
  echo "Seeding initial SMM data..."
  if ! php artisan db:seed --force; then
    start_setup_mode "seed_failed" "$@"
  fi
else
  echo "Initial SMM data already present; seed skipped."
fi

# Apply Yellow Duck branding without changing provider, ordering or payment logic.
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

touch storage/installed
chown www-data:www-data storage/installed
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true
php artisan --version

write_health "ready"
echo "Starting Apache on port ${PORT}..."
exec "$@"
