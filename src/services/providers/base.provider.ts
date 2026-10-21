import { StandardJob, SupportedPortal } from "../../types/job";
import { IJobProvider, SearchOptions } from "../../types/provider";
import { ApiClient } from "../http/apiClient";

export abstract class BaseJobProvider implements IJobProvider {
    abstract readonly portalName: SupportedPortal;
    protected client: ApiClient;

    constructor(defaultHeaders: Record<string, string> = {}) {
        this.client = new ApiClient(defaultHeaders);
    }

    /**
     * Must be implemented by concrete provider subclasses.
     */
    abstract searchJobs(options: SearchOptions): Promise<StandardJob[]>;

    /**
     * Helper utility to deduplicate an array of StandardJob items by ID.
     */
    protected deduplicateJobs(jobs: StandardJob[]): StandardJob[] {
        const jobMap = new Map<string, StandardJob>();
        for (const job of jobs) {
            if (!jobMap.has(job.id)) {
                jobMap.set(job.id, job);
            }
        }
        return Array.from(jobMap.values());
    }

    /**
     * Strips HTML markup from raw descriptions into clean plain text.
     */
    protected stripHtml(html: string): string {
        if (!html) return "";
        return html
        .replace(/<[^>]*>?/gm, " ")
        .replace(/\s+/g, " ")
        .trim();
    }
}