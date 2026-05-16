#!/bin/sh
set -e

mkdir -p \
    storage/app/private \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache

if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ] && [ -n "${DB_DATABASE:-}" ]; then
    mkdir -p "$(dirname "$DB_DATABASE")"
    touch "$DB_DATABASE"
fi

chown -R www-data:www-data storage bootstrap/cache

php artisan migrate --force

exec "$@"
