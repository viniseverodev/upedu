// Fastify error handler centralizado
// Converte AppError e erros Zod em respostas JSON padronizadas

import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from './AppError';

export function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  // Erros de domínio (AppError e subclasses)
  if (error instanceof AppError) {
    reply.status(error.statusCode).send({
      error: error.code ?? 'ERROR',
      message: error.message,
    });
    return;
  }

  // Erros de validação Zod — tanto via .parse() manual quanto via fastify-type-provider-zod
  if (error instanceof ZodError) {
    // Expõe a mensagem do primeiro erro de forma legível ao usuário
    const first = error.issues[0];
    const message = first.message;

    reply.status(422).send({
      error: 'VALIDATION_ERROR',
      message,
      details: error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
    return;
  }

  // M6: Erros Prisma conhecidos — mapeados para códigos HTTP semânticos
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      // Violação de unique constraint
      reply.status(409).send({
        error: 'CONFLICT',
        message: 'Registro já existe',
      });
      return;
    }
    if (error.code === 'P2025') {
      // M5: Registro não encontrado (ex: update/delete de ID inexistente)
      reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Registro não encontrado',
      });
      return;
    }
    if (error.code === 'P2003') {
      // M5: Violação de foreign key (ex: alunoId não existe)
      reply.status(422).send({
        error: 'FOREIGN_KEY_VIOLATION',
        message: 'Referência inválida: registro relacionado não encontrado',
      });
      return;
    }
    // Outros erros Prisma conhecidos — logar sem expor detalhes ao cliente
    request.log.error({ code: error.code, meta: error.meta }, 'Prisma known error');
    reply.status(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Erro interno do servidor',
    });
    return;
  }

  // Erro genérico — não expor detalhes em produção
  request.log.error(error);
  reply.status(500).send({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'Erro interno do servidor',
  });
}
