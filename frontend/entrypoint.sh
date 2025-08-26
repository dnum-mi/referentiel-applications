#!/bin/sh

APP_ENV_PREFIX="VITE_RDA_"
APP_SRC_DIR="/app"
APP_DIST_DIR="/usr/share/nginx/html"

echo "Prefix: $APP_ENV_PREFIX"
echo "Source directory: $APP_DIST_DIR"
echo "Dist directory: $APP_DIST_DIR"

env | grep "^$APP_ENV_PREFIX" | while IFS='=' read -r key value; do
    [ -z "$key" ] && continue

    echo "Setting $key=$value"

    FILES=$(grep -rl -- "$key" "$APP_SRC_DIR" || true)
    FILE_COUNT=$(echo "$FILES" | grep -c . || true)
    echo "Found $FILE_COUNT files with matching key: $key"

    for file in $FILES; do
        tmpfile="${file}.tmp"
        sed "s|${key}|${value}|g" "$file" > "$tmpfile"
        mv "$tmpfile" "$file"
    done
done

# On écrase complètement le dossier de destination
echo copying files from src to dist
ls -R "$APP_SRC_DIR"/
rm -rf "$APP_DIST_DIR"/*
cp -r "$APP_SRC_DIR"/* "$APP_DIST_DIR"/

echo "Done."

# exec CMD from Dockerfile
# exec "$@"

# run nginx
nginx -g 'daemon off;'
