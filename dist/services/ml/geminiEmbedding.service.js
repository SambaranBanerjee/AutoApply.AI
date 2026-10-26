"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiEmbeddingService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class GeminiEmbeddingService {
    static ai = null;
    static modelName = "gemini-embedding-001";
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
                console.warn("[GeminiEmbeddingService] Could not initialize GoogleGenAI:", err.message);
                return null;
            }
        }
        return this.ai;
    }
    /**
     * Sanitizes raw resume or job text by removing control characters,
     * non-standard bullet symbols, and excessive whitespace.
     */
    static sanitize(text, maxLength) {
        if (!text)
            return "";
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
    static async getSingleEmbedding(text) {
        try {
            const ai = await this.getClient();
            if (!ai || !ai.models) {
                return null;
            }
            const sanitized = this.sanitize(text, 2048);
            if (!sanitized)
                return null;
            const response = await ai.models.embedContent({
                model: this.modelName,
                contents: sanitized,
            });
            return response.embeddings?.[0]?.values || null;
        }
        catch (err) {
            console.warn("[GeminiEmbeddingService] Single embed error, falling back to lexical:", err.message);
            return null;
        }
    }
    /**
     * Batch embeds candidate job descriptions in 1 single HTTP request.
     */
    static async getBatchEmbeddings(texts) {
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
            return response.embeddings.map((e) => e?.values || null);
        }
        catch (err) {
            console.warn("[GeminiEmbeddingService] Batch embed error, falling back to lexical:", err.message);
            return texts.map(() => null);
        }
    }
    /**
     * Mathematical Cosine Similarity: (A . B) / (||A|| * ||B||)
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
        if (isNaN(similarity) || !isFinite(similarity)) {
            return 0;
        }
        return Math.max(0, Math.min(1, similarity));
    }
}
exports.GeminiEmbeddingService = GeminiEmbeddingService;
