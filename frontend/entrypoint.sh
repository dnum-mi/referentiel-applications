#!/bin/sh

DEFAULT_APP_ENV_PREFIX="VITE_RDA_"
DEFAULT_APP_DIST_DIR="/app"

if [ -z "$APP_ENV_PREFIX" ]; then
    echo "APP_ENV_PREFIX is not set. Setting to default: $DEFAULT_APP_ENV_PREFIX"
    export APP_ENV_PREFIX=$DEFAULT_APP_ENV_PREFIX
fi
if [ -z "$APP_DIST_DIR" ]; then
    echo "APP_DIST_DIR is not set. Setting to default: $DEFAULT_APP_DIST_DIR"
    export APP_DIST_DIR=$DEFAULT_APP_DIST_DIR
fi

echo "Prefix: $APP_ENV_PREFIX"
echo "Directory: $APP_DIST_DIR"
ls $APP_DIST_DIR | grep 'assets'

env | grep "^$APP_ENV_PREFIX"
for i in $(env | grep "^$APP_ENV_PREFIX"); do
    key=$(echo "$i" | cut -d '=' -f 1)
    value=$(echo "$i" | cut -d '=' -f 2-)

    echo "Setting $key=$value"
    FILE_COUNT=$(grep $key -rnl $APP_DIST_DIR | wc -l)
    echo "Found $FILE_COUNT files with matching key: $key"

    find "$APP_DIST_DIR" -type f -exec sed -i 's|'"${key}"'|'"${value}"'|g' {} \;  
done

echo "Done."

# exec CMD from Dockerfile
# exec "$@"

# run nginx
nginx -g 'daemon off;'
