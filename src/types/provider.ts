import { SupportedPortal, StandardJob } from "./job";

export type PortalSelection = SupportedPortal | "all";

export interface SearchOptions {
  keywords: string[];
  limit?: number;
  pageDepth?: number;
  userExperience?: number;
  locations?: string[];
  remoteOnly?: boolean;
}

export interface IJobProvider {
  readonly portalName: SupportedPortal;
  /**
   * Queries the platform using the given search criteria and returns normalized StandardJob items.
   */
  searchJobs(options: SearchOptions): Promise<StandardJob[]>;
}