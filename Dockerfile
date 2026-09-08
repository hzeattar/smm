FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    APACHE_DOCUMENT_ROOT=/var/www/html/public \
    COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_MEMORY_LIMIT=-1 \
    COMPOSER_PROCESS_TIMEOUT=2000

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        apache2 libapache2-mod-php8.2 \
        php8.2-cli php8.2-common php8.2-mysql php8.2-curl php8.2-mbstring \
        php8.2-xml php8.2-zip php8.2-gd php8.2-bcmath php8.2-opcache \
        git unzip ca-certificates curl \
    && a2enmod rewrite headers expires \
    && sed -ri 's/^Listen 80$/Listen 8080/' /etc/apache2/ports.conf \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2.2 /usr/bin/composer /usr/local/bin/composer

WORKDIR /var/www/html

# Pull the public upstream at image build time. Our modifications live in overrides/.
RUN git clone --depth 1 --branch master https://github.com/mediarayek-me/smmbooster.git /tmp/smmbooster \
    && cp -a /tmp/smmbooster/. /var/www/html/ \
    && rm -rf /tmp/smmbooster /var/www/html/.git \
    && rm -f /var/www/html/api-purchasecode.php /var/www/html/smmstore_test.sql

COPY overrides/ /var/www/html/
COPY docker/000-default.conf /etc/apache2/sites-available/000-default.conf
COPY docker/php.ini /etc/php/8.2/apache2/conf.d/99-railway.ini
COPY docker/php.ini /etc/php/8.2/cli/conf.d/99-railway.ini
COPY docker/entrypoint.sh /usr/local/bin/railway-entrypoint

# Avoid booting Laravel while the image is being built. Runtime discovery happens
# after Railway injects environment variables.
RUN mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && composer install --no-dev --prefer-dist --no-interaction --no-progress --no-scripts --optimize-autoloader \
    && chmod +x /usr/local/bin/railway-entrypoint \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 8080
ENTRYPOINT ["railway-entrypoint"]
CMD ["apache2ctl", "-D", "FOREGROUND"]
