import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config";
import { errorHandler } from "./middlewares/errorHandler";
import { requestTracing } from "./middlewares/requestTracing";
import boarsRoutes from "./routes/boars.route";
import breedingSowRoutes from "./routes/breedingSows.route";
import breedRoutes from "./routes/breeds.route";
import farrowingsRoutes from "./routes/farrowings.route";
import healthRoutes from "./routes/health.route";
import matingEventsRoutes from "./routes/matingEvents.route";
import { setupSwagger } from "./swagger";

const app = express();

// Establish request correlation before any middleware can complete or reject a request.
app.use(requestTracing);

// Middlewares to enhance API security
app.use(helmet());

// Enable CORS for all routes
app.use(cors({ exposedHeaders: ["X-Request-ID"] }));

/** If you want to restrict CORS to specific origins, methods, or headers, you can configure it like this:
 * app.use(cors({
 * origin: ["http://localhost:5173", "https://midominio.com"],
 * methods: ["GET", "POST", "PUT", "DELETE"],
 * allowedHeaders: ["Content-Type", "Authorization"],
 * }));
 * This configuration allows requests only from the specified origins and methods.
 **/

// Welcome route (For now)
app.get("/", (_, res) => {
  res.send("🚀 Bienvenido a la API de PorciGestion");
});

app.use("/api/health", healthRoutes);

// Middleware to parse JSON bodies
app.use(express.json());
// Routes
app.use("/api/breeds", breedRoutes);
app.use("/api/breedingsows", breedingSowRoutes);
app.use("/api/farrowings", farrowingsRoutes);
app.use("/api/boars", boarsRoutes);
app.use("/api/matingevents", matingEventsRoutes);

setupSwagger(app, config.swaggerPath, config.apiBaseUrl);

// Global error handling middleware (should be after all routes)
app.use(errorHandler);

export default app;
