# Public entrypoint for CloudPaste.
# This is the only service that publishes a host port in docker-compose.yml.
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80