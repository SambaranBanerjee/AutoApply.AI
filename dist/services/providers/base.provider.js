"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseJobProvider = void 0;
const apiClient_1 = require("../http/apiClient");
class BaseJobProvider {
    client;
    constructor(defaultHeaders = {}) {
        this.client = new apiClient_1.ApiClient(defaultHeaders);
    }
    /**
     * Helper utility to deduplicate an array of StandardJob items by ID.
     */
    deduplicateJobs(jobs) {
        const jobMap = new Map();
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
    stripHtml(html) {
        if (!html)
            return "";
        return html
            .replace(/<[^>]*>?/gm, " ")
            .replace(/\s+/g, " ")
            .trim();
    }
}
exports.BaseJobProvider = BaseJobProvider;
