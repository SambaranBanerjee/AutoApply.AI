"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobMatcher = void 0;
function normalizeSkill(name) {
    if (!name || typeof name !== "string") {
        return "";
    }
    return name.toLowerCase().replace(/[\s\-_.]/g, "");
}
function doesSkillMatch(jobTag, userSkills) {
    const normTag = normalizeSkill(jobTag);
    for (const userSkill of userSkills) {
        const normUser = normalizeSkill(userSkill);
        if (!normUser)
            continue;
        if (normTag === normUser || normTag.includes(normUser) || normUser.includes(normTag)) {
            return true;
        }
    }
    // Infer "Full Stack" if candidate has both frontend and backend skills
    if (normTag === "fullstack") {
        const hasFrontend = userSkills.has("react") ||
            userSkills.has("javascript") ||
            userSkills.has("typescript") ||
            userSkills.has("frontend");
        const hasBackend = userSkills.has("node.js") ||
            userSkills.has("python") ||
            userSkills.has("java") ||
            userSkills.has("backend");
        return hasFrontend && hasBackend;
    }
    return false;
}
function inferExperienceFromTitle(title, currentMin, currentMax) {
    const lowerTitle = title.toLowerCase();
    if (currentMin > 0) {
        return { min: currentMin, max: currentMax };
    }
    if (/\b(senior|sr\.?|lead|staff|principal|architect|director|head of)\b/i.test(lowerTitle)) {
        return { min: 4, max: Math.max(8, currentMax) };
    }
    if (/\b(junior|jr\.?|intern|internship|graduate|associate|trainee|entry level)\b/i.test(lowerTitle)) {
        return { min: 0, max: 2 };
    }
    return { min: 1, max: currentMax };
}
function isTechnicalRole(title) {
    return /\b(developer|engineer|programmer|full stack|frontend|backend|software|web|coder)\b/i.test(title);
}
function matchesTargetRole(title = "", tags = [], targetRole) {
    if (!targetRole || targetRole.trim() === "" || targetRole.toLowerCase() === "any") {
        return true;
    }
    const role = targetRole.toLowerCase().trim();
    const titleLower = (title || "").toLowerCase();
    // Role track checks
    if (role.includes("front")) {
        return (titleLower.includes("front") ||
            titleLower.includes("react") ||
            titleLower.includes("ui") ||
            titleLower.includes("web developer"));
    }
    if (role.includes("back")) {
        return (titleLower.includes("back") ||
            titleLower.includes("node") ||
            titleLower.includes("python") ||
            titleLower.includes("java") ||
            titleLower.includes("api"));
    }
    if (role.includes("full") || role.includes("fullstack")) {
        return (titleLower.includes("full stack") ||
            titleLower.includes("fullstack") ||
            titleLower.includes("full-stack"));
    }
    if (role.includes("mobile") || role.includes("android") || role.includes("ios")) {
        return (titleLower.includes("mobile") ||
            titleLower.includes("react native") ||
            titleLower.includes("android") ||
            titleLower.includes("ios") ||
            titleLower.includes("flutter"));
    }
    return (titleLower.includes(role) ||
        tags.some((t) => t && typeof t.name === "string" && t.name.toLowerCase().includes(role)));
}
function matchesJobType(jobType, targetJobType) {
    if (!targetJobType || targetJobType.toLowerCase() === "any") {
        return true;
    }
    if (!jobType) {
        // If job does not explicitly declare a type, keep it rather than aggressively dropping
        return true;
    }
    return jobType.toLowerCase() === targetJobType.toLowerCase();
}
class JobMatcher {
    static isExperienceCompatible(userExp, minExp, maxExp, mode = "moderate") {
        if (mode === "any")
            return true;
        if (mode === "strict") {
            if (userExp === 0)
                return minExp <= 1;
            return userExp >= minExp && userExp <= maxExp;
        }
        if (userExp <= 1) {
            return minExp <= 3;
        }
        return userExp >= Math.max(0, minExp - 2) && userExp <= maxExp + 2;
    }
    static evaluate(job, profile) {
        const userSkillSet = new Set(profile.skills.filter(Boolean).map((s) => s.trim().toLowerCase()));
        const rawTags = (job.tags || [])
            .map((t) => {
            if (typeof t === "string")
                return { name: t, isMandatory: false };
            if (t && typeof t.name === "string")
                return t;
            return null;
        })
            .filter((t) => Boolean(t && t.name));
        // Gathers all searchable tokens from tags, title, and description
        const tagsToEvaluate = [...rawTags];
        const titleAndDesc = `${job.title} ${job.description || ""}`.toLowerCase();
        for (const skill of profile.skills) {
            const escaped = skill.toLowerCase().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
            const regex = new RegExp(`\\b${escaped}\\b`, "i");
            if (regex.test(titleAndDesc)) {
                const normSkill = normalizeSkill(skill);
                const alreadyExists = tagsToEvaluate.some((t) => normalizeSkill(t.name) === normSkill);
                if (!alreadyExists) {
                    tagsToEvaluate.push({ name: skill, isMandatory: false });
                }
            }
        }
        // Evaluating matches
        const matchedSkillsSet = new Set();
        const missingMandatorySkills = [];
        let mandatoryTagCount = 0;
        let mandatoryMatchedCount = 0;
        for (const tag of tagsToEvaluate) {
            if (!tag || !tag.name)
                continue;
            const isMatched = doesSkillMatch(tag.name, userSkillSet);
            if (isMatched) {
                matchedSkillsSet.add(tag.name);
            }
            if (tag.isMandatory) {
                mandatoryTagCount++;
                if (isMatched) {
                    mandatoryMatchedCount++;
                }
                else {
                    missingMandatorySkills.push(tag.name);
                }
            }
        }
        const matchedSkills = Array.from(matchedSkillsSet);
        if (matchedSkills.length === 0) {
            return {
                job: {
                    id: job.id,
                    sourcePortal: job.sourcePortal,
                    title: job.title,
                    company: job.company,
                    url: job.url,
                    experienceRange: `${job.minExp} - ${job.maxExp} yrs`,
                    minExp: job.minExp,
                    maxExp: job.maxExp,
                    locations: job.locations || [],
                    isRemote: Boolean(job.isRemote),
                },
                score: 0,
                matchedSkills: [],
                missingMandatorySkills,
                isExperienceMatch: false,
                matchReason: "",
            };
        }
        let skillScore = 0;
        if (mandatoryTagCount > 0) {
            const mandatoryScore = (mandatoryMatchedCount / mandatoryTagCount) * 70;
            const optionalTotal = tagsToEvaluate.length - mandatoryTagCount;
            const optionalMatched = matchedSkills.length - mandatoryMatchedCount;
            const optionalScore = optionalTotal > 0 ? (Math.max(0, optionalMatched) / optionalTotal) * 30 : 30;
            skillScore = Math.round(mandatoryScore + optionalScore);
        }
        else {
            // Score is based on how many candidate skills were discovered (cap at 100)
            const coverageRate = Math.min(1, matchedSkills.length / Math.min(profile.skills.length, 5));
            skillScore = Math.round(coverageRate * 100);
        }
        // Deducts point if missing mandatory skills
        if (missingMandatorySkills.length > 0) {
            skillScore = Math.max(10, skillScore - missingMandatorySkills.length * 15);
        }
        if (!isTechnicalRole(job.title)) {
            skillScore = Math.round(skillScore * 0.4);
        }
        const { min: inferredMin, max: inferredMax } = inferExperienceFromTitle(job.title, job.minExp, job.maxExp);
        const expMode = profile.experienceMode || "moderate";
        const userYears = Number(profile.yearsOfExperience);
        const isExperienceMatch = this.isExperienceCompatible(userYears, inferredMin, inferredMax, expMode);
        let matchReason = "";
        if (matchedSkills.length > 0) {
            const topSkills = matchedSkills.slice(0, 3).join(", ");
            matchReason = `Aligns with your experience in ${topSkills}.`;
            if (missingMandatorySkills.length === 0 && mandatoryTagCount > 0) {
                matchReason += " Satisfies all mandatory stack requirements.";
            }
            else if (missingMandatorySkills.length > 0) {
                matchReason += ` Note: specifically requests ${missingMandatorySkills.slice(0, 2).join(", ")}.`;
            }
        }
        else {
            matchReason = "General profile overlap based on role track.";
        }
        if (isExperienceMatch) {
            matchReason += ` Experience range (${inferredMin}-${inferredMax} yrs) is well-suited for your profile.`;
        }
        return {
            job: {
                id: job.id,
                sourcePortal: job.sourcePortal,
                title: job.title,
                company: job.company,
                url: job.url,
                experienceRange: `${inferredMin} - ${inferredMax} yrs`,
                minExp: inferredMin,
                maxExp: inferredMax,
                locations: job.locations || [],
                isRemote: Boolean(job.isRemote),
            },
            score: skillScore,
            matchedSkills,
            missingMandatorySkills,
            isExperienceMatch,
            matchReason,
        };
    }
    static matchAll(jobs, profile, minScoreThreshold = 30) {
        const expMode = profile.experienceMode || "moderate";
        return jobs
            .map((job) => this.evaluate(job, profile))
            .filter((result) => {
            // Discarding any job with zero skill match or below threshold
            if (result.score < minScoreThreshold || result.matchedSkills.length === 0) {
                return false;
            }
            const originalJob = jobs.find((j) => j.id === result.job.id);
            if (!originalJob)
                return false;
            if (!matchesTargetRole(originalJob.title, originalJob.tags || [], profile.targetRole)) {
                return false;
            }
            if (expMode !== "any" && !result.isExperienceMatch) {
                return false;
            }
            if (profile.remoteOnly && !result.job.isRemote) {
                return false;
            }
            if (profile.preferredLocations && profile.preferredLocations.length > 0) {
                const hasLocation = result.job.locations.some((loc) => profile.preferredLocations?.some((pref) => {
                    const p = pref.toLowerCase();
                    const l = loc.toLowerCase();
                    return l.includes(p) || p.includes(l);
                }));
                if (!hasLocation && !result.job.isRemote)
                    return false;
            }
            return true;
        })
            .sort((a, b) => b.score - a.score);
    }
}
exports.JobMatcher = JobMatcher;
