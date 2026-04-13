---
name: Contrato de status HTTP — AppError e ZodError
description: Status codes reais retornados pelo backend UpEdu; deve ser consultado ANTES de escrever qualquer assertiva de teste
type: feedback
---

SEMPRE consultar `backend/src/shared/errors/AppError.ts` e `error-handler.ts` antes de escrever assertivas de status code em testes de integração.

**Mapa definitivo:**

| Classe / situação | Status | Comentário |
|-------------------|--------|------------|
| `ValidationError` | **422** | NÃO é 400 |
| `ZodError` (parse manual ou schema) | **422** | NÃO é 400 |
| `NotFoundError` | 404 | correto |
| `UnauthorizedError` | 401 | correto |
| `ForbiddenError` | 403 | correto |
| `ConflictError` | 409 | correto |

**Regra sobre filialContext:**
Quando o usuário não tem acesso à filial informada no header `x-filial-id`, o middleware `filialContext` rejeita com **403** antes de o service ser chamado. Não esperar 404 nesses casos.

**Why:** Esse erro ocorreu três vezes em sprints diferentes (LGPD consent test S012, e múltiplos testes S018/S019). O user ficou frustrado com retrabalho a cada commit.

**How to apply:** Antes de escrever `expect(res.statusCode).toBe(4XX)` em qualquer teste de integração, verificar qual classe de erro o service lança e qual status code essa classe tem em AppError.ts.
