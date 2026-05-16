# syntax=docker/dockerfile:1.6

FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress --no-scripts

FROM node:20-bookworm-slim AS assets
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
RUN pnpm install --frozen-lockfile
COPY resources/ resources/
COPY public/ public/
COPY vite.config.ts tsconfig.json components.json ./
RUN pnpm run build

FROM php:8.3-apache AS runtime
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
WORKDIR /var/www/html

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libzip-dev \
        libonig-dev \
        libxml2-dev \
    && docker-php-ext-install -j$(nproc) \
        pdo_mysql \
        pdo_sqlite \
        mbstring \
        exif \
        pcntl \
        bcmath \
        zip \
        xml \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN a2enmod rewrite \
    && sed -ri -e "s!/var/www/html!${APACHE_DOCUMENT_ROOT}!g" /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

COPY . .
COPY --from=vendor /app/vendor ./vendor
COPY --from=assets /app/public/build ./public/build

COPY docker/entrypoint.sh /usr/local/bin/taros-entrypoint
RUN chmod +x /usr/local/bin/taros-entrypoint \
    && chown -R www-data:www-data storage bootstrap/cache

EXPOSE 80
ENTRYPOINT ["taros-entrypoint"]
CMD ["apache2-foreground"]
