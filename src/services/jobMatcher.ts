import { HiristJobItem } from "../types/hirist";

export interface UserProfile {
  skills: string[]; // e.g., ["Python", "Java", "SQL", "React"]
  yearsOfExperience: number;
  preferredLocations?: string[]; // e.g., ["Bangalore", "Remote"]
  remoteOnly?: boolean;
}

export interface JobMatchResult {
  job: {
    id: number;
    title: string;
    company: string;
    url: string;
    experienceRange: string;
    locations: string[];
    isRemote: boolean;
  };
  score: number; // 0 to 100%
  matchedSkills: string[];
  missingMandatorySkills: string[];
  isExperienceMatch: boolean;
}

export class JobMatcher {
    /**
    * Matches and ranks Hirist jobs against a user's profile.
    */
    static evaluate(job: HiristJobItem, profile: UserProfile) : JobMatchResult {
        const userSkillSet = new Set(profile.skills.map((s) => s.trim().toLowerCase()));

        const matchedSkills: string[] = [];
        const missingMandatorySkills: string[] = [];
        
        let mandatoryTagCount = 0;
        let mandatoryMatchedCount = 0

        for (const tag of job.tags || []) {
            const tagLower = tag.name.toLowerCase();
            const isMatched = userSkillSet.has(tagLower);

            if (isMatched) {
                matchedSkills.push(tagLower);
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

        const totalTags = job.tags?.length || 0
        const mandatoryScore = mandatoryTagCount > 0 ? (mandatoryMatchedCount / mandatoryTagCount) * 70 : 70;
        const optionalScore = totalTags > mandatoryTagCount ? 
            ((matchedSkills.length - mandatoryMatchedCount) / (totalTags - mandatoryTagCount)) * 30 : 30;

        let skillScore = Math.round(mandatoryScore + optionalScore);

        const isExperienceMatch = profile.yearsOfExperience >= job.min && profile.yearsOfExperience <= job.max;
        if (!isExperienceMatch) {
            skillScore = Math.max(0, skillScore - 20);
        }

        const jobLocations = (job.locations || []).map((loc) => loc.name);
        const isRemote = (job.workFromHome) === 1;

        return {
            job: {
                id: job.id,
                title: job.title,
                company: job.companyData?.companyName || "Unknown",
                url: job.jobDetailUrl,
                experienceRange: `${job.min} - ${job.max} yrs`,
                locations: jobLocations,
                isRemote,
            },
            score: skillScore,
            matchedSkills,
            missingMandatorySkills,
            isExperienceMatch,
        }; 
    }
    /**
    * Filters and sorts an array of jobs from highest to lowest score.
    */

    static matchAll(
        jobs: HiristJobItem[],
        profile: UserProfile,
        minScoreThreshold = 40
    ) : JobMatchResult[] {
        return jobs
            .map((job) => this.evaluate(job, profile))
            .filter((result) => {
                // Enforce remote condition if explicitly requested
                if (profile.remoteOnly && !result.job.isRemote) {
                return false;
                }

                // Enforce location filter if specified
                if (profile.preferredLocations && profile.preferredLocations.length > 0) {
                const hasLocation = result.job.locations.some((loc) =>
                    profile.preferredLocations?.some((pref) => pref.toLowerCase() === loc.toLowerCase())
                );
                if (!hasLocation && !result.job.isRemote) return false;
                }

                return result.score >= minScoreThreshold;
            })
            .sort((a,b) => b.score - a.score);
    }
}