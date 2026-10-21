import { StandardJob, SupportedPortal } from "../../types/job";
import { IJobProvider, PortalSelection, SearchOptions } from "../../types/provider";
import { ArbeitnowProvider } from "./arbeitnow.provider";
import { HiristProvider } from "./hirist.provider";
import { RemotiveProvider } from "./remotive.provider";

export class ProviderFactory {
    private static providers = new Map<SupportedPortal, IJobProvider>([
        ["hirist", new HiristProvider()],
        ["remotive", new RemotiveProvider()],
        ["arbeitnow", new ArbeitnowProvider()],
    ]);

    /**
    * Retrieves a specific job provider by name.
    */
    static getProvider(portal: SupportedPortal): IJobProvider {
        const provider = this.providers.get(portal);
        if (!provider) {
            throw new Error(`Unsupported portal provider: "${portal}". Supported: ${Array.from(this.providers.keys()).join(", ")}`);
        }
        return provider;
    }

    /**
   * Dispatches searches based on portal selection ("hirist", "remotive", "arbeitnow", or "all").
   */
    static async search(
        portal: PortalSelection,
        options: SearchOptions
    ): Promise<StandardJob[]> {
        if (portal !== "all") {
            const provider = this.getProvider(portal);
            return provider.searchJobs(options);
        }

        // Running all providers concurrently and aggregate the results
        const providerInstances = Array.from(this.providers.values());
        const tasks = providerInstances.map((provider) => 
            provider.searchJobs(options).catch((err) => {
                console.error(`[ProviderFactory] Error in ${provider.portalName}:`, err);
                return [] as StandardJob[];
            })
        );

        const results = await Promise.all(tasks);
        const combined = results.flat();

        const seenUrls = new Set<string>();
        return combined.filter((job) => {
            if (seenUrls.has(job.url)) {
                return false;
            }
            seenUrls.add(job.url);
            return true;
        });
    }
}