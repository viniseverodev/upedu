// Testes de integração — Filiais (S006, S007, S008)

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { redis } from '../../src/config/redis';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

const ORG_ID = uuidv4();
const ADMIN_ID = uuidv4();
const ATENDENTE_ID = uuidv4();
const FILIAL_ID = uuidv4();
const ADMIN_EMAIL = `admin-filiais-${Date.now()}@upedu.com`;
const ATENDENTE_EMAIL = `atendente-filiais-${Date.now()}@upedu.com`;

let adminToken: string;
let atendenteToken: string;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();

  await prisma.organization.create({
    data: { id: ORG_ID, nome: 'Org Filiais Teste', cnpj: `${Date.now()}`.padStart(14, '0'), email: 'org@filiais.com' },
  });

  const hash = await bcrypt.hash('Senha123', 4);

  // Criar filial inicial para os testes de update/list
  await prisma.filial.create({
    data: {
      id: FILIAL_ID,
      organizationId: ORG_ID,
      nome: 'Filial Inicial',
      cnpj: '11111111000100',
      valorMensalidadeIntegral: 1000,
      valorMensalidadeMeioTurno: 600,
    },
  });

  await prisma.user.create({
    data: {
      id: ADMIN_ID,
      organizationId: ORG_ID,
      nome: 'Admin Filiais',
      email: ADMIN_EMAIL,
      passwordHash: hash,
      role: 'ADMIN_MATRIZ',
      ativo: true,
      primeiroAcesso: false,
      filiais: { create: [{ filialId: FILIAL_ID }] },
    },
  });

  await prisma.user.create({
    data: {
      id: ATENDENTE_ID,
      organizationId: ORG_ID,
      nome: 'Atendente Filiais',
      email: ATENDENTE_EMAIL,
      passwordHash: hash,
      role: 'ATENDENTE',
      ativo: true,
      primeiroAcesso: false,
      filiais: { create: [{ filialId: FILIAL_ID }] },
    },
  });

  // Obter tokens
  const adminLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: ADMIN_EMAIL, password: 'Senha123' },
  });
  adminToken = adminLogin.json().accessToken;

  const atendenteLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    remoteAddress: '192.168.10.1',
    payload: { email: ATENDENTE_EMAIL, password: 'Senha123' },
  });
  atendenteToken = atendenteLogin.json().accessToken;
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { filialId: FILIAL_ID } });
  await prisma.auditLog.deleteMany({ where: { userId: { in: [ADMIN_ID, ATENDENTE_ID] } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: [ADMIN_ID, ATENDENTE_ID] } } });
  await prisma.userFilial.deleteMany({ where: { userId: { in: [ADMIN_ID, ATENDENTE_ID] } } });
  await prisma.user.deleteMany({ where: { id: { in: [ADMIN_ID, ATENDENTE_ID] } } });
  await prisma.filial.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.organization.delete({ where: { id: ORG_ID } }).catch(() => {});

  await app.close();
  await prisma.$disconnect();
  redis.disconnect();
});

beforeEach(async () => {
  await redis.del(`rate:login:127.0.0.1`);
  await redis.del(`rate:login:192.168.10.1`);
});

// --- S008: GET /filiais ---

describe('GET /api/v1/filiais', () => {
  it('ADMIN_MATRIZ vê todas as filiais da organização', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/filiais',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((f: { id: string }) => f.id === FILIAL_ID)).toBe(true);
  });

  it('retorna 401 sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/filiais' });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/v1/filiais/ativas', () => {
  it('retorna apenas filiais ativas', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/filiais/ativas',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.every((f: { ativo: boolean }) => f.ativo === true)).toBe(true);
  });
});

// --- S006: POST /filiais ---

describe('POST /api/v1/filiais', () => {
  it('ADMIN_MATRIZ cria filial com sucesso — retorna 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/filiais',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        nome: 'Nova Filial Teste',
        cnpj: '22.222.222/0001-00',
        diaVencimento: 15,
        valorMensalidadeIntegral: 1500,
        valorMensalidadeMeioTurno: 800,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.nome).toBe('Nova Filial Teste');
    expect(body.cnpj).toBe('22222222000100'); // normalizado
    expect(body.ativo).toBe(true);

    // Cleanup
    await prisma.auditLog.deleteMany({ where: { entityId: body.id } });
    await prisma.filial.delete({ where: { id: body.id } });
  });

  it('retorna 409 para CNPJ duplicado na organização', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/filiais',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        nome: 'Duplicada',
        cnpj: '11111111000100', // mesmo CNPJ da FILIAL_ID
        diaVencimento: 10,
        valorMensalidadeIntegral: 1000,
        valorMensalidadeMeioTurno: 600,
      },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().message).toContain('CNPJ já cadastrado');
  });

  it('retorna 403 quando ATENDENTE tenta criar filial', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/filiais',
      headers: { authorization: `Bearer ${atendenteToken}` },
      payload: {
        nome: 'Tentativa',
        cnpj: '33333333000133',
        diaVencimento: 10,
        valorMensalidadeIntegral: 1000,
        valorMensalidadeMeioTurno: 600,
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it('retorna 422 para campos obrigatórios ausentes', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/filiais',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { nome: 'Incompleta' },
    });

    expect(res.statusCode).toBe(422);
  });
});

// --- S007: PATCH /filiais/:id ---

describe('PATCH /api/v1/filiais/:id', () => {
  it('ADMIN_MATRIZ atualiza nome da filial', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/filiais/${FILIAL_ID}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { nome: 'Filial Atualizada' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().nome).toBe('Filial Atualizada');

    // Restaurar nome
    await prisma.filial.update({ where: { id: FILIAL_ID }, data: { nome: 'Filial Inicial' } });
  });

  it('retorna 404 para filial de outra organização', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/filiais/${uuidv4()}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { nome: 'Filial Inexistente' },
    });

    expect(res.statusCode).toBe(404);
  });

  it('retorna 422 ao tentar desativar com alunos ativos', async () => {
    // Criar aluno ativo na filial
    const alunoId = uuidv4();
    await prisma.aluno.create({
      data: {
        id: alunoId,
        filialId: FILIAL_ID,
        nome: 'Aluno Teste',
        dataNascimento: new Date('2018-01-01'),
        status: 'ATIVO',
        turno: 'INTEGRAL',
        consentimentoResponsavel: true,
        consentimentoTimestamp: new Date(),
      },
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/filiais/${FILIAL_ID}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { ativo: false },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json().message).toContain('aluno(s) ativo(s)');

    // Cleanup
    await prisma.aluno.delete({ where: { id: alunoId } });
  });
});
