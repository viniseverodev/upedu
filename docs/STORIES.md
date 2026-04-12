# Story Map e Backlog — UpEdu
**Versão:** 1.0  
**Agente:** @sm (River)  
**Status:** Draft — pronto para validação @po

---

## PARTE 1 — STORY MAP

### Backbone (Atividades do Usuário)

```
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│  1. ACESSAR  │ 2. GERENCIAR │ 3. GERENCIAR │ 4. GERENCIAR │ 5. GERENCIAR │ 6. VISUALIZAR│  7. GERAR    │ 8. CONFIGURAR│
│   SISTEMA    │   FILIAIS    │    ALUNOS    │ RESPONSÁVEIS │  FINANCEIRO  │  DASHBOARDS  │  RELATÓRIOS  │   SISTEMA    │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

### Walking Skeleton

```
┌──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│ Login email  │ Cadastrar    │ Cadastrar    │ Cadastrar    │ Gerar        │ Ver KPIs     │ Relatório    │ Cadastrar    │
│ + senha      │ filial       │ aluno        │ responsável  │ mensalidade  │ filial       │ inadimplência│ usuário      │
├──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│ Logout       │ Editar       │ Editar aluno │ Vincular     │ Registrar    │ Filtrar por  │ Exportar     │ Atribuir     │
│ seguro       │ filial       │              │ resp-aluno   │ pagamento    │ período      │ CSV/PDF      │ roles        │
├──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│ Refresh      │ Listar e     │ Inativar     │ Editar       │ Cancelar     │ Comparar     │ Relatório    │ Gerenciar    │
│ token auto   │ selecionar   │ aluno        │ responsável  │ mensalidade  │ filiais      │ fluxo caixa  │ filiais      │
├──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│ Primeiro     │ Config.      │ Lista espera │ CPF/RG       │ Transações   │ Gráficos     │              │ Audit log    │
│ acesso       │ financeira   │              │ criptografado│ financeiras  │ receita/desp │              │ consulta     │
├──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│ RBAC roles   │              │ Transferir   │              │ Categorias   │              │              │              │
│ + filiais    │              │ entre filiais│              │ financeiras  │              │              │              │
├──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│              │              │ Perfil       │              │ Relatório    │              │              │              │
│              │              │ completo     │              │ inadimplência│              │              │              │
├──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│              │              │ Exportar CSV │              │              │              │              │              │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

### Release Slicing

```
══════════════════════════════════════════════════════════════════════════════
  RELEASE 1 — MVP CORE (Sprints 1-4) ~8 semanas
──────────────────────────────────────────────────────────────────────────────
  Login+Logout | Cadastrar filial | Cadastrar aluno+LGPD | Cadastrar usuário
  Refresh JWT  | Editar filial    | Editar/Inativar       | Atribuir roles
  Primeiro     | Listar           | Matrícula + snapshot  |
  acesso       |                  | Responsáveis + crypto |
  RBAC         |                  |                       |
══════════════════════════════════════════════════════════════════════════════
  RELEASE 2 — FINANCEIRO BÁSICO (Sprints 5-7) ~6 semanas
──────────────────────────────────────────────────────────────────────────────
               |                  | Lista espera          | Gerar mensalidade
               |                  | Transferir            | Registrar pagamento
               |                  | Exportar CSV          | Cancelar mensalidade
               |                  |                       | KPIs Dashboard
               |                  |                       | Inadimplência
══════════════════════════════════════════════════════════════════════════════
  RELEASE 3 — FINANCEIRO COMPLETO (Sprints 8-10) ~6 semanas
──────────────────────────────────────────────────────────────────────────────
               | Config. financ.  | Perfil completo       | Transações
               |                  |                       | Fluxo de caixa
               |                  |                       | Relatórios export.
               |                  |                       | Comparativo filiais
               |                  |                       | Audit log UI
══════════════════════════════════════════════════════════════════════════════
  RELEASE 4 — INTEGRAÇÕES (Sprints 11-12) ~4 semanas
──────────────────────────────────────────────────────────────────────────────
               |                  |                       | BullMQ jobs
               |                  |                       | Geração auto mensal.
               |                  |                       | Dashboard avançado
══════════════════════════════════════════════════════════════════════════════
```

---

## PARTE 2 — BACKLOG DE USER STORIES

### Resumo do Backlog

| Epic | Stories | Total Pts | Release |
|------|---------|-----------|---------|
| E1 — Autenticação | S001-S005 | 24 pts | MVP |
| E2 — Filiais | S006-S008 | 11 pts | MVP |
| E3 — Usuários | S009-S010 | 8 pts | MVP |
| E4 — Alunos | S012-S017 | 27 pts | MVP + Fin. Básico |
| E5 — Responsáveis | S018-S019 | 11 pts | MVP |
| E6 — Matrículas | S020-S021 | 10 pts | MVP |
| E7 — Financeiro | S022-S028 | 35 pts | Fin. Básico + Completo |
| E8 — Dashboard | S030-S031 | 13 pts | Fin. Básico + Completo |
| E9 — Auditoria | S034-S035 | 8 pts | MVP + Completo |
| **TOTAL** | **35 stories** | **~147 pts** | 4 releases |

---

## EPIC 1 — Autenticação e Autorização

---

### STORY-001: Login com email e senha

| Campo | Valor |
|-------|-------|
| **Epic** | E1 — Autenticação e Autorização |
| **PRD Ref** | AUTH-01 |
| **Prioridade** | MUST HAVE |
| **Estimativa** | 5 pts |
| **Sprint** | Sprint 1 |
| **Dependências** | Nenhuma — story inicial |

**User Story:**
> Como **qualquer usuário do sistema**, quero **fazer login com meu email e senha**, para que **eu possa acessar as funcionalidades da minha filial com segurança**.

**Contexto:**
Sistema multi-tenant. O usuário pode ter acesso a 1 ou mais filiais. Após login válido, recebe access token (15min) + refresh token (7 dias httpOnly cookie). Login único por organização — o email é único dentro da organização, não globalmente.

**Critérios de Aceitação:**

```gherkin
Scenario: Login com credenciais válidas
  Given que o usuário tem email "joao@upedu.com" e senha cadastrada
  When ele envia POST /auth/login com { email, password }
  Then recebe HTTP 200
  And o body contém { accessToken, user: { id, nome, role, filiais[] } }
  And um cookie httpOnly "refreshToken" é setado com SameSite=Strict, Secure
  And o access token expira em 15 minutos

Scenario: Login com senha incorreta
  Given que o usuário existe mas a senha está errada
  When ele envia POST /auth/login com senha inválida
  Then recebe HTTP 401
  And a mensagem é "Credenciais inválidas"
  And NÃO revela se o email existe ou não

Scenario: Bloqueio por tentativas excessivas
  Given que houve 5 tentativas falhas nos últimos 15 minutos do mesmo IP
  When uma nova tentativa é feita
  Then recebe HTTP 429
  And a mensagem é "Muitas tentativas. Tente em 15 minutos."

Scenario: Usuário inativo
  Given que o usuário existe mas ativo=false
  When ele tenta fazer login
  Then recebe HTTP 401
  And a mensagem é "Usuário inativo. Contate o administrador."

Scenario: Primeiro acesso detectado
  Given que primeiroAcesso=true no registro do usuário
  When o login é bem-sucedido
  Then o body contém { requiresPasswordChange: true }
  And o frontend redireciona para /primeiro-acesso
```

**Regras de Negócio:**
- RN-AUTH-01: Rate limiting — máx 5 tentativas/IP/15min (Redis counter)
- RN-AUTH-02: bcrypt cost 12 para hash de senha
- RN-AUTH-03: Refresh token armazenado como hash bcrypt na tabela `refresh_tokens`
- RN-AUTH-04: Audit log registrado em cada login (sucesso e falha)

**Definition of Done:**
- [ ] Endpoint POST /auth/login implementado e funcional
- [ ] Testes unitários (service + controller) com cobertura ≥ 80%
- [ ] Teste de integração com banco real
- [ ] Rate limiting validado com Redis
- [ ] Cookie httpOnly configurado corretamente
- [ ] Audit log sendo gravado
- [ ] Lint e typecheck passando
- [ ] Documentação OpenAPI atualizada

**Tarefas Técnicas:**

*Backend:*
- [ ] Criar `AuthController` com POST /auth/login
- [ ] Criar `AuthService.login()` com validação de credenciais
- [ ] Implementar `AuthRepository.findByEmail()` + `findByEmailAndOrg()`
- [ ] Configurar Zod schema para body de login
- [ ] Implementar bcrypt.compare() para validação
- [ ] Gerar JWT access token (15min) com payload `{ sub, role, orgId }`
- [ ] Gerar refresh token (7 dias), salvar hash no banco
- [ ] Configurar cookie httpOnly via `reply.setCookie()`
- [ ] Integrar rate limiting middleware (Redis INCR/EXPIRE)
- [ ] Gravar audit log de login

*Frontend:*
- [ ] Criar página `/login` com React Hook Form
- [ ] Zod schema para validação client-side (email, senha min 8 chars)
- [ ] Mutation TanStack Query para POST /auth/login
- [ ] Armazenar accessToken no Zustand store (`authStore`)
- [ ] Redirecionar para `/primeiro-acesso` se `requiresPasswordChange`
- [ ] Tratar erros 401, 429 com toast notifications
- [ ] Layout `(auth)` sem sidebar

*DB:*
- [ ] Verificar migration do model `User` existe com campos corretos
- [ ] Verificar migration do model `RefreshToken` com `tokenHash`, `expiresAt`, `revokedAt`
- [ ] Index em `users.email` + `users.organization_id`

**Notas Técnicas:**
- Endpoint: `POST /api/v1/auth/login`
- Permissões: Público (sem autenticação)
- Validações Zod: `email.email()`, `password.min(8).max(100)`
- Segurança: Nunca revelar se email existe (timing attack prevention com `bcrypt.compare` mesmo para usuário inexistente)

**Notas UI/UX:**
- Input de senha com toggle show/hide
- Botão desabilitado durante loading (evitar double-submit)
- Mensagem de erro genérica para 401 (não revelar qual campo está errado)

**Casos de Teste:**
- TC-001-01: Login válido retorna tokens corretos
- TC-001-02: Senha errada retorna 401 sem revelar email
- TC-001-03: 5ª tentativa falha retorna 429
- TC-001-04: 6ª tentativa após 15min funciona novamente
- TC-001-05: Usuário inativo bloqueado

---

### STORY-002: Logout e invalidação de tokens

| Campo | Valor |
|-------|-------|
| **Epic** | E1 — Autenticação e Autorização |
| **PRD Ref** | AUTH-02 |
| **Prioridade** | MUST HAVE |
| **Estimativa** | 3 pts |
| **Sprint** | Sprint 1 |
| **Dependências** | STORY-001 |

**User Story:**
> Como **usuário autenticado**, quero **fazer logout do sistema**, para que **minha sessão seja encerrada com segurança e ninguém possa usar meu token**.

**Critérios de Aceitação:**

```gherkin
Scenario: Logout bem-sucedido
  Given que o usuário está autenticado com access token válido
  When ele envia POST /auth/logout com o cookie refreshToken
  Then recebe HTTP 200
  And o refresh token é marcado como revokedAt=now() no banco
  And o cookie refreshToken é removido (maxAge=0)
  And o access token é adicionado ao Redis blacklist com TTL=15min

Scenario: Logout sem cookie
  Given que a requisição não possui cookie refreshToken
  When POST /auth/logout é chamado
  Then recebe HTTP 200 (idempotente — logout já ocorreu)

Scenario: Token de acesso blacklistado
  Given que o usuário fez logout e o access token foi blacklistado
  When ele tenta acessar qualquer rota protegida com o mesmo access token
  Then recebe HTTP 401 com mensagem "Token inválido"
```

**Tarefas Técnicas:**

*Backend:*
- [ ] POST /auth/logout — extrair jti do JWT, adicionar ao Redis com TTL
- [ ] Marcar refresh token como revogado no banco
- [ ] Limpar cookie via `reply.clearCookie('refreshToken')`
- [ ] Middleware `authenticate.ts` checar blacklist Redis antes de autorizar

*Frontend:*
- [ ] Botão logout no menu do usuário
- [ ] Ao logout: limpar `authStore`, redirecionar para `/login`
- [ ] Interceptor Axios: em 401 com "Token inválido" → forçar logout

---

### STORY-003: Refresh token e renovação automática de sessão

| Campo | Valor |
|-------|-------|
| **Epic** | E1 — Autenticação e Autorização |
| **PRD Ref** | AUTH-03 |
| **Prioridade** | MUST HAVE |
| **Estimativa** | 5 pts |
| **Sprint** | Sprint 1 |
| **Dependências** | STORY-001, STORY-002 |

**User Story:**
> Como **usuário trabalhando no sistema**, quero que **minha sessão seja renovada automaticamente enquanto estou ativo**, para que **não seja deslogado no meio de uma operação**.

**Critérios de Aceitação:**

```gherkin
Scenario: Renovação automática com refresh token válido
  Given que o access token expirou mas o refresh token é válido
  When a aplicação envia POST /auth/refresh com o cookie refreshToken
  Then recebe HTTP 200
  And um novo access token é retornado
  And o refresh token atual é revogado (revokedAt=now())
  And um novo refresh token é gerado e setado no cookie (rotação obrigatória)

Scenario: Refresh token já revogado (uso suspeito)
  Given que um refresh token foi revogado anteriormente
  When alguém tenta usá-lo novamente
  Then recebe HTTP 401
  And TODOS os refresh tokens do usuário são revogados (detecção de roubo)
  And audit log registra "SUSPICIOUS_TOKEN_REUSE"

Scenario: Refresh token expirado
  Given que o refresh token passou de 7 dias
  When POST /auth/refresh é chamado
  Then recebe HTTP 401
  And o frontend redireciona para /login

Scenario: Queue de requests concorrentes
  Given que múltiplas requisições são feitas simultaneamente com o mesmo access token expirado
  When a renovação ocorre
  Then apenas uma requisição dispara o refresh
  And as demais aguardam e usam o novo token
```

**Tarefas Técnicas:**

*Backend:*
- [ ] POST /auth/refresh — validar cookie, verificar banco, gerar novo par de tokens
- [ ] Implementar detecção de roubo: se token já revogado, revogar TODOS do usuário
- [ ] Rotation obrigatória: sempre gerar novo refresh token

*Frontend:*
- [ ] Interceptor Axios: ao receber 401, verificar se `!isRefreshRequest`, disparar refresh
- [ ] Implementar fila de requests pendentes durante refresh (Promise queue pattern)
- [ ] Se refresh falhar: forçar logout e redirecionar para /login

---

### STORY-004: Primeiro acesso e troca de senha obrigatória

| Campo | Valor |
|-------|-------|
| **Epic** | E1 — Autenticação e Autorização |
| **PRD Ref** | AUTH-04 |
| **Prioridade** | MUST HAVE |
| **Estimativa** | 3 pts |
| **Sprint** | Sprint 2 |
| **Dependências** | STORY-001 |

**User Story:**
> Como **usuário que foi cadastrado pelo administrador**, quero **ser obrigado a trocar minha senha no primeiro acesso**, para que **a senha temporária não permaneça válida**.

**Critérios de Aceitação:**

```gherkin
Scenario: Fluxo de primeiro acesso
  Given que primeiroAcesso=true após login bem-sucedido
  When o usuário acessa qualquer rota protegida exceto /primeiro-acesso
  Then é redirecionado para /primeiro-acesso (middleware bloqueia)

Scenario: Troca de senha no primeiro acesso
  Given que o usuário está na tela de primeiro acesso
  When ele preenche nova senha e confirmação válidas
  Then a senha é atualizada no banco com bcrypt cost 12
  And primeiroAcesso é setado para false
  And o usuário é redirecionado para o dashboard

Scenario: Senha fraca rejeitada
  Given que a nova senha tem menos de 8 caracteres ou não atende critérios
  When o formulário é submetido
  Then recebe erro de validação com critérios específicos
```

**Tarefas Técnicas:**

*Backend:*
- [ ] POST /auth/change-password — validar acesso, atualizar hash, setar `primeiroAcesso=false`
- [ ] Middleware: se `user.primeiroAcesso=true`, bloquear todas as rotas exceto `/auth/*`

*Frontend:*
- [ ] Página `/primeiro-acesso` com campo nova senha + confirmação
- [ ] Validação: mín 8 chars, 1 maiúscula, 1 número
- [ ] Indicador de força de senha
- [ ] Após sucesso: redirecionar para dashboard

---

### STORY-005: RBAC — Controle de acesso por role e filial

| Campo | Valor |
|-------|-------|
| **Epic** | E1 — Autenticação e Autorização |
| **PRD Ref** | AUTH-01, USERS-03 |
| **Prioridade** | MUST HAVE |
| **Estimativa** | 8 pts |
| **Sprint** | Sprint 2 |
| **Dependências** | STORY-001, STORY-009 |

**User Story:**
> Como **sistema**, preciso **garantir que cada usuário acesse apenas os recursos autorizados para sua role e filial**, para que **dados de uma filial não sejam visíveis para usuários de outra filial**.

**Critérios de Aceitação:**

```gherkin
Scenario: SUPER_ADMIN acessa qualquer filial
  Given que o usuário tem role SUPER_ADMIN
  When ele acessa endpoints de qualquer filial
  Then tem acesso irrestrito a todas as operações

Scenario: GERENTE_FILIAL acessa apenas sua filial
  Given que o usuário é GERENTE_FILIAL da filial "Centro"
  When ele tenta acessar dados da filial "Norte"
  Then recebe HTTP 403 "Acesso negado a esta filial"

Scenario: Middleware de isolamento por filial
  Given que qualquer request autenticado inclui header x-filial-id
  When o middleware processa a requisição
  Then valida que o usuário tem acesso à filial solicitada
  And injeta filialId em todas as queries do Prisma automaticamente

Scenario: ATENDENTE não cria usuários
  Given que o usuário tem role ATENDENTE
  When tenta acessar POST /users
  Then recebe HTTP 403
```

**Tarefas Técnicas:**

*Backend:*
- [ ] Middleware `authenticate.ts`: validar JWT + Redis blacklist
- [ ] Middleware `authorize.ts`: factory `authorize(roles[])` verificar role
- [ ] Middleware `filial-context.ts`: validar x-filial-id vs user.filiais[], injetar no context
- [ ] Decorator/helper `requireFilial()` para rotas que precisam de filial
- [ ] Testes de integração: matriz completa de roles × endpoints

*Frontend:*
- [ ] Hook `usePermission(role)` para condicional de UI
- [ ] Hook `useFilial()` para filial ativa do Zustand store
- [ ] Interceptor: sempre enviar `x-filial-id` header nas requests
- [ ] Sidebar: renderizar menus condicionalmente por role

---

## EPIC 2 — Gestão de Filiais

---

### STORY-006: Cadastro de filial

| Campo | Valor |
|-------|-------|
| **Epic** | E2 — Gestão de Filiais |
| **PRD Ref** | FILIAL-01 |
| **Prioridade** | MUST HAVE |
| **Estimativa** | 5 pts |
| **Sprint** | Sprint 2 |
| **Dependências** | STORY-005 |

**User Story:**
> Como **SUPER_ADMIN ou ADMIN_MATRIZ**, quero **cadastrar uma nova filial**, para que **a unidade comece a operar no sistema com sua própria configuração**.

**Critérios de Aceitação:**

```gherkin
Scenario: Cadastro bem-sucedido
  Given que o usuário é SUPER_ADMIN ou ADMIN_MATRIZ
  When envia POST /filiais com dados válidos
  Then a filial é criada com ativo=true
  And retorna HTTP 201 com a filial criada
  And audit log registra a criação

Scenario: CNPJ duplicado na organização
  Given que já existe filial com o mesmo CNPJ na organização
  When tenta criar nova filial com mesmo CNPJ
  Then recebe HTTP 409 "CNPJ já cadastrado nesta organização"

Scenario: Campos obrigatórios ausentes
  Given que nome ou CNPJ não foram enviados
  When POST /filiais é chamado
  Then recebe HTTP 422 com erros de validação por campo
```

**Tarefas Técnicas:**

*Backend:*
- [ ] POST /filiais — autorizar apenas SUPER_ADMIN/ADMIN_MATRIZ
- [ ] Zod schema: `nome.min(3)`, `cnpj` com validação de formato
- [ ] Verificar CNPJ único por organização antes de criar
- [ ] Criar filial com `ativo=true`

*Frontend:*
- [ ] Página `/filiais/nova` com form
- [ ] Mask de CNPJ no input
- [ ] Validação client-side com Zod
- [ ] Após sucesso: redirecionar para lista de filiais com toast success

*DB:*
- [ ] Unique constraint `(cnpj, organization_id)` na migration

---

### STORY-007: Edição e configuração financeira de filial

| Campo | Valor |
|-------|-------|
| **Epic** | E2 — Gestão de Filiais |
| **PRD Ref** | FILIAL-01, FILIAL-02 |
| **Prioridade** | MUST HAVE |
| **Estimativa** | 3 pts |
| **Sprint** | Sprint 2 |
| **Dependências** | STORY-006 |

**User Story:**
> Como **ADMIN_MATRIZ**, quero **editar os dados e configurações financeiras de uma filial**, para que **o sistema calcule mensalidades corretamente para cada unidade**.

**Critérios de Aceitação:**

```gherkin
Scenario: Edição de configuração financeira
  Given que o usuário é ADMIN_MATRIZ
  When envia PATCH /filiais/:id com { diaVencimento: 10, valorMensalidadeIntegral: 450.00, valorMensalidadeMeioTurno: 250.00 }
  Then os valores são atualizados
  And mensalidades JÁ GERADAS não são afetadas (snapshot nas matrículas)
  And novas matrículas usam os novos valores

Scenario: Desativação de filial
  Given que a filial não tem alunos com matrículas ativas
  When ADMIN_MATRIZ envia PATCH /filiais/:id com { ativo: false }
  Then a filial é desativada
  And não aparece mais na seleção de filial ativa

Scenario: Tentativa de desativar filial com alunos ativos
  Given que a filial tem alunos com status=ATIVO
  When tenta desativar a filial
  Then recebe HTTP 422 "Filial possui X alunos ativos. Transfira-os antes de desativar."
```

**Tarefas Técnicas:**

*Backend:*
- [ ] PATCH /filiais/:id — validar ownership da organização
- [ ] Guard: verificar alunos ativos antes de desativar
- [ ] Atualizar apenas campos enviados (partial update)

*Frontend:*
- [ ] Página `/filiais/:id/editar`
- [ ] Campos: nome, CNPJ, endereço, diaVencimento (select 1-28), valorIntegral, valorMeioTurno
- [ ] Confirmação modal para desativação

---

### STORY-008: Listagem e seleção de filial ativa

| Campo | Valor |
|-------|-------|
| **Epic** | E2 — Gestão de Filiais |
| **PRD Ref** | FILIAL-01 |
| **Prioridade** | MUST HAVE |
| **Estimativa** | 3 pts |
| **Sprint** | Sprint 2 |
| **Dependências** | STORY-006, STORY-005 |

**User Story:**
> Como **usuário com acesso a múltiplas filiais**, quero **selecionar a filial ativa no sistema**, para que **todas as operações sejam realizadas no contexto correto**.

**Critérios de Aceitação:**

```gherkin
Scenario: Usuário com uma filial — seleção automática
  Given que o usuário tem acesso a apenas 1 filial
  When ele faz login
  Then a filial é selecionada automaticamente
  And não é exibido o seletor de filial

Scenario: Usuário com múltiplas filiais — seleção manual
  Given que o usuário tem acesso a 3 filiais
  When ele faz login
  Then é exibido um seletor de filial
  And deve escolher uma para prosseguir ao dashboard

Scenario: SUPER_ADMIN vê todas as filiais
  Given que o usuário é SUPER_ADMIN
  When acessa o seletor de filial
  Then vê todas as filiais ativas da organização
```

**Tarefas Técnicas:**

*Frontend:*
- [ ] Componente `FilialSelector` no topo da sidebar
- [ ] `filialStore` Zustand: `activeFilialId`, `setActiveFilial()`
- [ ] Ao trocar de filial: invalidar todos os queries do TanStack Query
- [ ] Persistir filial ativa no localStorage (recuperar no reload)

---

## EPIC 3 — Gestão de Usuários

---

### STORY-009: Cadastro de usuário com convite

| Campo | Valor |
|-------|-------|
| **Epic** | E3 — Gestão de Usuários |
| **PRD Ref** | USERS-01, USERS-02 |
| **Prioridade** | MUST HAVE |
| **Estimativa** | 5 pts |
| **Sprint** | Sprint 3 |
| **Dependências** | STORY-005, STORY-006 |

**User Story:**
> Como **SUPER_ADMIN ou ADMIN_MATRIZ**, quero **cadastrar um novo usuário definindo sua role e filiais de acesso**, para que **a pessoa possa acessar o sistema com as permissões corretas**.

**Critérios de Aceitação:**

```gherkin
Scenario: Cadastro de usuário com role e filial
  Given que o usuário é ADMIN_MATRIZ
  When envia POST /users com { nome, email, role: "GERENTE_FILIAL", filialIds: ["uuid1"] }
  Then o usuário é criado com primeiroAcesso=true e senha temporária
  And a associação UserFilial é criada para cada filialId
  And audit log registra a criação

Scenario: Email duplicado na organização
  Given que já existe usuário com o mesmo email
  When tenta criar outro com o mesmo email
  Then recebe HTTP 409 "Email já cadastrado"

Scenario: GERENTE_FILIAL não cria ADMIN_MATRIZ
  Given que o criador é GERENTE_FILIAL
  When tenta criar usuário com role ADMIN_MATRIZ ou SUPER_ADMIN
  Then recebe HTTP 403 "Sem permissão para criar esta role"
```

**Tarefas Técnicas:**

*Backend:*
- [ ] POST /users — validar que criador só atribui roles ≤ sua própria hierarquia
- [ ] Gerar senha temporária aleatória (16 chars)
- [ ] Hash bcrypt da senha temporária
- [ ] Criar UserFilial para cada filialId fornecido
- [ ] Enviar email com senha temporária (futuro: nodemailer)

*Frontend:*
- [ ] Página `/usuarios/novo` com form
- [ ] Select de role (filtrado pela role do usuário logado)
- [ ] Multi-select de filiais
- [ ] Mostrar senha temporária gerada após criação (modal)

*DB:*
- [ ] Migration UserFilial com composite PK `(userId, filialId)`

---

### STORY-010: Edição e desativação de usuário

| Campo | Valor |
|-------|-------|
| **Epic** | E3 — Gestão de Usuários |
| **PRD Ref** | USERS-02 |
| **Prioridade** | MUST HAVE |
| **Estimativa** | 3 pts |
| **Sprint** | Sprint 3 |
| **Dependências** | STORY-009 |

**User Story:**
> Como **ADMIN_MATRIZ**, quero **editar ou desativar um usuário**, para que **permissões sejam atualizadas quando necessário e ex-colaboradores percam o acesso imediatamente**.

**Critérios de Aceitação:**

```gherkin
Scenario: Desativação imediata
  Given que o usuário existe e está ativo
  When ADMIN_MATRIZ envia PATCH /users/:id com { ativo: false }
  Then o usuário é marcado como inativo
  And todos os refresh tokens do usuário são revogados imediatamente
  And próximos logins são bloqueados

Scenario: Edição de filiais de acesso
  Given que o usuário é GERENTE_FILIAL das filiais A e B
  When ADMIN_MATRIZ remove filial B e adiciona filial C
  Then a associação com B é removida e C é criada
  And o usuário perde acesso à B e ganha à C
```

**Tarefas Técnicas:**

*Backend:*
- [ ] PATCH /users/:id — permitir edição de nome, role, filialIds, ativo
- [ ] Ao desativar: revogar todos RefreshTokens do usuário (UPDATE SET revokedAt=now())
- [ ] Ao revogar refresh tokens: adicionar JTIs ativos ao Redis blacklist

---

## EPIC 4 — Gestão de Alunos

---

### STORY-012: Cadastro de aluno com conformidade LGPD

| Campo | Valor |
|-------|-------|
| **Epic** | E4 — Gestão de Alunos |
| **PRD Ref** | ALUNO-01 |
| **Prioridade** | MUST HAVE |
| **Estimativa** | 8 pts |
| **Sprint** | Sprint 3 |
| **Dependências** | STORY-005, STORY-008 |

**User Story:**
> Como **ATENDENTE ou GERENTE_FILIAL**, quero **cadastrar um novo aluno na filial ativa com os dados obrigatórios**, para que **a criança conste no sistema e possa ser matriculada**.

**Critérios de Aceitação:**

```gherkin
Scenario: Cadastro bem-sucedido com consentimento
  Given que o usuário tem acesso à filial ativa
  When envia POST /alunos com dados válidos incluindo consentimentoResponsavel=true
  Then o aluno é criado com status=PRE_MATRICULA e filialId da filial ativa
  And consentimentoTimestamp é gravado automaticamente como now()
  And HTTP 201 é retornado

Scenario: Cadastro sem consentimento parental
  Given que o campo consentimentoResponsavel=false ou ausente
  When POST /alunos é chamado
  Then recebe HTTP 422 "Consentimento parental obrigatório (LGPD Art. 14)"

Scenario: Isolamento por filial
  Given que o usuário é GERENTE_FILIAL da filial "Norte"
  When tenta criar aluno com filialId da filial "Sul"
  Then recebe HTTP 403

Scenario: Campos obrigatórios
  Given que nome ou dataNascimento estão ausentes
  When POST /alunos é chamado
  Then recebe HTTP 422 com erros por campo
```

**Regras de Negócio:**
- RN-ALUNO-01: `consentimentoResponsavel=true` é OBRIGATÓRIO (LGPD Art. 14)
- RN-ALUNO-02: `filialId` é sempre inferido do contexto (middleware), não pode ser fornecido pelo cliente
- RN-ALUNO-03: Status inicial sempre `PRE_MATRICULA`
- RN-ALUNO-04: `deletedAt=null` por padrão (soft delete)

**Tarefas Técnicas:**

*Backend:*
- [ ] POST /alunos — filialId do contexto (middleware), nunca do body
- [ ] Zod schema com `consentimentoResponsavel: z.literal(true)` (forçar true)
- [ ] Auto-setar `consentimentoTimestamp: new Date()` no service
- [ ] Status inicial `PRE_MATRICULA`
- [ ] Audit log da criação

*Frontend:*
- [ ] Formulário de cadastro de aluno com campos: nome, dataNascimento, turno, observações
- [ ] Checkbox obrigatório "Confirmo o consentimento parental (LGPD)"
- [ ] Datepicker para data de nascimento
- [ ] Após criação: opção de "Adicionar responsável agora" ou "Fazer depois"

*DB:*
- [ ] Verificar migration `Aluno` com todos os campos incluindo `consentimento_timestamp`

---

### STORY-013: Edição e inativação de aluno

| Campo | Valor |
|-------|-------|
| **Epic** | E4 — Gestão de Alunos |
| **PRD Ref** | ALUNO-02 |
| **Prioridade** | MUST HAVE |
| **Estimativa** | 3 pts |
| **Sprint** | Sprint 3 |
| **Dependências** | STORY-012 |

**User Story:**
> Como **ATENDENTE**, quero **editar os dados de um aluno ou inativá-lo**, para que **as informações estejam sempre atualizadas e alunos que saíram não apareçam nos relatórios ativos**.

**Critérios de Aceitação:**

```gherkin
Scenario: Edição de dados
  Given que o aluno existe na filial ativa
  When PATCH /alunos/:id com dados atualizados é enviado
  Then os campos editáveis são atualizados
  And audit log registra old/new values

Scenario: Inativação de aluno
  Given que o aluno tem status=ATIVO
  When PATCH /alunos/:id com { status: "INATIVO" } é enviado
  Then status é atualizado para INATIVO
  And matrícula ativa (se existir) é encerrada com dataFim=now()
  And mensalidades futuras pendentes são canceladas

Scenario: Soft delete (LGPD)
  Given que o aluno precisa ser removido definitivamente após 5 anos
  When o processo de anonimização é executado (admin)
  Then dados pessoais são anonimizados
  And anonimizadoEm é setado
  And registros financeiros são preservados para compliance
```

**Tarefas Técnicas:**

*Backend:*
- [ ] PATCH /alunos/:id — campos editáveis: nome, dataNascimento, turno, observações
- [ ] Ao mudar status para INATIVO: encerrar matrícula ativa, cancelar mensalidades futuras
- [ ] Endpoint separado DELETE /alunos/:id (soft delete apenas — setar `deletedAt`)
- [ ] Todas as queries de listagem filtram `WHERE deleted_at IS NULL`

---

### STORY-014: Lista de espera

| Campo | Valor |
|-------|-------|
| **Epic** | E4 — Gestão de Alunos |
| **PRD Ref** | ALUNO-03 |
| **Prioridade** | SHOULD HAVE |
| **Estimativa** | 3 pts |
| **Sprint** | Sprint 6 |
| **Dependências** | STORY-012 |

**User Story:**
> Como **ATENDENTE**, quero **incluir um aluno na lista de espera quando não há vagas**, para que **ele seja atendido quando surgir uma vaga disponível**.

**Critérios de Aceitação:**

```gherkin
Scenario: Inclusão na lista de espera
  Given que não há vagas no turno solicitado
  When o aluno é criado com status=LISTA_ESPERA
  Then aparece na lista de espera ordenado por data de criação

Scenario: Promoção da lista de espera
  Given que há aluno na lista de espera
  When ATENDENTE aciona "Promover para ativo"
  Then status muda para PRE_MATRICULA
  And o aluno sai da lista de espera
  And posição dos demais é recalculada
```

---

### STORY-015: Transferência entre filiais

| Campo | Valor |
|-------|-------|
| **Epic** | E4 — Gestão de Alunos |
| **PRD Ref** | ALUNO-04 |
| **Prioridade** | SHOULD HAVE |
| **Estimativa** | 5 pts |
| **Sprint** | Sprint 6 |
| **Dependências** | STORY-012, STORY-020 |

**User Story:**
> Como **ADMIN_MATRIZ**, quero **transferir um aluno de uma filial para outra**, para que **o histórico seja preservado e o aluno continue matriculado na nova filial**.

**Critérios de Aceitação:**

```gherkin
Scenario: Transferência com histórico preservado
  Given que o aluno está ativo na filial "Norte"
  When ADMIN_MATRIZ solicita transferência para filial "Sul"
  Then filialId do aluno é atualizado para "Sul"
  And matrícula atual é encerrada com dataFim=hoje
  And nova matrícula é criada na filial "Sul" com valorMensalidade atual da filial destino
  And histórico de matrículas preserva o registro anterior

Scenario: Transferência bloqueada — mensalidades em aberto
  Given que o aluno tem mensalidades com status=PENDENTE na filial origem
  When transferência é solicitada
  Then recebe aviso "Aluno possui X mensalidade(s) em aberto na filial atual"
  And admin pode confirmar mesmo assim (warning, não bloqueio)
```

---

### STORY-016: Perfil completo do aluno

| Campo | Valor |
|-------|-------|
| **Epic** | E4 — Gestão de Alunos |
| **PRD Ref** | ALUNO-05 |
| **Prioridade** | SHOULD HAVE |
| **Estimativa** | 5 pts |
| **Sprint** | Sprint 5 |
| **Dependências** | STORY-012, STORY-018, STORY-020 |

**User Story:**
> Como **ATENDENTE**, quero **visualizar o perfil completo de um aluno em uma única tela**, para que **eu tenha todos os dados relevantes sem precisar navegar entre seções**.

**Critérios de Aceitação:**

```gherkin
Scenario: Visualização do perfil completo
  Given que o aluno existe na filial ativa
  When acessa GET /alunos/:id
  Then retorna: dados pessoais + responsáveis vinculados + matrícula atual + 
                últimas 5 mensalidades + histórico de status
```

**Tarefas Técnicas:**

*Backend:*
- [ ] GET /alunos/:id com include Prisma: `responsaveis, matriculas, mensalidades (últimas 5)`
- [ ] Retornar CPF/RG dos responsáveis descriptografados e mascarados

*Frontend:*
- [ ] Tabs: Dados Pessoais | Responsáveis | Financeiro | Histórico
- [ ] Card de status com badge colorido
- [ ] Timeline de histórico de status

---

### STORY-017: Exportação de alunos por CSV

| Campo | Valor |
|-------|-------|
| **Epic** | E4 — Gestão de Alunos |
| **PRD Ref** | ALUNO-06 |
| **Prioridade** | COULD HAVE |
| **Estimativa** | 3 pts |
| **Sprint** | Sprint 6 |
| **Dependências** | STORY-012 |

**User Story:**
> Como **GERENTE_FILIAL**, quero **exportar a lista de alunos em CSV**, para que **possa fazer análises externas ou controle em planilhas**.

**Critérios de Aceitação:**

```gherkin
Scenario: Exportação CSV filtrada
  Given que o usuário solicita exportação
  When GET /alunos/export?status=ATIVO&format=csv
  Then retorna arquivo CSV com campos: nome, dataNascimento, status, turno, responsávelNome, telefone
  And CPF/RG NÃO são incluídos no CSV (proteção LGPD)
  And o download inicia automaticamente no browser
```

---

## EPIC 5 — Gestão de Responsáveis

---

### STORY-018: Cadastro de responsável com dados sensíveis

| Campo | Valor |
|-------|-------|
| **Epic** | E5 — Gestão de Responsáveis |
| **PRD Ref** | RESP-01 |
| **Prioridade** | MUST HAVE |
| **Estimativa** | 8 pts |
| **Sprint** | Sprint 4 |
| **Dependências** | STORY-005 |

**User Story:**
> Como **ATENDENTE**, quero **cadastrar um responsável com CPF e RG**, para que **os dados de identificação estejam disponíveis com segurança no sistema**.

**Critérios de Aceitação:**

```gherkin
Scenario: Cadastro com criptografia de CPF/RG
  Given que o usuário envia POST /responsaveis com { nome, cpf, rg, telefone, email }
  When o service processa os dados
  Then CPF e RG são criptografados com AES-256-GCM antes de salvar
  And o banco armazena apenas os bytes cifrados (BYTEA)
  And HTTP 201 retorna dados SEM CPF/RG (ou mascarados: "***.***.789-**")

Scenario: CPF inválido rejeitado
  Given que o CPF não passa na validação de dígitos verificadores
  When POST /responsaveis é chamado
  Then recebe HTTP 422 "CPF inválido"

Scenario: Descriptografia para visualização autorizada
  Given que GERENTE_FILIAL acessa perfil do responsável
  When GET /responsaveis/:id é chamado
  Then CPF/RG são descriptografados e retornados mascarados: "•••.•••.789-00"
  And acesso é registrado no audit log
```

**Tarefas Técnicas:**

*Backend:*
- [ ] Criar `utils/crypto.ts` com `encrypt(text)` e `decrypt(bytes)` usando AES-256-GCM
- [ ] Chave de criptografia via variável de ambiente `ENCRYPTION_KEY` (32 bytes, via Doppler)
- [ ] `ResponsavelService.create()`: chamar `encrypt(cpf)` e `encrypt(rg)` antes de salvar
- [ ] `ResponsavelService.findById()`: chamar `decrypt()` e mascarar retorno
- [ ] Validação de CPF: algoritmo de dígitos verificadores no Zod custom

*Frontend:*
- [ ] Form com mask para CPF (999.999.999-99) e RG
- [ ] Exibir CPF/RG mascarados na listagem
- [ ] Botão "Revelar CPF" (trigger audit log no backend)

*DB:*
- [ ] Campos `cpf_enc BYTEA`, `rg_enc BYTEA` no schema Prisma

---

### STORY-019: Vinculação responsável-aluno

| Campo | Valor |
|-------|-------|
| **Epic** | E5 — Gestão de Responsáveis |
| **PRD Ref** | RESP-01 |
| **Prioridade** | MUST HAVE |
| **Estimativa** | 3 pts |
| **Sprint** | Sprint 4 |
| **Dependências** | STORY-012, STORY-018 |

**User Story:**
> Como **ATENDENTE**, quero **vincular um responsável a um aluno**, para que **seja possível contatar e cobrar o responsável financeiro**.

**Critérios de Aceitação:**

```gherkin
Scenario: Vínculo com responsável financeiro
  Given que aluno e responsável existem
  When POST /alunos/:id/responsaveis com { responsavelId, parentesco: "MAE", isResponsavelFinanceiro: true }
  Then o vínculo é criado
  And apenas 1 responsável pode ser financeiro por aluno (upsert)

Scenario: Múltiplos responsáveis
  Given que o aluno já tem 1 responsável
  When outro responsável é vinculado com isResponsavelFinanceiro=false
  Then ambos são listados no perfil do aluno

Scenario: Desvincular responsável
  Given que o vínculo existe
  When DELETE /alunos/:alunoId/responsaveis/:responsavelId
  Then o vínculo é removido (hard delete — tabela de relacionamento)
```

---

## EPIC 6 — Matrículas

---

### STORY-020: Criação de matrícula com snapshot de valor

| Campo | Valor |
|-------|-------|
| **Epic** | E6 — Matrículas |
| **PRD Ref** | MATRIC-01 |
| **Prioridade** | MUST HAVE |
| **Estimativa** | 8 pts |
| **Sprint** | Sprint 4 |
| **Dependências** | STORY-012, STORY-019 |

**User Story:**
> Como **ATENDENTE**, quero **matricular um aluno capturando o valor de mensalidade atual da filial**, para que **reajustes futuros não alterem o valor contratado na matrícula**.

**Critérios de Aceitação:**

```gherkin
Scenario: Matrícula com snapshot de valor
  Given que o aluno tem status=PRE_MATRICULA e a filial tem valorMensalidadeIntegral=450.00
  When POST /matriculas com { alunoId, turno: "INTEGRAL", dataInicio: "2025-02-01" }
  Then matrícula é criada com valorMensalidade=450.00 (snapshot do momento)
  And status do aluno muda para ATIVO
  And HTTP 201 retorna a matrícula criada

Scenario: Apenas 1 matrícula ativa por aluno
  Given que o aluno já tem matrícula com status=ATIVA
  When tenta criar nova matrícula
  Then recebe HTTP 422 "Aluno já possui matrícula ativa"

Scenario: Snapshot é imutável após criação
  Given que a filial atualiza valorMensalidadeIntegral para 500.00
  When matrícula existente é consultada
  Then valorMensalidade permanece 450.00

Scenario: Aluno sem responsável financeiro
  Given que o aluno não tem responsável com isResponsavelFinanceiro=true
  When tenta criar matrícula
  Then recebe HTTP 422 "Aluno precisa ter responsável financeiro para ser matriculado"
```

**Tarefas Técnicas:**

*Backend:*
- [ ] POST /matriculas — buscar `filial.valorMensalidadeIntegral` ou `valorMensalidadeMeioTurno` conforme turno
- [ ] Salvar snapshot no campo `valorMensalidade` da matrícula
- [ ] Verificar aluno não tem matrícula ATIVA
- [ ] Verificar aluno tem responsável financeiro
- [ ] Atualizar `aluno.status = ATIVO`
- [ ] Transação Prisma: criar matrícula + atualizar aluno em uma única tx

*Frontend:*
- [ ] Modal "Nova Matrícula" acessível do perfil do aluno
- [ ] Exibir valor que será cobrado baseado no turno selecionado
- [ ] Confirmação antes de finalizar

---

### STORY-021: Histórico de matrículas

| Campo | Valor |
|-------|-------|
| **Epic** | E6 — Matrículas |
| **PRD Ref** | MATRIC-02 |
| **Prioridade** | SHOULD HAVE |
| **Estimativa** | 2 pts |
| **Sprint** | Sprint 5 |
| **Dependências** | STORY-020 |

**User Story:**
> Como **ATENDENTE**, quero **visualizar o histórico completo de matrículas de um aluno**, para que **eu entenda o histórico de permanência e eventuais transferências**.

**Critérios de Aceitação:**

```gherkin
Scenario: Listagem de histórico
  Given que o aluno tem 3 matrículas (2 encerradas + 1 ativa)
  When GET /alunos/:id/matriculas
  Then retorna todas ordenadas por dataInicio DESC
  And inclui: status, turno, valorMensalidade (snapshot), dataInicio, dataFim, nomeDaFilial
```

---

## EPIC 7 — Gestão Financeira

---

### STORY-022: Geração manual de mensalidade

| Campo | Valor |
|-------|-------|
| **Epic** | E7 — Gestão Financeira |
| **PRD Ref** | FIN-01 |
| **Prioridade** | MUST HAVE |
| **Estimativa** | 8 pts |
| **Sprint** | Sprint 5 |
| **Dependências** | STORY-020 |

**User Story:**
> Como **ATENDENTE**, quero **gerar uma mensalidade para um aluno matriculado**, para que **o sistema registre o valor a ser cobrado no mês de referência**.

**Critérios de Aceitação:**

```gherkin
Scenario: Geração de mensalidade
  Given que o aluno tem matrícula ativa com valorMensalidade=450.00
  When POST /mensalidades com { alunoId, mesReferencia: 3, anoReferencia: 2025 }
  Then mensalidade é criada com status=PENDENTE e valorOriginal=450.00
  And dataVencimento é calculada como dia diaVencimento da filial no mês/ano referência
  And HTTP 201 retorna a mensalidade

Scenario: Idempotência — mensalidade duplicada
  Given que já existe mensalidade para o mesmo aluno/mês/ano
  When tenta gerar novamente
  Then recebe HTTP 409 "Mensalidade já existe para este mês"
  And a mensalidade existente é retornada (não cria nova)

Scenario: Geração para aluno sem matrícula ativa
  Given que o aluno está com status=INATIVO
  When tenta gerar mensalidade
  Then recebe HTTP 422 "Aluno não possui matrícula ativa"
```

**Tarefas Técnicas:**

*Backend:*
- [ ] POST /mensalidades com constraint idempotência `@@unique([alunoId, mesReferencia, anoReferencia])`
- [ ] Calcular dataVencimento: `new Date(ano, mes-1, filial.diaVencimento)`
- [ ] Tratar dia 31 em meses de 28/29/30 dias (usar último dia do mês)
- [ ] `valorOriginal` = `matricula.valorMensalidade` (snapshot)

*Frontend:*
- [ ] Botão "Gerar Mensalidade" na aba Financeiro do perfil do aluno
- [ ] Seletor de mês/ano de referência
- [ ] Exibir valor e data de vencimento calculados antes de confirmar

---

### STORY-023: Registro de pagamento

| Campo | Valor |
|-------|-------|
| **Epic** | E7 — Gestão Financeira |
| **PRD Ref** | FIN-02 |
| **Prioridade** | MUST HAVE |
| **Estimativa** | 5 pts |
| **Sprint** | Sprint 5 |
| **Dependências** | STORY-022 |

**User Story:**
> Como **ATENDENTE**, quero **registrar o pagamento de uma mensalidade**, para que **a situação financeira do aluno fique atualizada**.

**Critérios de Aceitação:**

```gherkin
Scenario: Pagamento total
  Given que a mensalidade está PENDENTE com valorOriginal=450.00
  When PATCH /mensalidades/:id/pagar com { valorPago: 450.00, formaPagamento: "PIX", dataPagamento: "2025-03-10" }
  Then status muda para PAGO
  And valorPago, formaPagamento e dataPagamento são registrados

Scenario: Pagamento com desconto
  Given que mensalidade tem valorOriginal=450.00
  When pago com { valorPago: 400.00, valorDesconto: 50.00 }
  Then status=PAGO, valorDesconto=50.00 é registrado

Scenario: Mensalidade já paga
  Given que status=PAGO
  When tenta registrar pagamento novamente
  Then recebe HTTP 422 "Mensalidade já foi paga"
```

**Perguntas em Aberto (aguardar cliente):**
- Aceitar pagamento parcial (valorPago < valorDevido)?
- Calcular juros automaticamente se dataPagamento > dataVencimento?

---

### STORY-024: Cancelamento de mensalidade

| Campo | Valor |
|-------|-------|
| **Epic** | E7 — Gestão Financeira |
| **PRD Ref** | FIN-03 |
| **Prioridade** | MUST HAVE |
| **Estimativa** | 2 pts |
| **Sprint** | Sprint 5 |
| **Dependências** | STORY-022 |

**User Story:**
> Como **GERENTE_FILIAL**, quero **cancelar uma mensalidade**, para que **cobranças incorretas sejam removidas do sistema**.

**Critérios de Aceitação:**

```gherkin
Scenario: Cancelamento de mensalidade pendente
  Given que mensalidade está PENDENTE
  When PATCH /mensalidades/:id com { status: "CANCELADA", motivoCancelamento: "Erro de lançamento" }
  Then status muda para CANCELADA
  And audit log registra cancelamento com motivo

Scenario: Tentativa de cancelar mensalidade paga
  Given que mensalidade está PAGA
  When tenta cancelar
  Then recebe HTTP 422 "Mensalidade paga não pode ser cancelada. Use estorno."
```

---

### STORY-025: Atualização automática de status e inadimplência

| Campo | Valor |
|-------|-------|
| **Epic** | E7 — Gestão Financeira |
| **PRD Ref** | FIN-04, FIN-05 |
| **Prioridade** | MUST HAVE |
| **Estimativa** | 5 pts |
| **Sprint** | Sprint 6 |
| **Dependências** | STORY-022 |

**User Story:**
> Como **sistema**, preciso **marcar automaticamente mensalidades vencidas como inadimplentes**, para que **o relatório de inadimplência reflita a situação real**.

**Critérios de Aceitação:**

```gherkin
Scenario: Marcação automática de inadimplência
  Given que mensalidade está PENDENTE e dataVencimento < today
  When o job diário de atualização executa
  Then status muda para INADIMPLENTE

Scenario: Relatório de inadimplência por filial
  Given que existem mensalidades INADIMPLENTES na filial ativa
  When GET /relatorios/inadimplencia?filialId=X&mes=3&ano=2025
  Then retorna lista de alunos inadimplentes com: nome, responsável, valor, dias de atraso
```

**Tarefas Técnicas:**

*Backend:*
- [ ] Job `updateOverdueStatus`: diário, busca `status=PENDENTE AND dataVencimento < today`, atualiza para INADIMPLENTE
- [ ] Implementação inicial: node-cron (BullMQ na Release 4)
- [ ] Endpoint GET /relatorios/inadimplencia com filtros

---

### STORY-027: Cadastro de transações financeiras

| Campo | Valor |
|-------|-------|
| **Epic** | E7 — Gestão Financeira |
| **PRD Ref** | TRANS-01, TRANS-02 |
| **Prioridade** | SHOULD HAVE |
| **Estimativa** | 5 pts |
| **Sprint** | Sprint 7 |
| **Dependências** | STORY-005, STORY-008 |

**User Story:**
> Como **GERENTE_FILIAL**, quero **registrar receitas e despesas da filial**, para que **o fluxo de caixa reflita todos os movimentos financeiros**.

**Critérios de Aceitação:**

```gherkin
Scenario: Registro de despesa
  Given que existe categoria "Aluguel" do tipo DESPESA
  When POST /transacoes com { tipo: "SAIDA", categoriaId, descricao: "Aluguel Mar/25", valor: 3000.00, dataTransacao: "2025-03-05" }
  Then transação é criada vinculada à filial ativa
  And aparece no fluxo de caixa

Scenario: Registro de receita extra
  Given que existe categoria "Eventos" do tipo RECEITA
  When POST /transacoes com { tipo: "ENTRADA", categoriaId, valor: 500.00 }
  Then receita é registrada

Scenario: Gestão de categorias
  Given que GERENTE_FILIAL acessa /categorias
  When cria nova categoria { nome: "Manutenção", tipo: "DESPESA" }
  Then categoria é criada e disponível nos formulários de transação
```

---

### STORY-028: Fluxo de caixa

| Campo | Valor |
|-------|-------|
| **Epic** | E7 — Gestão Financeira |
| **PRD Ref** | TRANS-03 |
| **Prioridade** | SHOULD HAVE |
| **Estimativa** | 5 pts |
| **Sprint** | Sprint 7 |
| **Dependências** | STORY-023, STORY-027 |

**User Story:**
> Como **GERENTE_FILIAL**, quero **visualizar o fluxo de caixa da filial por período**, para que **eu saiba a situação financeira da unidade**.

**Critérios de Aceitação:**

```gherkin
Scenario: Fluxo de caixa mensal
  Given que existem transações e pagamentos no mês
  When GET /relatorios/fluxo-caixa?mes=3&ano=2025
  Then retorna: totalReceitas (mensalidades pagas + receitas), totalDespesas, saldo
  And detalha por categoria

Scenario: Exportação CSV
  When ?format=csv é adicionado à query
  Then retorna arquivo CSV com todas as transações do período
```

---

## EPIC 8 — Dashboard e Relatórios

---

### STORY-030: Dashboard KPIs

| Campo | Valor |
|-------|-------|
| **Epic** | E8 — Dashboard e Relatórios |
| **PRD Ref** | DASH-01 |
| **Prioridade** | SHOULD HAVE |
| **Estimativa** | 8 pts |
| **Sprint** | Sprint 6 |
| **Dependências** | STORY-012, STORY-022 |

**User Story:**
> Como **GERENTE_FILIAL**, quero **ver os principais indicadores da minha filial no dashboard**, para que **eu tenha uma visão rápida da situação operacional e financeira**.

**Critérios de Aceitação:**

```gherkin
Scenario: Carregamento do dashboard com cache
  Given que o usuário acessa o dashboard
  When GET /dashboard/kpis?filialId=X
  Then retorna em < 200ms (dados do cache Redis)
  And contém: totalAlunos(ativo/inativo/lista_espera), receitaMes, inadimplentes, taxaOcupacao

Scenario: Cache invalidado em eventos relevantes
  Given que um pagamento é registrado
  When o serviço de pagamento processa
  Then o cache Redis dos KPIs da filial é invalidado (TTL 5min ou invalidação imediata)

Scenario: Dados sem cache (primeira vez ou expirado)
  Given que o cache está vazio
  When GET /dashboard/kpis é chamado
  Then dados são calculados do banco e salvos no Redis por 5min
```

**Tarefas Técnicas:**

*Backend:*
- [ ] GET /dashboard/kpis — verificar Redis antes de calcular
- [ ] Calcular: `COUNT(alunos) GROUP BY status`, `SUM(mensalidades.valorPago) WHERE mes=atual`, `COUNT(mensalidades WHERE status=INADIMPLENTE)`
- [ ] Cache key: `kpis:filial:{filialId}:mes:{YYYY-MM}`
- [ ] Invalidação: service de pagamento/matricula chama `redis.del(key)`

*Frontend:*
- [ ] Grid de cards KPIs: Alunos Ativos, Inadimplentes, Receita do Mês, Taxa de Ocupação
- [ ] Gráfico de barras: mensalidades pagas vs pendentes vs inadimplentes (Recharts)
- [ ] Loading skeleton enquanto carrega
- [ ] Auto-refresh a cada 5 minutos

---

### STORY-031: Filtros e comparativo de filiais

| Campo | Valor |
|-------|-------|
| **Epic** | E8 — Dashboard e Relatórios |
| **PRD Ref** | DASH-02 |
| **Prioridade** | COULD HAVE |
| **Estimativa** | 5 pts |
| **Sprint** | Sprint 8 |
| **Dependências** | STORY-030 |

**User Story:**
> Como **ADMIN_MATRIZ**, quero **comparar KPIs de múltiplas filiais no mesmo dashboard**, para que **eu tome decisões estratégicas baseadas em dados consolidados**.

---

## EPIC 9 — Auditoria e Segurança

---

### STORY-034: Log de auditoria automático

| Campo | Valor |
|-------|-------|
| **Epic** | E9 — Auditoria e Segurança |
| **PRD Ref** | AUDIT-01 |
| **Prioridade** | MUST HAVE |
| **Estimativa** | 5 pts |
| **Sprint** | Sprint 3 |
| **Dependências** | STORY-005 |

**User Story:**
> Como **sistema**, preciso **registrar automaticamente todas as operações de criação, edição e exclusão**, para que **haja rastreabilidade completa de mudanças para fins de auditoria e compliance**.

**Critérios de Aceitação:**

```gherkin
Scenario: Registro automático de alteração
  Given que qualquer operação de escrita é realizada
  When o middleware de auditoria intercepta a resposta
  Then cria registro em audit_logs com: userId, filialId, action(CREATE/UPDATE/DELETE), entityType, entityId, oldValues(JSON), newValues(JSON), ipAddress, createdAt

Scenario: Log imutável
  Given que um audit log foi criado
  When qualquer processo tenta atualizar ou deletar o registro
  Then a operação é bloqueada (sem endpoints de update/delete para audit_logs)

Scenario: Captura de oldValues
  Given que um aluno é editado
  When PATCH /alunos/:id é executado
  Then o audit log contém os valores ANTES da edição em oldValues
  And os novos valores em newValues
```

**Tarefas Técnicas:**

*Backend:*
- [ ] Middleware `audit.ts`: chamar após operações de escrita
- [ ] Helper `auditLog(action, entityType, entityId, oldValues, newValues)` no contexto do request
- [ ] Schema `AuditLog` sem `updated_at` e sem `deleted_at` (imutável por design)
- [ ] Nenhum endpoint de DELETE ou UPDATE para audit_logs

---

### STORY-035: Interface de consulta de audit log

| Campo | Valor |
|-------|-------|
| **Epic** | E9 — Auditoria e Segurança |
| **PRD Ref** | AUDIT-02 |
| **Prioridade** | SHOULD HAVE |
| **Estimativa** | 3 pts |
| **Sprint** | Sprint 8 |
| **Dependências** | STORY-034 |

**User Story:**
> Como **SUPER_ADMIN ou ADMIN_MATRIZ**, quero **consultar o histórico de auditoria com filtros**, para que **eu investigue ações suspeitas ou rastreie alterações específicas**.

**Critérios de Aceitação:**

```gherkin
Scenario: Consulta de logs com filtros
  Given que o usuário acessa /auditoria
  When filtra por { userId, entityType: "Aluno", dateFrom: "2025-03-01", dateTo: "2025-03-31" }
  Then retorna logs paginados (50/página) ordenados por createdAt DESC

Scenario: Exportação de log
  When GET /auditoria?format=csv
  Then retorna CSV com: timestamp, usuário, ação, entidade, IP
```

---

## PARTE 3 — SPRINT PLANNING

| Sprint | Objetivo | Stories | Pontos |
|--------|----------|---------|--------|
| **Sprint 1** | Foundation & Auth Core | S001, S002, S003 | 13 pts |
| **Sprint 2** | Auth Complete + Filiais | S004, S005, S006, S007, S008 | 17 pts |
| **Sprint 3** | Usuários + Alunos Core + Auditoria | S009, S010, S012, S034 | 21 pts |
| **Sprint 4** | Responsáveis + Matrículas | S013, S018, S019, S020 | 22 pts |
| **Sprint 5** | Financeiro Core | S016, S021, S022, S023, S024 | 23 pts |
| **Sprint 6** | Financeiro Avançado + Dashboard | S014, S015, S017, S025, S030 | 24 pts |
| **Sprint 7** | Transações + Fluxo de Caixa | S027, S028 | 10 pts |
| **Sprint 8** | Relatórios + Audit UI | S031, S035 | 8 pts |
| **Sprint 9** | Polish + Performance | E2E, bugs, refinamentos | — |
| **Sprint 10** | Release Prep + Deploy | Infra, SSL, smoke tests | — |

### Marcos

| Marco | Sprint | Entregável |
|-------|--------|-----------|
| **MVP Core** | Sprint 4 / Semana 8 | Login, filiais, alunos, responsáveis, matrículas |
| **Financeiro Básico** | Sprint 6 / Semana 12 | Mensalidades, pagamentos, dashboard KPIs |
| **Financeiro Completo** | Sprint 8 / Semana 16 | Transações, relatórios, auditoria |
| **Produção** | Sprint 10 / Semana 20 | Sistema completo em VPS |

### Setup obrigatório antes do Sprint 1
- [ ] Scaffolding monorepo: `/backend`, `/frontend`, `/docs`
- [ ] Docker Compose: PostgreSQL 15 + Redis 7
- [ ] Backend: Fastify + Prisma + TypeScript strict
- [ ] Frontend: Next.js 14 + Tailwind + shadcn/ui
- [ ] CI/CD: GitHub Actions básico (lint + typecheck)
- [ ] Doppler: configuração de secrets
- [ ] Prisma migrations iniciais

---

## PARTE 4 — ROADMAP VISUAL TIMELINE

```
Semanas:  1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20
          │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │
Sprint:   [──S1──][──S2──][──S3──][──S4──][──S5──][──S6──][──S7──][──S8──][──S9──][─S10─]

Auth:     [Login/Logout/Refresh──────][Primeiro acesso/RBAC]
Filiais:                    [Cadastro/Edição/Seleção──────]
Usuários:                             [CRUD usuarios─────]
Alunos:                               [Cadastro/LGPD─────][Perfil][Espera/Transfer/CSV]
Responsáveis:                                      [CRUD + Crypto]
Matrículas:                                        [Criação snapshot][Histórico]
Auditoria:                            [Auto log─────────────────────────────][UI────]
Financeiro:                                                [Core: Gerar/Pagar/Cancel]
                                                                   [Inadimpl./Transfer]
                                                                             [Transações]
                                                                             [Fluxo caixa]
Dashboard:                                                         [KPIs + Cache]
                                                                               [Comparativo]

Marcos:                              ★MVP                ★FIN.BÁSICO  ★FIN.COMPLETO ★PROD
                                    (S4/W8)              (S6/W12)     (S8/W16)      (S10/W20)
```

---
*UpEdu Stories v1.0 — Gerado por @sm (River) — Synkra AIOX*
