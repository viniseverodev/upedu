// CategoriasRepository — queries Prisma (S027)

import { prisma } from '../../../config/database';
import type { CategoriaFinanceiraTipo } from '@prisma/client';

export class CategoriasRepository {
  async create(data: { filialId: string; nome: string; tipo: CategoriaFinanceiraTipo }) {
    return prisma.categoriaFinanceira.create({ data });
  }

  async findByFilial(filialId: string) {
    return prisma.categoriaFinanceira.findMany({
      where: { filialId },
      orderBy: [{ tipo: 'asc' }, { nome: 'asc' }],
    });
  }

  async findById(id: string) {
    return prisma.categoriaFinanceira.findUnique({ where: { id } });
  }

  async findByIdAndFilial(id: string, filialId: string) {
    return prisma.categoriaFinanceira.findFirst({ where: { id, filialId } });
  }

  async delete(id: string) {
    return prisma.categoriaFinanceira.delete({ where: { id } });
  }

  async hasTransacoes(id: string) {
    const count = await prisma.transacao.count({ where: { categoriaId: id } });
    return count > 0;
  }
}
