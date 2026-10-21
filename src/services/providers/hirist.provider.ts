import { BaseJobProvider } from "./base.provider";
import { StandardJob, SupportedPortal } from "../../types/job";
import { SearchOptions } from "../../types/provider";
import { HiristJobItem, HiristSearchResponse } from "../../types/hirist";

export class HiristProvider extends BaseJobProvider {
  readonly portalName: SupportedPortal = "hirist";
  private baseUrl = "https://gladiator.hirist.tech/job/search";

  constructor() {
    super({
      "accept": "application/json, text/plain, */*",
      "accept-language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      "origin": "https://www.hirist.tech",
      "pragma": "no-cache",
      "referer": "https://www.hirist.tech/",
      "sec-ch-ua": '"Chromium";v="154", "Google Chrome";v="154", "Not A(Brand";v="99"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36",
    });
  }

  async searchJobs(options: SearchOptions): Promise<StandardJob[]> {
    const queryKeywords = options.keywords.slice(0, 4);

    if (options.userExperience !== undefined && options.userExperience <= 1 && !queryKeywords.includes("Junior")) {
      queryKeywords.push("Junior");
    }

    const pagesToFetch = Math.max(1, Math.min(options.pageDepth || 1, 5)); // Bound between 1 and 5
    const searchPromises: Promise<HiristSearchResponse>[] = [];

    for (const kw of queryKeywords) {
      for (let page = 0; page < pagesToFetch; page++) {
        searchPromises.push(
          this.client.get<HiristSearchResponse>(this.baseUrl, {
            params: {
              query: kw,
              page: page,
              size: options.limit || 20,
            },
          })
        );
      }
    }

    const settledResults = await Promise.allSettled(searchPromises);
    const rawJobs: HiristJobItem[] = [];

    for (const res of settledResults) {
      if (res.status === "fulfilled" && Array.isArray(res.value?.data)) {
        rawJobs.push(...res.value.data);
      }
    }

    const mappedJobs: StandardJob[] = rawJobs.map((item) => {
    const isIntern = /\b(intern|internship|trainee)\b/i.test(item.title);
    
    return {
        id: `hirist-${item.id}`,
        sourcePortal: "hirist",
        title: item.title,
        company: item.companyData?.companyName || "Unknown",
        url: item.jobDetailUrl,
        minExp: item.min ?? 0,
        maxExp: item.max ?? 0,
        locations: (item.locations || []).map((loc) => loc.name),
        isRemote: item.workFromHome === 1,
        jobType: isIntern ? "internship" : "full-time",
        minSalary: item.minSal > 0 ? item.minSal : undefined,
        maxSalary: item.maxSal > 0 ? item.maxSal : undefined,
        currency: "INR",
        tags: (item.tags || []).map((tag) => ({
          name: tag.name,
          isMandatory: tag.isMandatory,
        })),
      };
    });

    return this.deduplicateJobs(mappedJobs);
  }
}