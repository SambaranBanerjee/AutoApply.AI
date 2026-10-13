import express, { Request,Response } from "express";
import multer from "multer";
import { HiristService } from "./services/hiristService";
import { ResumeParser } from "./services/resumeParser";
import { JobMatcher, UserProfile } from "./services/jobMatcher";


const app = express();
const port = 3000;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});

const hiristService = new HiristService();

app.post(
    "/api/match-jobs",
    upload.single("resume"),
    async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.file) {
                res.status(400).json({ error: "Please upload a resume file (PDF)." });
                return;
            }

            const rawText = await ResumeParser.extractTextFromBuffer(req.file.buffer);
            const ephemeralKeywords = ResumeParser.extractKeywords(rawText);

            if (ephemeralKeywords.length === 0) {
                res.status(422).json({
                    message: "No technical keywords could be identified in the uploaded resume.",
                });
                return;
            }
            
            const experience = Number(req.body.yearsOfExperience) || 2;
            const preferredLocation = req.body.location ? [String(req.body.location)] : [];

            const userProfile: UserProfile = {
                skills: ephemeralKeywords,
                yearsOfExperience: experience,
                preferredLocations: preferredLocation,
                remoteOnly: req.body.remoteOnly === "true",
            };

            const searchRole = ephemeralKeywords[0] || "Software";
            const rawJobData = await hiristService.searchJobs(searchRole, 0, 20);

            const matchedJobs = JobMatcher.matchAll(rawJobData.data || [], userProfile, 30);

            res.json({
                extractedKeywords: ephemeralKeywords,
                totalMatches: matchedJobs.length,
                results: matchedJobs,
            });
        }
        catch (error) {
            console.error("Match error:", error);
            res.status(500).json({ error: "An error occurred while evaluating the resume." });
        }
    }
);

app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});