// src/types/tanstack-table.d.ts
import '@tanstack/react-table';

declare module '@tanstack/react-table' {
  // RowData is from the lib; keep it generic so it works for any row type.
  interface TableMeta<TData extends RowData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void;
  }
}
