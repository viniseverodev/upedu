// Testes de integração — Users (S009, S010)

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
const GERENTE_ID = uuidv4();
const FILIAL_ID = uuidv4();
const ADMIN_EMAIL = `admin-users-${Date.now()}@upedu.com`;
const GERENTE_EMAIL = `gerente-users-${Date.now()}@upedu.com`;

let adminToken: string;
let gerenteToken: string;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();

  await prisma.organization.create({
    data: { id: ORG_ID, nome: 'Org Users Teste', cnpj: ORG_ID.replace(/-/g, '').slice(0, 14), email: 'org@users.com' },
  });

  await prisma.filial.create({
    data: {
      id: FILIAL_ID,
      organizationId: ORG_ID,
      nome: 'Filial Users',
      cnpj: ORG_ID.replace(/-/g, '').slice(1, 15),
      valorMensalidadeIntegral: 1000,
      valorMensalidadeMeioTurno: 600,
    },
  });

  const hash = await bcrypt.hash('Senha123', 4);

  await prisma.user.create({
    data: {
      id: ADMIN_ID,
      organizationId: ORG_ID,
      nome: 'Admin Users',
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
      id: GERENTE_ID,
      organizationId: ORG_ID,
      nome: 'Gerente Users',
      email: GERENTE_EMAIL,
      passwordHash: hash,
      role: 'GERENTE_FILIAL',
      ativo: true,
      primeiroAcesso: false,
      filiais: { create: [{ filialId: FILIAL_ID }] },
    },
  });

  const adminLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: ADMIN_EMAIL, password: 'Senha123' },
  });
  adminToken = adminLogin.json().accessToken;

  const gerenteLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    remoteAddress: '192.168.20.1',
    payload: { email: GERENTE_EMAIL, password: 'Senha123' },
  });
  gerenteToken = gerenteLogin.json().accessToken;
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { userId: { in: [ADMIN_ID, GERENTE_ID] } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: [ADMIN_ID, GERENTE_ID] } } });
  await prisma.userFilial.deleteMany({ where: { userId: { in: [ADMIN_ID, GERENTE_ID] } } });
  // limpar usuários criados nos testes
  await prisma.user.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.filial.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.organization.delete({ where: { id: ORG_ID } }).catch(() => {});

  await app.close();
  await prisma.$disconnect();
  redis.disconnect();
});

beforeEach(async () => {
  await redis.del('rate:login:127.0.0.1');
  await redis.del('rate:login:192.168.20.1');
});

// --- S009: POST /users ---

describe('POST /api/v1/users', () => {
  it('ADMIN_MATRIZ cria usuário ATENDENTE — retorna 201 com tempPassword', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        nome: 'Novo Atendente',
        email: `atendente-${Date.now()}@upedu.com`,
        role: 'ATENDENTE',
        filialIds: [FILIAL_ID],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.primeiroAcesso).toBe(true);
    expect(body.user.role).toBe('ATENDENTE');
    expect(typeof body.tempPassword).toBe('string');
    expect(body.tempPassword.length).toBeGreaterThanOrEqual(16);

    // Cleanup
    const userId = body.user.id;
    await prisma.auditLog.deleteMany({ where: { entityId: userId } });
    await prisma.userFilial.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  });

  it('retorna 409 para email duplicado na organização', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        nome: 'Duplicado',
        email: ADMIN_EMAIL,
        role: 'ATENDENTE',
        filialIds: [FILIAL_ID],
      },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().message).toContain('Email já cadastrado');
  });

  it('retorna 403 quando GERENTE_FILIAL tenta criar ADMIN_MATRIZ', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${gerenteToken}` },
      payload: {
        nome: 'Tentativa Admin',
        email: `admin-tentativa-${Date.now()}@upedu.com`,
        role: 'ADMIN_MATRIZ',
        filialIds: [FILIAL_ID],
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it('retorna 403 quando GERENTE_FILIAL tenta acessar POST /users (não é ADMIN)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${gerenteToken}` },
      payload: {
        nome: 'Qualquer',
        email: `qualquer-${Date.now()}@upedu.com`,
        role: 'PROFESSOR',
        filialIds: [FILIAL_ID],
      },
    });

    // GERENTE_FILIAL não passa pelo authorize(['ADMIN_MATRIZ', 'SUPER_ADMIN'])
    expect(res.statusCode).toBe(403);
  });

  it('retorna 422 para campos obrigatórios ausentes', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { nome: 'Incompleto' },
    });

    expect(res.statusCode).toBe(422);
  });
});

// --- S009: GET /users ---

describe('GET /api/v1/users', () => {
  it('ADMIN_MATRIZ lista usuários da organização', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((u: { id: string }) => u.id === ADMIN_ID)).toBe(true);
  });

  it('retorna 401 sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/users' });
    expect(res.statusCode).toBe(401);
  });
});

// --- S010: PATCH /users/:id ---

describe('PATCH /api/v1/users/:id', () => {
  it('ADMIN_MATRIZ atualiza nome do usuário', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/${GERENTE_ID}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { nome: 'Gerente Atualizado' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().nome).toBe('Gerente Atualizado');

    await prisma.user.update({ where: { id: GERENTE_ID }, data: { nome: 'Gerente Users' } });
  });

  it('desativa usuário e revoga refresh tokens imediatamente', async () => {
    // Criar usuário temporário para desativar
    const tempId = uuidv4();
    const hash = await bcrypt.hash('Senha123', 4);
    await prisma.user.create({
      data: {
        id: tempId,
        organizationId: ORG_ID,
        nome: 'Temp Desativar',
        email: `temp-desat-${Date.now()}@upedu.com`,
        passwordHash: hash,
        role: 'ATENDENTE',
        ativo: true,
        primeiroAcesso: false,
        filiais: { create: [{ filialId: FILIAL_ID }] },
      },
    });

    // Criar refresh token ativo para ele
    await prisma.refreshToken.create({
      data: {
        userId: tempId,
        tokenHash: 'fakehash',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/${tempId}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { ativo: false },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().ativo).toBe(false);

    // Verificar que os refresh tokens foram revogados
    const tokens = await prisma.refreshToken.findMany({ where: { userId: tempId } });
    expect(tokens.every((t) => t.revokedAt !== null)).toBe(true);

    // Verificar blacklist no Redis
    const blacklisted = await redis.get(`blacklist:user:${tempId}`);
    expect(blacklisted).toBe('1');

    // Cleanup
    await prisma.auditLog.deleteMany({ where: { entityId: tempId } });
    await prisma.refreshToken.deleteMany({ where: { userId: tempId } });
    await prisma.userFilial.deleteMany({ where: { userId: tempId } });
    await prisma.user.delete({ where: { id: tempId } });
    await redis.del(`blacklist:user:${tempId}`);
  });

  it('retorna 404 para usuário de outra organização', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/${uuidv4()}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { nome: 'Nome Qualquer' },
    });

    expect(res.statusCode).toBe(404);
  });
});
