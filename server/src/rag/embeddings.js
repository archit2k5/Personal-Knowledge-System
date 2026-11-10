import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let extractorPromise = null;

/**
 * Lazy loads and caches the @huggingface/transformers feature-extraction pipeline.
 */
async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline } = await import('@huggingface/transformers');
      const modelId = env.EMBEDDING_MODEL.includes('/')
        ? env.EMBEDDING_MODEL
        : `Xenova/${env.EMBEDDING_MODEL}`;

      logger.info('Loading @huggingface/transformers embedding pipeline', { model: modelId });
      return await pipeline('feature-extraction', modelId);
    })();
  }
  return extractorPromise;
}

/**
 * Generates a normalized 384-dimensional dense vector for a single text.
 */
export async function generateEmbedding(text) {
  const cleanText = text.replace(/\s+/g, ' ').trim();
  if (!cleanText) {
    return new Array(env.EMBEDDING_DIM).fill(0);
  }

  try {
    const extractor = await getExtractor();
    const output = await extractor(cleanText, {
      pooling: 'mean',
      normalize: true,
    });

    const vector = Array.from(output.data);
    return vector.slice(0, env.EMBEDDING_DIM);
  } catch (error) {
    logger.warn('Failed to generate embedding with @huggingface/transformers; using fallback vector', {
      error: String(error),
    });

    // Fallback pseudo-embedding
    const embedding = new Array(env.EMBEDDING_DIM).fill(0);
    for (let i = 0; i < cleanText.length; i++) {
      const charCode = cleanText.charCodeAt(i);
      embedding[i % env.EMBEDDING_DIM] += charCode * 0.001;
    }

    const magnitude = Math.sqrt(embedding.reduce((acc, val) => acc + val * val, 0));
    return magnitude > 0 ? embedding.map((val) => val / magnitude) : embedding;
  }
}

/**
 * Generates embeddings for an array of texts.
 */
export async function generateEmbeddings(texts) {
  if (!texts || texts.length === 0) return [];

  try {
    const extractor = await getExtractor();
    const cleanTexts = texts.map((t) => t.replace(/\s+/g, ' ').trim() || ' ');

    const output = await extractor(cleanTexts, {
      pooling: 'mean',
      normalize: true,
    });

    // output.tolist() or chunking Float32Array by dimension
    if (typeof output.tolist === 'function') {
      return output.tolist();
    }

    // Fallback slice from flat Float32Array
    const flat = Array.from(output.data);
    const results = [];
    for (let i = 0; i < cleanTexts.length; i++) {
      results.push(flat.slice(i * env.EMBEDDING_DIM, (i + 1) * env.EMBEDDING_DIM));
    }
    return results;
  } catch {
    // If batch extraction fails, fall back to individual generation
    return Promise.all(texts.map((t) => generateEmbedding(t)));
  }
}
