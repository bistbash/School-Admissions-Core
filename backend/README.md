# Backend API

Express.js backend with TypeScript, Prisma, and Zod validation.

## Scripts

- `npm run dev` - Start development server with hot reload
- `npx prisma studio` - Open Prisma Studio to view/edit database
- `npx prisma migrate dev` - Run database migrations
- `npx prisma generate` - Generate Prisma Client

## Environment Variables

See `.env.example` for required environment variables.

## Architecture

- **Modules**: Feature-based organization (soldiers, departments, roles, rooms)
- **Services**: Business logic layer
- **Controllers**: Request/response handling
- **Routes**: Route definitions with validation middleware
- **Lib**: Shared utilities (Prisma client, error handling, validation)

## Error Handling

The application uses a centralized error handling middleware that:
- Catches all errors from controllers
- Returns appropriate HTTP status codes
- Provides error messages in a consistent format
- Includes validation error details when applicable

## Validation

All POST/PUT requests are validated using Zod schemas defined in `src/lib/validation.ts`.

