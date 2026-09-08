#!/usr/bin/env bash
set -e

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
# A generated runtime key is stored inside storage for the lifetime of this deployment.
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

# Railway MySQL exposes MYSQL* variables. Explicit DB_* variables still take priority.
RAW_DB_HOST="${DB_HOST:-${MYSQLHOST:-}}"
if [ -n "$RAW_DB_HOST" ]; then
  export DB_HOST="$RAW_DB_HOST"
  export DB_PORT="${DB_PORT:-${MYSQLPORT:-3306}}"
  export DB_DATABASE="${DB_DATABASE:-${MYSQLDATABASE:-railway}}"
  export DB_USERNAME="${DB_USERNAME:-${MYSQLUSER:-root}}"
  export DB_PASSWORD="${DB_PASSWORD:-${MYSQLPASSWORD:-}}"
fi

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

# Composer build uses --no-scripts for compatibility; complete Laravel discovery now
# when Railway runtime variables are present and before the app is marked installed.
php artisan package:discover --ansi || true
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

  php artisan migrate --force

  # Seed the upstream initial data exactly once.
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
    php artisan db:seed --force
  fi

  # Apply our brand without changing the application's business logic.
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
        "website_keywords" => "خدمات السوشيال ميديا, SMM, التسويق الرقمي, إدارة الخدمات"
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

exec "$@"
