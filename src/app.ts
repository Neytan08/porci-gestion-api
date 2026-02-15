import statusRoutes from "./routes/status.route";
import breedRoutes from "./routes/breeds.route";
import breedingSowRoutes from "./routes/breedingSows.route";
// import farrowingsRoutes from "./routes/farrowings.route";
import boarsRoutes from "./routes/boars.route";
import matingEventsRoutes from "./routes/matingEvents.route";
// import notificationsRoutes from "./routes/notifications.route";
import vaccinesRoutes from "./routes/vaccines.route";
import vaccineTypesRoutes from "./routes/vaccineTypes.route";
import express from "express";
import { errorHandler } from './middlewares/errorHandler';
import logger from './utils/logger';
import helmet from "helmet";
import cors from "cors";
import { setupSwagger } from "./swagger";

const app = express();

// Middlewares to enhance API security
app.use(helmet());


// Enable CORS for all routes
app.use(cors());

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

// Middleware to parse JSON bodies
app.use(express.json());
// Routes
app.use("/api/status", statusRoutes);
app.use("/api/breeds", breedRoutes)
app.use("/api/breedingsows", breedingSowRoutes);
// app.use("/api/farrowings", farrowingsRoutes);
app.use("/api/boars", boarsRoutes);
app.use("/api/matingevents", matingEventsRoutes);
// app.use("/api/notifications", notificationsRoutes);
app.use("/api/vaccines", vaccinesRoutes);
app.use("/api/vaccinetypes", vaccineTypesRoutes);

// Global error handling middleware (should be after all routes)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const SWAGGER_PATH = process.env.SWAGGER_PATH || 'api-docs';
setupSwagger(app);

app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
  logger.info(`Swagger docs available at http://localhost:${PORT}/${SWAGGER_PATH}`);
});