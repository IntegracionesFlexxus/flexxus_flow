#!/bin/sh
# Docker entrypoint script - MVP Nivel 1
# TODO: En Nivel 2 agregar configuración dinámica de environment

set -e

# Replace environment variables in index.html if needed
# This allows runtime configuration without rebuilding
if [ -f /usr/share/nginx/html/index.html ]; then
    # Example: Replace API_URL placeholder
    if [ ! -z "$API_URL" ]; then
        sed -i "s|__API_URL__|${API_URL}|g" /usr/share/nginx/html/index.html
    fi
    
    if [ ! -z "$WS_URL" ]; then
        sed -i "s|__WS_URL__|${WS_URL}|g" /usr/share/nginx/html/index.html
    fi
    
    if [ ! -z "$APP_ENV" ]; then
        sed -i "s|__APP_ENV__|${APP_ENV}|g" /usr/share/nginx/html/index.html
    fi
fi

# Execute the CMD
exec "$@"