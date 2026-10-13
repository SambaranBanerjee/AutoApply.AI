import { ApiClient } from "../services/apiClient";

export class HiristService {
    private client : ApiClient;
    private baseUrl = "https://gladiator.hirist.tech/job/search";

    constructor() {
        this.client = new ApiClient({
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

    async searchJobs(query: string, page = 0, size = 0) : Promise<any> {
        return this.client.get<any>(
            this.baseUrl,
            {
                params: {
                query : query,
                page: page,
                posting: 0,
                industry: "",
                size: size,
                ref: "homepage",
                referenceText: "homepage",
                refPool: '{"ref":"homepage"}',
            },
        });
    }
}