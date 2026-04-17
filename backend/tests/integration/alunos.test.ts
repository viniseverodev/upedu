// Testes de integração — Alunos (S012-S017)

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { redis } from '../../src/config/redis';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;

const ORG_ID = uuidv4();
const FILIAL_ID = uuidv4();
const FILIAL2_ID = uuidv4();
const ATENDENTE_ID = uuidv4();
const ADMIN_ID = uuidv4();
const ATENDENTE_EMAIL = `atendente-alunos-${Date.now()}@upedu.com`;
const ADMIN_EMAIL = `admin-alunos-${Date.now()}@upedu.com`;

let atendenteToken: string;
let adminToken: string;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();

  await prisma.organization.create({
    data: {
      id: ORG_ID,
      nome: 'Org Alunos Teste',
      cnpj: ORG_ID.replace(/-/g, '').slice(0, 14),
      email: 'org@alunos.com',
    },
  });

  await prisma.filial.create({
    data: {
      id: FILIAL_ID,
      organizationId: ORG_ID,
      nome: 'Filial Principal',
      cnpj: ORG_ID.replace(/-/g, '').slice(1, 15),
      valorMensalidadeIntegral: 1200,
      valorMensalidadeMeioTurno: 700,
    },
  });

  await prisma.filial.create({
    data: {
      id: FILIAL2_ID,
      organizationId: ORG_ID,
      nome: 'Filial Secundária',
      cnpj: ORG_ID.replace(/-/g, '').slice(2, 16),
      valorMensalidadeIntegral: 1100,
      valorMensalidadeMeioTurno: 650,
    },
  });

  const hash = await bcrypt.hash('Senha123', 4);

  await prisma.user.create({
    data: {
      id: ATENDENTE_ID,
      organizationId: ORG_ID,
      nome: 'Atendente Alunos',
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
      id: ADMIN_ID,
      organizationId: ORG_ID,
      nome: 'Admin Alunos',
      email: ADMIN_EMAIL,
      passwordHash: hash,
      role: 'ADMIN_MATRIZ',
      ativo: true,
      primeiroAcesso: false,
      filiais: { create: [{ filialId: FILIAL_ID }, { filialId: FILIAL2_ID }] },
    },
  });

  const atendenteLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: ATENDENTE_EMAIL, password: 'Senha123' },
  });
  atendenteToken = atendenteLogin.json().accessToken;

  const adminLogin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: ADMIN_EMAIL, password: 'Senha123' },
  });
  adminToken = adminLogin.json().accessToken;
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { userId: { in: [ATENDENTE_ID, ADMIN_ID] } } });
  await prisma.mensalidade.deleteMany({ where: { filialId: { in: [FILIAL_ID, FILIAL2_ID] } } });
  await prisma.matricula.deleteMany({ where: { filialId: { in: [FILIAL_ID, FILIAL2_ID] } } });
  await prisma.aluno.deleteMany({ where: { filialId: { in: [FILIAL_ID, FILIAL2_ID] } } });
  await prisma.refreshToken.deleteMany({ where: { userId: { in: [ATENDENTE_ID, ADMIN_ID] } } });
  await prisma.userFilial.deleteMany({ where: { userId: { in: [ATENDENTE_ID, ADMIN_ID] } } });
  await prisma.user.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.filial.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.organization.delete({ where: { id: ORG_ID } }).catch(() => {});

  await app.close();
  await prisma.$disconnect();
  redis.disconnect();
});

beforeEach(async () => {
  await redis.del('rate:login:127.0.0.1');
});

// --- S012: POST /alunos ---

describe('POST /api/v1/alunos', () => {
  it('ATENDENTE cria aluno com consentimento — retorna 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/alunos',
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: {
        nome: 'Maria Teste',
        dataNascimento: '2018-05-10',
        turno: 'INTEGRAL',
        consentimentoResponsavel: true,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.status).toBe('PRE_MATRICULA');
    expect(body.consentimentoResponsavel).toBe(true);
    expect(body.consentimentoTimestamp).not.toBeNull();

    // Cleanup
    await prisma.auditLog.deleteMany({ where: { entityId: body.id } });
    await prisma.aluno.delete({ where: { id: body.id } });
  });

  it('cria aluno com status LISTA_ESPERA — S014', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/alunos',
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: {
        nome: 'Pedro Espera',
        dataNascimento: '2019-03-15',
        turno: 'MEIO_TURNO',
        consentimentoResponsavel: true,
        status: 'LISTA_ESPERA',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().status).toBe('LISTA_ESPERA');

    await prisma.auditLog.deleteMany({ where: { entityId: res.json().id } });
    await prisma.aluno.delete({ where: { id: res.json().id } });
  });

  it('retorna 422 sem consentimento parental (LGPD)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/alunos',
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: {
        nome: 'Sem Consentimento',
        dataNascimento: '2018-01-01',
        turno: 'INTEGRAL',
        consentimentoResponsavel: false,
      },
    });

    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(
      body.details.some((d: { message: string }) => d.message.includes('Consentimento'))
    ).toBe(true);
  });

  it('retorna 422 sem campos obrigatórios', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/alunos',
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { nome: 'Incompleto' },
    });

    expect(res.statusCode).toBe(422);
  });

  it('retorna 403 quando filial não pertence ao usuário (isolamento S012)', async () => {
    const outraFilialId = uuidv4();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/alunos',
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': outraFilialId },
      payload: {
        nome: 'Aluno Proibido',
        dataNascimento: '2018-01-01',
        turno: 'INTEGRAL',
        consentimentoResponsavel: true,
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it('retorna 401 sem token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/alunos',
      headers: { 'x-filial-id': FILIAL_ID },
      payload: { nome: 'Sem Auth', dataNascimento: '2018-01-01', turno: 'INTEGRAL', consentimentoResponsavel: true },
    });

    expect(res.statusCode).toBe(401);
  });
});

// --- S012: GET /alunos ---

describe('GET /api/v1/alunos', () => {
  let alunoId: string;

  beforeAll(async () => {
    const a = await prisma.aluno.create({
      data: {
        filialId: FILIAL_ID,
        nome: 'Aluno Lista',
        dataNascimento: new Date('2017-07-20'),
        turno: 'INTEGRAL',
        status: 'ATIVO',
        consentimentoResponsavel: true,
        consentimentoTimestamp: new Date(),
      },
    });
    alunoId = a.id;
  });

  afterAll(async () => {
    await prisma.aluno.deleteMany({ where: { id: alunoId } });
  });

  it('lista alunos da filial ativa', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/alunos',
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
    });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
    expect(res.json().some((a: { id: string }) => a.id === alunoId)).toBe(true);
  });

  it('filtra por status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/alunos?status=ATIVO',
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().every((a: { status: string }) => a.status === 'ATIVO')).toBe(true);
  });
});

// --- S013: PATCH /alunos/:id ---

describe('PATCH /api/v1/alunos/:id', () => {
  let alunoId: string;

  beforeAll(async () => {
    const a = await prisma.aluno.create({
      data: {
        filialId: FILIAL_ID,
        nome: 'Aluno Editar',
        dataNascimento: new Date('2016-04-01'),
        turno: 'MEIO_TURNO',
        status: 'ATIVO',
        consentimentoResponsavel: true,
        consentimentoTimestamp: new Date(),
      },
    });
    alunoId = a.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entityId: alunoId } });
    await prisma.aluno.deleteMany({ where: { id: alunoId } });
  });

  it('ATENDENTE atualiza nome do aluno', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/alunos/${alunoId}`,
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { nome: 'Aluno Editado' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().nome).toBe('Aluno Editado');
  });

  it('inativação com cascade — encerra matrícula e cancela mensalidades', async () => {
    // Criar matrícula ativa e mensalidade pendente
    const matricula = await prisma.matricula.create({
      data: {
        alunoId,
        filialId: FILIAL_ID,
        status: 'ATIVA',
        turno: 'MEIO_TURNO',
        valorMensalidade: 700,
        dataInicio: new Date(),
      },
    });
    const mensalidade = await prisma.mensalidade.create({
      data: {
        alunoId,
        filialId: FILIAL_ID,
        status: 'PENDENTE',
        mesReferencia: 1,
        anoReferencia: 2025,
        valorOriginal: 700,
        dataVencimento: new Date(),
      },
    });

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/alunos/${alunoId}`,
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { status: 'INATIVO' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('INATIVO');

    const mat = await prisma.matricula.findUnique({ where: { id: matricula.id } });
    expect(mat?.status).toBe('ENCERRADA');
    expect(mat?.dataFim).not.toBeNull();

    const mens = await prisma.mensalidade.findUnique({ where: { id: mensalidade.id } });
    expect(mens?.status).toBe('CANCELADA');

    await prisma.mensalidade.delete({ where: { id: mensalidade.id } });
    await prisma.matricula.delete({ where: { id: matricula.id } });
  });

  it('retorna 404 para aluno de outra filial', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/alunos/${uuidv4()}`,
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { nome: 'Tentativa' },
    });

    expect(res.statusCode).toBe(404);
  });
});

// --- S014: PATCH /alunos/:id/promover ---

describe('PATCH /api/v1/alunos/:id/promover', () => {
  let alunoId: string;

  beforeAll(async () => {
    const a = await prisma.aluno.create({
      data: {
        filialId: FILIAL_ID,
        nome: 'Aluno Espera',
        dataNascimento: new Date('2020-01-01'),
        turno: 'INTEGRAL',
        status: 'LISTA_ESPERA',
        consentimentoResponsavel: true,
        consentimentoTimestamp: new Date(),
      },
    });
    alunoId = a.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entityId: alunoId } });
    await prisma.aluno.deleteMany({ where: { id: alunoId } });
  });

  it('promove aluno da lista de espera para PRE_MATRICULA', async () => {
    // BUG-016: promover requer GERENTE_FILIAL+ — usar adminToken (ADMIN_MATRIZ)
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/alunos/${alunoId}/promover`,
      headers: { authorization: `Bearer ${adminToken}`, 'x-filial-id': FILIAL_ID },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('PRE_MATRICULA');
  });

  it('retorna 422 ao tentar promover aluno que não está na lista', async () => {
    // Já foi promovido acima — BUG-016: requer GERENTE_FILIAL+
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/alunos/${alunoId}/promover`,
      headers: { authorization: `Bearer ${adminToken}`, 'x-filial-id': FILIAL_ID },
    });

    expect(res.statusCode).toBe(422);
  });
});

// --- S016: GET /alunos/:id ---

describe('GET /api/v1/alunos/:id', () => {
  let alunoId: string;

  beforeAll(async () => {
    const a = await prisma.aluno.create({
      data: {
        filialId: FILIAL_ID,
        nome: 'Aluno Perfil',
        dataNascimento: new Date('2015-08-22'),
        turno: 'INTEGRAL',
        status: 'ATIVO',
        consentimentoResponsavel: true,
        consentimentoTimestamp: new Date(),
      },
    });
    alunoId = a.id;
  });

  afterAll(async () => {
    await prisma.aluno.deleteMany({ where: { id: alunoId } });
  });

  it('retorna perfil completo com includes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/alunos/${alunoId}`,
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBe(alunoId);
    expect(Array.isArray(body.responsaveis)).toBe(true);
    expect(Array.isArray(body.matriculas)).toBe(true);
    expect(Array.isArray(body.mensalidades)).toBe(true);
  });

  it('retorna 404 para ID inexistente', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/alunos/${uuidv4()}`,
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
    });

    expect(res.statusCode).toBe(404);
  });
});

// --- S017: GET /alunos/export ---

describe('GET /api/v1/alunos/export', () => {
  let alunoId: string;

  beforeAll(async () => {
    const a = await prisma.aluno.create({
      data: {
        filialId: FILIAL_ID,
        nome: 'Aluno CSV',
        dataNascimento: new Date('2014-12-01'),
        turno: 'MEIO_TURNO',
        status: 'ATIVO',
        consentimentoResponsavel: true,
        consentimentoTimestamp: new Date(),
      },
    });
    alunoId = a.id;
  });

  afterAll(async () => {
    await prisma.aluno.deleteMany({ where: { id: alunoId } });
  });

  it('retorna CSV com header correto e sem CPF/RG', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/alunos/export',
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('alunos.csv');

    const lines = res.payload.split('\n');
    expect(lines[0]).toBe('nome,dataNascimento,status,turno,responsavelNome,telefone');
    expect(res.payload).not.toContain('cpf');
    expect(res.payload).not.toContain('rg');
  });

  it('filtra por status no export', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/alunos/export?status=ATIVO',
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
    });

    expect(res.statusCode).toBe(200);
    const lines = res.payload.split('\n').slice(1); // skip header
    expect(lines.every((l: string) => !l || l.includes('ATIVO'))).toBe(true);
  });
});

// --- S015: PATCH /alunos/:id/transferir ---

describe('PATCH /api/v1/alunos/:id/transferir', () => {
  let alunoId: string;

  beforeAll(async () => {
    const a = await prisma.aluno.create({
      data: {
        filialId: FILIAL_ID,
        nome: 'Aluno Transferir',
        dataNascimento: new Date('2016-06-15'),
        turno: 'INTEGRAL',
        status: 'ATIVO',
        consentimentoResponsavel: true,
        consentimentoTimestamp: new Date(),
      },
    });
    // Criar matrícula ativa
    await prisma.matricula.create({
      data: {
        alunoId: a.id,
        filialId: FILIAL_ID,
        status: 'ATIVA',
        turno: 'INTEGRAL',
        valorMensalidade: 1200,
        dataInicio: new Date(),
      },
    });
    alunoId = a.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entityId: alunoId } });
    await prisma.matricula.deleteMany({ where: { alunoId } });
    await prisma.aluno.deleteMany({ where: { id: alunoId } });
  });

  it('ADMIN_MATRIZ transfere aluno entre filiais — cria nova matrícula', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/alunos/${alunoId}/transferir`,
      headers: { authorization: `Bearer ${adminToken}`, 'x-filial-id': FILIAL_ID },
      payload: { filialDestinoId: FILIAL2_ID },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().filialId).toBe(FILIAL2_ID);

    // Verificar que matrícula anterior foi encerrada
    const matriculas = await prisma.matricula.findMany({ where: { alunoId } });
    const encerrada = matriculas.find((m) => m.filialId === FILIAL_ID);
    const nova = matriculas.find((m) => m.filialId === FILIAL2_ID);

    expect(encerrada?.status).toBe('ENCERRADA');
    expect(nova?.status).toBe('ATIVA');
    expect(Number(nova?.valorMensalidade)).toBe(1100); // valorMensalidadeIntegral da FILIAL2
  });

  it('retorna 403 quando ATENDENTE tenta transferir', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/alunos/${alunoId}/transferir`,
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { filialDestinoId: FILIAL_ID },
    });

    expect(res.statusCode).toBe(403);
  });
});

// --- S013: DELETE /alunos/:id ---

describe('DELETE /api/v1/alunos/:id', () => {
  it('soft delete — seta deletedAt e remove da listagem', async () => {
    const a = await prisma.aluno.create({
      data: {
        filialId: FILIAL_ID,
        nome: 'Aluno Deletar',
        dataNascimento: new Date('2019-09-09'),
        turno: 'MEIO_TURNO',
        status: 'INATIVO',
        consentimentoResponsavel: true,
        consentimentoTimestamp: new Date(),
      },
    });

    // BUG-016: delete requer GERENTE_FILIAL+ — usar adminToken (ADMIN_MATRIZ)
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/alunos/${a.id}`,
      headers: { authorization: `Bearer ${adminToken}`, 'x-filial-id': FILIAL_ID },
    });

    expect(res.statusCode).toBe(204);

    const deletado = await prisma.aluno.findUnique({ where: { id: a.id } });
    expect(deletado?.deletedAt).not.toBeNull();

    // Verificar que não aparece na listagem
    const lista = await app.inject({
      method: 'GET',
      url: '/api/v1/alunos',
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
    });
    expect(lista.json().some((al: { id: string }) => al.id === a.id)).toBe(false);

    await prisma.auditLog.deleteMany({ where: { entityId: a.id } });
    await prisma.aluno.delete({ where: { id: a.id } });
  });
});
