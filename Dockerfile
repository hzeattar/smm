FROM php:7.4-apache-bullseye

ENV APACHE_DOCUMENT_ROOT=/var/www/html \
    COMPOSER_ALLOW_SUPERUSER=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git unzip libzip-dev libpng-dev libjpeg62-turbo-dev libfreetype6-dev libonig-dev libcurl4-openssl-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" mysqli pdo_mysql mbstring zip gd \
    && a2enmod rewrite headers expires \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

WORKDIR /var/www/html
COPY . /var/www/html

COPY docker/000-default.conf /etc/apache2/sites-available/000-default.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/railway.ini
COPY docker/entrypoint.sh /usr/local/bin/railway-entrypoint

RUN chmod +x /usr/local/bin/railway-entrypoint \
    && if [ -f /var/www/html/app/composer.json ]; then composer install --working-dir=/var/www/html/app --no-dev --prefer-dist --no-interaction --optimize-autoloader || true; fi \
    && chown -R www-data:www-data /var/www/html

EXPOSE 8080
ENTRYPOINT ["railway-entrypoint"]
CMD ["apache2-foreground"]
