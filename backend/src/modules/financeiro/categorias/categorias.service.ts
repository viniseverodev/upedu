// CategoriasService — lógica de negócio (S027)

import { CategoriasRepository } from './categorias.repository';
import { NotFoundError, ValidationError } from '../../../shared/errors/AppError';
import type { CreateCategoriaInput } from './categorias.schema';

export class CategoriasService {
  private repo = new CategoriasRepository();

  async create(filialId: string, data: CreateCategoriaInput) {
    return this.repo.create({ filialId, nome: data.nome, tipo: data.tipo });
  }

  async listByFilial(filialId: string) {
    return this.repo.findByFilial(filialId);
  }

  async delete(id: string, filialId: string) {
    const categoria = await this.repo.findByIdAndFilial(id, filialId);
    if (!categoria) throw new NotFoundError('Categoria');

    const temTransacoes = await this.repo.hasTransacoes(id);
    if (temTransacoes) {
      throw new ValidationError('Categoria não pode ser excluída pois possui transações vinculadas');
    }

    await this.repo.delete(id);
  }
}
