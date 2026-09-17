import { read, utils, write } from 'xlsx';

export interface ExcelPreview {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
}

const cellToString = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
};

export const parseExcelPreview = async (file: File): Promise<ExcelPreview> => {
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Excel file has no worksheets');
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (rawRows.length === 0) {
    throw new Error('Excel file is empty');
  }

  const headerRow = rawRows[0] ?? [];
  const headers = headerRow.map((cell, index) => {
    const label = cellToString(cell);
    return label || `Column ${index + 1}`;
  });

  const dataRows = rawRows.slice(1).filter((row) =>
    Array.isArray(row) && row.some((cell) => cellToString(cell) !== ''),
  );

  const rows = dataRows.map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = cellToString((row as unknown[])[index]);
    });
    return record;
  });

  return {
    headers,
    rows,
    totalRows: rows.length,
  };
};

export const buildExcelFileFromPreview = (
  preview: ExcelPreview,
  fileName: string,
): File => {
  const worksheetData = [
    preview.headers,
    ...preview.rows.map((row) => preview.headers.map((header) => row[header] ?? '')),
  ];
  const worksheet = utils.aoa_to_sheet(worksheetData);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Import');
  const buffer = write(workbook, { bookType: 'xlsx', type: 'array' });
  return new File([buffer], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
};

export const downloadErrorReport = (
  errors: Array<{ row: number; message: string }>,
  fileName: string,
): void => {
  const header = 'Row,Message\n';
  const body = errors
    .map((error) => `${error.row},"${error.message.replace(/"/g, '""')}"`)
    .join('\n');
  const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
