import { StandardJob } from "../../types/job";

export interface SkillGapInsight {
  skill: string;
  demandCount: number;
  frequencyPercentage: number;
  impactScore: "High" | "Medium" | "Low";
}

export class SkillGapService {
  static analyze(
    jobs: StandardJob[],
    userSkills: string[],
    topN: number = 6
  ): SkillGapInsight[] {
    if (!jobs || jobs.length === 0) return [];

    const userSkillSet = new Set(
      userSkills.map((s) => s.trim().toLowerCase())
    );
    const missingCounts = new Map<string, number>();
    let totalOpportunities = 0;

    for (const job of jobs) {
      if (!job.tags || job.tags.length === 0) continue;
      totalOpportunities++;

      const jobSkillNames = Array.from(
        new Set(job.tags.map((t) => t.name.trim()))
      );

      for (const skillName of jobSkillNames) {
        const lower = skillName.toLowerCase();
        // Ignore generic words or skills already present on the resume
        if (
          userSkillSet.has(lower) ||
          lower === "it" ||
          lower === "software" ||
          lower === "developer" ||
          lower === "development" ||
          lower === "engineering"
        ) {
          continue;
        }

        missingCounts.set(skillName, (missingCounts.get(skillName) || 0) + 1);
      }
    }

    if (totalOpportunities === 0) return [];

    const sorted = Array.from(missingCounts.entries()).sort(
      (a, b) => b[1] - a[1]
    );

    return sorted.slice(0, topN).map(([skill, count]) => {
      const frequencyPercentage = Math.round(
        (count / totalOpportunities) * 100
      );
      let impactScore: "High" | "Medium" | "Low" = "Low";

      if (frequencyPercentage >= 20) {
        impactScore = "High";
      } else if (frequencyPercentage >= 10) {
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