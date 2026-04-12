// Utilitário de geração de CSV
// Usado em: exportação de alunos (ALUNO-06), relatório de inadimplência (FIN-05), fluxo de caixa (TRANS-03)

export function toCsv(rows: Record<string, unknown>[], headers?: string[]): string {
  if (rows.length === 0) return '';

  const keys = headers ?? Object.keys(rows[0]);
  const escape = (val: unknown): string => {
    const str = val == null ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = keys.join(',');
  const dataLines = rows.map((row) => keys.map((k) => escape(row[k])).join(','));

  return [headerLine, ...dataLines].join('\n');
}

export function csvHeaders(reply: any, filename: string): void {
  reply.header('Content-Type', 'text/csv; charset=utf-8');
  reply.header('Content-Disposition', `attachment; filename="${filename}"`);
}
