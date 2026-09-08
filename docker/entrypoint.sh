#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8080}"

sed -ri "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:[0-9]+>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

export APP_ENV="${APP_ENV:-production}"
export APP_DEBUG="${APP_DEBUG:-false}"
export LOG_CHANNEL="${LOG_CHANNEL:-stderr}"
export APP_NAME="${APP_NAME:-البطة الصفرا لخدمات السوشيال ميديا}"

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

export DB_CONNECTION="${DB_CONNECTION:-mysql}"

# Railway MySQL exposes MYSQL* variables. Explicit DB_* values take priority.
RAW_DB_HOST="${DB_HOST:-${MYSQLHOST:-}}"
if [ -n "$RAW_DB_HOST" ]; then
  export DB_HOST="$RAW_DB_HOST"
  export DB_PORT="${DB_PORT:-${MYSQLPORT:-3306}}"
  export DB_DATABASE="${DB_DATABASE:-${MYSQLDATABASE:-railway}}"
  export DB_USERNAME="${DB_USERNAME:-${MYSQLUSER:-root}}"
  export DB_PASSWORD="${DB_PASSWORD:-${MYSQLPASSWORD:-}}"
  echo "Railway MySQL configuration detected."
else
  echo "No MYSQLHOST/DB_HOST reference detected; starting without database initialization."
fi

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

# Runtime preflight: do not hide framework/bootstrap failures.
php -r 'require "vendor/autoload.php"; if (!class_exists("Illuminate\\Support\\Collection")) { fwrite(STDERR, "Illuminate Collection autoload preflight failed\n"); exit(1); }'
php artisan --version
php artisan package:discover --ansi
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true

if [ -n "$RAW_DB_HOST" ]; then
  echo "Waiting for MySQL..."
  DB_READY=0
  for i in $(seq 1 45); do
    if php -r '
      try {
        new PDO(
          "mysql:host=".getenv("DB_HOST").";port=".getenv("DB_PORT").";dbname=".getenv("DB_DATABASE"),
          getenv("DB_USERNAME"),
          getenv("DB_PASSWORD"),
          [PDO::ATTR_TIMEOUT => 3]
        );
        exit(0);
      } catch (Throwable $e) { exit(1); }
    '; then
      DB_READY=1
      break
    fi
    sleep 2
  done

  if [ "$DB_READY" -ne 1 ]; then
    echo "MySQL did not become ready in time."
    exit 1
  fi

  echo "MySQL is ready. Running migrations..."
  php artisan migrate --force

  # Seed the upstream initial data exactly once. init.sql contains data rows;
  # schema creation is handled by Laravel migrations.
  if ! php -r '
    try {
      $pdo = new PDO(
        "mysql:host=".getenv("DB_HOST").";port=".getenv("DB_PORT").";dbname=".getenv("DB_DATABASE"),
        getenv("DB_USERNAME"),
        getenv("DB_PASSWORD")
      );
      $count = (int) $pdo->query("SELECT COUNT(*) FROM admins")->fetchColumn();
      exit($count > 0 ? 0 : 1);
    } catch (Throwable $e) { exit(1); }
  '; then
    echo "Seeding initial SMM data..."
    php artisan db:seed --force
  else
    echo "Initial SMM data already present; seed skipped."
  fi

  # Apply Yellow Duck branding without changing ordering/provider/payment logic.
  php -r '
    try {
      $pdo = new PDO(
        "mysql:host=".getenv("DB_HOST").";port=".getenv("DB_PORT").";dbname=".getenv("DB_DATABASE"),
        getenv("DB_USERNAME"),
        getenv("DB_PASSWORD"),
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
      );
      $settings = [
        "website_title" => "البطة الصفرا لخدمات السوشيال ميديا",
        "website_name_1" => "البطة",
        "website_name_2" => "الصفرا",
        "website_desc" => "منصة عربية سهلة وسريعة لإدارة وطلب خدمات السوشيال ميديا من مكان واحد.",
        "website_keywords" => "خدمات السوشيال ميديا, SMM, التسويق الرقمي, إدارة الخدمات",
        "site_base_color" => "#F6C90E",
        "site_secondary_color" => "#171717"
      ];
      $stmt = $pdo->prepare("UPDATE settings SET value = :value WHERE name = :name");
      foreach ($settings as $name => $value) {
        $stmt->execute([":value" => $value, ":name" => $name]);
      }
    } catch (Throwable $e) {
      fwrite(STDERR, "Brand settings skipped: ".$e->getMessage().PHP_EOL);
    }
  ' || true

  touch storage/installed
  chown www-data:www-data storage/installed

  php artisan config:clear || true
  php artisan route:clear || true
  php artisan view:clear || true
fi

# Final framework preflight immediately before serving traffic.
php artisan --version

echo "Starting Apache on port ${PORT}..."
exec "$@"
