// Fixtures e helpers compartilhados para testes
// Usados tanto em unit como integration tests

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export const TEST_ENV = {
  JWT_SECRET: 'test-jwt-secret-minimum-32-characters-long',
  JWT_REFRESH_SECRET: 'test-refresh-secret-minimum-32-chars',
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  ENCRYPTION_KEY: '0'.repeat(64),
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://test_user:test_pass@localhost:5432/upedu_test',
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  FRONTEND_URL: 'http://localhost:3000',
  NODE_ENV: 'test' as const,
  PORT: 3002,
};

export const FAKE_ORG_ID = uuidv4();
export const FAKE_USER_ID = uuidv4();
export const FAKE_FILIAL_ID = uuidv4();

export async function makePasswordHash(password = 'Senha123') {
  return bcrypt.hash(password, 4); // cost 4 em testes para velocidade
}

export function makeAccessToken(
  overrides: Partial<{
    sub: string;
    jti: string;
    role: string;
    orgId: string;
    primeiroAcesso: boolean;
  }> = {}
) {
  const payload = {
    sub: FAKE_USER_ID,
    jti: uuidv4(),
    role: 'ATENDENTE',
    orgId: FAKE_ORG_ID,
    primeiroAcesso: false,
    ...overrides,
  };
  return jwt.sign(payload, TEST_ENV.JWT_SECRET, { expiresIn: '15m' });
}

export function makeRefreshToken(userId = FAKE_USER_ID, jti = uuidv4()) {
  const raw = jwt.sign({ sub: userId, jti }, TEST_ENV.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { raw, jti };
}

export async function makeRefreshTokenHash(jti: string) {
  return bcrypt.hash(jti, 4);
}

export function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: FAKE_USER_ID,
    organizationId: FAKE_ORG_ID,
    nome: 'Usuário Teste',
    email: 'teste@upedu.com',
    passwordHash: '$2b$04$placeholderhashXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    role: 'ATENDENTE' as const,
    ativo: true,
    primeiroAcesso: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    filiais: [{ filialId: FAKE_FILIAL_ID }],
    ...overrides,
  };
}
