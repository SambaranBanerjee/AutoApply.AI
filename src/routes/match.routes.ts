import { Router } from "express";
import multer from "multer";
import { MatchController } from "../controllers/match.controller";

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
})

router.post("/match-jobs", upload.single("resume"), MatchController.handleResumeMatch);

export default router;