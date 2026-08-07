# ITX Learning Hub API

Node.js and Express API for the computer-lab slot booking portal. PostgreSQL is
accessed through Prisma ORM. Authentication uses a JWT stored in an HTTP-only
cookie, and Socket.IO publishes live booking, system, and policy updates.

## Development setup

1. Install PostgreSQL and create a database named `itx_slot_booking`.
2. Copy `.env.example` to `.env`.
3. Update `DATABASE_URL` in `.env` with your PostgreSQL username and password.
4. Run `npm install`.
5. Run `npm run prisma:migrate` to apply the database migrations.
6. Run `npm run dev`.

The API runs at `http://localhost:5000`.

For the common pgAdmin 4 local setup, use:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/itx_slot_booking?schema=public"
```

- `postgres` is the default PostgreSQL username.
- `YOUR_PASSWORD` is the password chosen during PostgreSQL installation.
- `5432` is the default PostgreSQL port.
- `itx_slot_booking` is the database name to create in pgAdmin 4.
- If the password contains characters such as `@`, `#`, `/`, or `:`, URL-encode them in the connection string.

## Frontend connection

The React app should request relative routes such as `/api/health` and
`/api/auth/login`. Vite proxies `/api` to the Express server during development,
so this project does not need CORS origin whitelisting.

## Useful commands

- `npm run dev` starts the API with Node watch mode.
- `npm run check` checks the JavaScript files for syntax errors.
- `npm run prisma:generate` regenerates Prisma Client.
- `npm run prisma:migrate -- --name migration_name` creates a migration.
- `npm run prisma:migrate:deploy` applies existing migrations in production.
- `npm run prisma:studio` opens Prisma Studio.
- `npm run admin:create -- --email=... --username=... --password=...` creates the first administrator.
- `npm run backup:database` creates a PostgreSQL custom-format backup.

Production database, backup, monitoring, and alert guidance is available in the `docs` folder. The API uses `Asia/Kolkata` as the default lab timezone; change `LAB_TIME_ZONE` only if the lab moves to another timezone.

Administrator and student accounts, bookings, systems, outages, courses, and
lab settings are stored in PostgreSQL.
