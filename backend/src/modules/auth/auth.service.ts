// AuthService — lógica de negócio de autenticação
// S001: login com rate limiting, bcrypt, JWT, audit log
// S002: logout com blacklist do access token + revogação do refresh token
// S003: refresh com rotação obrigatória + detecção de roubo de token
// S004: changePassword com atualização de primeiroAcesso

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AuthRepository } from './auth.repository';
import { redis, REDIS_TTL } from '../../config/redis';
import { RATE_LIMIT_LOGIN_KEY } from '../../middlewares/rate-limit';
import { env } from '../../config/env';
import { createAuditLog } from '../../middlewares/audit';
import { UnauthorizedError, ConflictError } from '../../shared/errors/AppError';
import type { LoginInput, UpdateProfileInput } from './auth.schema';
import type { JwtPayload, RefreshTokenPayload } from '../../middlewares/authenticate';

const BCRYPT_COST = 12;

export class AuthService {
  private repo = new AuthRepository();

  // S001 — Login com email e senha
  async login(input: LoginInput, ip: string) {
    const user = await this.repo.findByEmail(input.email);

    // Sempre executar bcrypt mesmo para email inexistente — evita timing attack
    const dummyHash = '$2b$12$invalidhashfordummycomparisononlyXXXXXXXXXXXXXXXXXXX';
    const isValid = user
      ? await bcrypt.compare(input.password, user.passwordHash)
      : await bcrypt.compare(input.password, dummyHash).then(() => false);

    if (!user || !isValid) {
      // Incrementar contador de falhas (SET NX cria com TTL se não existe; INCR incrementa)
      const rateKey = RATE_LIMIT_LOGIN_KEY(ip);
      await redis.set(rateKey, '0', 'EX', REDIS_TTL.RATE_LIMIT_LOGIN, 'NX');
      const attempts = await redis.incr(rateKey);

      await createAuditLog({
        userId: user?.id ?? 'unknown',
        action: 'LOGIN',
        entityType: 'User',
        entityId: user?.id ?? 'unknown',
        ipAddress: ip,
        newValues: { success: false, reason: 'invalid_credentials', attempt: attempts },
      }).catch(() => {}); // não bloquear resposta se audit falhar
      throw new UnauthorizedError('Credenciais inválidas');
    }

    if (!user.ativo) {
      throw new UnauthorizedError('Usuário inativo. Contate o administrador.');
    }

    // Access token — stateless, 15min
    const jti = uuidv4();
    const accessToken = jwt.sign(
      {
        sub: user.id,
        jti,
        role: user.role,
        orgId: user.organizationId,
        primeiroAcesso: user.primeiroAcesso,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    // Refresh token — JWT assinado com chave separada, jti hasheado no banco
    const jtiRefresh = uuidv4();
    const refreshTokenRaw = jwt.sign(
      { sub: user.id, jti: jtiRefresh },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any }
    );
    const refreshTokenHash = await bcrypt.hash(jtiRefresh, BCRYPT_COST);
    await this.repo.saveRefreshToken(user.id, refreshTokenHash);

    // Login bem-sucedido — zerar contador de tentativas do IP
    await redis.del(RATE_LIMIT_LOGIN_KEY(ip));

    await createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      ipAddress: ip,
      newValues: { success: true },
    });

    return {
      accessToken,
      refreshToken: refreshTokenRaw,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        filiais: user.filiais,
      },
      requiresPasswordChange: user.primeiroAcesso,
    };
  }

  // S002 — Logout com invalidação do access token e revogação do refresh token
  async logout(userPayload: JwtPayload, rawRefreshToken?: string) {
    // Blacklist do access token no Redis (TTL = tempo restante do token)
    const now = Math.floor(Date.now() / 1000);
    const ttl = Math.max(userPayload.exp - now, 1);
    await redis.setex(`blacklist:jwt:${userPayload.jti}`, ttl, '1');

    // Revogar o refresh token se fornecido
    if (rawRefreshToken) {
      try {
        const decoded = jwt.verify(rawRefreshToken, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
        await this.repo.revokeRefreshTokenByJti(decoded.sub, decoded.jti);
      } catch {
        // Token inválido ou expirado — já está inoperante, não bloquear o logout
      }
    }

    await createAuditLog({
      userId: userPayload.sub,
      action: 'LOGOUT',
      entityType: 'User',
      entityId: userPayload.sub,
    });
  }

  // S003 — Refresh token com rotação obrigatória e detecção de roubo
  // C1/H1: lock Redis para prevenir race condition — dois requests simultâneos com o mesmo
  // refresh token não podem ambos gerar novos tokens
  async refresh(rawRefreshToken?: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!rawRefreshToken) {
      throw new UnauthorizedError('Refresh token não encontrado');
    }

    // 1. Verificar assinatura e expiração do JWT do refresh token
    let decoded: RefreshTokenPayload;
    try {
      decoded = jwt.verify(rawRefreshToken, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
    } catch {
      throw new UnauthorizedError('Refresh token inválido ou expirado');
    }

    const { sub: userId, jti: jtiRefresh } = decoded;

    // C1/H1: Adquirir lock distribuído por usuário (TTL 15s para evitar deadlock)
    const lockKey = `lock:refresh:${userId}`;
    const lockAcquired = await redis.set(lockKey, '1', 'EX', 15, 'NX');
    if (!lockAcquired) {
      throw new UnauthorizedError('Refresh em andamento. Tente novamente em instantes.');
    }

    try {
      // 2. Buscar token ativo correspondente ao jti
      const activeTokens = await this.repo.findActiveTokensByUser(userId);
      let matchedToken = null;
      for (const token of activeTokens) {
        const match = await bcrypt.compare(jtiRefresh, token.tokenHash);
        if (match) {
          matchedToken = token;
          break;
        }
      }

      // 3. Detecção de roubo: token JWT válido mas não encontrado como ativo
      //    Significa que o token já foi usado/revogado — possível roubo de sessão
      if (!matchedToken) {
        await this.repo.revokeAllUserTokens(userId);
        await createAuditLog({
          userId,
          action: 'SUSPICIOUS_TOKEN_REUSE',
          entityType: 'User',
          entityId: userId,
        });
        throw new UnauthorizedError('Sessão inválida. Faça login novamente.');
      }

      // 4. Revogar token atual (rotação obrigatória)
      await this.repo.revokeTokenById(matchedToken.id);

      // 5. Buscar dados atuais do usuário para o novo access token
      const user = await this.repo.findById(userId);
      if (!user || !user.ativo) {
        throw new UnauthorizedError('Usuário inativo ou não encontrado');
      }

      // 6. Gerar novo par de tokens
      const jti = uuidv4();
      const accessToken = jwt.sign(
        {
          sub: user.id,
          jti,
          role: user.role,
          orgId: user.organizationId,
          primeiroAcesso: user.primeiroAcesso,
        },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN as any }
      );

      const newJtiRefresh = uuidv4();
      const newRefreshTokenRaw = jwt.sign(
        { sub: user.id, jti: newJtiRefresh },
        env.JWT_REFRESH_SECRET,
        { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any }
      );
      const newRefreshTokenHash = await bcrypt.hash(newJtiRefresh, BCRYPT_COST);
      await this.repo.saveRefreshToken(user.id, newRefreshTokenHash);

      return { accessToken, refreshToken: newRefreshTokenRaw };
    } finally {
      // Liberar lock independentemente de sucesso ou falha
      await redis.del(lockKey);
    }
  }

  // S004 — Troca de senha com validação da senha atual
  // BUG-011: emite novo par de tokens para que o frontend não fique com JWT primeiroAcesso=true
  // BUG-021: currentPassword é opcional para primeiroAcesso (senha temp gerada pelo sistema)
  async changePassword(userId: string, currentPassword: string | undefined, newPassword: string) {
    const user = await this.repo.findById(userId);
    if (!user) throw new UnauthorizedError('Usuário não encontrado');

    // Usuários em primeiroAcesso não precisam informar a senha atual (foi gerada pelo sistema)
    if (!user.primeiroAcesso) {
      if (!currentPassword) throw new UnauthorizedError('Senha atual obrigatória');
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) throw new UnauthorizedError('Senha atual incorreta');
    }

    const hash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await this.repo.updatePassword(userId, hash);

    // BUG-015: revogar todos os refresh tokens anteriores para encerrar sessões em outros dispositivos
    await this.repo.revokeAllUserTokens(userId);

    await createAuditLog({
      userId,
      action: 'UPDATE',
      entityType: 'User',
      entityId: userId,
      newValues: { action: 'password_changed', primeiroAcesso: false },
    });

    // Emite novo access token com primeiroAcesso=false imediatamente (BUG-011)
    const jti = uuidv4();
    const accessToken = jwt.sign(
      {
        sub: user.id,
        jti,
        role: user.role,
        orgId: user.organizationId,
        primeiroAcesso: false,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any },
    );

    // Novo refresh token com rotação
    const jtiRefresh = uuidv4();
    const refreshToken = jwt.sign(
      { sub: user.id, jti: jtiRefresh },
      env.JWT_REFRESH_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any },
    );
    const refreshTokenHash = await bcrypt.hash(jtiRefresh, BCRYPT_COST);
    await this.repo.saveRefreshToken(user.id, refreshTokenHash);

    return { accessToken, refreshToken };
  }

  // Atualização de perfil — nome e/ou e-mail do próprio usuário
  async updateProfile(userId: string, input: UpdateProfileInput) {
    // L4: verificar unicidade de email antes do update — evita P2002 com mensagem genérica "Registro já existe"
    if (input.email) {
      const currentUser = await this.repo.findById(userId);
      if (!currentUser) throw new UnauthorizedError('Usuário não encontrado');
      const existing = await this.repo.findByEmail(input.email);
      if (existing && existing.organizationId === currentUser.organizationId && existing.id !== userId) {
        throw new ConflictError('Email já cadastrado nesta organização');
      }
    }

    const updated = await this.repo.updateProfile(userId, input);

    await createAuditLog({
      userId,
      action: 'UPDATE',
      entityType: 'User',
      entityId: userId,
      newValues: input,
    });

    return updated;
  }
}
