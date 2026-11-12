import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PiiSanitizer } from './middlewares/piiSanitizer';
import { ResilienceModule } from './resilience/circuitBreaker';

const app = Fastify({ logger: true });

app.register(cors, { origin: '*' });

app.post('/v1/chat/completions', async (request, reply) => {
  const body = request.body as { messages: Array<{ role: 'user' | 'system' | 'assistant'; content: string }> };

  if (!body || !body.messages) {
    return reply.status(400).send({ error: 'Payload inválido: envie o array de mensagens.' });
  }

  // 1. Interceptação e Sanitização de PII
  let piiDetected = false;
  const sanitizedMessages = body.messages.map(msg => {
    const piiCheck = PiiSanitizer.sanitize(msg.content);
    if (piiCheck.hasRedactedData) piiDetected = true;
    return {
      role: msg.role,
      content: piiCheck.sanitizedText
    };
  });

  // 2. Execução resiliente (Ollama com Fallback no Circuit Breaker)
  const result = await ResilienceModule.executeChat(sanitizedMessages);

  return reply.send({
    status: 'success',
    providerUsed: result.provider,
    latencyMs: result.latencyMs,
    piiSanitized: piiDetected,
    message: {
      role: 'assistant',
      content: result.content
    }
  });
});

app.get('/api/circuit-status', async () => {
  return ResilienceModule.getStatus();
});

const start = async () => {
  try {
    const address = await app.listen({ port: process.env.PORT ? parseInt(process.env.PORT) : 3001, host: '0.0.0.0' });
    process.stdout.write(`\n🚀 Gateway resiliente ativo em: ${address}\n`);
  } catch (err) {
    console.error('Erro ao iniciar o servidor:', err);
    process.exit(1);
  }
};

start();