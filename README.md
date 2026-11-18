# 🛡️ LLM Resilience Gateway

Um Gateway de Inteligência Artificial resiliente, de baixo custo e com foco em privacidade, desenvolvido em **Node.js/Fastify**, **Ollama (Local)** e **Next.js**. 

O projeto resolve dores reais de adoção de LLMs locais em produção[cite: 4]: **indisponibilidade de hardware, vazamento de dados sensíveis (PII) e falta de visibilidade financeira (FinOps)**.

---

## 🚀 Arquitetura e Componentes

1. **API Gateway (`/apps/gateway`)**:
   - Backend em **Node.js + Fastify** com compatibilidade de payload.
   - **Circuit Breaker (`Opossum`)**: Monitora falhas e timeouts do Ollama local, chaveando automaticamente para um provedor de nuvem em caso de degradação.
   - **Sanitizador de PII (Regex)**: Detecta e mascará dados sensíveis antes de enviá-los ao modelo (CPF, CNPJ, E-mail, Cartões de Crédito e Telefones).
   - **Buffer de Telemetria (`MetricsStore`)**: Coleta métricas em tempo real de latência, taxas de roteamento e impactos financeiros.

2. **IA Local (`Ollama`)**:
   - Orquestrado via Docker com o modelo `llama3.2:latest`, garantindo privacidade de dados e custo operacional zero nas requisições padrão.

3. **Dashboard de Observabilidade (`/apps/dashboard`)**:
   - Interface moderna em **Next.js 14/16 + Tailwind CSS**.
   - Exibe em tempo real o estado do Circuit Breaker, taxa de roteamento local vs. nuvem, latência integrada e painel de FinOps (Economia Gerada vs. Custo de Fallback sugerido por feedbacks da comunidade)[cite: 4].

---

## 📊 Principais Métricas e FinOps
* **Taxa de Roteamento Local**: Porcentagem de requisições atendidas pelo Ollama sem custo de nuvem.
* **Cost Avoidance (Economia)**: Cálculo estimado do valor economizado com base no volume de tokens processados localmente.
* **Custo de Fallback**: Monitoramento financeiro do impacto gerado durante janelas de indisponibilidade do modelo local.
* **Auditoria de PII**: Identificação e contagem de tipos de dados sensíveis bloqueados por requisição.

---

## 🛠️ Como Executar o Projeto

### Pré-requisitos
- Docker & Docker Compose instalados.
- Node.js 20+ (caso queira rodar o dashboard localmente).

### 1. Subir o Gateway e o Ollama (Docker)
Na raiz do projeto, execute:
```bash
docker compose up --build -d
(O Ollama subirá na porta 11434 ou 11435 e o Gateway na porta 3001).

2. Baixar o modelo no container do Ollama (primeira execução)
Bash
docker exec -it ollama-local ollama pull llama3.2:latest

3. Iniciar o Dashboard Frontend
Em um novo terminal, navegue até a pasta do painel, instale as dependências e inicie:

Bash
cd apps/dashboard
npm install
npm run dev
Acesse o painel em http://localhost:3000.

🔌 Endpoints Principais da API (Porta 3001)
POST /v1/chat/completions - Envia prompts com sanitização automática de PII e proteção de Circuit Breaker.

GET /api/stats - Retorna o estado atual do circuito e os KPIs consolidados.

GET /api/logs - Retorna o buffer circular com as últimas requisições auditadas.