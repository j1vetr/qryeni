import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import router from "./routes";
import { logger } from "./lib/logger";
import path from "path";

declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
  }
}

const isProd = process.env.NODE_ENV === "production";

const sessionSecret = process.env.SESSION_SECRET;
if (isProd && !sessionSecret) {
  throw new Error("SESSION_SECRET environment variable is required in production");
}

// Parse explicit origin allowlist once at startup
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ?.split(",")
  .map((o) => o.trim())
  .filter(Boolean) ?? [];

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  })
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Same-origin / server-to-server requests carry no Origin header — always allow
      if (!origin) return callback(null, true);

      // Explicit allowlist always wins
      if (allowedOrigins.length > 0) {
        return callback(null, allowedOrigins.includes(origin));
      }

      // Production without an explicit allowlist: fail closed — reject all cross-origin requests
      if (isProd) {
        return callback(null, false);
      }

      // Development only: allow localhost and Replit preview domains for convenience
      if (
        origin.includes("localhost") ||
        origin.includes(".replit.dev") ||
        origin.includes(".repl.co") ||
        origin.includes(".replit.app")
      ) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: sessionSecret ?? "qrmenu-dev-only-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      // SameSite: "lax" is safe because the API and frontend are co-hosted
      // on the same domain (both served through the Replit proxy).
      // "none" would require Secure + broad CORS, creating unnecessary exposure.
      secure: isProd,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  })
);

app.use("/api", router);

// Production: serve built frontend static files
if (isProd) {
  const staticDir = path.resolve(process.cwd(), "artifacts/qr-menu/dist/public");
  app.use(express.static(staticDir));
  app.use((_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

export default app;
