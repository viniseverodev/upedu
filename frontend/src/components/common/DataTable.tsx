// DataTable — wrapper de tabela com paginação
// TODO: implementar com shadcn/ui Table + TanStack Query

'use client';

interface DataTableProps<T> {
  data: T[];
  columns: Array<{ key: keyof T; label: string }>;
}

export function DataTable<T extends Record<string, unknown>>({ data, columns }: DataTableProps<T>) {
  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} className="px-4 py-3 text-left text-sm font-medium">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-t">
              {columns.map((col) => (
                <td key={String(col.key)} className="px-4 py-3 text-sm">
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
