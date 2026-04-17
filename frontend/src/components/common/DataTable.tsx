// DataTable — wrapper de tabela com design system
// TODO: adicionar paginação quando necessário

'use client';

interface DataTableProps<T> {
  data: T[];
  columns: Array<{ key: keyof T; label: string }>;
}

export function DataTable<T extends Record<string, unknown>>({ data, columns }: DataTableProps<T>) {
  return (
    <div className="table-container">
      <table className="table-base">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} className="table-th">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="table-row">
              {columns.map((col) => (
                <td key={String(col.key)} className="table-td">
                  {String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
