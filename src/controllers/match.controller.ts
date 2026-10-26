import { Request, Response } from "express";
import { ResumeParser } from "../services/resume/resumeParser";
import { PortalSelection } from "../types/provider";
import { UserProfile, ExperienceMode } from "../types/matcher";
import { ProviderFactory } from "../services/providers/provider.factory";
import { JobMatcher } from "../services/matcher/jobMatcher";
import { EmploymentType } from "../types/job";
import { csvExporter } from "../services/export/csvExporter";
import { GeminiEmbeddingService } from "../services/ml/geminiEmbedding.service";
import { SkillGapService } from "../services/analytics/skillGap.service";

const VALID_PORTALS: Set<string> = new Set(["hirist", "remotive", "arbeitnow", "all"]);

export class MatchController {
    static async handleResumeMatch(req: Request, res: Response): Promise<void> {
        try {
            if (!req.file || !req.file.buffer) {
                res.status(400).json({ error: "Please upload a resume file (PDF)." });
                return;
            }

            // 1. In-memory text extraction
            let rawText = "";
            try {
                rawText = await ResumeParser.extractTextFromBuffer(req.file.buffer);
            } catch (parseErr) {
                console.error("[MatchController] Error extracting text from buffer:", parseErr);
                res.status(422).json({ error: "Could not read text content from the uploaded PDF." });
                return;
            }

            if (!rawText || rawText.trim().length === 0) {
                res.status(422).json({ error: "Uploaded PDF appears to be empty or unscannable." });
                return;
            }

            // 2. Extract technical keywords with fallback
            let ephemeralKeywords: string[] = [];
            try {
                ephemeralKeywords = ResumeParser.extractKeywords(rawText) || [];
            } catch (kwErr) {
                console.warn("[MatchController] Keyword extraction warning:", kwErr);
                ephemeralKeywords = [];
            }

            if (ephemeralKeywords.length === 0) {
                res.status(422).json({
                    message: "No technical keywords identified in the uploaded resume.",
                });
                return;
            }

            // 3. Resilient Experience Detection (Safeguards against 'Expected 2027', NaN, negative values)
            let detectedExp = 0;
            try {
                const parsedExp = Number(ResumeParser.extractExperience(rawText));
                if (!isNaN(parsedExp) && isFinite(parsedExp) && parsedExp >= 0 && parsedExp <= 40) {
                    detectedExp = Math.floor(parsedExp);
                }
            } catch (expErr) {
                console.warn("[MatchController] Experience parsing warning, defaulting to 0:", expErr);
                detectedExp = 0;
            }

            let userExp = detectedExp;
            if (req.body.yearsOfExperience !== undefined && req.body.yearsOfExperience !== "") {
                const manualExp = Number(req.body.yearsOfExperience);
                if (!isNaN(manualExp) && isFinite(manualExp) && manualExp >= 0) {
                    userExp = manualExp;
                }
            }

            // 4. Safe Single Embedding Generation (never throws; falls back to null)
            const resumeEmbedding = await GeminiEmbeddingService.getSingleEmbedding(rawText);

            // 5. Query parameters & Filters
            const pageDepth = Math.max(1, Math.min(Number(req.body.pageDepth) || 1, 4));

            const rawPortal = (req.body.portal || "all").toString().toLowerCase();
            const portal: PortalSelection = VALID_PORTALS.has(rawPortal)
                ? (rawPortal as PortalSelection)
                : "all";

            const preferredLocation = req.body.location ? [String(req.body.location)] : [];
            const remoteOnly = req.body.remoteOnly === "true";
            const experienceMode = (req.body.experienceMode as ExperienceMode) || "moderate";

            const targetRole = req.body.roleTitle ? String(req.body.roleTitle) : undefined;
            const jobType = req.body.jobType ? (String(req.body.jobType) as EmploymentType) : undefined;
            const minSalary = req.body.minSalary && !isNaN(Number(req.body.minSalary))
                ? Number(req.body.minSalary)
                : undefined;

            const userProfile: UserProfile = {
                skills: ephemeralKeywords,
                yearsOfExperience: userExp,
                preferredLocations: preferredLocation,
                remoteOnly,
                experienceMode,
                targetRole,
                jobType,
                minSalary,
                resumeEmbedding,
            };

            // 6. Ingest jobs across candidate providers
            const jobs = await ProviderFactory.search(portal, {
                keywords: ephemeralKeywords,
                userExperience: userExp,
                locations: preferredLocation,
                remoteOnly,
                pageDepth,
                limit: 20,
            });

            // 7. Execute Hybrid Matcher
            const matchedJobs = await JobMatcher.matchAll(jobs, userProfile, 30);

            // 8. Handle CSV Export format
            const requestedFormat = (req.body.format || req.query.format || "json")
                .toString()
                .toLowerCase();

            if (requestedFormat === "csv") {
                const csvContent = csvExporter.generateCsv(matchedJobs);
                const fileName = `job_matches_${Date.now()}.csv`;

                res.setHeader("Content-Type", "text/csv; charset=utf-8");
                res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
                res.status(200).send(csvContent);
                return;
            }

            // 9. Compute High-ROI Skill Gaps
            let skillGaps: any[] = [];
            try {
                skillGaps = SkillGapService.analyze(jobs, ephemeralKeywords, 6);
            } catch (gapErr) {
                console.warn("[MatchController] Skill gap analysis warning:", gapErr);
                skillGaps = [];
            }

            // 10. Final Response payload
            res.json({
                portalSelected: portal,
                extractedKeywords: ephemeralKeywords,
                detectedExperience: userExp,
                semanticMatchingEnabled: Boolean(resumeEmbedding),
                totalJobsFetched: jobs.length,
                totalQualifiedMatches: matchedJobs.length,
                skillGaps,
                results: matchedJobs,
            });
        } catch (error) {
            console.error("[MatchController] Critical error executing match:", error);
            res.status(500).json({
                error: (error as Error).message || "Internal server error while evaluating resume.",
            });
        }
    }
}