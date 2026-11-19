import { PGlite } from "@electric-sql/pglite";
import { PGliteSocketServer } from "@electric-sql/pglite-socket";

const port = Number.parseInt(process.env.PORT ?? "5544", 10);
if (!Number.isFinite(port) || port <= 0) throw new Error("PORT invalide");

const server = new PGliteSocketServer({ db: new PGlite(), port, host: "127.0.0.1" });
await server.start();
console.log(`PGlite à l'écoute sur 127.0.0.1:${port}`);
console.log(`DATABASE_URL=postgres://postgres:postgres@127.0.0.1:${port}/postgres`);
