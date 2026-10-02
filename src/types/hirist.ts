export interface HiristTag {
  id: number;
  name: string;
  isMandatory: boolean;
}

export interface HiristLocation {
  id: number;
  name: string;
}

export interface HiristJobItem {
  id: number;
  title: string;
  min: number; // minimum experience in years
  max: number; // maximum experience in years
  jobDetailUrl: string;
  workFromHome: number; // 0 or 1
  tags: HiristTag[];
  locations: HiristLocation[];
  companyData?: {
    companyName?: string;
  };
}

export interface HiristSearchResponse {
  data: HiristJobItem[];
  page: string;
  totalJobs: number;
  hasMore: boolean;
}