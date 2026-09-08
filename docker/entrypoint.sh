#!/usr/bin/env bash
set -e

PORT="${PORT:-8080}"

sed -ri "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:[0-9]+>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

export APP_ENV="${APP_ENV:-production}"
export APP_DEBUG="${APP_DEBUG:-false}"
export LOG_CHANNEL="${LOG_CHANNEL:-stderr}"
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

php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true

if [ -n "$RAW_DB_HOST" ]; then
  echo "Waiting for MySQL..."
  DB_READY=0
  for i in $(seq 1 30); do
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

  touch storage/installed
  chown www-data:www-data storage/installed
fi

exec "$@"
