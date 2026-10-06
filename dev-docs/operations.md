# API Operations

## Startup and Health

`src/server.ts` verifies the Prisma connection before listening. Use `GET /api/health/live` to check that the process is running and `GET /api/health/ready` to check database readiness. Traffic should only be sent to an instance whose readiness endpoint returns HTTP 200.

Production starts with `npm run build` followed by `npm start`. The build produces compiled code and `dist/openapi.json`; production startup fails when that API-document artifact is missing.

## Shutdown

`SIGINT` and `SIGTERM` stop new HTTP connections, allow active work to drain for `SHUTDOWN_TIMEOUT_MS`, and disconnect Prisma. The process force-closes remaining connections after the timeout so deployments cannot wait indefinitely.

## Configuration

Use `.env.example` as a reference. `npm run dev` loads the local `.env` file; production should provide variables through its shell or process manager. `DATABASE_URL` must never be committed. `API_BASE_URL` is the public `/api` URL shown by Swagger, while `SWAGGER_PATH` controls where the documentation UI is mounted.

## Logging and Retention

Development defaults to readable console output. Production defaults to JSON console output. File logging is enabled by default for a traditional server and writes structured records to `logs/error.log` and `logs/combined.log`.

`LOG_FILE_MAX_BYTES` limits each file and `LOG_FILE_MAX_FILES` limits retained rotated files. Monitor the server disk even with rotation enabled. Set `LOG_FILES_ENABLED=false` when a hosting platform collects console logs instead.

Every request returns `X-Request-ID`. Use that value to correlate a frontend failure with the server's request and error records; server logs are not sent to the frontend.
