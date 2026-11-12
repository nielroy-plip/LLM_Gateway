# 🛡️ LLM Resilience Gateway

Um proxy reverso inteligente e resiliente projetado para atuar como camada de infraestrutura entre aplicações cliente e Modelos de Linguagem (LLMs). O gateway prioriza a execução local via **Ollama** para reduzir custos e garantir privacidade, conta com sanitização automática de dados sensíveis (**PII Redaction**) e aplica o padrão **Circuit Breaker** com fallback automático para APIs em nuvem.

---

## 🎯 Problema Resolvido

Em ambientes de produção, o consumo direto de LLMs apresenta três desafios críticos:
1. **Privacidade e Compliance (LGPD/GDPR):** Vazamento acidental de dados sensíveis (CPFs, e-mails, chaves de API, cartões) nos prompts enviados a provedores externos.
2. **Custos Elevados:** Dependência exclusiva de APIs pagas por token para tarefas que poderiam ser resolvidas localmente.
3. **Instabilidade e Latência:** Falhas ou lentidão em modelos locais que podem derrubar a experiência do usuário final caso não haja contingência.

---

## 🏗️ Arquitetura e Fluxo de Dados

```text
[ Cliente / Aplicação ]
         │
         ▼
┌─────────────────────────────────────────┐
│           API Gateway Core              │  <-- Contrato compatível com OpenAI
│       (Node.js + Fastify + TS)          │      POST /v1/chat/completions
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│          PII Sanitizer Engine           │  <-- Interceptação e mascaramento
│         (Regex / Data Redaction)        │      (CPF, E-mail, Cartões, Keys)
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│        Policy & Routing Engine          │  <-- Gerenciamento de falhas e timeout
│       (Circuit Breaker - Opossum)       │      (Closed / Open / Half-Open)
└──────┬───────────────────────────┬──────┘
       │                           │
       ▼ (Primary)                 ▼ (Fallback)
┌──────────────┐            ┌──────────────┐
│ Local Ollama │            │ Cloud LLM API│
│  (llama3)    │            │ (Contingência)│
└──────────────┘            └──────────────┘
```

### Ciclo de Vida da Requisição
1. **Interceptação:** O gateway recebe requisições no padrão `POST /v1/chat/completions`.
2. **Sanitização (PII):** O motor analisa cada mensagem e substitui dados confidenciais por marcadores seguros (ex: `[REDACTED_CPF]`, `[REDACTED_EMAIL]`) antes que o prompt saia do servidor.
3. **Roteamento Resiliente:** O **Circuit Breaker** encaminha o prompt limpo para a instância local do **Ollama**.
4. **Fallback Automático:** Caso o Ollama esteja indisponível, retorne erro ou ultrapasse o limite de tempo (*timeout*), o circuito aciona a rota de fallback automaticamente, mantendo a disponibilidade da aplicação.

---

## 🛠️ Stack Tecnológica

* **Runtime & Linguagem:** Node.js, TypeScript
* **Framework Web:** Fastify v5 + `@fastify/cors`
* **Resiliência:** Opossum (Circuit Breaker Pattern)
* **Cliente HTTP:** Axios (com controle estrito de *timeouts*)
* **Motor de IA Local:** Ollama (`llama3:latest`)

---

## 📂 Estrutura Atual do Projeto

```text
llm-resilience-gateway/
├── apps/
│   └── gateway/                  # Core do Proxy & Resiliência
│       ├── src/
│       │   ├── middlewares/
│       │   │   └── piiSanitizer.ts       # Motor de anonimização de dados sensíveis
│       │   ├── resilience/
│       │   │   └── circuitBreaker.ts     # Configuração do Opossum e lógica de Fallback
│       │   ├── services/
│       │   │   ├── ollamaService.ts      # Integração com a API local do Ollama
│       │   │   └── cloudLlmService.ts    # Provedor de contingência em nuvem
│       │   └── server.ts                 # Rotas da API e inicialização do Fastify
│       ├── .env                          # Variáveis de ambiente
│       ├── package.json
│       └── tsconfig.json
└── README.md
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
* **Node.js** (v20+)
* **Ollama** instalado e em execução localmente com o modelo `llama3` baixado:
  ```bash
  ollama pull llama3
  ```

### 1. Instalação das Dependências
Acesse a pasta do gateway e instale os pacotes:
```bash
cd apps/gateway
npm install
```

### 2. Configuração de Ambiente
Crie um arquivo `.env` na raiz de `apps/gateway` com as seguintes variáveis:
```env
PORT=3001
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3:latest
OPENAI_API_KEY=
```

### 3. Iniciar o Servidor
```bash
npm run dev
```
O servidor estará disponível em `http://127.0.0.1:3001`.

---

## 🧪 Testando os Recursos

### 1. Testar Chat com Sanitização de PII
Envie uma requisição contendo dados fictícios (CPF e e-mail) para validar a anonimização e o roteamento para o Ollama:

```bash
curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Olá, meu nome é Lucas, meu CPF é 123.456.789-00 e meu email é lucas@teste.com. Me explique o padrão Circuit Breaker em uma frase."
      }
    ]
  }'
```

**Exemplo de Resposta:**
```json
{
  "status": "success",
  "providerUsed": "OLLAMA_LOCAL",
  "latencyMs": 1420,
  "piiSanitized": true,
  "message": {
    "role": "assistant",
    "content": "O padrão Circuit Breaker protege sistemas distribuídos interrompendo chamadas a serviços com falhas recorrentes para evitar falhas em cascata."
  }
}
```

### 2. Consultar Estado do Circuit Breaker
```bash
curl http://localhost:3001/api/circuit-status
```

---

## 🗺️ Roadmap do Projeto

- [x] Proxy compatível com formato OpenAI (`/v1/chat/completions`)
- [x] Motor de sanitização de PII (CPF, E-mail, Cartão de Crédito, API Keys)
- [x] Circuit Breaker com Fallback automático (Ollama -> Cloud)
- [ ] Containerização com Docker e `docker-compose.yml` (Gateway + Ollama)
- [ ] Coleta de métricas de economia e latência (`/api/stats`)
- [ ] Dashboard Web de Observabilidade em tempo real (Next.js)