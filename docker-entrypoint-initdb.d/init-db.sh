#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    DO
    \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'myuser') THEN
            CREATE ROLE myuser WITH LOGIN PASSWORD 'mypassword';
        END IF;
    END
    \$\$;

    DO
    \$\$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'canelbdd') THEN
            CREATE DATABASE canelbdd;
            GRANT ALL PRIVILEGES ON DATABASE canelbdd TO myuser;
        END IF;
    END
    \$\$;
EOSQL
