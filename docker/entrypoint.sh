#!/usr/bin/env bash
set -e

PORT="${PORT:-8080}"

sed -ri "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:[0-9]+>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

if [ -f /var/www/html/app/config.php ]; then
  cat > /var/www/html/app/config.php <<'PHP'
<?php
// Runtime configuration for Railway / container deployments.
define('DB_HOST', getenv('MYSQLHOST') ?: getenv('DB_HOST') ?: '127.0.0.1');
define('DB_PORT', getenv('MYSQLPORT') ?: getenv('DB_PORT') ?: '3306');
define('DB_USER', getenv('MYSQLUSER') ?: getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('MYSQLPASSWORD') ?: getenv('DB_PASS') ?: '');
define('DB_NAME', getenv('MYSQLDATABASE') ?: getenv('DB_NAME') ?: 'railway');
define('TIMEZONE', getenv('APP_TIMEZONE') ?: 'UTC');
define('ENCRYPTION_KEY', getenv('APP_ENCRYPTION_KEY') ?: 'change-this-in-railway');
PHP
fi

DB_CONFIG=/var/www/html/app/config/database.php
if [ -f "$DB_CONFIG" ] && ! grep -q "'port'.*DB_PORT" "$DB_CONFIG"; then
  sed -i "/'hostname'.*DB_HOST/a\\\t'port' => defined('DB_PORT') ? DB_PORT : 3306," "$DB_CONFIG"
fi

CI_CONFIG=/var/www/html/app/config/config.php
if [ -f "$CI_CONFIG" ]; then
  sed -i "s#\$config\['base_url'\] = '';#\$config['base_url'] = getenv('APP_URL') ?: '';#" "$CI_CONFIG" || true
fi

mkdir -p /var/www/html/app/cache
chown -R www-data:www-data /var/www/html/app/cache 2>/dev/null || true

exec "$@"
