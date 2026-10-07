import { useEffect, useRef, useState } from 'react';
import { Check, CheckCircle2, Download, FileSpreadsheet, UploadCloud } from 'lucide-react';
import * as XLSX from 'xlsx';
import * as api from '@/services/api';
import type { PersonType, Student, Teacher } from '@/types';
import { useToast } from '@/context/ToastContext';
import { exportExcel, readExcel } from '@/utils/excel';
import { POSITIONS, formatPhone, isValidPhone, isValidPassport } from '@/utils/format';
import { useStructure } from '@/utils/hooks';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Checkbox } from './ui/Form';
import { Tooltip } from './ui/Tooltip';

type Step = 1 | 2 | 3 | 4;
const T_COLS = ['Familiya', 'Ism', 'Otasining ismi', "Tug'ilgan sana", 'Jinsi', 'Telefon raqami', 'Pasport', 'JSHSHIR', 'Kafedra', 'Lavozimi', 'Turniket ID'];
const S_COLS = ['Familiya', 'Ism', 'Otasining ismi', "Tug'ilgan sana", 'Jinsi', 'JSHSHIR', 'Telefon raqami', 'Ota-onasining F.I.Sh', 'Ota-onasining telefon raqami', 'Talaba ID', 'Guruh', 'Turniket ID'];

interface Parsed {
  values: Record<string, string>;
  errors: Record<string, string>;
}

function parseDate(v: string): string | null {
  const m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(v.trim());
  if (!m) return null;
  const [, d, mo, y] = m;
  const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  return isNaN(new Date(iso).getTime()) ? null : iso;
}

export function ImportModal({ open, onClose, type, onDone }: { open: boolean; onClose: () => void; type: PersonType; onDone: () => void }) {
  const toast = useToast();
  const st = useStructure();
  const [step, setStep] = useState<Step>(1);
  const [rows, setRows] = useState<Parsed[]>([]);
  const [fileName, setFileName] = useState('');
  const [onlyValid, setOnlyValid] = useState(true);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState({ added: 0, skipped: 0 });
  const [fileErr, setFileErr] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const cols = type === 'teacher' ? T_COLS : S_COLS;

  useEffect(() => {
    if (open) {
      setStep(1);
      setRows([]);
      setFileName('');
      setFileErr('');
      setOnlyValid(true);
    }
  }, [open]);

  const downloadTemplate = () => {
    const sample =
      type === 'teacher'
        ? [{ Familiya: 'Karimova', Ism: 'Nodira', 'Otasining ismi': 'Anvarovna', "Tug'ilgan sana": '14.03.1986', Jinsi: 'Ayol', 'Telefon raqami': '+998 (90) 123-45-67', Pasport: 'AB1234567', JSHSHIR: '41403861234567', Kafedra: st?.departments[0]?.name ?? '', Lavozimi: 'Dotsent', 'Turniket ID': '1101' }]
        : [{ Familiya: 'Rahimov', Ism: 'Bobur', 'Otasining ismi': "Olim o'g'li", "Tug'ilgan sana": '02.09.2007', Jinsi: 'Erkak', JSHSHIR: '50209071234567', 'Telefon raqami': '+998 (91) 765-43-21', 'Ota-onasining F.I.Sh': 'Rahimov Olim Hamidovich', 'Ota-onasining telefon raqami': '+998 (93) 111-22-33', 'Talaba ID': '2610999', Guruh: st?.groups[0]?.name ?? '', 'Turniket ID': '29001' }];
    exportExcel(type === 'teacher' ? 'Oqituvchilar_shablon' : 'Talabalar_shablon', [{ name: 'Shablon', rows: sample }]);
  };

  const validate = async (raw: Record<string, string>[]) => {
    const [teachers, students] = await Promise.all([api.getTeachers(), api.getStudents()]);
    const usedTurn = new Set([...teachers.map((t) => t.turnstileId), ...students.map((s) => s.turnstileId)].filter(Boolean));
    const usedJ = new Set((type === 'teacher' ? teachers : students).map((p) => p.jshshir));
    const usedSid = new Set(students.map((s) => s.studentId));
    const seenTurn = new Set<string>();
    return raw.map<Parsed>((r) => {
      const v: Record<string, string> = {};
      cols.forEach((c) => (v[c] = String(r[c] ?? '').trim()));
      const e: Record<string, string> = {};
      cols.forEach((c) => {
        if (!v[c] && c !== 'Otasining ismi') e[c] = "Bu maydon to'ldirilishi shart";
      });
      if (v["Tug'ilgan sana"] && !parseDate(v["Tug'ilgan sana"])) e["Tug'ilgan sana"] = "Sana noto'g'ri (masalan: 14.03.1986)";
      if (v.Jinsi && !['erkak', 'ayol'].includes(v.Jinsi.toLowerCase())) e.Jinsi = 'Erkak yoki Ayol bo\'lishi kerak';
      for (const pc of ['Telefon raqami', 'Ota-onasining telefon raqami']) if (v[pc] && !isValidPhone(formatPhone(v[pc]))) e[pc] = "Telefon raqami noto'g'ri kiritilgan";
      if (v.JSHSHIR && !/^\d{14}$/.test(v.JSHSHIR)) e.JSHSHIR = "JSHSHIR 14 ta raqamdan iborat bo'lishi kerak";
      else if (usedJ.has(v.JSHSHIR)) e.JSHSHIR = type === 'teacher' ? "Bu JSHSHIR bilan o'qituvchi allaqachon mavjud" : 'Bu JSHSHIR bilan talaba allaqachon mavjud';
      if (type === 'teacher') {
        if (v.Pasport && !isValidPassport(v.Pasport.toUpperCase())) e.Pasport = "Pasport seriyasi va raqami noto'g'ri (masalan: AA1234567)";
        if (v.Kafedra && !st?.departments.some((d) => d.name === v.Kafedra)) e.Kafedra = 'Bunday kafedra topilmadi';
        if (v.Lavozimi && !POSITIONS.includes(v.Lavozimi)) e.Lavozimi = 'Bunday lavozim topilmadi';
      } else {
        if (v.Guruh && !st?.groups.some((g) => g.name === v.Guruh)) e.Guruh = 'Bunday guruh topilmadi';
        if (v['Talaba ID'] && usedSid.has(v['Talaba ID'])) e['Talaba ID'] = 'Bu Talaba ID allaqachon mavjud';
      }
      const tid = v['Turniket ID'];
      if (tid && (usedTurn.has(tid) || seenTurn.has(tid))) e['Turniket ID'] = 'Bu Turniket ID boshqa xodimga biriktirilgan';
      if (tid) seenTurn.add(tid);
      return { values: v, errors: e };
    });
  };

  const handleFile = async (f: File | undefined) => {
    if (!f) return;
    setFileErr('');
    if (!/\.(xlsx|xls)$/i.test(f.name)) return setFileErr('Faqat .xlsx yoki .xls fayl yuklash mumkin');
    if (f.size > 5 * 1024 * 1024) return setFileErr('Fayl hajmi 5 MB dan oshmasligi kerak');
    setBusy(true);
    try {
      const raw = await readExcel(f);
      if (!raw.length) {
        setFileErr("Faylda ma'lumot topilmadi");
        return;
      }
      setFileName(f.name);
      setRows(await validate(raw));
      setStep(3);
    } catch {
      setFileErr("Faylni o'qib bo'lmadi");
    } finally {
      setBusy(false);
    }
  };

  const valid = rows.filter((r) => !Object.keys(r.errors).length);
  const invalid = rows.length - valid.length;

  const doImport = async () => {
    setBusy(true);
    try {
      if (type === 'teacher') {
        const items: Omit<Teacher, 'id'>[] = valid.map(({ values: v }) => ({
          photo: null, lastName: v.Familiya, firstName: v.Ism, middleName: v['Otasining ismi'], birthDate: parseDate(v["Tug'ilgan sana"])!, gender: v.Jinsi.toLowerCase() as 'erkak' | 'ayol',
          phone: formatPhone(v['Telefon raqami']), phone2: '', passport: v.Pasport.toUpperCase(), jshshir: v.JSHSHIR, passportIssued: '', passportIssuedBy: '', passportExpiry: '',
          region: 'Surxondaryo viloyati', district: '', address: '', departmentId: st!.departments.find((d) => d.name === v.Kafedra)!.id, position: v.Lavozimi, degree: "Yo'q",
          hiredDate: new Date().toISOString().slice(0, 10), rate: '1,0', active: true, turnstileId: v['Turniket ID'],
        }));
        await api.importTeachers(items);
      } else {
        const items: Omit<Student, 'id'>[] = valid.map(({ values: v }) => {
          const g = st!.groups.find((x) => x.name === v.Guruh)!;
          const dir = st!.directions.find((d) => d.id === g.directionId)!;
          const dep = st!.departments.find((d) => d.id === dir.departmentId)!;
          return {
            photo: null, lastName: v.Familiya, firstName: v.Ism, middleName: v['Otasining ismi'], birthDate: parseDate(v["Tug'ilgan sana"])!, gender: v.Jinsi.toLowerCase() as 'erkak' | 'ayol',
            jshshir: v.JSHSHIR, phone: formatPhone(v['Telefon raqami']), region: 'Surxondaryo viloyati', district: '', address: '',
            parents: [{ fullName: v['Ota-onasining F.I.Sh'], relation: 'Otasi', phone: formatPhone(v['Ota-onasining telefon raqami']), phone2: '' }],
            studentId: v['Talaba ID'], facultyId: dep.facultyId, departmentId: dep.id, directionId: dir.id, course: g.course, groupId: g.id, studyForm: g.studyForm,
            admissionYear: String(new Date().getFullYear()), turnstileId: v['Turniket ID'], active: true,
          };
        });
        await api.importStudents(items);
      }
      setResult({ added: valid.length, skipped: invalid });
      setStep(4);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const downloadErrors = () => {
    const ws = XLSX.utils.json_to_sheet(
      rows
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => Object.keys(r.errors).length)
        .map(({ r, i }) => ({ Qator: i + 2, ...r.values, Xatolar: Object.entries(r.errors).map(([k, m]) => `${k}: ${m}`).join('; ') })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Xatolar');
    XLSX.writeFile(wb, 'Import_xatolari.xlsx');
  };

  const steps = ['Shablon', 'Fayl yuklash', 'Tekshirish'];
  return (
    <Modal open={open} onClose={onClose} title="Excel orqali import" size="xl" dirty={step === 3}>
      {step < 4 && (
        <ol className="mb-6 flex items-center gap-2">
          {steps.map((s, i) => {
            const n = i + 1;
            const done = step > n;
            const cur = step === n;
            return (
              <li key={s} className="flex flex-1 items-center gap-2">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? 'bg-primary text-primary-fg' : cur ? 'bg-primary-soft text-primary-ink ring-2 ring-primary' : 'bg-surface-2 text-muted'}`}>
                  {done ? <Check size={16} /> : n}
                </span>
                <span className={`hidden text-sm font-semibold sm:inline ${cur || done ? 'text-text' : 'text-muted'}`}>{s}</span>
                {n < 3 && <span className={`h-0.5 flex-1 rounded ${done ? 'bg-primary' : 'bg-border'}`} />}
              </li>
            );
          })}
        </ol>
      )}

      {step === 1 && (
        <div className="flex flex-col items-center py-6 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary-ink">
            <FileSpreadsheet size={30} />
          </span>
          <p className="mt-4 text-sm text-text">Avval shablonni yuklab oling va to'ldiring</p>
          <p className="mt-1 max-w-md text-xs text-muted">Ustunlar: {cols.join(', ')}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="outline" icon={<Download size={16} />} onClick={downloadTemplate}>
              Shablonni yuklab olish
            </Button>
            <Button onClick={() => setStep(2)}>Keyingi</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              void handleFile(e.dataTransfer.files[0]);
            }}
            className={`focus-ring flex cursor-pointer flex-col items-center rounded-card border-2 border-dashed px-6 py-12 text-center transition-colors ${drag ? 'border-primary bg-primary-soft' : 'border-border-strong bg-surface-2 hover:border-primary'}`}
          >
            <UploadCloud size={36} className="text-primary-ink" />
            <p className="mt-3 text-sm font-semibold text-text">{busy ? 'Fayl tekshirilmoqda...' : 'Faylni shu yerga tashlang yoki tanlash uchun bosing'}</p>
            <p className="mt-1 text-xs text-muted">.xlsx yoki .xls, 5 MB gacha</p>
            <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => void handleFile(e.target.files?.[0])} />
          </div>
          {fileErr && <p className="mt-2 text-sm font-medium text-danger-ink">{fileErr}</p>}
          <div className="mt-4 flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              Orqaga
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-muted">
              <span className="font-semibold text-text">{fileName}</span> —{' '}
              <span className="font-semibold text-success-ink">{valid.length} ta to'g'ri</span>, <span className="font-semibold text-danger-ink">{invalid} ta xatoli</span>
            </div>
            <Checkbox checked={onlyValid} onChange={setOnlyValid} label="Faqat to'g'ri qatorlarni import qilish" />
          </div>
          <div className="max-h-[50vh] overflow-auto rounded-ctl border border-border">
            <table className="w-full min-w-[900px] border-separate border-spacing-0 text-xs">
              <thead className="sticky top-0 z-[1]">
                <tr className="[&>th]:border-b [&>th]:border-border [&>th]:bg-surface-2">
                  <th className="th !px-3">№</th>
                  {cols.map((c) => (
                    <th key={c} className="th !px-3">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="[&>td]:border-b [&>td]:border-border">
                    <td className="px-3 py-2 text-muted tabular">{i + 1}</td>
                    {cols.map((c) =>
                      r.errors[c] ? (
                        <td key={c} className="bg-danger-soft px-3 py-2 text-danger-ink">
                          <Tooltip content={r.errors[c]}>
                            <span tabIndex={0} className="cursor-help underline decoration-dotted">
                              {r.values[c] || '—'}
                            </span>
                          </Tooltip>
                        </td>
                      ) : (
                        <td key={c} className="whitespace-nowrap px-3 py-2 text-text">
                          {r.values[c]}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!onlyValid && invalid > 0 && <p className="mt-2 text-xs font-medium text-danger-ink">Xatoli qatorlar mavjud. Avval faylni tuzating yoki faqat to'g'ri qatorlarni import qiling.</p>}
          <div className="mt-4 flex flex-wrap justify-between gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              Orqaga
            </Button>
            <Button loading={busy} disabled={!valid.length || (!onlyValid && invalid > 0)} onClick={doImport}>
              Import qilish
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-col items-center py-8 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-success-soft text-success-ink">
            <CheckCircle2 size={32} />
          </span>
          <p className="mt-4 text-base font-semibold text-text">
            Import yakunlandi: {result.added} ta qo'shildi, {result.skipped} ta o'tkazib yuborildi
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {result.skipped > 0 && (
              <Button variant="outline" icon={<Download size={16} />} onClick={downloadErrors}>
                Xatolar ro'yxatini yuklab olish
              </Button>
            )}
            <Button onClick={onClose}>Yopish</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
