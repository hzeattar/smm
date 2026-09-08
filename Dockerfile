FROM php:8.1-apache-bookworm

ARG SMMBOOSTER_COMMIT=0315d0631bb7ac354cae817514eced0b9dc1bcc7

ENV DEBIAN_FRONTEND=noninteractive \
    APACHE_DOCUMENT_ROOT=/var/www/html/public \
    COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_MEMORY_LIMIT=-1 \
    COMPOSER_PROCESS_TIMEOUT=2000

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git unzip ca-certificates curl \
        libcurl4-openssl-dev libonig-dev libxml2-dev libzip-dev \
        libpng-dev libjpeg62-turbo-dev libfreetype6-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_mysql mysqli bcmath mbstring zip gd opcache curl dom xml xmlreader xmlwriter \
    && a2enmod rewrite headers expires \
    && sed -ri 's/^Listen 80$/Listen 8080/' /etc/apache2/ports.conf \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2.2 /usr/bin/composer /usr/local/bin/composer

WORKDIR /var/www/html

# Pin the exact upstream revision so future upstream changes cannot silently
# change a Railway build.
RUN git clone --no-tags https://github.com/mediarayek-me/smmbooster.git /tmp/smmbooster \
    && cd /tmp/smmbooster \
    && git checkout "${SMMBOOSTER_COMMIT}" \
    && cp -a /tmp/smmbooster/. /var/www/html/ \
    && rm -rf /tmp/smmbooster /var/www/html/.git \
    && rm -f /var/www/html/api-purchasecode.php /var/www/html/smmstore_test.sql

COPY overrides/ /var/www/html/
COPY docker/000-default.conf /etc/apache2/sites-available/000-default.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/99-railway.ini
COPY docker/entrypoint.sh /usr/local/bin/railway-entrypoint

# Keep the upstream lockfile intact. Laravel 8.32 predates PHP 8.1 and forces
# error_reporting(-1) during bootstrap; mask deprecation-only notices so they
# cannot become fatal ErrorExceptions. No application/business logic is changed.
RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && rm -rf vendor \
    && composer install --no-dev --prefer-dist --no-interaction --no-progress --no-scripts --optimize-autoloader \
    && php -r '$p="vendor/laravel/framework/src/Illuminate/Foundation/Bootstrap/HandleExceptions.php"; $s=file_get_contents($p); $s2=str_replace("error_reporting(-1);", "error_reporting(E_ALL & ~E_DEPRECATED & ~E_USER_DEPRECATED);", $s, $n); if ($n < 1) { fwrite(STDERR, "Laravel PHP 8.1 compatibility patch target not found\n"); exit(1); } file_put_contents($p, $s2);' \
    && php -r 'require "vendor/autoload.php"; if (!class_exists("Illuminate\\Support\\Collection")) { fwrite(STDERR, "Illuminate Collection autoload preflight failed\n"); exit(1); } echo "Composer autoload preflight OK\n";' \
    && chmod +x /usr/local/bin/railway-entrypoint \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 8080
ENTRYPOINT ["railway-entrypoint"]
CMD ["apache2-foreground"]
