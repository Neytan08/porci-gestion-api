import { Router } from "express";
import matingEventsController from "../controllers/matingEvents.controller";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

router.get("/", asyncHandler(matingEventsController.getAll.bind(matingEventsController)));
router.get("/:id", asyncHandler(matingEventsController.getById.bind(matingEventsController)));
router.post("/", asyncHandler(matingEventsController.create.bind(matingEventsController)));
router.put("/:id", asyncHandler(matingEventsController.update.bind(matingEventsController)));
router.delete("/:id", asyncHandler(matingEventsController.delete.bind(matingEventsController)));
router.get("/sow/:sowId", asyncHandler(matingEventsController.getAllMatingEventsBySow.bind(matingEventsController)));
router.get("/boar/:boarId", asyncHandler(matingEventsController.getAllMatingEventsByBoar.bind(matingEventsController)));


export default router;