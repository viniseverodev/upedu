// Fastify error handler centralizado
// Converte AppError e erros Zod em respostas JSON padronizadas

import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
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

  // Erros de validação Zod (via fastify-type-provider-zod)
  if ((error as FastifyError).statusCode === 400 && error.name === 'ZodError') {
    reply.status(422).send({
      error: 'VALIDATION_ERROR',
      message: 'Dados inválidos',
      details: (error as any).issues,
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
