FROM oven/bun:1 AS base

COPY ./ /app
WORKDIR /app
run bun i 
run bun run build

FROM nginx:stable-alpine
COPY --from=base /app/build /usr/share/nginx/html
