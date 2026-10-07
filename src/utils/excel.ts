import * as XLSX from 'xlsx';
import { todayISO } from './date';

export type SheetRow = Record<string, string | number>;

/** Bir yoki bir nechta varaqli .xlsx faylni yuklab berish */
export function exportExcel(filename: string, sheets: { name: string; rows: SheetRow[]; title?: string }[]) {
  const wb = XLSX.utils.book_new();
  for (const sh of sheets) {
    const ws = sh.title ? XLSX.utils.aoa_to_sheet([[sh.title], []]) : XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.sheet_add_json(ws, sh.rows.length ? sh.rows : [{ "Ma'lumot": "Ma'lumot topilmadi" }], { origin: sh.title ? 'A3' : 'A1' });
    const keys = Object.keys(sh.rows[0] ?? { "Ma'lumot": '' });
    ws['!cols'] = keys.map((k) => ({ wch: Math.min(48, Math.max(k.length + 2, ...sh.rows.slice(0, 200).map((r) => String(r[k] ?? '').length + 2))) }));
    XLSX.utils.book_append_sheet(wb, ws, sh.name.slice(0, 31));
  }
  XLSX.writeFile(wb, `${filename}_${todayISO()}.xlsx`);
}

export function readExcel(file: File): Promise<Record<string, string>[]> {
  return file.arrayBuffer().then((buf) => {
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '', raw: false });
  });
}
