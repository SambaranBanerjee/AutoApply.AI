import { extractMatchingKeywords, hasMatchingKeyword } from "../../helper/keywords";
import { IndeedLocators } from "./Locators/indeedLocators"
import { Page } from "@playwright/test"

export interface JobCardData {
    title: string;
    company: string;
    url: string;
    matchedKeywords: string[];
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
        const searchInput = this.locators.searchInput();
        await searchInput.fill(jobTitle);
        await this.locators.findJobsButton().click();
        await this.page.waitForLoadState("domcontentloaded");
        await this.locators.cookieButton().click();
    }

    async scrapeFilteredJobCards() : Promise<JobCardData[]> {
        const cards = this.locators.jobCards();
        await cards.first().waitFor({ state : "visible" });

        const count = await cards.count();
        const qualifiedJobs : JobCardData[] = [];
        const descriptionLocator = this.locators.jobDescription();

        for (let i = 0; i < count; i++) {
            const card = cards.nth(i);
            const titleCard = this.locators.jobCardTitle(card);

            if ((await titleCard.count()) === 0) continue;

            await titleCard.click();

            await descriptionLocator.waitFor({ state : "visible"});
            const descriptionText = await descriptionLocator.innerText();

            if (!hasMatchingKeyword(descriptionText)) {
                continue;
            }

            const companyElement = this.locators.jobCardCompany(card);
            const title = (await titleCard.innerText()).trim();
            const company = (await companyElement.innerText()).trim();
            const relativeHref = await titleCard.getAttribute("href");
            const url = relativeHref ? new URL(relativeHref, this.page.url()).toString() : "";

            const matchedKeywords = extractMatchingKeywords(descriptionText);

            qualifiedJobs.push({
                title,
                company,
                url,
                matchedKeywords,
            });
        }

        return qualifiedJobs;
    }
}