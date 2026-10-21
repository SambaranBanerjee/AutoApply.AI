import { EmploymentType } from "./job";

export type ExperienceMode = "strict" | "moderate" | "any";

export interface UserProfile {
  skills: string[];
  yearsOfExperience: number;
  preferredLocations?: string[];
  remoteOnly?: boolean;
  experienceMode?: ExperienceMode;
  
  targetRole?: string; 
  jobType?: EmploymentType;
  minSalary?: number;
  includeUndisclosedSalary?: boolean; // Default true so jobs hiding salary aren't dropped
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
    jobType?: EmploymentType;
  };
  score: number;
  matchedSkills: string[];
  missingMandatorySkills: string[];
  isExperienceMatch: boolean;
}
