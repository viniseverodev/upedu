# PRD — UpEdu: Sistema de Gestão Escolar Multi-Filial
**Versão:** 1.0  
**Agente:** @pm (Morgan)  
**Status:** Aprovado — base para desenvolvimento

---

## 1. Visão Geral do Produto

**UpEdu** é um sistema SaaS de gestão para redes de escolinhas infantis (contraturno) com múltiplas filiais. Centraliza a gestão de alunos, responsáveis, matrículas, cobranças financeiras e relatórios gerenciais em uma única plataforma multi-tenant.

**Problema central:** Proprietários de redes de escolinhas gerenciam operações dispersas (planilhas, WhatsApp, papel), sem visibilidade consolidada entre filiais e sem controle financeiro estruturado.

**Proposta de valor:** Uma plataforma web que unifica o ciclo completo — da matrícula do aluno ao controle financeiro — com isolamento seguro de dados por filial e dashboards de inteligência para decisão.

---

## 2. Personas

### Persona 1 — Dono/Proprietário (SUPER_ADMIN)
- Precisa de visão consolidada de todas as filiais
- Toma decisões estratégicas baseadas em dados
- Não opera o sistema diariamente

### Persona 2 — Gestor de Filial (ADMIN_MATRIZ / GERENTE_FILIAL)
- Responsável pelo desempenho da unidade
- Acessa relatórios financeiros e operacionais
- Gerencia equipe e configurações da filial

### Persona 3 — Atendente (ATENDENTE)
- Opera o sistema diariamente
- Cadastra alunos, responsáveis, registra pagamentos
- Precisa de interface ágil e validações claras

### Persona 4 — Professor (PROFESSOR)
- Acesso limitado: consulta lista de alunos da turma
- Não acessa dados financeiros

---

## 3. User Journeys

### Journey 1 — Matrícula de novo aluno
1. Atendente cadastra aluno (com consentimento parental LGPD)
2. Vincula responsável financeiro (CPF/RG criptografado)
3. Cria matrícula (snapshot do valor de mensalidade)
4. Sistema ativa status do aluno → PRE_MATRICULA → ATIVO
5. Mensalidade gerada para o mês corrente

### Journey 2 — Ciclo de cobrança mensal
1. Sistema gera mensalidades (manual ou automático futuro)
2. Responsável paga → atendente registra pagamento
3. Mensalidades vencidas → job automático marca como INADIMPLENTE
4. Gerente visualiza relatório de inadimplência

### Journey 3 — Visão gerencial
1. Gerente acessa dashboard com KPIs da filial
2. Filtra por período, compara com mês anterior
3. Exporta relatório de fluxo de caixa em CSV

---

## 4. Roles e Permissões (RBAC)

| Role | Descrição | Escopo |
|------|-----------|--------|
| `SUPER_ADMIN` | Proprietário da rede | Todas as filiais, sem restrição |
| `ADMIN_MATRIZ` | Gestor central | Todas as filiais da organização |
| `GERENTE_FILIAL` | Gestor de unidade | Apenas sua(s) filial(is) |
| `ATENDENTE` | Operação diária | Apenas sua filial ativa |
| `PROFESSOR` | Consulta de turmas | Leitura de alunos da filial |

---

## 5. Features com Critérios de Aceitação

### AUTH-01 — Login com email e senha
- POST /auth/login com credenciais válidas retorna access token (15min) + refresh token httpOnly (7 dias)
- Rate limiting: 5 tentativas/IP/15min (Redis)
- Mensagem genérica em falha (não revela se email existe)
- Detecta primeiroAcesso=true e redireciona para troca de senha

### AUTH-02 — Logout com invalidação de token
- POST /auth/logout revoga refresh token no banco e adiciona access token ao Redis blacklist
- Cookie refreshToken removido (maxAge=0)
- Qualquer uso do access token blacklistado retorna 401

### AUTH-03 — Refresh token com rotação obrigatória
- POST /auth/refresh valida cookie, revoga token atual, gera novo par
- Reutilização de token revogado: revoga TODOS os tokens do usuário + audit log "SUSPICIOUS_TOKEN_REUSE"
- Fila de requests concorrentes aguarda único refresh antes de prosseguir

### AUTH-04 — Primeiro acesso e troca de senha obrigatória
- Usuário criado com primeiroAcesso=true e senha temporária aleatória
- Middleware bloqueia todas as rotas exceto /auth/* até troca ser realizada
- Nova senha: mín 8 chars, 1 maiúscula, 1 número

### USERS-01 — Cadastro de usuário
- ADMIN_MATRIZ cria usuário com role e lista de filialIds
- Role do criador limita roles criáveis (hierarquia)
- Email único por organização (HTTP 409 se duplicado)

### USERS-02 — Edição e desativação de usuário
- Desativação imediata: revoga todos refresh tokens
- Edição de filiais de acesso: add/remove UserFilial

### USERS-03 — RBAC com isolamento por filial
- Header x-filial-id obrigatório em todas as rotas protegidas
- Middleware valida que usuário tem acesso à filial solicitada
- Injeção automática de filialId em todas as queries

### FILIAL-01 — Cadastro e gestão de filiais
- POST /filiais (SUPER_ADMIN/ADMIN_MATRIZ): nome, CNPJ, endereço
- CNPJ único por organização (HTTP 409 se duplicado)
- Listagem para seleção de filial ativa (filtrado pelo acesso do usuário)

### FILIAL-02 — Configuração financeira de filial
- Campos: diaVencimento (1-28), valorMensalidadeIntegral, valorMensalidadeMeioTurno
- Alterações não afetam snapshots de matrículas existentes
- Desativação bloqueada se há alunos ativos (HTTP 422 com contagem)

### ALUNO-01 — Cadastro de aluno
- Campos: nome, dataNascimento, turno, observações
- consentimentoResponsavel=true OBRIGATÓRIO (LGPD Art. 14)
- consentimentoTimestamp registrado automaticamente
- Status inicial: PRE_MATRICULA
- filialId inferido do contexto (middleware), nunca do body

### ALUNO-02 — Edição e inativação de aluno
- Inativação encerra matrícula ativa e cancela mensalidades futuras pendentes
- Soft delete: setam deletedAt (LGPD — dados preservados para compliance)
- Todas as listagens filtram WHERE deleted_at IS NULL

### ALUNO-03 — Lista de espera
- Status LISTA_ESPERA para quando não há vagas no turno
- Promoção manual para PRE_MATRICULA quando vaga disponível
- Ordenação por data de criação (FIFO)

### ALUNO-04 — Transferência entre filiais
- ADMIN_MATRIZ encerra matrícula na filial origem, cria na filial destino
- Snapshot do valor usa configuração da filial destino
- Aviso (não bloqueio) se há mensalidades pendentes na origem

### ALUNO-05 — Perfil completo do aluno
- Dados pessoais + responsáveis + matrícula atual + últimas 5 mensalidades + histórico de status
- GET /alunos/:id com includes Prisma

### ALUNO-06 — Exportação CSV de alunos
- GET /alunos/export?status=ATIVO&format=csv
- CPF/RG NÃO incluídos no CSV (proteção LGPD)
- Campos: nome, dataNascimento, status, turno, responsávelNome, telefone

### RESP-01 — Cadastro e vinculação de responsáveis
- CPF e RG criptografados com AES-256-GCM, armazenados como BYTEA
- Exibição mascarada: "•••.•••.789-00"
- Vínculo com aluno inclui: parentesco, isResponsavelFinanceiro
- Apenas 1 responsável financeiro por aluno (constraint)
- Acesso ao CPF/RG completo registrado no audit log

### MATRIC-01 — Criação de matrícula com snapshot
- Snapshot obrigatório: valorMensalidade = filial.valorMensalidadeIntegral ou valorMensalidadeMeioTurno (conforme turno)
- Apenas 1 matrícula ATIVA por aluno (HTTP 422 se já existe)
- Aluno sem responsável financeiro não pode ser matriculado
- Atualiza aluno.status → ATIVO (transação Prisma)

### MATRIC-02 — Histórico de matrículas
- GET /alunos/:id/matriculas: todas ordenadas por dataInicio DESC
- Inclui: status, turno, valorMensalidade (snapshot), dataInicio, dataFim, nomeDaFilial

### FIN-01 — Geração de mensalidade
- valorOriginal = matricula.valorMensalidade (snapshot)
- dataVencimento = dia diaVencimento da filial no mês/ano referência
- Idempotência: UNIQUE (alunoId, mesReferencia, anoReferencia) — HTTP 409 se duplicada

### FIN-02 — Registro de pagamento
- PATCH /mensalidades/:id/pagar: valorPago, formaPagamento, dataPagamento, valorDesconto
- Status → PAGO
- Mensalidade já paga: HTTP 422

### FIN-03 — Cancelamento de mensalidade
- PATCH /mensalidades/:id com status=CANCELADA e motivoCancelamento
- Mensalidade PAGA não pode ser cancelada (HTTP 422 — usar estorno)

### FIN-04 — Atualização automática de inadimplência
- Job diário: mensalidades PENDENTE com dataVencimento < today → INADIMPLENTE
- Implementação inicial: node-cron; Release 4: BullMQ

### FIN-05 — Relatório de inadimplência
- GET /relatorios/inadimplencia?filialId=X&mes=N&ano=N
- Lista: nome do aluno, responsável, valor, dias de atraso

### TRANS-01 — Registro de receitas
- POST /transacoes: tipo=ENTRADA, categoriaId, descricao, valor, dataTransacao
- Vinculada à filial ativa (middleware)

### TRANS-02 — Registro de despesas
- POST /transacoes: tipo=SAIDA, categoriaId, descricao, valor, dataTransacao

### TRANS-03 — Fluxo de caixa
- GET /relatorios/fluxo-caixa?mes=N&ano=N
- Retorna: totalReceitas, totalDespesas, saldo, breakdown por categoria
- Exportação CSV com ?format=csv

### DASH-01 — Dashboard KPIs
- GET /dashboard/kpis com cache Redis (TTL 5min)
- KPIs: totalAlunos (por status), receitaMes, inadimplentes, taxaOcupacao
- Cache invalidado em pagamento/matrícula
- Latência < 200ms (cache hit)

### DASH-02 — Filtros e comparativo entre filiais
- Filtros por período (mês/ano) e comparativo entre filiais
- Acesso: ADMIN_MATRIZ e SUPER_ADMIN

### REL-01 — Relatórios exportáveis
- Inadimplência, fluxo de caixa, lista de alunos
- Formatos: CSV e PDF (futuro)

### REL-02 — Categorias financeiras
- CRUD de categorias por filial (tipo: RECEITA ou DESPESA)
- Categorias padrão criadas na inicialização da filial

### AUDIT-01 — Log de auditoria automático
- Registrado em TODA operação de escrita (CREATE/UPDATE/DELETE)
- Campos: userId, filialId, action, entityType, entityId, oldValues(JSON), newValues(JSON), ipAddress, createdAt
- Imutável: sem endpoints de update/delete para audit_logs

### AUDIT-02 — Consulta de audit log
- GET /auditoria com filtros: userId, entityType, dateFrom, dateTo
- Paginação: 50 registros/página, ordenado por createdAt DESC
- Exportação CSV
- Acesso: SUPER_ADMIN e ADMIN_MATRIZ

---

## 6. Entidades de Dados

| Entidade | Descrição |
|----------|-----------|
| `Organization` | Rede/empresa dona das filiais |
| `User` | Usuário do sistema com role |
| `RefreshToken` | Tokens de refresh (hash bcrypt) |
| `Filial` | Unidade/filial da organização |
| `UserFilial` | N:N usuários ↔ filiais |
| `Responsavel` | Responsável do aluno (CPF/RG criptografado) |
| `Aluno` | Aluno cadastrado na filial |
| `AlunoResponsavel` | N:N alunos ↔ responsáveis com parentesco |
| `Matricula` | Matrícula com snapshot de valor |
| `Mensalidade` | Cobrança mensal com idempotência |
| `CategoriaFinanceira` | Categorias de receita/despesa por filial |
| `Transacao` | Transação financeira (entrada/saída) |
| `AuditLog` | Registro imutável de auditoria |

---

## 7. Requisitos Não-Funcionais

### Segurança
- OWASP Top 10: Prisma parameterized queries, Zod validation, Helmet headers, SameSite cookies
- AES-256-GCM para CPF/RG (chave via Doppler)
- bcrypt cost 12 para senhas
- Rate limiting Redis em todas as rotas de auth
- IDOR protection: filialId sempre do contexto, nunca do body

### LGPD
- Art. 14: consentimento parental obrigatório para menores
- Data minimization: CPF/RG apenas quando necessário
- Right to erasure: anonimização após 5 anos (deletedAt + anonimizadoEm)
- Dados financeiros preservados mesmo após anonimização

### Performance
- Dashboard KPIs < 200ms (Redis cache TTL 5min)
- Paginação padrão: 50 registros/página
- Índices compostos para queries frequentes
- Cache invalidation orientada a eventos

### Escalabilidade
- Multi-tenant com row-level isolation via middleware
- Stateless backend (JWT + Redis blacklist)
- Docker + VPS Hostinger (escala vertical inicial)

---

## 8. Stack Tecnológica Aprovada

### Backend
- Node.js 20+, TypeScript strict
- Fastify + fastify-type-provider-zod
- Prisma ORM + PostgreSQL 15
- Redis 7 (cache + blacklist + rate limiting)
- bcrypt (cost 12), Pino (logging)

### Frontend
- Next.js 14+ (App Router)
- TypeScript strict
- Tailwind CSS + shadcn/ui
- TanStack Query + Zustand
- React Hook Form + Zod
- Recharts, Axios

### Infraestrutura
- Docker + Docker Compose
- Nginx (reverse proxy + SSL)
- VPS Hostinger
- Backblaze B2 (backups)
- GitHub Actions (CI/CD)
- Doppler (secrets management)

---

## 9. Roadmap — 3 Fases

### Release 1 — MVP Core (Semanas 1-8)
Autenticação, filiais, usuários, alunos (LGPD), responsáveis (criptografia), matrículas (snapshot)

### Release 2 — Financeiro Básico (Semanas 9-12)
Mensalidades, pagamentos, inadimplência, dashboard KPIs, exportação CSV

### Release 3 — Financeiro Completo (Semanas 13-20)
Transações, fluxo de caixa, relatórios exportáveis, comparativo de filiais, audit log UI, deploy produção

### Release 4 — Integrações (Pós-produção)
BullMQ para jobs, geração automática de mensalidades, notificações, relatórios avançados

---

## 10. Registro de Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Requisitos financeiros incompletos (juros, desconto, parcial) | Alta | Alto | 13 perguntas levantadas para cliente — responder antes do Sprint 5 |
| Complexidade da criptografia AES para CPF/RG | Média | Alto | Implementar crypto.ts isolado com testes unitários robustos |
| Multi-tenant isolation falha | Baixa | Crítico | Testes de integração específicos para isolamento de filial |
| Performance dashboard com muitos alunos | Média | Médio | Redis cache + índices compostos + profiling desde Sprint 6 |
| LGPD não-conformidade | Baixa | Crítico | Consentimento obrigatório no cadastro + audit log completo |

---

## 11. Critérios de Sucesso

- Sistema operacional com ≥ 1 filial e ≥ 50 alunos cadastrados
- Tempo de resposta < 200ms no dashboard (cache hit)
- Zero vazamento de dados entre filiais (testes de isolamento passando)
- 100% das operações de escrita com audit log
- Deploy em produção com SSL e backup automático

---

## 12. Perguntas Abertas para o Cliente

*(Devem ser respondidas antes do Sprint 5 — módulo financeiro)*

1. O valor de mensalidade varia por turno (integral vs meio-turno) em todas as filiais?
2. Existe política de descontos? (irmãos, pagamento antecipado, bolsa?)
3. O dia de vencimento é fixo por filial ou pode variar por aluno?
4. Há cobrança de juros/multa automática por atraso?
5. Aceitar pagamento parcial (valorPago < valorDevido)?
6. Desconto por pagamento antecipado?
7. Mensalidade proporcional para matrícula no meio do mês?
8. Como distribuir despesas da matriz entre filiais?
9. Quais formas de pagamento são aceitas? (PIX, boleto, cartão?)
10. Haverá integração com gateway de pagamento futuramente?

---

## 13. Glossário

| Termo | Definição |
|-------|-----------|
| **Filial** | Unidade física de uma escolinha da rede |
| **Snapshot** | Valor de mensalidade congelado no momento da matrícula |
| **Turno** | INTEGRAL ou MEIO_TURNO (determina o valor cobrado) |
| **Inadimplente** | Aluno com mensalidade vencida e não paga |
| **Soft Delete** | Remoção lógica via campo deletedAt (dado preservado) |
| **LGPD Art. 14** | Lei brasileira que exige consentimento parental para dados de menores |
| **Multi-tenant** | Arquitetura onde uma instância serve múltiplas organizações com isolamento |
| **RBAC** | Role-Based Access Control — controle de acesso por papel/função |

---
*UpEdu PRD v1.0 — Gerado por @pm (Morgan) — Synkra AIOX*
