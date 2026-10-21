import { BaseJobProvider } from "./base.provider";
import { StandardJob, SupportedPortal } from "../../types/job";
import { SearchOptions } from "../../types/provider";

interface ArbeitnowJob {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  job_types: string[];
  location: string;
}

interface ArbeitnowApiResponse {
  data: ArbeitnowJob[];
  links: { next?: string };
  meta: { current_page: number };
}

export class ArbeitnowProvider extends BaseJobProvider {
  readonly portalName: SupportedPortal = "arbeitnow";
  private baseUrl = "https://www.arbeitnow.com/api/job-board-api";

  constructor() {
    super({
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });
  }

  async searchJobs(options: SearchOptions): Promise<StandardJob[]> {
    try {
      const response = await this.client.get<ArbeitnowApiResponse>(this.baseUrl);
      const rawJobs = response.data || [];

      const keywordSet = new Set(options.keywords.map((k) => k.toLowerCase()));

      const mappedJobs: StandardJob[] = rawJobs
        .map((item) => {
          const cleanDesc = this.stripHtml(item.description);
          return {
            id: `arbeitnow-${item.slug}`,
            sourcePortal: "arbeitnow" as SupportedPortal,
            title: item.title,
            company: item.company_name,
            url: item.url,
            description: cleanDesc,
            minExp: 0,
            maxExp: 10,
            locations: item.location ? [item.location] : ["Remote"],
            isRemote: item.remote,
            tags: (item.tags || []).map((tag) => ({
              name: tag,
              isMandatory: false,
            })),
          };
        })
        .filter((job) => {
          const titleMatches = options.keywords.some((kw) =>
            job.title.toLowerCase().includes(kw.toLowerCase())
          );
          const tagMatches = job.tags.some((tag) =>
            keywordSet.has(tag.name.toLowerCase())
          );
          return titleMatches || tagMatches;
        });

      return this.deduplicateJobs(mappedJobs);
    } catch (error) {
      console.error("[ArbeitnowProvider] Failed to fetch listings:", error);
      return [];
    }
  }
}