# Static frontend container.
# Nginx serves the plain HTML/CSS/JS app; API calls still go through the reverse proxy as /api/...
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html styles.css app.js /usr/share/nginx/html/

EXPOSE 80