// Testes unitários — FiliaisService (S006, S007, S008)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FAKE_USER_ID, FAKE_ORG_ID, FAKE_FILIAL_ID } from '../fixtures';

// --- Mocks com vi.hoisted ---

const mockRepo = vi.hoisted(() => ({
  findAllByOrg: vi.fn(),
  findActiveByOrg: vi.fn(),
  findActiveByUserId: vi.fn(),
  findAllByUserId: vi.fn(),
  findById: vi.fn(),
  findByCnpjAndOrg: vi.fn(),
  countActiveAlunos: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

const mockAuditLog = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('../../src/modules/filiais/filiais.repository', () => ({
  FiliaisRepository: vi.fn(() => mockRepo),
}));

vi.mock('../../src/middlewares/audit', () => ({
  createAuditLog: mockAuditLog,
}));

vi.mock('../../src/config/redis', () => ({
  redis: { setex: vi.fn(), get: vi.fn().mockResolvedValue(null), del: vi.fn().mockResolvedValue(1) },
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

import { FiliaisService } from '../../src/modules/filiais/filiais.service';
import { ConflictError, NotFoundError, ValidationError } from '../../src/shared/errors/AppError';

function makeFilial(overrides: Record<string, unknown> = {}) {
  return {
    id: FAKE_FILIAL_ID,
    organizationId: FAKE_ORG_ID,
    nome: 'Filial Teste',
    cnpj: '12345678000195',
    diaVencimento: 10,
    valorMensalidadeManha: 1200,
    valorMensalidadeTarde: 700,
    ativo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const CREATE_INPUT = {
  nome: 'Nova Filial',
  cnpj: '98765432000100',
  diaVencimento: 10,
  valorMensalidadeManha: 1200,
  valorMensalidadeTarde: 700,
};

// --- S006: create ---

describe('FiliaisService.create()', () => {
  let service: FiliaisService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FiliaisService();
  });

  it('cria filial com sucesso e registra audit log', async () => {
    mockRepo.findByCnpjAndOrg.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(makeFilial({ cnpj: CREATE_INPUT.cnpj }));

    const result = await service.create(FAKE_ORG_ID, FAKE_USER_ID, CREATE_INPUT);

    expect(result.id).toBe(FAKE_FILIAL_ID);
    expect(mockRepo.create).toHaveBeenCalledOnce();
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE', entityType: 'Filial' })
    );
  });

  it('lança ConflictError para CNPJ duplicado na organização', async () => {
    mockRepo.findByCnpjAndOrg.mockResolvedValue(makeFilial());

    await expect(
      service.create(FAKE_ORG_ID, FAKE_USER_ID, CREATE_INPUT)
    ).rejects.toThrow(ConflictError);

    expect(mockRepo.create).not.toHaveBeenCalled();
  });
});

// --- S007: update ---

describe('FiliaisService.update()', () => {
  let service: FiliaisService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FiliaisService();
  });

  it('atualiza filial com sucesso e registra audit log', async () => {
    mockRepo.findById.mockResolvedValue(makeFilial());
    mockRepo.update.mockResolvedValue(makeFilial({ nome: 'Novo Nome' }));

    const result = await service.update(FAKE_FILIAL_ID, FAKE_ORG_ID, FAKE_USER_ID, {
      nome: 'Novo Nome',
    });

    expect(result.nome).toBe('Novo Nome');
    expect(mockAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'UPDATE', entityType: 'Filial' })
    );
  });

  it('lança NotFoundError quando filial não pertence à organização', async () => {
    mockRepo.findById.mockResolvedValue(makeFilial({ organizationId: 'outra-org' }));

    await expect(
      service.update(FAKE_FILIAL_ID, FAKE_ORG_ID, FAKE_USER_ID, { nome: 'X' })
    ).rejects.toThrow(NotFoundError);
  });

  it('lança NotFoundError quando filial não existe', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      service.update(FAKE_FILIAL_ID, FAKE_ORG_ID, FAKE_USER_ID, { ativo: false })
    ).rejects.toThrow(NotFoundError);
  });

  it('lança ValidationError ao tentar desativar filial com alunos ativos', async () => {
    mockRepo.findById.mockResolvedValue(makeFilial({ ativo: true }));
    mockRepo.countActiveAlunos.mockResolvedValue(5);

    const err = await service
      .update(FAKE_FILIAL_ID, FAKE_ORG_ID, FAKE_USER_ID, { ativo: false })
      .catch((e) => e);

    expect(err).toBeInstanceOf(ValidationError);
    expect(err.message).toContain('5 aluno(s) ativo(s)');
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  it('desativa filial com sucesso quando não há alunos ativos', async () => {
    mockRepo.findById.mockResolvedValue(makeFilial({ ativo: true }));
    mockRepo.countActiveAlunos.mockResolvedValue(0);
    mockRepo.update.mockResolvedValue(makeFilial({ ativo: false }));

    const result = await service.update(FAKE_FILIAL_ID, FAKE_ORG_ID, FAKE_USER_ID, {
      ativo: false,
    });

    expect(result.ativo).toBe(false);
    expect(mockRepo.update).toHaveBeenCalledOnce();
  });
});

// --- S008: list ---

describe('FiliaisService.list()', () => {
  let service: FiliaisService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FiliaisService();
    mockRepo.findAllByOrg.mockResolvedValue([makeFilial()]);
    mockRepo.findAllByUserId.mockResolvedValue([makeFilial()]);
  });

  it('ADMIN_MATRIZ vê todas as filiais da organização', async () => {
    await service.list(FAKE_USER_ID, FAKE_ORG_ID, 'ADMIN_MATRIZ');
    expect(mockRepo.findAllByOrg).toHaveBeenCalledWith(FAKE_ORG_ID);
    expect(mockRepo.findAllByUserId).not.toHaveBeenCalled();
  });

  it('SUPER_ADMIN vê todas as filiais da organização', async () => {
    await service.list(FAKE_USER_ID, FAKE_ORG_ID, 'SUPER_ADMIN');
    expect(mockRepo.findAllByOrg).toHaveBeenCalledWith(FAKE_ORG_ID);
  });

  it('GERENTE_FILIAL vê apenas suas filiais atribuídas', async () => {
    await service.list(FAKE_USER_ID, FAKE_ORG_ID, 'GERENTE_FILIAL');
    expect(mockRepo.findAllByUserId).toHaveBeenCalledWith(FAKE_USER_ID);
    expect(mockRepo.findAllByOrg).not.toHaveBeenCalled();
  });
});
