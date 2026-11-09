# Auth fixes

This copy uses `/api` to match the Spring Boot controllers. The included `.env`
points the development proxy to `http://localhost:8080`. Vite runs on port 3000
and fails explicitly if that port is occupied, avoiding an unexpected CORS origin.

## Run locally

1. Restart the backend after its CORS configuration change.
2. In this frontend folder, run `npm ci`, then `npm run dev`.
3. Open `http://localhost:3000`.
4. Register, confirm the emailed code, then sign in.

Backend configuration must allow the frontend origin. The backend in the current
workspace was updated to use this default in `src/main/resources/application.properties`:

```properties
app.cors.allowed-origins=${CORS_ALLOWED_ORIGINS:http://localhost:3000,http://localhost:5173}
```

If `CORS_ALLOWED_ORIGINS` is set in the actual backend runtime, it overrides that
default. Include the exact frontend origin in that variable. The existing backend
properties file is gitignored, so carry this configuration to other environments
explicitly. Do not copy backend credentials into the frontend.

## Other changes

- Public auth requests omit an old Authorization header.
- Forgot/reset password requests do not trigger session refresh or login redirects.
- Resend confirmation uses `/auth/resend-confirmation`.
- Refresh reads the backend's plain DTO, validates accessToken, and has a timeout.
- Queued requests are marked as retried to prevent repeated refresh loops.
- `vite.config.ts` loads `VITE_BACKEND_URL` from the selected mode's env files.

## Verification

Run `npm run build`, `npm test`, and `npm run lint`.
The auth request tests use Axios adapters; they do not create Cognito accounts.
Full signup, email delivery, and login still require a running configured backend.

Vite's development proxy is not included in a production build. In production,
configure the web server to proxy `/api`, or set `VITE_API_BASE_URL` to the backend's
absolute API URL before building and allow the production frontend origin there.
