"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillGapService = void 0;
class SkillGapService {
    /**
     * Safely normalizes a tag whether it's a string, an object { name: "..." }, or malformed.
     */
    static extractTagString(tag) {
        if (!tag)
            return null;
        if (typeof tag === "string") {
            const clean = tag.trim();
            return clean.length > 0 ? clean : null;
        }
        if (typeof tag === "object" && typeof tag.name === "string") {
            const clean = tag.name.trim();
            return clean.length > 0 ? clean : null;
        }
        return null;
    }
    /**
     * Analyzes all fetched jobs against user skills to compute the most impactful missing skills.
     */
    static analyze(jobs, userSkills, topN = 6) {
        if (!jobs || jobs.length === 0)
            return [];
        const userSkillSet = new Set((userSkills || [])
            .filter((s) => typeof s === "string")
            .map((s) => s.trim().toLowerCase()));
        const missingCounts = new Map();
        let totalOpportunities = 0;
        for (const job of jobs) {
            if (!job || !Array.isArray(job.tags) || job.tags.length === 0)
                continue;
            // Extract valid string names safely
            const validJobSkills = job.tags
                .map(this.extractTagString)
                .filter((t) => Boolean(t));
            if (validJobSkills.length === 0)
                continue;
            totalOpportunities++;
            const uniqueJobSkills = Array.from(new Set(validJobSkills));
            for (const skillName of uniqueJobSkills) {
                const lower = skillName.toLowerCase();
                // Skip generic tokens or skills the applicant already has
                if (userSkillSet.has(lower) ||
                    lower === "it" ||
                    lower === "software" ||
                    lower === "developer" ||
                    lower === "development" ||
                    lower === "engineering") {
                    continue;
                }
                missingCounts.set(skillName, (missingCounts.get(skillName) || 0) + 1);
            }
        }
        if (totalOpportunities === 0)
            return [];
        // Rank descending by count
        const sorted = Array.from(missingCounts.entries()).sort((a, b) => b[1] - a[1]);
        return sorted.slice(0, topN).map(([skill, count]) => {
            const frequencyPercentage = Math.round((count / totalOpportunities) * 100);
            let impactScore = "Low";
            if (frequencyPercentage >= 20) {
                impactScore = "High";
            }
            else if (frequencyPercentage >= 10) {
                impactScore = "Medium";
            }
            return {
                skill,
                demandCount: count,
                frequencyPercentage,
                impactScore,
            };
        });
    }
}
exports.SkillGapService = SkillGapService;
