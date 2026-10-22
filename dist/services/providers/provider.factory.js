"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderFactory = void 0;
const arbeitnow_provider_1 = require("./arbeitnow.provider");
const hirist_provider_1 = require("./hirist.provider");
const remotive_provider_1 = require("./remotive.provider");
class ProviderFactory {
    static providers = new Map([
        ["hirist", new hirist_provider_1.HiristProvider()],
        ["remotive", new remotive_provider_1.RemotiveProvider()],
        ["arbeitnow", new arbeitnow_provider_1.ArbeitnowProvider()],
    ]);
    /**
    * Retrieves a specific job provider by name.
    */
    static getProvider(portal) {
        const provider = this.providers.get(portal);
        if (!provider) {
            throw new Error(`Unsupported portal provider: "${portal}". Supported: ${Array.from(this.providers.keys()).join(", ")}`);
        }
        return provider;
    }
    /**
   * Dispatches searches based on portal selection ("hirist", "remotive", "arbeitnow", or "all").
   */
    static async search(portal, options) {
        if (portal !== "all") {
            const provider = this.getProvider(portal);
            return provider.searchJobs(options);
        }
        // Running all providers concurrently and aggregate the results
        const providerInstances = Array.from(this.providers.values());
        const tasks = providerInstances.map((provider) => provider.searchJobs(options).catch((err) => {
            console.error(`[ProviderFactory] Error in ${provider.portalName}:`, err);
            return [];
        }));
        const results = await Promise.all(tasks);
        const combined = results.flat();
        const seenUrls = new Set();
        return combined.filter((job) => {
            if (seenUrls.has(job.url)) {
                return false;
            }
            seenUrls.add(job.url);
            return true;
        });
    }
}
exports.ProviderFactory = ProviderFactory;
