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
export SESSION_DRIVER="${SESSION_DRIVER:-file}"
export CACHE_DRIVER="${CACHE_DRIVER:-file}"
export QUEUE_CONNECTION="${QUEUE_CONNECTION:-sync}"
export SESSION_COOKIE="${SESSION_COOKIE:-yellow_duck_session_v2}"

if [ -z "${APP_URL:-}" ] && [ -n "${RAILWAY_PUBLIC_DOMAIN:-}" ]; then
  export APP_URL="https://${RAILWAY_PUBLIC_DOMAIN}"
fi

# Railway MySQL references are the source of truth. Do not preserve placeholder
# Laravel DB_* values such as DB_DATABASE=forge when MYSQL* values exist.
if [ -n "${MYSQLHOST:-}" ]; then export DB_HOST="$MYSQLHOST"; fi
if [ -n "${MYSQLPORT:-}" ]; then export DB_PORT="$MYSQLPORT"; else export DB_PORT="${DB_PORT:-3306}"; fi
if [ -n "${MYSQLDATABASE:-}" ]; then export DB_DATABASE="$MYSQLDATABASE"; fi
if [ -n "${MYSQLUSER:-}" ]; then export DB_USERNAME="$MYSQLUSER"; fi
if [ -n "${MYSQLPASSWORD:-}" ]; then export DB_PASSWORD="$MYSQLPASSWORD"; fi

# Stable fallback key when Railway APP_KEY has not been configured yet. The seed
# is never logged or written to Git; a real APP_KEY variable still takes priority.
if [ -z "${APP_KEY:-}" ]; then
  KEY_SEED="${YELLOWDUCK_APP_KEY_SEED:-${MYSQLPASSWORD:-${DB_PASSWORD:-}}}"
  if [ -n "$KEY_SEED" ]; then
    export KEY_SEED
    export APP_KEY="$(php -r '$s=getenv("KEY_SEED"); echo "base64:".base64_encode(hash("sha256", "yellow-duck-smm|".$s, true));')"
    unset KEY_SEED
  else
    export APP_KEY="base64:$(php -r 'echo base64_encode(random_bytes(32));')"
  fi
fi

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache public
chown -R www-data:www-data storage bootstrap/cache

# Materialize the runtime environment so both CLI PHP and Apache/mod_php see
# the same DB/app configuration. Secrets are not printed to stdout.
php -r '
$keys=["APP_ENV","APP_DEBUG","APP_KEY","APP_URL","APP_NAME","LOG_CHANNEL","DB_CONNECTION","DB_HOST","DB_PORT","DB_DATABASE","DB_USERNAME","DB_PASSWORD","SESSION_DRIVER","SESSION_COOKIE","CACHE_DRIVER","QUEUE_CONNECTION"];
foreach($keys as $k){
  $v=getenv($k);
  if($v===false) continue;
  $v=str_replace(["\\","\"","\r","\n"],["\\\\","\\\"","","\\n"],$v);
  echo $k."=\"".$v."\"\n";
}
' > .env.runtime
mv .env.runtime .env
chown www-data:www-data .env
chmod 600 .env

php -r 'require "vendor/autoload.php"; if (!class_exists("Illuminate\\Support\\Collection")) { fwrite(STDERR, "Illuminate Collection autoload preflight failed\n"); exit(1); }'
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true

write_health() {
  local state="$1"
  cat > public/boot-health.json <<EOF
{"service":"yellow-duck-smm","state":"${state}","db_host_configured":$([ -n "${DB_HOST:-}" ] && echo true || echo false),"db_name_configured":$([ -n "${DB_DATABASE:-}" ] && echo true || echo false)}
EOF
}

pdo_test() {
  php -r '
  try {
    $pdo=new PDO("mysql:host=".getenv("DB_HOST").";port=".(getenv("DB_PORT")?:3306).";dbname=".getenv("DB_DATABASE").";charset=utf8mb4", getenv("DB_USERNAME"), getenv("DB_PASSWORD"), [PDO::ATTR_TIMEOUT=>3, PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    $pdo->query("SELECT 1");
    exit(0);
  } catch(Throwable $e) { exit(1); }
  '
}

schema_ready() {
  php -r '
  try {
    $db=getenv("DB_DATABASE");
    $pdo=new PDO("mysql:host=".getenv("DB_HOST").";port=".(getenv("DB_PORT")?:3306).";dbname=".$db.";charset=utf8mb4", getenv("DB_USERNAME"), getenv("DB_PASSWORD"), [PDO::ATTR_TIMEOUT=>3, PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    $required=["settings","users","admins","categories","services","orders","api_providers"];
    $q=$pdo->prepare("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=? AND table_name IN (".implode(",",array_fill(0,count($required),"?")).")");
    $q->execute(array_merge([$db],$required));
    exit(((int)$q->fetchColumn()===count($required))?0:1);
  } catch(Throwable $e) { exit(1); }
  '
}

if [ -z "${DB_HOST:-}" ] || [ -z "${DB_DATABASE:-}" ] || [ -z "${DB_USERNAME:-}" ]; then
  write_health "database_not_configured"
  echo "Database configuration is incomplete; refusing to start Laravel with placeholder values."
  exit 78
fi

write_health "waiting_for_database"
echo "Waiting for Railway MySQL..."
DB_OK=0
for _ in $(seq 1 20); do
  if pdo_test; then DB_OK=1; break; fi
  sleep 2
done
if [ "$DB_OK" -ne 1 ]; then
  write_health "database_unreachable"
  echo "Railway MySQL is unreachable with the configured MYSQL* references."
  exit 79
fi

write_health "database_connected"

if schema_ready; then
  echo "Existing SMM schema detected; skipping Laravel migrations and bootstrap seed."
else
  echo "Incomplete SMM schema detected; applying safe migration/bootstrap recovery."
  php artisan migrate --force
  php scripts/bootstrap-db.php
fi

touch storage/installed
chown www-data:www-data storage/installed

# Refresh managed provider data only after the database is confirmed healthy.
if [ -f scripts/sync-smmfansfaster.php ]; then
  php scripts/sync-smmfansfaster.php || true
fi

if [ -f scripts/bootstrap-yellow-duck-payments.php ]; then
  php scripts/bootstrap-yellow-duck-payments.php || true
fi

php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true

write_health "ready"

if [ "${SMM_STATUS_SYNC_ENABLED:-true}" = "true" ] && [ -n "${SMMFANSFASTER_API_URL:-}" ] && [ -n "${SMMFANSFASTER_API_KEY:-}" ] && [ -f scripts/sync-smm-orders.php ]; then
  SYNC_INTERVAL="${SMM_STATUS_SYNC_INTERVAL:-120}"
  case "$SYNC_INTERVAL" in ''|*[!0-9]*) SYNC_INTERVAL=120 ;; esac
  if [ "$SYNC_INTERVAL" -lt 60 ]; then SYNC_INTERVAL=60; fi
  (
    while true; do
      php scripts/sync-smm-orders.php || true
      sleep "$SYNC_INTERVAL"
    done
  ) &
fi

echo "Starting Apache on port ${PORT}..."
exec "$@"
