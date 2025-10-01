import express from "express";
import statusRoutes from "./routes/status.route";
import breedingSowRoutes from "./routes/breedingSows.route";
import farrowingsRoutes from "./routes/farrowings.route";
import boarsRoutes from "./routes/boars.route";
import matingEventsRoutes from "./routes/matingEvents.route";
import notificationsRoutes from "./routes/notifications.route";
import vaccinesRoutes from "./routes/vaccines.route";
import vaccineTypesRoutes from "./routes/vaccineTypes.route";
import { errorHandler } from './middlewares/errorHandler';
import logger from './utils/logger';


const app = express();

app.use(express.json());

// Welcome route (For now)
app.get("/", (_, res) => {
  res.send("🚀 Bienvenido a la API de PorciGestion");
});

// Routes
app.use("/api/status", statusRoutes);
app.use("/api/breedingsows", breedingSowRoutes);
app.use("/api/farrowings", farrowingsRoutes);
app.use("/api/boars", boarsRoutes);
app.use("/api/matingevents", matingEventsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/vaccines", vaccinesRoutes);
app.use("/api/vaccinetypes", vaccineTypesRoutes);

app.use(errorHandler);


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
});