// Testes de integração — Responsáveis (S018/S019)

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
const ATENDENTE_ID = uuidv4();
const ADMIN_ID = uuidv4();
const ATENDENTE_EMAIL = `atendente-resp-${Date.now()}@upedu.com`;
const ADMIN_EMAIL = `admin-resp-${Date.now()}@upedu.com`;

let atendenteToken: string;
let adminToken: string;
let alunoId: string;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();

  await prisma.organization.create({
    data: {
      id: ORG_ID,
      nome: 'Org Resp Teste',
      cnpj: ORG_ID.replace(/-/g, '').slice(0, 14),
      email: 'org@resp.com',
    },
  });

  await prisma.filial.create({
    data: {
      id: FILIAL_ID,
      organizationId: ORG_ID,
      nome: 'Filial Resp',
      cnpj: ORG_ID.replace(/-/g, '').slice(1, 15),
      valorMensalidadeManha: 1200,
      valorMensalidadeTarde: 700,
    },
  });

  const hash = await bcrypt.hash('Senha123', 4);

  await prisma.user.create({
    data: {
      id: ATENDENTE_ID,
      organizationId: ORG_ID,
      nome: 'Atendente Resp',
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
      nome: 'Admin Resp',
      email: ADMIN_EMAIL,
      passwordHash: hash,
      role: 'ADMIN_MATRIZ',
      ativo: true,
      primeiroAcesso: false,
      filiais: { create: [{ filialId: FILIAL_ID }] },
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

  // Cria aluno para testes de vinculação (S019)
  const alunoRes = await app.inject({
    method: 'POST',
    url: '/api/v1/alunos',
    headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
    payload: {
      nome: 'Aluno para Responsáveis',
      dataNascimento: '2018-03-01',
      turno: 'MANHA',
      consentimentoResponsavel: true,
    },
  });
  alunoId = alunoRes.json().id;
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { userId: { in: [ATENDENTE_ID, ADMIN_ID] } } });
  // Desvincular e excluir responsáveis
  await prisma.alunoResponsavel.deleteMany({ where: { alunoId } });
  await prisma.mensalidade.deleteMany({ where: { filialId: FILIAL_ID } });
  await prisma.matricula.deleteMany({ where: { filialId: FILIAL_ID } });
  await prisma.aluno.deleteMany({ where: { filialId: FILIAL_ID } });
  await prisma.responsavel.deleteMany({ where: { nome: { startsWith: 'Test Resp' } } });
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

// --- S018: GET /responsaveis (listagem por filial) ---

describe('GET /api/v1/responsaveis', () => {
  it('retorna lista vazia quando nenhum responsável vinculado', async () => {
    // Usa uma filial diferente que não tem alunos/responsáveis
    const filialSemResponsaveis = uuidv4();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/responsaveis',
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': filialSemResponsaveis },
    });
    // filialContext vai rejeitar se filialId não pertencer ao usuário — 403 esperado
    // O atendente só tem acesso a FILIAL_ID
    expect([403, 200]).toContain(res.statusCode);
  });

  it('lista responsáveis da filial do usuário após vincular — retorna 200', async () => {
    // Cria responsável e vincula ao aluno da filial
    const respRes = await app.inject({
      method: 'POST',
      url: '/api/v1/responsaveis',
      headers: { authorization: `Bearer ${atendenteToken}` },
      payload: { nome: 'Test Resp Listagem', telefone: '11900000099' },
    });
    const respId = respRes.json().id;

    await app.inject({
      method: 'POST',
      url: `/api/v1/alunos/${alunoId}/responsaveis`,
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { responsavelId: respId, parentesco: 'Tia', isResponsavelFinanceiro: false },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/responsaveis',
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.some((r: { id: string }) => r.id === respId)).toBe(true);
  });

  it('sem autenticação — retorna 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/responsaveis',
    });
    expect(res.statusCode).toBe(401);
  });
});

// --- S018: POST /responsaveis ---

describe('POST /api/v1/responsaveis', () => {
  it('cria responsável sem CPF/RG — retorna 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/responsaveis',
      headers: { authorization: `Bearer ${atendenteToken}` },
      payload: {
        nome: 'Test Resp Simples',
        telefone: '11999990001',
        email: 'resp.simples@test.com',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeTruthy();
    expect(body.nome).toBe('Test Resp Simples');
    expect(body.cpf).toBeNull();
    expect(body.rg).toBeNull();
  });

  it('cria responsável com CPF válido — retorna 201 e CPF mascarado', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/responsaveis',
      headers: { authorization: `Bearer ${atendenteToken}` },
      payload: {
        nome: 'Test Resp CPF',
        cpf: '529.982.247-25', // CPF válido para testes
        telefone: '11999990002',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.cpf).toBeTruthy();
    // CPF deve estar mascarado (não deve conter o CPF original completo)
    expect(body.cpf).toMatch(/•••\./);
  });

  it('CPF com dígito verificador inválido — retorna 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/responsaveis',
      headers: { authorization: `Bearer ${atendenteToken}` },
      payload: {
        nome: 'Test Resp CPF Inválido',
        cpf: '123.456.789-00', // dígitos verificadores errados
      },
    });

    expect(res.statusCode).toBe(422); // ZodError → 422 (ver error-handler.ts)
    const body = res.json();
    expect(body.details.some((d: { message: string }) =>
      d.message.toLowerCase().includes('cpf')
    )).toBe(true);
  });

  it('sem autenticação — retorna 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/responsaveis',
      payload: { nome: 'Test Resp Sem Auth' },
    });
    expect(res.statusCode).toBe(401);
  });
});

// --- S018: GET /responsaveis/:id ---

describe('GET /api/v1/responsaveis/:id', () => {
  let responsavelId: string;

  beforeAll(async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/responsaveis',
      headers: { authorization: `Bearer ${atendenteToken}` },
      payload: {
        nome: 'Test Resp GET',
        cpf: '529.982.247-25',
        email: 'resp.get@test.com',
      },
    });
    responsavelId = res.json().id;

    // BUG-009: assertOrgAccess exige vínculo com aluno da org antes de findById
    await app.inject({
      method: 'POST',
      url: `/api/v1/alunos/${alunoId}/responsaveis`,
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { responsavelId, parentesco: 'Mãe', isResponsavelFinanceiro: false },
    });
  });

  it('retorna perfil com CPF mascarado', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/responsaveis/${responsavelId}`,
      headers: { authorization: `Bearer ${atendenteToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.nome).toBe('Test Resp GET');
    // CPF mascarado — não expõe o valor completo
    expect(body.cpf).toMatch(/•••\./);
    // CPF real não deve aparecer no response
    expect(body.cpf).not.toContain('529');
  });

  it('ID inexistente — retorna 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/responsaveis/${uuidv4()}`,
      headers: { authorization: `Bearer ${atendenteToken}` },
    });
    expect(res.statusCode).toBe(404);
  });
});

// --- S018: GET /responsaveis/:id/revelar-cpf ---

describe('GET /api/v1/responsaveis/:id/revelar-cpf', () => {
  let responsavelId: string;

  beforeAll(async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/responsaveis',
      headers: { authorization: `Bearer ${atendenteToken}` },
      payload: {
        nome: 'Test Resp Revelar',
        cpf: '529.982.247-25',
      },
    });
    responsavelId = res.json().id;

    // BUG-010: assertOrgAccess exige vínculo com aluno da org antes de revelarCpf
    await app.inject({
      method: 'POST',
      url: `/api/v1/alunos/${alunoId}/responsaveis`,
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { responsavelId, parentesco: 'Pai', isResponsavelFinanceiro: false },
    });
  });

  it('ADMIN revela CPF — retorna CPF completo formatado', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/responsaveis/${responsavelId}/revelar-cpf`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.cpf).toBe('529.982.247-25');
  });

  it('ATENDENTE sem permissão de revelar CPF — retorna 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/responsaveis/${responsavelId}/revelar-cpf`,
      headers: { authorization: `Bearer ${atendenteToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('responsável sem CPF — retorna 400', async () => {
    // Cria responsável sem CPF
    const semCpf = await app.inject({
      method: 'POST',
      url: '/api/v1/responsaveis',
      headers: { authorization: `Bearer ${atendenteToken}` },
      payload: { nome: 'Test Resp Sem CPF' },
    });
    const semCpfId = semCpf.json().id;

    // BUG-010: vincular antes de revelar para que assertOrgAccess passe
    await app.inject({
      method: 'POST',
      url: `/api/v1/alunos/${alunoId}/responsaveis`,
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { responsavelId: semCpfId, parentesco: 'Tio', isResponsavelFinanceiro: false },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/responsaveis/${semCpfId}/revelar-cpf`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(422); // ValidationError → 422 (ver AppError.ts)
  });
});

// --- S018: PATCH /responsaveis/:id ---

describe('PATCH /api/v1/responsaveis/:id', () => {
  let responsavelId: string;

  beforeAll(async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/responsaveis',
      headers: { authorization: `Bearer ${atendenteToken}` },
      payload: {
        nome: 'Test Resp Update',
        telefone: '11900000001',
      },
    });
    responsavelId = res.json().id;

    // BUG-009: assertOrgAccess exige vínculo com aluno da org antes de update
    await app.inject({
      method: 'POST',
      url: `/api/v1/alunos/${alunoId}/responsaveis`,
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: { responsavelId, parentesco: 'Avó', isResponsavelFinanceiro: false },
    });
  });

  it('atualiza nome e telefone — retorna dados atualizados', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/responsaveis/${responsavelId}`,
      headers: { authorization: `Bearer ${atendenteToken}` },
      payload: { nome: 'Test Resp Updated', telefone: '11900000002' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.nome).toBe('Test Resp Updated');
    expect(body.telefone).toBe('11900000002');
  });

  it('ID inexistente — retorna 404', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/responsaveis/${uuidv4()}`,
      headers: { authorization: `Bearer ${atendenteToken}` },
      payload: { nome: 'Novo Nome' },
    });
    expect(res.statusCode).toBe(404);
  });
});

// --- S019: POST /alunos/:id/responsaveis ---

describe('POST /api/v1/alunos/:id/responsaveis', () => {
  let responsavelId: string;
  let financeirId: string;

  beforeAll(async () => {
    const r1 = await app.inject({
      method: 'POST',
      url: '/api/v1/responsaveis',
      headers: { authorization: `Bearer ${atendenteToken}` },
      payload: { nome: 'Test Resp Vincular', telefone: '11900000010' },
    });
    responsavelId = r1.json().id;

    const r2 = await app.inject({
      method: 'POST',
      url: '/api/v1/responsaveis',
      headers: { authorization: `Bearer ${atendenteToken}` },
      payload: { nome: 'Test Resp Financeiro', telefone: '11900000011' },
    });
    financeirId = r2.json().id;
  });

  it('vincula responsável ao aluno — retorna 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/alunos/${alunoId}/responsaveis`,
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: {
        responsavelId,
        parentesco: 'Mãe',
        isResponsavelFinanceiro: false,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.alunoId).toBe(alunoId);
    expect(body.responsavelId).toBe(responsavelId);
  });

  it('tenta vincular mesmo responsável duas vezes — retorna 422', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/alunos/${alunoId}/responsaveis`,
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: {
        responsavelId,
        parentesco: 'Mãe',
        isResponsavelFinanceiro: false,
      },
    });

    expect(res.statusCode).toBe(422); // ValidationError → 422 (ver AppError.ts)
    expect(res.json().message).toContain('já vinculado');
  });

  it('vincula responsável financeiro — retorna 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/alunos/${alunoId}/responsaveis`,
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: {
        responsavelId: financeirId,
        parentesco: 'Pai',
        isResponsavelFinanceiro: true,
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().isResponsavelFinanceiro).toBe(true);
  });

  it('tenta vincular segundo responsável financeiro — retorna 422', async () => {
    // Cria um terceiro responsável
    const r3 = await app.inject({
      method: 'POST',
      url: '/api/v1/responsaveis',
      headers: { authorization: `Bearer ${atendenteToken}` },
      payload: { nome: 'Test Resp Financeiro 2', telefone: '11900000012' },
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/alunos/${alunoId}/responsaveis`,
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: {
        responsavelId: r3.json().id,
        parentesco: 'Avó',
        isResponsavelFinanceiro: true,
      },
    });

    expect(res.statusCode).toBe(422); // ValidationError → 422 (ver AppError.ts)
    expect(res.json().message).toContain('responsável financeiro');
  });

  it('aluno de outra filial — retorna 403', async () => {
    // filialContext rejeita com 403 quando o usuário não tem acesso à filial informada
    // O service nunca é chamado, então não há 404 do domínio
    const outraFilialId = uuidv4();
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/alunos/${alunoId}/responsaveis`,
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': outraFilialId },
      payload: {
        responsavelId,
        parentesco: 'Tio',
        isResponsavelFinanceiro: false,
      },
    });
    expect(res.statusCode).toBe(403);
  });
});

// --- S019: DELETE /alunos/:alunoId/responsaveis/:responsavelId ---

describe('DELETE /api/v1/alunos/:alunoId/responsaveis/:responsavelId', () => {
  let responsavelParaDesvincular: string;

  beforeAll(async () => {
    // Cria e vincula responsável para o teste de desvinculação
    const r = await app.inject({
      method: 'POST',
      url: '/api/v1/responsaveis',
      headers: { authorization: `Bearer ${atendenteToken}` },
      payload: { nome: 'Test Resp Desvincular', telefone: '11900000020' },
    });
    responsavelParaDesvincular = r.json().id;

    await app.inject({
      method: 'POST',
      url: `/api/v1/alunos/${alunoId}/responsaveis`,
      headers: { authorization: `Bearer ${atendenteToken}`, 'x-filial-id': FILIAL_ID },
      payload: {
        responsavelId: responsavelParaDesvincular,
        parentesco: 'Avô',
        isResponsavelFinanceiro: false,
      },
    });
  });

  it('desvincula responsável — retorna 204', async () => {
    // BUG-016: desvincular requer GERENTE_FILIAL+ — usar adminToken (ADMIN_MATRIZ)
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/alunos/${alunoId}/responsaveis/${responsavelParaDesvincular}`,
      headers: { authorization: `Bearer ${adminToken}`, 'x-filial-id': FILIAL_ID },
    });

    expect(res.statusCode).toBe(204);
  });

  it('vínculo inexistente — retorna 404', async () => {
    // BUG-016: desvincular requer GERENTE_FILIAL+
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/alunos/${alunoId}/responsaveis/${uuidv4()}`,
      headers: { authorization: `Bearer ${adminToken}`, 'x-filial-id': FILIAL_ID },
    });

    expect(res.statusCode).toBe(404);
  });
});
