export interface UnifiedJobTag {
  name: string;
  isMandatory?: boolean;
}

export type SupportedPortal = "hirist" | "remotive" | "arbeitnow";

export type EmploymentType = "full-time" | "part-time" | "internship" | "contract" | "any";

export interface StandardJob {
  id: string;
  sourcePortal: SupportedPortal;
  title: string;
  company: string;
  url: string;
  description?: string;
  minExp: number;
  maxExp: number;
  locations: string[];
  isRemote: boolean;
  jobType?: EmploymentType;
  minSalary?: number; 
  maxSalary?: number;
  currency?: string;
  tags: UnifiedJobTag[];
}