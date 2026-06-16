"use client";

export interface ChatTablePayload {
  title: string;
  columns: string[];
  rows: (string | number)[][];
}

export function ChatTable({ table }: { table: ChatTablePayload }) {
  if (!table.rows || table.rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 max-w-[80%]">
        <p className="text-sm font-semibold text-foreground mb-1">{table.title}</p>
        <p className="text-sm text-muted-foreground">No data to show yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 max-w-[80%] overflow-x-auto">
      <p className="text-sm font-semibold text-foreground mb-2">{table.title}</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            {table.columns.map((col) => (
              <th key={col} className="text-left font-medium text-muted-foreground pb-1.5 pr-4 whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="py-1.5 pr-4 text-foreground whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
