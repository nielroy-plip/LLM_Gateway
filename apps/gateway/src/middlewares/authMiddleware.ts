import { FastifyRequest, FastifyReply } from 'fastify';

// Em produção, isso viria de um banco de dados ou Redis
const VALID_API_KEYS = new Set([
    process.env.GATEWAY_API_KEY || 'sk-gateway-dev-2026',
    'sk-client-alpha'
]);

export async function verifyApiKey(request: FastifyRequest, reply: FastifyReply) {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Header Authorization: Bearer <API_KEY> é obrigatório.'
        });
    }

    const token = authHeader.replace('Bearer ', '').trim();

    if (!VALID_API_KEYS.has(token)) {
        return reply.status(403).send({
            error: 'Forbidden',
            message: 'API key inválida ou revogada.'
        });
    }

    // Anexa o identificador do cliente na requisição para o Rate Limiter e Logs
    (request as any).clientId = token.slice(0, 12) + '...';
}