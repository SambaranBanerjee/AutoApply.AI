import { StandardJob } from "../../types/job";

export type ExperienceMode = "strict" | "moderate" | "any";

export interface UserProfile {
  skills: string[];
  yearsOfExperience: number;
  preferredLocations?: string[];
  remoteOnly?: boolean;
  experienceMode?: ExperienceMode;
}

export interface JobMatchResult {
  job: {
    id: string;
    sourcePortal: string;
    title: string;
    company: string;
    url: string;
    experienceRange: string;
    minExp: number;
    maxExp: number;
    locations: string[];
    isRemote: boolean;
  };
  score: number;
  matchedSkills: string[];
  missingMandatorySkills: string[];
  isExperienceMatch: boolean;
}

function normalizeSkill(name: string): string {
  return name.toLowerCase().replace(/[\s\-_.]/g, "");
}

function doesSkillMatch(jobTag: string, userSkills: Set<string>): boolean {
  const normTag = normalizeSkill(jobTag);

  for (const userSkill of userSkills) {
    const normUser = normalizeSkill(userSkill);
    if (normTag === normUser || normTag.includes(normUser) || normUser.includes(normTag)) {
      return true;
    }
  }

  // Infer "Full Stack" if candidate has both frontend and backend skills
  if (normTag === "fullstack") {
    const hasFrontend =
      userSkills.has("react") ||
      userSkills.has("javascript") ||
      userSkills.has("typescript") ||
      userSkills.has("frontend");
    const hasBackend =
      userSkills.has("node.js") ||
      userSkills.has("python") ||
      userSkills.has("java") ||
      userSkills.has("backend");
    return hasFrontend && hasBackend;
  }

  return false;
}

export class JobMatcher {
  static isExperienceCompatible(
    userExp: number,
    minExp: number,
    maxExp: number,
    mode: ExperienceMode = "moderate"
  ): boolean {
    if (mode === "any") return true;

    if (mode === "strict") {
      if (userExp === 0) return minExp <= 1;
      return userExp >= minExp && userExp <= maxExp;
    }

    if (userExp <= 1) {
      return minExp <= 3;
    }

    return userExp >= Math.max(0, minExp - 2) && userExp <= maxExp + 2;
  }

  static evaluate(job: StandardJob, profile: UserProfile): JobMatchResult {
    const userSkillSet = new Set(profile.skills.map((s) => s.trim().toLowerCase()));

    // Gathers all searchable tokens from tags, title, and description
    const tagsToEvaluate = [...(job.tags || [])];

    // If tags are sparse, check if the job title or description mentions any user skills
    const titleAndDesc = `${job.title} ${job.description || ""}`.toLowerCase();
    
    for (const skill of profile.skills) {
      const escaped = skill.toLowerCase().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      if (regex.test(titleAndDesc)) {
        if (!tagsToEvaluate.some((t) => normalizeSkill(t.name) === normalizeSkill(skill))) {
          tagsToEvaluate.push({ name: skill, isMandatory: false });
        }
      }
    }

    // Evaluating matches
    const matchedSkillsSet = new Set<string>();
    const missingMandatorySkills: string[] = [];
    let mandatoryTagCount = 0;
    let mandatoryMatchedCount = 0;

    for (const tag of tagsToEvaluate) {
      const isMatched = doesSkillMatch(tag.name, userSkillSet);

      if (isMatched) {
        matchedSkillsSet.add(tag.name);
      }

      if (tag.isMandatory) {
        mandatoryTagCount++;
        if (isMatched) {
          mandatoryMatchedCount++;
        } else {
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
          locations: job.locations,
          isRemote: job.isRemote,
        },
        score: 0,
        matchedSkills: [],
        missingMandatorySkills,
        isExperienceMatch: false,
      };
    }

    let skillScore = 0;

    if (mandatoryTagCount > 0) {
      const mandatoryScore = (mandatoryMatchedCount / mandatoryTagCount) * 70;
      const optionalTotal = tagsToEvaluate.length - mandatoryTagCount;
      const optionalMatched = matchedSkills.length - mandatoryMatchedCount;
      const optionalScore = optionalTotal > 0 ? (Math.max(0, optionalMatched) / optionalTotal) * 30 : 30;
      skillScore = Math.round(mandatoryScore + optionalScore);
    } else {
      // Score is based on how many candidate skills were discovered (cap at 100)
      const coverageRate = Math.min(1, matchedSkills.length / Math.min(profile.skills.length, 5));
      skillScore = Math.round(coverageRate * 100);
    }

    // Deducts point if missing mandatory skills
    if (missingMandatorySkills.length > 0) {
      skillScore = Math.max(10, skillScore - missingMandatorySkills.length * 15);
    }

    const expMode = profile.experienceMode || "moderate";
    const isExperienceMatch = this.isExperienceCompatible(
      profile.yearsOfExperience,
      job.minExp,
      job.maxExp,
      expMode
    );

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
        locations: job.locations,
        isRemote: job.isRemote,
      },
      score: skillScore,
      matchedSkills,
      missingMandatorySkills,
      isExperienceMatch,
    };
  }

  static matchAll(
    jobs: StandardJob[],
    profile: UserProfile,
    minScoreThreshold = 30
  ): JobMatchResult[] {
    const expMode = profile.experienceMode || "moderate";

    return jobs
      .map((job) => this.evaluate(job, profile))
      .filter((result) => {
        // Discarding any job with zero skill match or below threshold
        if (result.score < minScoreThreshold || result.matchedSkills.length === 0) {
          return false;
        }

        if (expMode !== "any" && !result.isExperienceMatch) {
          return false;
        }

        if (profile.remoteOnly && !result.job.isRemote) {
          return false;
        }

        if (profile.preferredLocations && profile.preferredLocations.length > 0) {
          const hasLocation = result.job.locations.some((loc) =>
            profile.preferredLocations?.some((pref) => {
              const p = pref.toLowerCase();
              const l = loc.toLowerCase();
              return l.includes(p) || p.includes(l);
            })
          );
          if (!hasLocation && !result.job.isRemote) return false;
        }

        return true;
      })
      .sort((a, b) => b.score - a.score);
  }
}