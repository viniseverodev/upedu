# Arquitetura de Software — UpEdu
**Versão:** 1.0  
**Agente:** @architect (Aria)  
**Status:** Aprovado — base para implementação

---

## 1. Visão Geral da Arquitetura

### Padrão Arquitetural
- **Backend:** Modular Monolith com separação por domínio (não microserviços — time pequeno)
- **Frontend:** Next.js App Router com Server Components onde possível
- **Multi-tenant:** Row-level isolation via middleware (filialId injetado em todas as queries)
- **Auth:** JWT híbrido (stateless access token + Redis blacklist para revogação)

### Diagrama de Alto Nível

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                               │
│                   Next.js 14 (App Router)                   │
│         Zustand │ TanStack Query │ shadcn/ui │ Recharts      │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼───────────────────────────────────┐
│                     NGINX (Reverse Proxy + SSL)              │
└────────────────┬────────────────────────┬───────────────────┘
                 │                        │
┌────────────────▼──────────┐  ┌──────────▼──────────────────┐
│   BACKEND (Fastify)       │  │   REDIS 7                   │
│   Node.js 20 + TypeScript │  │   - JWT Blacklist           │
│   Prisma ORM              │  │   - Rate Limit Counters     │
│   Zod Validation          │  │   - Dashboard KPI Cache     │
│   Pino Logging            │  │     (TTL 5min)              │
└────────────────┬──────────┘  └─────────────────────────────┘
                 │
┌────────────────▼──────────────────────────────────────────┐
│               PostgreSQL 15                                │
│   - BYTEA para CPF/RG criptografados                       │
│   - ENUM para status/roles                                 │
│   - BIGSERIAL para audit_logs                              │
│   - Row-level isolation por filial_id                      │
└────────────────────────────────────────────────────────────┘
```

---

## 2. ADRs (Architecture Decision Records)

### ADR-001 — Fastify (não NestJS)
**Decisão:** Usar Fastify como framework HTTP  
**Motivo:** Performance superior (3x mais rápido que Express), bundle menor, suporte nativo a TypeScript com `fastify-type-provider-zod` para validação de schemas sem overhead. NestJS adiciona complexidade desnecessária para o tamanho da equipe.  
**Consequência:** Schema-first validation obrigatória com Zod em todos os endpoints.

### ADR-002 — Prisma (não TypeORM)
**Decisão:** Usar Prisma ORM  
**Motivo:** Type-safety gerada automaticamente do schema, migrations versionadas, Prisma Client com intellisense completo. TypeORM tem problemas conhecidos de type-safety em operações complexas.  
**Consequência:** Schema único em `prisma/schema.prisma` é fonte da verdade para todo o modelo de dados.

### ADR-003 — PostgreSQL 15 (não MySQL)
**Decisão:** Usar PostgreSQL 15  
**Motivo:** Suporte nativo a BYTEA (para CPF/RG criptografado), ENUM types, BIGSERIAL, JSONB (oldValues/newValues no audit log). PostgreSQL tem melhor suporte a queries analíticas para relatórios futuros.  
**Consequência:** Migrations específicas para tipos PostgreSQL (não portáveis para MySQL).

### ADR-004 — JWT Híbrido com Redis Blacklist
**Decisão:** Access token stateless (15min) + refresh token com rotação + Redis blacklist  
**Motivo:** Access token stateless mantém performance (sem hit no banco a cada request). Redis blacklist garante revogação imediata em logout e desativação de usuário. Rotação obrigatória de refresh token detecta roubo de sessão.  
**Consequência:** Redis é dependência crítica. Em caso de falha do Redis, sistema fica em modo degradado (aceita tokens não-blacklistados até expirar).

### ADR-005 — Next.js App Router (não Pages Router)
**Decisão:** Usar App Router do Next.js 14+  
**Motivo:** React Server Components reduzem bundle client-side, route groups `(auth)` e `(dashboard)` para layouts isolados, middleware.ts para proteção de rotas server-side.  
**Consequência:** Curva de aprendizado com RSC vs Client Components — marcar `"use client"` apenas onde necessário.

### ADR-006 — Zustand (não Redux)
**Decisão:** Usar Zustand para estado global do frontend  
**Motivo:** 8x menor que Redux, API simples sem boilerplate de actions/reducers, suficiente para o escopo (authStore, filialStore, sidebarStore). TanStack Query gerencia estado de servidor — Zustand apenas estado de UI.  
**Consequência:** Separação clara: Zustand = estado UI/sessão, TanStack Query = estado servidor/cache.

### ADR-007 — Docker + Docker Compose (não bare metal)
**Decisão:** Containerizar toda a stack  
**Motivo:** Ambientes reproduzíveis (dev/staging/prod idênticos), onboarding simplificado (`docker compose up`), portabilidade para migração de VPS.  
**Consequência:** Dockerfile por serviço, health checks obrigatórios, volumes para persistência de dados.

### ADR-008 — Monorepo Simples (não Turborepo)
**Decisão:** Monorepo com `/backend` e `/frontend` sem build orchestration  
**Motivo:** Tamanho do time não justifica overhead de Turborepo/Nx. Scripts npm simples suficientes. Turborepo seria adicionado se o time crescer para 5+ devs ou aparecerem 3+ packages compartilhados.  
**Consequência:** Scripts compartilhados via Makefile ou scripts raiz.

---

## 3. Schema Prisma (Fonte da Verdade)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  SUPER_ADMIN
  ADMIN_MATRIZ
  GERENTE_FILIAL
  ATENDENTE
  PROFESSOR
}

enum AlunoStatus {
  PRE_MATRICULA
  ATIVO
  INATIVO
  LISTA_ESPERA
  TRANSFERIDO
}

enum Turno {
  INTEGRAL
  MEIO_TURNO
}

enum MatriculaStatus {
  ATIVA
  ENCERRADA
  CANCELADA
}

enum MensalidadeStatus {
  PENDENTE
  PAGO
  INADIMPLENTE
  CANCELADA
}

enum TransacaoTipo {
  ENTRADA
  SAIDA
}

enum CategoriaFinanceiraTipo {
  RECEITA
  DESPESA
}

model Organization {
  id        String   @id @default(uuid())
  nome      String
  cnpj      String   @unique
  email     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  filiais Filial[]
  users   User[]

  @@map("organizations")
}

model User {
  id               String    @id @default(uuid())
  organizationId   String
  nome             String
  email            String
  passwordHash     String
  role             UserRole
  ativo            Boolean   @default(true)
  primeiroAcesso   Boolean   @default(true)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  deletedAt        DateTime?

  organization   Organization    @relation(fields: [organizationId], references: [id])
  filiais        UserFilial[]
  refreshTokens  RefreshToken[]
  auditLogs      AuditLog[]

  @@unique([email, organizationId])
  @@index([email, organizationId])
  @@map("users")
}

model RefreshToken {
  id         String    @id @default(uuid())
  userId     String
  tokenHash  String
  expiresAt  DateTime
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("refresh_tokens")
}

model Filial {
  id                           String    @id @default(uuid())
  organizationId               String
  nome                         String
  cnpj                         String
  diaVencimento                Int       @default(10)
  valorMensalidadeIntegral     Decimal   @db.Decimal(10, 2)
  valorMensalidadeMeioTurno    Decimal   @db.Decimal(10, 2)
  ativo                        Boolean   @default(true)
  createdAt                    DateTime  @default(now())
  updatedAt                    DateTime  @updatedAt

  organization      Organization          @relation(fields: [organizationId], references: [id])
  usuarios          UserFilial[]
  alunos            Aluno[]
  matriculas        Matricula[]
  mensalidades      Mensalidade[]
  transacoes        Transacao[]
  categorias        CategoriaFinanceira[]
  auditLogs         AuditLog[]

  @@unique([cnpj, organizationId])
  @@map("filiais")
}

model UserFilial {
  userId   String
  filialId String

  user   User   @relation(fields: [userId], references: [id])
  filial Filial @relation(fields: [filialId], references: [id])

  @@id([userId, filialId])
  @@map("users_filiais")
}

model Responsavel {
  id        String    @id @default(uuid())
  nome      String
  cpfEnc    Bytes?
  rgEnc     Bytes?
  telefone  String?
  email     String?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  alunos AlunoResponsavel[]

  @@map("responsaveis")
}

model Aluno {
  id                       String      @id @default(uuid())
  filialId                 String
  nome                     String
  dataNascimento           DateTime
  status                   AlunoStatus @default(PRE_MATRICULA)
  turno                    Turno
  observacoes              String?
  consentimentoResponsavel Boolean     @default(false)
  consentimentoTimestamp   DateTime?
  anonimizadoEm            DateTime?
  createdAt                DateTime    @default(now())
  updatedAt                DateTime    @updatedAt
  deletedAt                DateTime?

  filial         Filial             @relation(fields: [filialId], references: [id])
  responsaveis   AlunoResponsavel[]
  matriculas     Matricula[]
  mensalidades   Mensalidade[]

  @@index([filialId, status])
  @@map("alunos")
}

model AlunoResponsavel {
  alunoId                String
  responsavelId          String
  parentesco             String
  isResponsavelFinanceiro Boolean @default(false)

  aluno       Aluno       @relation(fields: [alunoId], references: [id])
  responsavel Responsavel @relation(fields: [responsavelId], references: [id])

  @@id([alunoId, responsavelId])
  @@map("alunos_responsaveis")
}

model Matricula {
  id               String          @id @default(uuid())
  alunoId          String
  filialId         String
  status           MatriculaStatus @default(ATIVA)
  turno            Turno
  valorMensalidade Decimal         @db.Decimal(10, 2) // SNAPSHOT — imutável após criação
  dataInicio       DateTime
  dataFim          DateTime?
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  aluno  Aluno  @relation(fields: [alunoId], references: [id])
  filial Filial @relation(fields: [filialId], references: [id])

  @@index([alunoId, status])
  @@map("matriculas")
}

model Mensalidade {
  id             String            @id @default(uuid())
  alunoId        String
  filialId       String
  status         MensalidadeStatus @default(PENDENTE)
  mesReferencia  Int
  anoReferencia  Int
  valorOriginal  Decimal           @db.Decimal(10, 2)
  valorDesconto  Decimal           @default(0) @db.Decimal(10, 2)
  valorJuros     Decimal           @default(0) @db.Decimal(10, 2)
  valorPago      Decimal?          @db.Decimal(10, 2)
  dataVencimento DateTime
  dataPagamento  DateTime?
  formaPagamento String?
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt

  aluno  Aluno  @relation(fields: [alunoId], references: [id])
  filial Filial @relation(fields: [filialId], references: [id])

  @@unique([alunoId, mesReferencia, anoReferencia]) // IDEMPOTÊNCIA
  @@index([filialId, status, dataVencimento])
  @@map("mensalidades")
}

model CategoriaFinanceira {
  id        String                  @id @default(uuid())
  filialId  String
  nome      String
  tipo      CategoriaFinanceiraTipo
  createdAt DateTime                @default(now())

  filial     Filial      @relation(fields: [filialId], references: [id])
  transacoes Transacao[]

  @@map("categorias_financeiras")
}

model Transacao {
  id             String        @id @default(uuid())
  filialId       String
  categoriaId    String
  tipo           TransacaoTipo
  descricao      String
  valor          Decimal       @db.Decimal(10, 2)
  dataTransacao  DateTime
  createdAt      DateTime      @default(now())

  filial    Filial              @relation(fields: [filialId], references: [id])
  categoria CategoriaFinanceira @relation(fields: [categoriaId], references: [id])

  @@index([filialId, dataTransacao])
  @@map("transacoes")
}

model AuditLog {
  id         BigInt   @id @default(autoincrement()) // BIGSERIAL — sem UUID para performance
  userId     String
  filialId   String?
  action     String   // CREATE | UPDATE | DELETE | LOGIN | LOGOUT | SUSPICIOUS_TOKEN_REUSE
  entityType String   // User | Aluno | Matricula | Mensalidade | etc.
  entityId   String
  oldValues  Json?
  newValues  Json?
  ipAddress  String?
  createdAt  DateTime @default(now())
  // SEM updatedAt e SEM deletedAt — IMUTÁVEL por design

  user   User    @relation(fields: [userId], references: [id])
  filial Filial? @relation(fields: [filialId], references: [id])

  @@index([userId, createdAt(sort: Desc)])
  @@index([entityType, entityId])
  @@map("audit_logs")
}
```

---

## 4. Índices Críticos de Performance

```sql
-- Queries de listagem de alunos (mais frequente)
CREATE INDEX idx_aluno_filial_status 
  ON alunos(filial_id, status) 
  WHERE deleted_at IS NULL;

-- Queries de inadimplência e vencimento
CREATE INDEX idx_mensalidade_filial_status_venc 
  ON mensalidades(filial_id, status, data_vencimento);

-- Constraint de idempotência de mensalidade
CREATE UNIQUE INDEX idx_mensalidade_aluno_mesano 
  ON mensalidades(aluno_id, mes_referencia, ano_referencia);

-- Audit log — busca por usuário recente
CREATE INDEX idx_audit_user_timestamp 
  ON audit_logs(user_id, created_at DESC);

-- Audit log — busca por entidade específica
CREATE INDEX idx_audit_entity 
  ON audit_logs(entity_type, entity_id);

-- Matrículas — busca de matrícula ativa do aluno
CREATE INDEX idx_matricula_aluno_status 
  ON matriculas(aluno_id, status);
```

---

## 5. Estrutura de Pastas — Backend

```
backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── app.ts                    # Fastify instance + plugins
│   ├── server.ts                 # Entry point, listen
│   ├── config/
│   │   ├── env.ts                # Zod env validation
│   │   ├── database.ts           # Prisma client singleton
│   │   ├── redis.ts              # Redis client singleton
│   │   └── logger.ts             # Pino configuration
│   ├── middlewares/
│   │   ├── authenticate.ts       # JWT validation + Redis blacklist check
│   │   ├── authorize.ts          # Role-based access: authorize(['ADMIN_MATRIZ'])
│   │   ├── filial-context.ts     # x-filial-id validation + injection
│   │   ├── rate-limit.ts         # Redis-based rate limiting
│   │   └── audit.ts              # Automatic audit log on write operations
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repository.ts
│   │   │   ├── auth.schema.ts    # Zod schemas
│   │   │   └── auth.routes.ts
│   │   ├── users/
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.repository.ts
│   │   │   ├── users.schema.ts
│   │   │   └── users.routes.ts
│   │   ├── filiais/
│   │   ├── alunos/
│   │   ├── responsaveis/
│   │   ├── matriculas/
│   │   ├── financeiro/
│   │   │   ├── mensalidades/
│   │   │   ├── transacoes/
│   │   │   └── categorias/
│   │   ├── dashboard/
│   │   ├── relatorios/
│   │   └── audit/
│   ├── shared/
│   │   ├── errors/
│   │   │   ├── AppError.ts       # Base error class
│   │   │   └── error-handler.ts  # Fastify error handler
│   │   └── utils/
│   │       ├── crypto.ts         # AES-256-GCM encrypt/decrypt
│   │       ├── pagination.ts     # Cursor/offset pagination helpers
│   │       └── csv.ts            # CSV generation utility
│   └── jobs/
│       └── update-overdue-status.ts  # node-cron job (BullMQ na Release 4)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── package.json
└── tsconfig.json
```

---

## 6. Estrutura de Pastas — Frontend

```
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── primeiro-acesso/
│   │   │       └── page.tsx
│   │   └── (dashboard)/
│   │       ├── layout.tsx        # Sidebar + header layout
│   │       ├── kpis/
│   │       │   └── page.tsx
│   │       ├── alunos/
│   │       │   ├── page.tsx      # Lista de alunos
│   │       │   ├── novo/page.tsx
│   │       │   └── [id]/page.tsx # Perfil do aluno
│   │       ├── responsaveis/
│   │       ├── matriculas/
│   │       ├── financeiro/
│   │       │   ├── mensalidades/
│   │       │   └── transacoes/
│   │       ├── filiais/
│   │       ├── usuarios/
│   │       ├── relatorios/
│   │       └── auditoria/
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── forms/                # React Hook Form wrappers
│   │   ├── layouts/
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopBar.tsx
│   │   ├── charts/               # Recharts wrappers
│   │   └── common/
│   │       ├── DataTable.tsx
│   │       ├── FilialSelector.tsx
│   │       └── StatusBadge.tsx
│   ├── lib/
│   │   ├── api.ts                # Axios instance + interceptors
│   │   ├── queryClient.ts        # TanStack Query configuration
│   │   └── utils.ts              # cn(), formatCurrency(), etc.
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useFilial.ts
│   │   └── usePermission.ts      # Hook: usePermission('GERENTE_FILIAL')
│   ├── stores/
│   │   ├── authStore.ts          # Zustand: user, accessToken, isAuthenticated
│   │   ├── filialStore.ts        # Zustand: activeFilialId, setActiveFilial
│   │   └── sidebarStore.ts       # Zustand: collapsed state
│   ├── types/
│   │   └── index.ts              # Shared TypeScript types
│   ├── schemas/
│   │   └── index.ts              # Zod schemas client-side
│   └── middleware.ts             # Next.js middleware: route protection
├── package.json
└── tsconfig.json
```

---

## 7. Padrões de Segurança

### Middleware Stack (ordem de execução)
```
Request
  → rate-limit (Redis INCR/EXPIRE)
  → authenticate (JWT verify + Redis blacklist)
  → filial-context (x-filial-id validate + inject)
  → authorize (role check)
  → route handler
  → audit (on write operations)
Response
```

### Criptografia AES-256-GCM (src/shared/utils/crypto.ts)
```typescript
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes via Doppler

export function encrypt(text: string): Buffer {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: IV (16) + TAG (16) + ENCRYPTED
  return Buffer.concat([iv, tag, encrypted]);
}

export function decrypt(data: Buffer): string {
  const iv = data.subarray(0, 16);
  const tag = data.subarray(16, 32);
  const encrypted = data.subarray(32);
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}
```

### Hierarquia de Erros (src/shared/errors/AppError.ts)
```typescript
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code?: string
  ) { super(message); }
}

export class ValidationError extends AppError {
  constructor(message: string) { super(message, 422, 'VALIDATION_ERROR'); }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') { super(message, 401, 'UNAUTHORIZED'); }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado') { super(message, 403, 'FORBIDDEN'); }
}

export class NotFoundError extends AppError {
  constructor(resource: string) { super(`${resource} não encontrado`, 404, 'NOT_FOUND'); }
}

export class ConflictError extends AppError {
  constructor(message: string) { super(message, 409, 'CONFLICT'); }
}
```

---

## 8. Frontend — Interceptors Axios (src/lib/api.ts)

```typescript
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { useFilialStore } from '@/stores/filialStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true, // Enviar cookies httpOnly (refresh token)
});

// Request: injetar access token e filial ativa
api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  const { activeFilialId } = useFilialStore.getState();
  
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  if (activeFilialId) config.headers['x-filial-id'] = activeFilialId;
  
  return config;
});

// Response: refresh automático em 401
let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      
      if (!refreshPromise) {
        refreshPromise = api.post('/auth/refresh')
          .then(res => res.data.accessToken)
          .finally(() => { refreshPromise = null; });
      }
      
      try {
        const newToken = await refreshPromise;
        useAuthStore.getState().setAccessToken(newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

---

## 9. Cache Strategy (Redis)

| Cache Key | TTL | Invalidação |
|-----------|-----|-------------|
| `kpis:filial:{filialId}:mes:{YYYY-MM}` | 5 min | Ao registrar pagamento ou criar matrícula |
| `filiais:org:{orgId}` | 1 hora | Ao criar/editar filial |
| `rate:login:{ip}` | 15 min | Auto-expire |
| `blacklist:jwt:{jti}` | 15 min (= access token TTL) | Auto-expire |

---

## 10. Infraestrutura — Docker Compose

```yaml
# docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: upedu_db
      POSTGRES_USER: upedu_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U upedu_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://upedu_user:${POSTGRES_PASSWORD}@postgres:5432/upedu_db
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend/src:/app/src  # Hot reload em dev

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: http://backend:3001/api/v1
    depends_on:
      - backend
    volumes:
      - ./frontend/src:/app/src  # Hot reload em dev

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
  redis_data:
```

---

## 11. CI/CD — GitHub Actions

```yaml
# .github/workflows/main.yml

name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:unit

  integration-tests:
    needs: quality
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: upedu_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_pass
        options: --health-cmd pg_isready
      redis:
        image: redis:7-alpine
        options: --health-cmd "redis-cli ping"
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test_user:test_pass@localhost:5432/upedu_test
          REDIS_URL: redis://localhost:6379

  security-scan:
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high

  build:
    needs: [integration-tests, security-scan]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t upedu-backend ./backend
      - run: docker build -t upedu-frontend ./frontend

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /app/upedu
            git pull origin main
            docker compose pull
            docker compose up -d --build
            docker compose exec backend npx prisma migrate deploy
```

---

## 12. Considerações de Escalabilidade

### Fase Atual (Release 1-3)
- VPS Hostinger: 4 vCPU, 8GB RAM suficiente para 500 alunos/filial, 10 filiais
- Redis single instance — OK para escala atual
- PostgreSQL single instance com backups para Backblaze B2

### Fase Futura (Release 4+)
- Read replicas PostgreSQL para queries de relatório
- BullMQ em cluster Redis para jobs de mensalidade automática
- CDN para assets estáticos do Next.js
- Separação de schema por organização (sharding) se necessário para multi-tenant pesado

---

## 13. Variáveis de Ambiente (via Doppler)

```env
# Backend
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=<256-bit random>
JWT_REFRESH_SECRET=<256-bit random>
ENCRYPTION_KEY=<32-byte hex para AES-256-GCM>
NODE_ENV=production
PORT=3001

# Frontend
NEXT_PUBLIC_API_URL=https://api.upedu.com/api/v1
```

---
*UpEdu Architecture v1.0 — Gerado por @architect (Aria) — Synkra AIOX*
