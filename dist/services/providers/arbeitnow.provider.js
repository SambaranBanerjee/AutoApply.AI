"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArbeitnowProvider = void 0;
const base_provider_1 = require("./base.provider");
class ArbeitnowProvider extends base_provider_1.BaseJobProvider {
    portalName = "arbeitnow";
    baseUrl = "https://www.arbeitnow.com/api/job-board-api";
    constructor() {
        super({
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        });
    }
    async searchJobs(options) {
        const pagesToFetch = Math.max(1, Math.min(options.pageDepth || 1, 3));
        const pagePromises = [];
        for (let page = 1; page <= pagesToFetch; page++) {
            pagePromises.push(this.client.get(this.baseUrl, {
                params: { page },
            }));
        }
        const settledResults = await Promise.allSettled(pagePromises);
        const rawJobs = [];
        for (const res of settledResults) {
            if (res.status === "fulfilled" && Array.isArray(res.value?.data)) {
                rawJobs.push(...res.value.data);
            }
        }
        const keywordSet = new Set(options.keywords.map((k) => k.toLowerCase()));
        const mappedJobs = rawJobs
            .map((item) => {
            const cleanDesc = this.stripHtml(item.description);
            return {
                id: `arbeitnow-${item.slug}`,
                sourcePortal: "arbeitnow",
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
            const titleMatches = options.keywords.some((kw) => job.title.toLowerCase().includes(kw.toLowerCase()));
            const tagMatches = job.tags.some((tag) => keywordSet.has(tag.name.toLowerCase()));
            return titleMatches || tagMatches;
        });
        return this.deduplicateJobs(mappedJobs);
    }
}
exports.ArbeitnowProvider = ArbeitnowProvider;
