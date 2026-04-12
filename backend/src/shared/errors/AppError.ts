// Hierarquia de erros — ADR-001 (Fastify)
// Todos os erros de domínio estendem AppError para tratamento centralizado

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 422, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} não encontrado`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}
