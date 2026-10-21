export interface RequestOptions {
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean | undefined>;
}

export class ApiClient {
    private defaultHeaders : Record<string, string>;

    constructor(defaultHeaders: Record<string, string> = {}) {
        this.defaultHeaders = defaultHeaders
    }

    /**
   * Performs a generic GET request.
   * @param endpoint Base URL or path.
   * @param options Query parameters and additional/override headers.
   * @returns Parsed JSON response of type T.
   */
    async get<T>(endpoint: string, options: RequestOptions = {}): Promise<T>{
        const url = new URL(endpoint);
        
        if (options.params) {
            Object.entries(options.params).forEach(([key, value]) => {
                if (value != undefined) {
                    url.searchParams.append(key, String(value));
                }
            });
        }

        const mergedHeaders = {
            ...this.defaultHeaders,
            ...(options.headers || {}),
        };

        const response = await fetch(url.toString(), {
            headers : mergedHeaders,
            method: "GET",
        })

        if (!response.ok) {
            const errorBody = await response.text().catch(() => "");
            throw new Error(
                `[ApiClient] GET ${url.toString()} failed with status ${response.status}: ${errorBody}`
            );
        }

        return (await response.json()) as T;
    }
}
