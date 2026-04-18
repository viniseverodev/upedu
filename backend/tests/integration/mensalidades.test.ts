// Testes de integração — Mensalidades (S022/S023/S024)

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
const GERENTE_ID = uuidv4();
const ATENDENTE_EMAIL = `atendente-mens-${Date.now()}@upedu.com`;
const GERENTE_EMAIL = `gerente-mens-${Date.now()}@upedu.com`;

let atendenteToken: string;
let gerenteToken: string;
let alunoId: string;
let mensalidadeId: string;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();

  await prisma.organization.create({
    data: {
      id: ORG_ID,
      nome: 'Org Mens Teste',
      cnpj: ORG_ID.replace(/-/g, '').slice(0, 14),
      email: 'org@mens.com',
    },
  });

  await prisma.filial.create({
    data: {
      id: FILIAL_ID,
      organizationId: ORG_ID,
      nome: 'Filial Mens',
      cnpj: ORG_ID.replace(/-/g, '').slice(1, 15),
      diaVencimento: 10,
      valorMensalidadeManha: 450,
      valorMensalidadeTarde: 250,
    },
  });

  const hash = await bcrypt.hash('Senha123', 4);

  await prisma.user.create({
    data: {
      id: ATENDENTE_ID,
      organizationId: ORG_ID,
      nome: 'Atendente Mens',
      email: ATENDENTE_EMAIL,
      passwordHash: hash,
      role: 'ATENDENTE',
      ativo: true,
      primeiroAcesso: false,
      filiais: { create: [{ filialId: FILIAL_ID }] },
    },
  });

  await prisma.user.create({
    data: {
      id: GERENTE_ID,
      organizationId: ORG_ID,
      nome: 'Gerente Mens',
      email: GERENTE_EMAIL,
      passwordHash: hash,
      role: 'GERENTE_FILIAL',
      ativo: true,
      primeiroAcesso: false,
      filiais: { create: [{ filialId: FILIAL_ID }] },
    },
  });

  // Login
  const [r1, r2] = await Promise.all([
    app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: ATENDENTE_EMAIL, password: 'Senha123' } }),
    app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: GERENTE_EMAIL, password: 'Senha123' } }),
  ]);
  atendenteToken = r1.json().accessToken;
  gerenteToken = r2.json().accessToken;

  // Criar aluno com matrícula ATIVA e responsável financeiro
  const aluno = await prisma.aluno.create({
    data: {
      filialId: FILIAL_ID,
      nome: 'Aluno Mens Teste',
      dataNascimento: new Date('2010-01-01'),
      status: 'ATIVO',
      turno: 'MANHA',
    },
  });
  alunoId = aluno.id;

  await prisma.matricula.create({
    data: {
      alunoId,
      filialId: FILIAL_ID,
      turno: 'MANHA',
      valorMensalidade: 450,
      dataInicio: new Date('2025-01-01'),
      status: 'ATIVA',
    },
  });
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { userId: { in: [ATENDENTE_ID, GERENTE_ID] } } });
  await prisma.mensalidade.deleteMany({ where: { filialId: FILIAL_ID } });
  await prisma.matricula.deleteMany({ where: { filialId: FILIAL_ID } });
  await prisma.aluno.deleteMany({ where: { filialId: FILIAL_ID } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: [ATENDENTE_ID, GERENTE_ID] } } });
  await prisma.userFilial.deleteMany({ where: { userId: { in: [ATENDENTE_ID, GERENTE_ID] } } });
  await prisma.user.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.filial.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.organization.delete({ where: { id: ORG_ID } }).catch(() => {});
  await app.close();
  await redis.quit();
});

// --- S022: POST /mensalidades ---

describe('POST /api/v1/mensalidades', () => {
  it('cria mensalidade com valorOriginal do snapshot — retorna 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/mensalidades',
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { alunoId, mesReferencia: 3, anoReferencia: 2025 },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.valorOriginal).toBe(450);
    expect(body.status).toBe('PENDENTE');
    expect(body.mesReferencia).toBe(3);
    // dataVencimento deve ser 10/03/2025
    expect(body.dataVencimento).toContain('2025-03-10');
    mensalidadeId = body.id;
  });

  it('mensalidade duplicada (idempotência) — retorna 409', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/mensalidades',
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { alunoId, mesReferencia: 3, anoReferencia: 2025 },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().message).toContain('já existe');
  });

  it('aluno sem matrícula ativa — retorna 422', async () => {
    const alunoInativo = await prisma.aluno.create({
      data: {
        filialId: FILIAL_ID,
        nome: 'Aluno Inativo',
        dataNascimento: new Date('2012-01-01'),
        status: 'INATIVO',
        turno: 'MANHA',
      },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/mensalidades',
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { alunoId: alunoInativo.id, mesReferencia: 3, anoReferencia: 2025 },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json().message).toContain('matrícula ativa');

    await prisma.aluno.delete({ where: { id: alunoInativo.id } });
  });

  it('aluno de outra filial — retorna 403', async () => {
    // filialContext rejeita antes do service
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/mensalidades',
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': uuidv4() },
      payload: { alunoId, mesReferencia: 4, anoReferencia: 2025 },
    });

    expect(res.statusCode).toBe(403);
  });
});

// --- S023: PATCH /mensalidades/:id/pagar ---

describe('PATCH /api/v1/mensalidades/:id/pagar', () => {
  it('registra pagamento — retorna 200 com status PAGO', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/mensalidades/${mensalidadeId}/pagar`,
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: {
        valorPago: 450.00,
        formaPagamento: 'PIX',
        dataPagamento: '2025-03-08',
        valorDesconto: 0,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('PAGO');
    expect(body.valorPago).toBe(450);
    expect(body.formaPagamento).toBe('PIX');
  });

  it('mensalidade já paga — retorna 422', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/mensalidades/${mensalidadeId}/pagar`,
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { valorPago: 450, formaPagamento: 'PIX', dataPagamento: '2025-03-08' },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json().message).toContain('já foi paga');
  });

  it('pagamento com desconto — retorna 200', async () => {
    // Criar nova mensalidade para testar desconto
    const criacao = await app.inject({
      method: 'POST',
      url: '/api/v1/mensalidades',
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { alunoId, mesReferencia: 4, anoReferencia: 2025 },
    });
    const novaMensId = criacao.json().id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/mensalidades/${novaMensId}/pagar`,
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: {
        valorPago: 400,
        formaPagamento: 'BOLETO',
        dataPagamento: '2025-04-08',
        valorDesconto: 50,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().valorDesconto).toBe(50);
    expect(res.json().status).toBe('PAGO');
  });
});

// --- S024: PATCH /mensalidades/:id/cancelar ---

describe('PATCH /api/v1/mensalidades/:id/cancelar', () => {
  let mensalidadeParaCancelar: string;

  beforeAll(async () => {
    const criacao = await app.inject({
      method: 'POST',
      url: '/api/v1/mensalidades',
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { alunoId, mesReferencia: 5, anoReferencia: 2025 },
    });
    mensalidadeParaCancelar = criacao.json().id;
  });

  it('cancela mensalidade pendente — retorna 200', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/mensalidades/${mensalidadeParaCancelar}/cancelar`,
      headers: { authorization: `Bearer ${gerenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { motivoCancelamento: 'Erro de lançamento' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('CANCELADA');
  });

  it('cancela mensalidade PAGA — retorna 422', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/mensalidades/${mensalidadeId}/cancelar`,
      headers: { authorization: `Bearer ${gerenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { motivoCancelamento: 'Teste' },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json().message).toContain('paga não pode ser cancelada');
  });

  it('atendente não pode cancelar — retorna 403', async () => {
    // Criar outra mensalidade
    const criacao = await app.inject({
      method: 'POST',
      url: '/api/v1/mensalidades',
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { alunoId, mesReferencia: 6, anoReferencia: 2025 },
    });
    const idParaCancelar = criacao.json().id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/mensalidades/${idParaCancelar}/cancelar`,
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { motivoCancelamento: 'Tentativa não autorizada' },
    });

    expect(res.statusCode).toBe(403);
  });
});
