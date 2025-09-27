import { Router } from "express";
import matingEventsController from "../controllers/matingEvents.controller";

const router = Router();

router.get("/", matingEventsController.getAll);
router.get("/:id", matingEventsController.getById);
router.post("/", matingEventsController.create);
router.put("/:id", matingEventsController.update);
router.delete("/:id", matingEventsController.delete);


export default router;