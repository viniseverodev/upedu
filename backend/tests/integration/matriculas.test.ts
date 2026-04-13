// Testes de integração — Matrículas (S020/S021)

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { redis } from '../../src/config/redis';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

const ORG_ID = uuidv4();
const FILIAL_ID = uuidv4();
const ATENDENTE_ID = uuidv4();
const ATENDENTE_EMAIL = `atendente-mat-${Date.now()}@upedu.com`;

let atendenteToken: string;
let alunoId: string;
let responsavelId: string;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();

  await prisma.organization.create({
    data: {
      id: ORG_ID,
      nome: 'Org Mat Teste',
      cnpj: ORG_ID.replace(/-/g, '').slice(0, 14),
      email: 'org@mat.com',
    },
  });

  await prisma.filial.create({
    data: {
      id: FILIAL_ID,
      organizationId: ORG_ID,
      nome: 'Filial Mat',
      cnpj: ORG_ID.replace(/-/g, '').slice(1, 15),
      diaVencimento: 10,
      valorMensalidadeIntegral: 900,
      valorMensalidadeMeioTurno: 500,
    },
  });

  const hash = await bcrypt.hash('Senha123', 4);
  await prisma.user.create({
    data: {
      id: ATENDENTE_ID,
      organizationId: ORG_ID,
      nome: 'Atendente Mat',
      email: ATENDENTE_EMAIL,
      passwordHash: hash,
      role: 'ATENDENTE',
      ativo: true,
      primeiroAcesso: false,
      filiais: { create: [{ filialId: FILIAL_ID }] },
    },
  });

  // Login
  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: ATENDENTE_EMAIL, password: 'Senha123' },
  });
  atendenteToken = loginRes.json().accessToken;

  // Criar aluno PRE_MATRICULA
  const aluno = await prisma.aluno.create({
    data: {
      id: uuidv4(),
      filialId: FILIAL_ID,
      nome: 'Aluno Mat Teste',
      dataNascimento: new Date('2010-01-01'),
      status: 'PRE_MATRICULA',
      turno: 'INTEGRAL',
    },
  });
  alunoId = aluno.id;

  // Criar responsável financeiro vinculado ao aluno
  const responsavel = await prisma.responsavel.create({
    data: { nome: 'Resp Financeiro Mat' },
  });
  responsavelId = responsavel.id;

  await prisma.alunoResponsavel.create({
    data: {
      alunoId,
      responsavelId,
      parentesco: 'Mãe',
      isResponsavelFinanceiro: true,
    },
  });
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { entityType: { in: ['Matricula', 'Aluno'] } } });
  await prisma.mensalidade.deleteMany({ where: { filialId: FILIAL_ID } });
  await prisma.matricula.deleteMany({ where: { filialId: FILIAL_ID } });
  await prisma.alunoResponsavel.deleteMany({ where: { alunoId } });
  await prisma.responsavel.delete({ where: { id: responsavelId } }).catch(() => {});
  await prisma.aluno.deleteMany({ where: { filialId: FILIAL_ID } });
  await prisma.refreshToken.deleteMany({ where: { userId: ATENDENTE_ID } });
  await prisma.userFilial.deleteMany({ where: { userId: ATENDENTE_ID } });
  await prisma.user.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.filial.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.organization.delete({ where: { id: ORG_ID } }).catch(() => {});
  await app.close();
  await redis.quit();
});

// --- S020: POST /matriculas ---

describe('POST /api/v1/matriculas', () => {
  it('cria matrícula com snapshot de valor — retorna 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/matriculas',
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { alunoId, turno: 'INTEGRAL', dataInicio: '2025-03-01' },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.valorMensalidade).toBe(900); // snapshot da filial
    expect(body.status).toBe('ATIVA');
    expect(body.turno).toBe('INTEGRAL');
  });

  it('segunda matrícula ativa — retorna 422', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/matriculas',
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { alunoId, turno: 'INTEGRAL', dataInicio: '2025-04-01' },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json().message).toContain('já possui matrícula ativa');
  });

  it('aluno sem responsável financeiro — retorna 422', async () => {
    const alunoSemResp = await prisma.aluno.create({
      data: {
        filialId: FILIAL_ID,
        nome: 'Aluno Sem Resp',
        dataNascimento: new Date('2012-01-01'),
        status: 'PRE_MATRICULA',
        turno: 'INTEGRAL',
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/matriculas',
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { alunoId: alunoSemResp.id, turno: 'INTEGRAL', dataInicio: '2025-03-01' },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json().message).toContain('responsável financeiro');

    await prisma.aluno.delete({ where: { id: alunoSemResp.id } });
  });

  it('aluno de outra filial — retorna 404', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/matriculas',
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { alunoId: uuidv4(), turno: 'INTEGRAL', dataInicio: '2025-03-01' },
    });

    expect(res.statusCode).toBe(404);
  });
});

// --- S021: GET /alunos/:id/matriculas ---

describe('GET /api/v1/alunos/:id/matriculas', () => {
  it('lista histórico de matrículas — retorna 200 com snapshot', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/alunos/${alunoId}/matriculas`,
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toMatchObject({
      status: 'ATIVA',
      turno: 'INTEGRAL',
      valorMensalidade: 900,
      nomeDaFilial: 'Filial Mat',
    });
  });

  it('aluno de outra filial — retorna 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/alunos/${uuidv4()}/matriculas`,
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
    });

    expect(res.statusCode).toBe(404);
  });
});
