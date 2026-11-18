    # --- Stage 1: Build ---
    FROM node:20-alpine AS builder

    WORKDIR /app

    # Copia os arquivos de confdigurações de dependências e TypeScript
    COPY package*.json tsconfig.json ./

    # Instala as dependências
    RUN npm ci

    # Copia o código fonte e realiza o build TypeScript
    COPY src/ ./src
    RUN npm run build

    # --- Stage 2: Production Runtime ---
        FROM node:20-alpine AS runner

        WORKDIR /app

        ENV NODE_ENV=production

        # Copia apenas o necessário da etapa anterior
        COPY package*.json ./
        RUN npm ci --omit=dev

        COPY --from=builder /app/dist ./dist

        EXPOSE 3001

        CMD ["node", "dist/server.js"]