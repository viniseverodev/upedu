// Pino logger configuration
// JSON em produção, pretty-print em desenvolvimento

// L1: logger.ts usa process.env.NODE_ENV diretamente (exceção intencional) porque é importado
// antes da inicialização de env.ts — evitar dependência circular no startup.
// Isso é seguro: se NODE_ENV estiver ausente em produção, env.ts falhará no parse antes de
// qualquer request ser processado. O valor padrão (debug) é conservador e não expõe dados.
import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});
