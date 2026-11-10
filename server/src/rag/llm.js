import Groq from 'groq-sdk';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let groqClient = null;

if (env.GROQ_API_KEY) {
  groqClient = new Groq({ apiKey: env.GROQ_API_KEY });
}

export async function rewriteQueryIfFollowUp(query, recentHistory = []) {
  if (!groqClient || !recentHistory || recentHistory.length === 0) {
    return query;
  }

  try {
    const historySummary = recentHistory
      .slice(-4)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const response = await groqClient.chat.completions.create({
      model: env.GROQ_QUERY_REWRITE_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a search query rewriter. Given the conversation history and a user follow-up question, rephrase the follow-up question into a single, standalone search query that contains all necessary context for document retrieval. Return ONLY the rewritten query without any explanation or quotes. If the question is already standalone, return it as-is.',
        },
        {
          role: 'user',
          content: `History:\n${historySummary}\n\nFollow-up question:\n${query}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 100,
    });

    const rewritten = response.choices[0]?.message?.content?.trim();
    if (rewritten && rewritten.length > 0) {
      logger.info('Rewrote follow-up query for search', { original: query, rewritten });
      return rewritten;
    }
  } catch (error) {
    logger.warn('Query rewriting failed; falling back to original query', {
      error: String(error),
    });
  }

  return query;
}

export async function* streamChatCompletion(messages, options = {}) {
  const model = options.model || env.GROQ_MODEL;
  const temperature = options.temperature ?? 0.7;

  if (!groqClient) {
    logger.warn('Groq API key not set; yielding simulated fallback stream');
    const fallbackText =
      'This is a local simulated response from Personal Knowledge Chat. To connect real AI completions, set GROQ_API_KEY in your .env file.';
    const words = fallbackText.split(' ');
    for (const word of words) {
      await new Promise((resolve) => setTimeout(resolve, 40));
      yield word + ' ';
    }
    return { promptTokens: 10, completionTokens: words.length };
  }

  const stream = await groqClient.chat.completions.create({
    model,
    messages,
    temperature,
    stream: true,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content || '';
    if (text) {
      yield text;
    }
  }

  return { promptTokens: undefined, completionTokens: undefined };
}
