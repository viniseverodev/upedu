// Testes unitários — AuthService (S001, S002, S003, S004)
// Padrão vitest: vi.hoisted + factory mock garante que mocks são aplicados antes do import

import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { makeUser, makeRefreshToken, makeRefreshTokenHash, FAKE_USER_ID } from '../fixtures';

// --- Mocks com vi.hoisted (executados antes dos imports) ---

const mockRepo = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  findById: vi.fn(),
  saveRefreshToken: vi.fn(),
  findActiveTokensByUser: vi.fn(),
  revokeTokenById: vi.fn(),
  revokeRefreshTokenByJti: vi.fn(),
  revokeAllUserTokens: vi.fn(),
  updatePassword: vi.fn(),
}));

const mockAuditLog = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRedisSetex = vi.hoisted(() => vi.fn().mockResolvedValue('OK'));

vi.mock('../../src/modules/auth/auth.repository', () => ({
  AuthRepository: vi.fn(() => mockRepo),
}));

vi.mock('../../src/middlewares/audit', () => ({
  createAuditLog: mockAuditLog,
}));

vi.mock('../../src/config/redis', () => ({
  redis: { setex: mockRedisSetex, get: vi.fn().mockResolvedValue(null) },
  REDIS_TTL: { ACCESS_TOKEN_BLACKLIST: 900, RATE_LIMIT_LOGIN: 900, KPI_CACHE: 300, FILIAL_CACHE: 3600 },
}));

vi.mock('../../src/config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret-minimum-32-characters-long',
    JWT_REFRESH_SECRET: 'test-refresh-secret-minimum-32-chars',
    JWT_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    ENCRYPTION_KEY: '0'.repeat(64),
    NODE_ENV: 'test',
    PORT: 3002,
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    FRONTEND_URL: 'http://localhost:3000',
  },
}));

// Importar DEPOIS dos mocks
import { AuthService } from '../../src/modules/auth/auth.service';
import { UnauthorizedError } from '../../src/shared/errors/AppError';

// --- S001: login ---

describe('AuthService.login()', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService();
    mockRepo.saveRefreshToken.mockResolvedValue({});
  });

  it('retorna accessToken, refreshToken e user em login válido', async () => {
    const user = makeUser();
    user.passwordHash = await bcrypt.hash('Senha123', 4);
    mockRepo.findByEmail.mockResolvedValue(user);

    const result = await service.login({ email: user.email, password: 'Senha123' }, '127.0.0.1');

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user.id).toBe(user.id);
    expect(result.requiresPasswordChange).toBe(false);
    expect(mockRepo.saveRefreshToken).toHaveBeenCalledOnce();
    expect(mockAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: 'LOGIN' }));
  });

  it('lança UnauthorizedError com mensagem genérica para senha incorreta', async () => {
    const user = makeUser();
    user.passwordHash = await bcrypt.hash('SenhaCorreta1', 4);
    mockRepo.findByEmail.mockResolvedValue(user);

    await expect(
      service.login({ email: user.email, password: 'SenhaErrada1' }, '127.0.0.1')
    ).rejects.toThrow(UnauthorizedError);
  });

  it('lança UnauthorizedError para email inexistente (mesma mensagem — sem revelar email)', async () => {
    mockRepo.findByEmail.mockResolvedValue(null);

    const err = await service.login({ email: 'nao@existe.com', password: 'Qualquer1' }, '127.0.0.1')
      .catch((e) => e);

    expect(err).toBeInstanceOf(UnauthorizedError);
    expect(err.message).toBe('Credenciais inválidas');
  });

  it('lança UnauthorizedError com mensagem específica para usuário inativo', async () => {
    const user = makeUser({ ativo: false });
    user.passwordHash = await bcrypt.hash('Senha123', 4);
    mockRepo.findByEmail.mockResolvedValue(user);

    const err = await service.login({ email: user.email, password: 'Senha123' }, '127.0.0.1')
      .catch((e) => e);

    expect(err).toBeInstanceOf(UnauthorizedError);
    expect(err.message).toContain('inativo');
  });

  it('retorna requiresPasswordChange=true quando primeiroAcesso=true', async () => {
    const user = makeUser({ primeiroAcesso: true, ativo: true });
    user.passwordHash = await bcrypt.hash('Senha123', 4);
    mockRepo.findByEmail.mockResolvedValue(user);

    const result = await service.login({ email: user.email, password: 'Senha123' }, '127.0.0.1');

    expect(result.requiresPasswordChange).toBe(true);
  });
});

// --- S002: logout ---

describe('AuthService.logout()', () => {
  let service: AuthService;
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: FAKE_USER_ID,
    jti: uuidv4(),
    role: 'ATENDENTE',
    orgId: uuidv4(),
    primeiroAcesso: false,
    iat: now,
    exp: now + 900,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService();
    mockRepo.revokeRefreshTokenByJti.mockResolvedValue(true);
  });

  it('adiciona access token ao Redis blacklist', async () => {
    await service.logout(payload);

    expect(mockRedisSetex).toHaveBeenCalledWith(
      `blacklist:jwt:${payload.jti}`,
      expect.any(Number),
      '1'
    );
  });

  it('registra audit log de LOGOUT', async () => {
    await service.logout(payload);

    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGOUT', userId: FAKE_USER_ID })
    );
  });
});

// --- S003: refresh ---

describe('AuthService.refresh()', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService();
  });

  it('lança UnauthorizedError quando refresh token não fornecido', async () => {
    const err = await service.refresh(undefined).catch((e) => e);
    expect(err).toBeInstanceOf(UnauthorizedError);
    expect(err.message).toContain('não encontrado');
  });

  it('lança UnauthorizedError para JWT com assinatura inválida', async () => {
    const err = await service.refresh('token.invalido.aqui').catch((e) => e);
    expect(err).toBeInstanceOf(UnauthorizedError);
  });

  it('rotaciona tokens com sucesso e revoga o token anterior', async () => {
    const { raw: refreshTokenRaw, jti } = makeRefreshToken();
    const tokenHash = await makeRefreshTokenHash(jti);
    const tokenId = uuidv4();

    mockRepo.findActiveTokensByUser.mockResolvedValue([
      { id: tokenId, userId: FAKE_USER_ID, tokenHash, expiresAt: new Date(Date.now() + 86400000), revokedAt: null, createdAt: new Date() },
    ]);
    mockRepo.revokeTokenById.mockResolvedValue({});
    mockRepo.findById.mockResolvedValue(makeUser());
    mockRepo.saveRefreshToken.mockResolvedValue({});

    const result = await service.refresh(refreshTokenRaw);

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.refreshToken).not.toBe(refreshTokenRaw);
    expect(mockRepo.revokeTokenById).toHaveBeenCalledWith(tokenId);
    expect(mockRepo.saveRefreshToken).toHaveBeenCalledOnce();
  });

  it('revoga TODOS os tokens e registra SUSPICIOUS_TOKEN_REUSE em reutilização de token revogado', async () => {
    const { raw: refreshTokenRaw } = makeRefreshToken();

    mockRepo.findActiveTokensByUser.mockResolvedValue([]);
    mockRepo.revokeAllUserTokens.mockResolvedValue({});

    const err = await service.refresh(refreshTokenRaw).catch((e) => e);

    expect(err).toBeInstanceOf(UnauthorizedError);
    expect(err.message).toContain('Sessão inválida');
    expect(mockRepo.revokeAllUserTokens).toHaveBeenCalledWith(FAKE_USER_ID);
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SUSPICIOUS_TOKEN_REUSE' })
    );
  });

  it('lança UnauthorizedError se usuário foi inativado após emissão do token', async () => {
    const { raw: refreshTokenRaw, jti } = makeRefreshToken();
    const tokenHash = await makeRefreshTokenHash(jti);

    mockRepo.findActiveTokensByUser.mockResolvedValue([
      { id: uuidv4(), userId: FAKE_USER_ID, tokenHash, expiresAt: new Date(Date.now() + 86400000), revokedAt: null, createdAt: new Date() },
    ]);
    mockRepo.revokeTokenById.mockResolvedValue({});
    mockRepo.findById.mockResolvedValue(makeUser({ ativo: false }));

    const err = await service.refresh(refreshTokenRaw).catch((e) => e);

    expect(err).toBeInstanceOf(UnauthorizedError);
    expect(err.message).toContain('inativo');
  });
});

// --- S004: changePassword ---

describe('AuthService.changePassword()', () => {
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService();
    // BUG-011/015: service agora chama findById, revokeAllUserTokens e saveRefreshToken
    mockRepo.updatePassword.mockResolvedValue({});
    mockRepo.revokeAllUserTokens.mockResolvedValue({});
    mockRepo.saveRefreshToken.mockResolvedValue({});
  });

  it('primeiroAcesso=true — troca senha sem currentPassword e emite novo par de tokens', async () => {
    const user = makeUser({ primeiroAcesso: true });
    user.passwordHash = await bcrypt.hash('SenhaTemp1', 4);
    mockRepo.findById.mockResolvedValue(user);

    const result = await service.changePassword(FAKE_USER_ID, undefined, 'NovaSenha1');

    expect(mockRepo.updatePassword).toHaveBeenCalledOnce();
    const [calledUserId, calledHash] = mockRepo.updatePassword.mock.calls[0];
    expect(calledUserId).toBe(FAKE_USER_ID);

    const isValid = await bcrypt.compare('NovaSenha1', calledHash);
    expect(isValid).toBe(true);

    // BUG-015: sessões anteriores revogadas
    expect(mockRepo.revokeAllUserTokens).toHaveBeenCalledWith(FAKE_USER_ID);
    // BUG-011: novo refresh token emitido
    expect(mockRepo.saveRefreshToken).toHaveBeenCalledOnce();
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();

    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE', entityId: FAKE_USER_ID })
    );
  });

  it('primeiroAcesso=false — valida currentPassword correta e troca senha', async () => {
    const user = makeUser({ primeiroAcesso: false });
    user.passwordHash = await bcrypt.hash('SenhaAtual1', 4);
    mockRepo.findById.mockResolvedValue(user);

    const result = await service.changePassword(FAKE_USER_ID, 'SenhaAtual1', 'NovaSenha1');

    expect(mockRepo.updatePassword).toHaveBeenCalledOnce();
    expect(mockRepo.revokeAllUserTokens).toHaveBeenCalledWith(FAKE_USER_ID);
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE', entityId: FAKE_USER_ID })
    );
  });

  it('lança UnauthorizedError para currentPassword incorreta (primeiroAcesso=false)', async () => {
    const user = makeUser({ primeiroAcesso: false });
    user.passwordHash = await bcrypt.hash('SenhaCorreta1', 4);
    mockRepo.findById.mockResolvedValue(user);

    const err = await service
      .changePassword(FAKE_USER_ID, 'SenhaErrada1', 'NovaSenha1')
      .catch((e) => e);

    expect(err).toBeInstanceOf(UnauthorizedError);
    expect(err.message).toContain('incorreta');
    expect(mockRepo.updatePassword).not.toHaveBeenCalled();
  });

  it('lança UnauthorizedError quando currentPassword ausente e primeiroAcesso=false', async () => {
    const user = makeUser({ primeiroAcesso: false });
    mockRepo.findById.mockResolvedValue(user);

    const err = await service
      .changePassword(FAKE_USER_ID, undefined, 'NovaSenha1')
      .catch((e) => e);

    expect(err).toBeInstanceOf(UnauthorizedError);
    expect(err.message).toContain('obrigatória');
    expect(mockRepo.updatePassword).not.toHaveBeenCalled();
  });

  it('lança UnauthorizedError quando usuário não encontrado', async () => {
    mockRepo.findById.mockResolvedValue(null);

    const err = await service
      .changePassword(FAKE_USER_ID, undefined, 'NovaSenha1')
      .catch((e) => e);

    expect(err).toBeInstanceOf(UnauthorizedError);
    expect(err.message).toContain('não encontrado');
    expect(mockRepo.updatePassword).not.toHaveBeenCalled();
  });
});
