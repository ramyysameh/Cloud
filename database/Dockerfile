# Official PostgreSQL image for the CloudPaste data tier.
# The init.sql file is automatically executed only when postgres_data is empty.
FROM postgres:16-alpine

COPY init.sql /docker-entrypoint-initdb.d/01-init.sql