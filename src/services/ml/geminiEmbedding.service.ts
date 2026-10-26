import dotenv from "dotenv";

dotenv.config();

export class GeminiEmbeddingService {
    private static ai: any = null;
    private static modelName = "gemini-embedding-001";

    private static async getClient(): Promise<any> {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return null;
        }

        if (!this.ai) {
            try {
                const { GoogleGenAI } = await import("@google/genai");
                this.ai = new GoogleGenAI({ apiKey });
            } catch (err) {
                console.warn("[GeminiEmbeddingService] Could not initialize GoogleGenAI:", (err as Error).message);
                return null;
            }
        }

        return this.ai;
    }

    /**
     * Sanitizes raw resume or job text by removing control characters,
     * non-standard bullet symbols, and excessive whitespace.
     */
    private static sanitize(text: string, maxLength: number): string {
        if (!text) return "";
        return text
            .replace(/[\x00-\x1F\x7F-\x9F]/g, " ")
            .replace(/[•●\u2022\u25E6\u2023\u25CF\u25CB]/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, maxLength);
    }

    /**
     * Generates a dense embedding vector for a single text string.
     */
    static async getSingleEmbedding(text: string): Promise<number[] | null> {
        try {
            const ai = await this.getClient();
            if (!ai || !ai.models) {
                return null;
            }

            const sanitized = this.sanitize(text, 2048);
            if (!sanitized) return null;

            const response = await ai.models.embedContent({
                model: this.modelName,
                contents: sanitized,
            });

            return response.embeddings?.[0]?.values || null;
        } catch (err) {
            console.warn(
                "[GeminiEmbeddingService] Single embed error, falling back to lexical:",
                (err as Error).message
            );
            return null;
        }
    }

    /**
     * Batch embeds candidate job descriptions in 1 single HTTP request.
     */
    static async getBatchEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
        if (!texts || texts.length === 0) {
            return [];
        }

        try {
            const ai = await this.getClient();
            if (!ai || !ai.models) {
                return texts.map(() => null);
            }

            const sanitizedTexts = texts.map((t) => this.sanitize(t, 1024));

            const response = await ai.models.embedContent({
                model: this.modelName,
                contents: sanitizedTexts,
            });

            if (!response.embeddings || response.embeddings.length === 0) {
                return texts.map(() => null);
            }

            return response.embeddings.map((e: { values?: number[] }) => e?.values || null);
        } catch (err) {
            console.warn(
                "[GeminiEmbeddingService] Batch embed error, falling back to lexical:",
                (err as Error).message
            );
            return texts.map(() => null);
        }
    }

    /**
     * Mathematical Cosine Similarity: (A . B) / (||A|| * ||B||)
     */
    static cosineSimilarity(vecA: number[] | null, vecB: number[] | null): number {
        if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
            return 0;
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        if (normA === 0 || normB === 0) {
            return 0;
        }

        const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
        if (isNaN(similarity) || !isFinite(similarity)) {
            return 0;
        }

        return Math.max(0, Math.min(1, similarity));
    }
}