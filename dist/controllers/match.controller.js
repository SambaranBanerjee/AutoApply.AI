"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchController = void 0;
const resumeParser_1 = require("../services/resume/resumeParser");
const provider_factory_1 = require("../services/providers/provider.factory");
const jobMatcher_1 = require("../services/matcher/jobMatcher");
const csvExporter_1 = require("../services/export/csvExporter");
const VALID_PORTALS = new Set(["hirist", "remotive", "arbeitnow", "all"]);
class MatchController {
    static async handleResumeMatch(req, res) {
        try {
            if (!req.file) {
                res.status(400).json({ error: "Please upload a resume file (PDF)." });
                return;
            }
            const rawText = await resumeParser_1.ResumeParser.extractTextFromBuffer(req.file.buffer);
            const ephemeralKeywords = resumeParser_1.ResumeParser.extractKeywords(rawText);
            if (ephemeralKeywords.length === 0) {
                res.status(422).json({
                    message: "No technical keywords identified in the uploaded resume.",
                });
                return;
            }
            const detectedExp = Number(resumeParser_1.ResumeParser.extractExperience(rawText)) || 0;
            const userExp = req.body.yearsOfExperience !== undefined && req.body.yearsOfExperience !== ""
                ? Number(req.body.yearsOfExperience)
                : detectedExp;
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
            const minSalary = req.body.minSalary ? Number(req.body.minSalary) : undefined;
            const userProfile = {
                skills: ephemeralKeywords,
                yearsOfExperience: userExp,
                preferredLocations: preferredLocation,
                remoteOnly,
                experienceMode,
                targetRole,
                jobType,
                minSalary,
            };
            const jobs = await provider_factory_1.ProviderFactory.search(portal, {
                keywords: ephemeralKeywords,
                userExperience: userExp,
                locations: preferredLocation,
                remoteOnly,
                pageDepth,
                limit: 20,
            });
            const matchedJobs = jobMatcher_1.JobMatcher.matchAll(jobs, userProfile, 30);
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
            res.json({
                portalSelected: portal,
                extractedKeywords: ephemeralKeywords,
                detectedExperience: userExp,
                totalJobsFetched: jobs.length,
                totalQualifiedMatches: matchedJobs.length,
                results: matchedJobs,
            });
        }
        catch (error) {
            console.error("[MatchController] Error executing match:", error);
            res.status(500).json({ error: "Internal server error while evaluating resume." });
        }
    }
}
exports.MatchController = MatchController;
