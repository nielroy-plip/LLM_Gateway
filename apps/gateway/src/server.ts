import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { sanitizePII } from './middlewares/piiSanitizer';
import { verifyApiKey } from './middlewares/authMiddleware';
import { ResilienceModule } from './resilience/circuitBreaker';
import { evaluatePromptRoute, RoutingStrategy } from './routing/promptRouter';
import { ChatMessage } from './services/ollamaService';
import { CloudLlmService } from './services/cloudLlmService';
import { metricsStore, ProviderType } from './observability/metricsStore';

const app = Fastify({ logger: true });

app.register(cors, {
  origin: '*'
});

// Rate Limiting global e por API key
app.register(rateLimit, {
  max: 30, // Máximo de 30 requisições por minuto por cliente
  timeWindow: '1 minute',
  keyGenerator: (request) => {
    return request.headers.authorization || request.ip;;
  },
  errorResponseBuilder: (_request, context) => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: `Limite de cotas excedito (${context.max} reqs/min). Tente novamente em ${context.after}.`
  })
});

interface ChatCompletionBody {
  messages: ChatMessage[];
  routing?: RoutingStrategy; // 'auto' | 'local' | 'cloud'
}

app.post<{ Body: ChatCompletionBody }>(
  '/v1/chat/completions',
  { preHandler: [verifyApiKey] },
  async (request, reply) => {
    const startTime = performance.now();
    const { messages, routing = 'auto' } = request.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return reply.status(400).send({ error: 'O campo messages é obrigatório e deve ser um array.' });
    }

    //1. Sanitização de PII
    let anyPiiSanitized = false;
    const allDetectedTypes = new Set<string>();

    const sanitizedMessages: ChatMessage[] = messages.map((msg) => {
      const result = sanitizePII(msg.content);
      if (result.wasSanitized) {
        anyPiiSanitized = true;
        result.detectedTypes.forEach((t) => allDetectedTypes.add(t));
      }
      return {
        role: msg.role,
        content: result.sanitizedText
      };
    });

    // 2. Roteamento Interligente por complexidade
    const decision = evaluatePromptRoute(sanitizedMessages, routing);

    let finalContent = '';
    let finalProvider: ProviderType = 'OLLAMA_LOCAL';

    if (decision.target === 'CLOUD_DIRECT') {
      finalContent = await CloudLlmService.generateCompletion(sanitizedMessages);
      finalProvider = 'CLOUD_DIRECT';
    } else {
      const execution = await ResilienceModule.executeChat(sanitizedMessages);
      finalContent = execution.content;
      finalProvider = execution.provider;
    }

    const latencyMs = Math.round(performance.now() - startTime);
    const lastUserMessage =
      [...sanitizedMessages].reverse().find((m) => m.role === 'user')?.content || '';

    // 3. Registro de telemetria
    metricsStore.recordRequest({
      provider: finalProvider,
      routingReason: decision.reason,
      latencyMs,
      piiSanitized: anyPiiSanitized,
      piiTypes: Array.from(allDetectedTypes),
      promptText: lastUserMessage,
      responseText: finalContent
    });

    return reply.send({
      status: 'success',
      providerUsed: finalProvider,
      routingReason: decision.reason,
      latencyMs,
      piiSanitized: anyPiiSanitized,
      piiTypesDetected: Array.from(allDetectedTypes),
      message: {
        role: 'assistant',
        content: finalContent
      }
    });
  }
);

app.get('/api/circuit-status', async () => {
  return ResilienceModule.getStatus();
});

app.get('/api/stats', async () => {
  return {
    circuit: ResilienceModule.getStatus(),
    metrics: metricsStore.getStats()
  };
});

app.get<{ Querystring: { limit?: string } }>('/api/logs', async (request) => {
  const limit = Number(request.query.limit) || 25;
  return {
    logs: metricsStore.getLogs(limit)
  };
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    const address = await app.listen({ port, host: '0.0.0.0' });
    process.stdout.write(`\n Gateway resiliente ativo em: ${address}\n`);
  } catch (err) {
    console.error('Erro ao iniciar o servidor:', err);
    process.exit(1);
  }
};

start();