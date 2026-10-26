"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchController = void 0;
const resumeParser_1 = require("../services/resume/resumeParser");
const provider_factory_1 = require("../services/providers/provider.factory");
const jobMatcher_1 = require("../services/matcher/jobMatcher");
const csvExporter_1 = require("../services/export/csvExporter");
const geminiEmbedding_service_1 = require("../services/ml/geminiEmbedding.service");
const skillGap_service_1 = require("../services/analytics/skillGap.service");
const VALID_PORTALS = new Set(["hirist", "remotive", "arbeitnow", "all"]);
class MatchController {
    static async handleResumeMatch(req, res) {
        try {
            if (!req.file || !req.file.buffer) {
                res.status(400).json({ error: "Please upload a resume file (PDF)." });
                return;
            }
            // 1. In-memory text extraction
            let rawText = "";
            try {
                rawText = await resumeParser_1.ResumeParser.extractTextFromBuffer(req.file.buffer);
            }
            catch (parseErr) {
                console.error("[MatchController] Error extracting text from buffer:", parseErr);
                res.status(422).json({ error: "Could not read text content from the uploaded PDF." });
                return;
            }
            if (!rawText || rawText.trim().length === 0) {
                res.status(422).json({ error: "Uploaded PDF appears to be empty or unscannable." });
                return;
            }
            // 2. Extract technical keywords with fallback
            let ephemeralKeywords = [];
            try {
                ephemeralKeywords = resumeParser_1.ResumeParser.extractKeywords(rawText) || [];
            }
            catch (kwErr) {
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
                const parsedExp = Number(resumeParser_1.ResumeParser.extractExperience(rawText));
                if (!isNaN(parsedExp) && isFinite(parsedExp) && parsedExp >= 0 && parsedExp <= 40) {
                    detectedExp = Math.floor(parsedExp);
                }
            }
            catch (expErr) {
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
            const resumeEmbedding = await geminiEmbedding_service_1.GeminiEmbeddingService.getSingleEmbedding(rawText);
            // 5. Query parameters & Filters
            const pageDepth = Math.max(1, Math.min(Number(req.body.pageDepth) || 1, 4));
            const rawPortal = (req.body.portal || "all").toString().toLowerCase();
            const portal = VALID_PORTALS.has(rawPortal)
                ? rawPortal
                : "all";
            const preferredLocation = req.body.location ? [String(req.body.location)] : [];
            const remoteOnly = req.body.remoteOnly === "true";
            const experienceMode = req.body.experienceMode || "moderate";
            const targetRole = req.body.roleTitle ? String(req.body.roleTitle) : undefined;
            const jobType = req.body.jobType ? String(req.body.jobType) : undefined;
            const minSalary = req.body.minSalary && !isNaN(Number(req.body.minSalary))
                ? Number(req.body.minSalary)
                : undefined;
            const userProfile = {
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
            const jobs = await provider_factory_1.ProviderFactory.search(portal, {
                keywords: ephemeralKeywords,
                userExperience: userExp,
                locations: preferredLocation,
                remoteOnly,
                pageDepth,
                limit: 20,
            });
            // 7. Execute Hybrid Matcher
            const matchedJobs = await jobMatcher_1.JobMatcher.matchAll(jobs, userProfile, 30);
            // 8. Handle CSV Export format
            const requestedFormat = (req.body.format || req.query.format || "json")
                .toString()
                .toLowerCase();
            if (requestedFormat === "csv") {
                const csvContent = csvExporter_1.csvExporter.generateCsv(matchedJobs);
                const fileName = `job_matches_${Date.now()}.csv`;
                res.setHeader("Content-Type", "text/csv; charset=utf-8");
                res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
                res.status(200).send(csvContent);
                return;
            }
            // 9. Compute High-ROI Skill Gaps
            let skillGaps = [];
            try {
                skillGaps = skillGap_service_1.SkillGapService.analyze(jobs, ephemeralKeywords, 6);
            }
            catch (gapErr) {
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
        }
        catch (error) {
            console.error("[MatchController] Critical error executing match:", error);
            res.status(500).json({
                error: error.message || "Internal server error while evaluating resume.",
            });
        }
    }
}
exports.MatchController = MatchController;
