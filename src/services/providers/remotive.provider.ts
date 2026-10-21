import { BaseJobProvider } from "./base.provider";
import { EmploymentType, StandardJob, SupportedPortal } from "../../types/job";
import { SearchOptions } from "../../types/provider";

interface RemotiveJob {
  id: number;
  url: string;
  title: string;
  company_name: string;
  category: string;
  tags: string[];
  job_type: string;
  candidate_required_location: string;
  salary: string;
  description: string;
}

interface RemotiveApiResponse {
  jobs: RemotiveJob[];
}

export class RemotiveProvider extends BaseJobProvider {
  readonly portalName: SupportedPortal = "remotive";
  private baseUrl = "https://remotive.com/api/remote-jobs";

  constructor() {
    super({
      "Accept": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });
  }

  async searchJobs(options: SearchOptions): Promise<StandardJob[]> {
    const queryKeywords = options.keywords.slice(0, 3);

    const searchPromises = queryKeywords.map((kw) =>
      this.client.get<RemotiveApiResponse>(this.baseUrl, {
        params: {
          search: kw,
          limit: options.limit || 25,
        },
      })
    );

    const settledResults = await Promise.allSettled(searchPromises);
    const rawJobs: RemotiveJob[] = [];

    for (const res of settledResults) {
      if (res.status === "fulfilled" && Array.isArray(res.value?.jobs)) {
        rawJobs.push(...res.value.jobs);
      }
    }

    const mappedJobs: StandardJob[] = rawJobs.map((item) => {
    const cleanDesc = this.stripHtml(item.description);
    const location = item.candidate_required_location || "Worldwide";

    let type: EmploymentType = "full-time";
    const rawType = (item.job_type || "").toLowerCase();
    if (rawType.includes("contract")) type = "contract";
    else if (rawType.includes("part_time") || rawType.includes("part-time")) type = "part-time";
    else if (rawType.includes("intern")) type = "internship";

    // Basic salary extraction if text like "$80,000" or "$80k" exists
    let minSalary: number | undefined;
    if (item.salary) {
      const salaryMatch = item.salary.match(/\$?(\d+)(?:,(\d{3}))?(?:k)?/i);
      if (salaryMatch) {
        let num = parseInt(salaryMatch[1], 10);
        if (item.salary.toLowerCase().includes("k")) num *= 1000;
        minSalary = num;
      }
    }

    return {
      id: `remotive-${item.id}`,
      sourcePortal: "remotive",
      title: item.title,
      company: item.company_name,
      url: item.url,
      description: cleanDesc,
      minExp: 0,
      maxExp: 10,
      locations: [location],
      isRemote: true,
      jobType: type,
      minSalary,
      currency: "USD",
      tags: (item.tags || []).map((tag) => ({
        name: tag,
        isMandatory: false,
      })),
    };
  });

    return this.deduplicateJobs(mappedJobs);
  }
}