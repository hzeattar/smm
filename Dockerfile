FROM php:8.0-apache-bullseye

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public \
    COMPOSER_ALLOW_SUPERUSER=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git unzip libzip-dev libpng-dev libjpeg62-turbo-dev libfreetype6-dev libonig-dev libcurl4-openssl-dev libxml2-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql mbstring zip gd bcmath \
    && a2enmod rewrite headers expires \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

WORKDIR /var/www/html

# Pull the public upstream at image build time. Our own modifications live in overrides/.
RUN git clone --depth 1 --branch master https://github.com/mediarayek-me/smmbooster.git /tmp/smmbooster \
    && cp -a /tmp/smmbooster/. /var/www/html/ \
    && rm -rf /tmp/smmbooster /var/www/html/.git \
    && rm -f /var/www/html/api-purchasecode.php /var/www/html/smmstore_test.sql

COPY overrides/ /var/www/html/
COPY docker/000-default.conf /etc/apache2/sites-available/000-default.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/railway.ini
COPY docker/entrypoint.sh /usr/local/bin/railway-entrypoint

RUN composer install --no-dev --prefer-dist --no-interaction --optimize-autoloader \
    && chmod +x /usr/local/bin/railway-entrypoint \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 8080
ENTRYPOINT ["railway-entrypoint"]
CMD ["apache2-foreground"]
