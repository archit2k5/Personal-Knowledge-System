import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5174'),

  MONGODB_URI: z.string().default('mongodb://localhost:27017/pks'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_ACCESS_SECRET: z.string().min(16).default('dev_access_secret_change_in_production_min32chars!'),
  JWT_REFRESH_SECRET: z.string().min(16).default('dev_refresh_secret_change_in_production_min32chars!'),
  ACCESS_TTL: z.string().default('15m'),
  REFRESH_TTL: z.string().default('7d'),

  MAILTRAP_HOST: z.string().default('sandbox.smtp.mailtrap.io'),
  MAILTRAP_PORT: z.coerce.number().default(2525),
  MAILTRAP_USER: z.string().default(''),
  MAILTRAP_PASS: z.string().default(''),
  EMAIL_FROM: z.string().default('Personal Knowledge System <no-reply@personalknowledge.local>'),
  EMAIL_VERIFY_TTL: z.string().default('24h'),
  PASSWORD_RESET_TTL: z.string().default('1h'),
  EMAIL_RESEND_COOLDOWN_SEC: z.coerce.number().default(60),

  GROQ_API_KEY: z.string().default(''),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  GROQ_QUERY_REWRITE_MODEL: z.string().default('llama-3.1-8b-instant'),

  EMBEDDING_PROVIDER: z.string().default('@huggingface/transformers'),
  EMBEDDING_MODEL: z.string().default('all-MiniLM-L6-v2'),
  EMBEDDING_DIM: z.coerce.number().default(384),

  QDRANT_URL: z.string().default('http://localhost:6333'),
  QDRANT_API_KEY: z.string().default(''),
  QDRANT_COLLECTION: z.string().default('kb_chunks'),

  R2_ACCOUNT_ID: z.string().default(''),
  R2_ACCESS_KEY_ID: z.string().default(''),
  R2_SECRET_ACCESS_KEY: z.string().default(''),
  R2_BUCKET: z.string().default('kb-uploads'),
  R2_ENDPOINT: z.string().optional(),
  R2_PRESIGN_TTL: z.coerce.number().default(300),

  MAX_UPLOAD_MB: z.coerce.number().default(20),
  RAG_TOP_K: z.coerce.number().default(6),
  RAG_MIN_SCORE: z.coerce.number().default(0.5),
  HISTORY_WINDOW: z.coerce.number().default(10),
  CHUNK_TOKENS: z.coerce.number().default(600),
  CHUNK_OVERLAP: z.coerce.number().default(80),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('Invalid environment variables:');
  console.error(parseResult.error.format());
  process.exit(1);
}

export const env = parseResult.data;
