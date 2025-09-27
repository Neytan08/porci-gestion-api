import express from "express";
import statusRoutes from "./routes/status.routes";
import breedingSowRoutes from "./routes/breedingSows.routes";

const app = express();

app.use(express.json());

// Ruta de bienvenida
app.get("/", (_, res) => {
  res.send("🚀 Bienvenido a la API de PorciGestion");
});

// Rutas
app.use("/api/status", statusRoutes);
app.use("/api/breeding-sows", breedingSowRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});