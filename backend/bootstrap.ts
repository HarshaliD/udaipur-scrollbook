/**
 * bootstrap.ts
 * Must be the very first import in server.ts.
 * Loads .env so all subsequent modules can read process.env safely.
 */
import dotenv from 'dotenv';
dotenv.config();
