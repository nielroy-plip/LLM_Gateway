# 🛡️ LLM Resilience Gateway (v1.1)

Um Gateway de Inteligência Artificial resiliente, híbrido, de baixo custo e com foco em privacidade e FinOps, desenvolvido com **Node.js / Fastify**, **Ollama (Local)** e **Next.js**.

O projeto resolve dores reais da adoção de LLMs em produção: **indisponibilidade ou lentidão de hardware local, vazamento de dados sensíveis (PII), controle de cotas e falta de visibilidade financeira entre modelos locais e comerciais**.

---

## 🚀 Arquitetura e Funcionalidades (v1.1)

### 1. API Gateway (`/apps/gateway`)
* **Backend de Alta Performance**: Construído em **Node.js + Fastify** com compatibilidade de payload para chats.
* **Circuit Breaker (`Opossum`)**: Monitora falhas e timeouts do Ollama local (com suporte a `keep_alive` em memória), chaveando automaticamente para a nuvem (`CLOUD_FALLBACK`) em caso de degradação.
* **Roteamento Inteligente por Complexidade (`PromptRouter`)**: Avalia o tamanho do prompt, blocos de código e palavras-chave técnicas para decidir dinamicamente entre:
  * `OLLAMA_LOCAL`: Tarefas cotidianas e triagem (custo zero + privacidade total).
  * `CLOUD_DIRECT`: Tarefas complexas e raciocínio profundo direcionados proativamente para modelos maiores.
  * Estratégias configuráveis via payload (`auto`, `local`, `cloud`).
* **Sanitização Local de PII**: Intercepta e mascara dados sensíveis antes da inferência (CPF, CNPJ, E-mail, Cartões de Crédito e Telefones).
* **Segurança e Governança**: Autenticação via `Authorization: Bearer <API_KEY>` e controle de cotas por cliente com `@fastify/rate-limit`.
* **Chaos Engineering Endpoint**: Rota administrativa (`POST /api/chaos/circuit`) para forçar abertura/fechamento do circuito durante testes de resiliência.

### 2. Inferência Local (`/docker-compose.yml`)
* **Ollama Containerizado**: Executa o modelo `llama3.2:latest` isolado em rede interna Docker, mantendo o modelo pré-aquecido na memória para baixíssima latência nas requisições subsequentes.

### 3. Dashboard de Observabilidade & Playground (`/apps/dashboard`)
* **Interface Corporativa (Next.js + Tailwind CSS)**: Painel em tempo real sincronizado com o Gateway.
* **KPIs de Infraestrutura e FinOps**:
  * Estado vivo do Circuit Breaker (`CLOSED`, `HALF-OPEN`, `OPEN`).
  * Taxa de eficiência local vs. nuvem e latência média ponderada.
  * **Cost Avoidance**: Cálculo estimado de economia gerada por tokens processados localmente.
  * **Custo de Fallback & Direct Cloud**: Rastreamento financeiro do gasto incorrido nas chamadas externas.
* **Visualização Gráfica (`Recharts`)**: Gráfico de área com histórico de latência e gráfico de rosca com a distribuição de tráfego por provedor.
* **Playground Interativo & Simulador de Caos**: Permite disparar prompts com cenários pré-configurados (vazamento de PII, tarefas complexas, inferência local) e simular quedas do Ollama diretamente pelo navegador.
* **Auditoria em Tempo Real**: Buffer circular exibindo histórico detalhado de rotas, motivos de decisão, tipos de PII bloqueados, impacto financeiro e latência por requisição.

---

## 🛠️ Como Executar o Projeto

### Pré-requisitos
* **Docker** e **Docker Compose** instalados.
* **Node.js 20+** (para executar o dashboard localmente).

### 1. Subir o Gateway e o Ollama via Docker
Na raiz do repositório, execute:
```bash
docker compose up --build -d
```

Após subir os containers, os serviços ficam disponíveis em:
* **Gateway API:** http://localhost:3001
* **Ollama Local:** http://localhost:11434

### 2. Baixar o modelo no container do Ollama (primeira execução)
```bash
docker exec -it ollama-local ollama pull llama3.2:latest
```

### 3. Iniciar o Dashboard Frontend
Em um novo terminal, acesse a pasta do painel, instale as dependências e inicie o servidor:
```bash
cd apps/dashboard
npm install
npm run dev
```

Acesse o painel em http://localhost:3000.

---

## 🔌 Referência Rápida da API (Porta 3001)

| Método | Endpoint | Autenticação | Descrição |
|---|---|---|---|
| `POST` | `/v1/chat/completions` | `Bearer <API_KEY>` | Processa prompts com sanitização de PII, roteamento inteligente e fallback. |
| `GET` | `/api/stats` | Pública | Retorna estado do Circuit Breaker e métricas consolidadas de FinOps/latência. |
| `GET` | `/api/logs?limit=20` | Pública | Retorna os últimos registros do buffer circular de auditoria. |
| `POST` | `/api/chaos/circuit` | Pública (Admin) | Alterna manualmente o estado do circuito (`{ "action": "OPEN" \| "CLOSE" }`). |

### Exemplo de Requisição (`POST /v1/chat/completions`)
```json
{
  "routing": "auto",
  "messages": [
    {
      "role": "user",
      "content": "Olá, meu CPF é 123.456.789-00. Resuma o que é um Circuit Breaker."
    }
  ]
}
```

**Header obrigatório:** `Authorization: Bearer sk-gateway-dev-2026`