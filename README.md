# Guardian Backend API

Production-oriented backend service for the **Guardian**, a Citizen Centric Police Application implemented with the goal of bridging the gap between the citizens and authority through various crime reporting and emergency related services\*\*.

## Tech Stack

- Node.js
- Express 5
- SQLite3
- JWT + HTTP-only cookies
- Argon2 password hashing
- Multer for image uploding
- Nodemailer for MFA email delivery
- Dialogflow for chatbot functionality
- TensorFlow.js (local priority model support)
- Mocha + Chai + Sinon + NYC for testing/coverage
- Swagger UI for OpenAPI Documentation

## Features

- Auhenticated and authorized Role based access for citizens and police(authority)
- Incident reports with optional image uploads and witnesses
- Lost-article records and related personal details
- Alerts and note management
- MFA via email verification code
- Rate limiting, security headers, and request logging
- OpenAPI docs served in development

## Project Structure

```text
backend/
  src/
    config/        # DB, Swagger, logging, upload, mail config
    controllers/   # Route handlers
    middleware/    # Auth, errors, rate limiting, security, logging
    models/        # SQLite-backed data models
    routes/        # API route modules
    scripts/       # Seed/training/util scripts
    services/      # Business logic
    utils/         # Shared helpers
  docs/openapi.yaml
  data/            # SQLite database file (runtime)
  uploads/         # Uploaded images (runtime)
  test/
```

## Prerequisites

## Prerequisites

### Method 1: Docker

- Docker
- Docker Compose

Using Docker ensures consistent behavior across operating systems and avoids
Node.js version or native dependency inconsistencies.

### Method 2: Native Setup

If running without Docker, the following versions are required:

- **Node.js v22.19.0**
- **Python v3.11.x**
- npm

**Caution: Other Node.js or Python versions (especially on Windows) may result in
native module or runtime errors due to the fact that this project was run and tested on MacOS.**

## Environment Variables

Create a `.env` file in the project root or modify the existing `.env.example` file.

| Variable                         | Required | Description                                           |
| -------------------------------- | -------- | ----------------------------------------------------- |
| `NODE_ENV`                       | Yes      | `development`, `test`, or `production`                |
| `PORT`                           | No       | API port (default: `2699`)                            |
| `JWT_ACCESS_SECRET`              | Yes      | Secret for access tokens                              |
| `JWT_REFRESH_SECRET`             | Yes      | Secret for refresh tokens                             |
| `JWT_MFA_SECRET`                 | Yes      | Secret for MFA tokens                                 |
| `MAP_BOX_TOKEN`                  | Yes      | Mapbox token for map endpoints                        |
| `ACCOUNT_LOCKOUT_SECONDS`        | Yes      | Login lockout window in seconds                       |
| `ACCOUNT_LOCKOUT_ATTEMPTS`       | Yes      | Failed attempts before lockout                        |
| `DUMMY_HASH`                     | Yes      | Argon2 hash used for timing-safe invalid login checks |
| `DF_PROJECT_ID`                  | Optional | Dialogflow project ID                                 |
| `GOOGLE_APPLICATION_CREDENTIALS` | Optional | Path to Dialogflow service account JSON               |
| `SMTP_HOST`                      | Optional | SMTP server host (required for email MFA delivery)    |
| `SMTP_PORT`                      | Optional | SMTP server port                                      |
| `SMTP_USER`                      | Optional | SMTP username                                         |
| `SMTP_PASS`                      | Optional | SMTP password                                         |

## Local Development

```
npm install
```

Additional Step (Windows Only)

```
cp node_modules/\@tensorflow/tfjs-node/deps/lib/tensorflow.dll node_modules/\@tensorflow/tfjs-node/lib/napi-v8/
```

Above step is required due to filesystem or path resolution differences on Windows.
Failure to perform this step may result in runtime errors.

```
npm run model:train
```

```
npm run dev
```

## URL Paths

Server base URL:

```text
http://localhost:2699
```

API base path:

```text
http://localhost:2699/api/v1
```

Swagger docs (development mode only):

```text
http://localhost:2699/api-docs
```

## All Available Scripts

- `npm start` - Run the production server
- `npm run dev` - Run with `nodemon`
- `npm test` - Run test suite with NYC instrumentation
- `npm run coverage` - Generate coverage report
- `npm run model:train` - Train local priority model from dataset
- `npm run script:generateExampleData` - Recreate DB and seed large example dataset

Extra utility script:

```bash
node src/scripts/create_officer.js [firstName] [lastName] [password] [email]
```

If arguments are omitted, the script prompts interactively.

## Running with Docker

```bash
docker compose up --build
```

Compose maps:

- `2699:2699`
- Named volume `guardian_db` -> `/app/data`
- Named volume `guardian_uploads` -> `/app/uploads`

## Authentication Notes

- Login issues HTTP-only cookies for access/refresh tokens.
- Protected routes require valid authentication middleware checks.
- Access token lifetime is 15 minutes; refresh token lifetime is 14 days.
- Refresh is only allowed near access-token expiry (short renewal window).

## API Modules

- `auth`
- `mfa`
- `reports`
- `lost-articles`
- `alerts`
- `notes`
- `dialogflow`
- `files`
- `map-box`

Refer to `docs/openapi.yaml` or `/api-docs` for full endpoint contracts.

## Testing

```bash
npm test
npm run coverage
```

Tests run with `NODE_ENV=test` and use in-memory SQLite.

## Operational Notes

- SQLite database file is created at `data/main.db` outside test mode.
- Uploaded report images are stored in `uploads/`.
- Logs are written using Winston configuration in `src/config/logging.js`.

## License

ISC
