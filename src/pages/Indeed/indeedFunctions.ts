import { IndeedLocators } from "./Locators/indeedLocators"
import { Page } from "@playwright/test"

export interface JobCardData {
    title: string;
    company: string;
    url: string;
}

export class IndeedFunctions {
    private locators : IndeedLocators;

    constructor(private page : Page) {
        this.locators = new IndeedLocators(page);
    }

    async navigateTo(url:string) : Promise<void> {
        await this.page.addInitScript(() => {
            Object.defineProperty(navigator, "webdriver", {
                get: () => undefined,
            });
        });

        await this.page.goto(url, { waitUntil : "domcontentloaded"});
    }

    async searchJob(jobTitle:string) : Promise<void> {
        const searchInput = this.locators.searchInput()
        await searchInput.fill(jobTitle);
        await this.locators.findJobsButton().click()
        await this.page.waitForLoadState("domcontentloaded");
    }

    async scrapeJobCards(): Promise<JobCardData[]> {
        const cards = this.locators.jobCards();
        await cards.first().waitFor({ state : "visible"});
       
        const count = await cards.count();
        const scrapedJobs: JobCardData[] = [];
        
        for (let index = 0; index < count; index++) {
            const card = cards.nth(index);
            const titleElement = this.locators.jobCardTitle(card);
            const companyElement = this.locators.jobCardCompany(card);

            if (await titleElement.count() === 0) continue;

            const title = (await titleElement.innerText()).trim();
            const company = (await companyElement.innerText()).trim();
            const relativeHref = await titleElement.getAttribute("href");
            
            const url = relativeHref ? new URL(relativeHref, this.page.url()).toString() : "";

            scrapedJobs.push({ title, company, url});
        }
        
        return scrapedJobs;
    }
}