"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiEmbeddingService = void 0;
// in src/services/ml/geminiEmbedding.service.ts
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class GeminiEmbeddingService {
    static ai = null;
    static modelName = "text-embedding-004";
    static async getClient() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return null;
        }
        if (!this.ai) {
            try {
                const { GoogleGenAI } = await import("@google/genai");
                this.ai = new GoogleGenAI({ apiKey });
            }
            catch (err) {
                console.warn("[GeminiEmbeddingService] Could not load @google/genai:", err.message);
                return null;
            }
        }
        return this.ai;
    }
    /**
     * Generates a 768-dimensional embedding for a single text snippet (e.g. resume).
     * Returns null if API key is not present or an error occurs.
     */
    static async getSingleEmbedding(text) {
        const ai = await this.getClient();
        if (!ai)
            return null;
        try {
            const sanitized = text.replace(/\s+/g, " ").trim().slice(0, 2000);
            const response = await ai.models.embedContent({
                model: this.modelName,
                contents: sanitized,
            });
            return response.embeddings?.[0]?.values || null;
        }
        catch (err) {
            console.warn("[GeminiEmbeddingService] Single embed error, falling back:", err.message);
            return null;
        }
    }
    /**
     * Batch embeds up to 100 job descriptions in a single API call.
     */
    static async getBatchEmbeddings(texts) {
        const ai = await this.getClient();
        if (!ai || texts.length === 0) {
            return texts.map(() => null);
        }
        try {
            const sanitizedTexts = texts.map((t) => t.replace(/\s+/g, " ").trim().slice(0, 1000));
            const response = await ai.models.embedContent({
                model: this.modelName,
                contents: sanitizedTexts,
            });
            if (!response.embeddings || response.embeddings.length === 0) {
                return texts.map(() => null);
            }
            // Explicitly type `e` to avoid implicit any under strict mode
            return response.embeddings.map((e) => e.values || null);
        }
        catch (err) {
            console.warn("[GeminiEmbeddingService] Batch embed error, falling back:", err.message);
            return texts.map(() => null);
        }
    }
    /**
     * Vector Cosine Similarity: (A . B) / (||A|| * ||B||)
     */
    static cosineSimilarity(vecA, vecB) {
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
        return Math.max(0, Math.min(1, similarity));
    }
}
exports.GeminiEmbeddingService = GeminiEmbeddingService;
