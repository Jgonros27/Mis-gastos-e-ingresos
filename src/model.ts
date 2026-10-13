export type Kind = "expense" | "income";
export interface Attachment {
  id: string;
  name: string;
  mime: string;
  size: number;
  addedAt: string;
  base64: string;
}
export interface Transaction {
  id: string;
  type: Kind;
  amountCents: number;
  date: string;
  categoryId: string;
  note: string;
  calculationExpression?: string;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
  source?: string;
}
export interface Category {
  id: string;
  name: string;
  type: Kind;
  icon: string;
  color: string;
  archived?: boolean;
}
export interface Document {
  schemaVersion: 1;
  currency: "EUR";
  revision: string;
  transactions: Transaction[];
  categories: Category[];
  budgets: Record<string, Record<string, number>>;
  settings: {
    reminder: boolean;
    reminderTime: string;
    maxFileMB: number;
    favorites: { name: string; filter: Filter }[];
  };
  savedAt: string;
}
export interface Filter {
  from: string;
  to: string;
  type: string;
  categories: string[];
  months: string[];
  text: string;
  min: string;
  max: string;
  receipts: string;
}
export const today = () => new Date().toLocaleDateString("sv-SE");
export const uid = () => crypto.randomUUID();
export const money = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    n / 100,
  );
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function cents(s: string): number {
  s = s.trim();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(s))
    throw Error("Importe inválido. Usa 1.299,80 o 73,79.");
  const [whole, decimal = ""] = s.replaceAll(".", "").split(",");
  const n = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (!Number.isSafeInteger(n)) throw Error("Importe demasiado grande");
  return n;
}
export function calculate(s: string): number {
  const parts = s.replace(/\s/g, "").split(/([+-])/);
  if (!parts.length || parts.some((x) => !x))
    throw Error("Completa la operación");
  let result = cents(parts[0]);
  for (let i = 1; i < parts.length; i += 2)
    result += (parts[i] === "+" ? 1 : -1) * cents(parts[i + 1]);
  if (!Number.isSafeInteger(result) || result <= 0)
    throw Error("El resultado debe ser mayor que cero");
  return result;
}
export function validDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T12:00:00Z");
  return !isNaN(+d) && d.toISOString().slice(0, 10) === s;
}
const expenses =
  "Piso,Luz,Gasolina,Alquiler,Compras,Alimentos,Teléfono,Entretenimiento,Educación,Belleza,Deportes,Social,Transporte,Ropa,Auto,Bebidas,Cigarrillos,Electrónicos,Viajes,Salud,Mascotas,Reparaciones,Vivienda,Hogar,Regalos,Donaciones,Lotería,Snacks,Hijos,Verduras,Frutas".split(
    ",",
  );
const icons = [
  "🏠",
  "💡",
  "⛽",
  "🔑",
  "🛒",
  "🍽️",
  "📱",
  "🎤",
  "📚",
  "🌸",
  "🏊",
  "👥",
  "🚌",
  "👕",
  "🚗",
  "🍷",
  "🚬",
  "💻",
  "✈️",
  "🩺",
  "🐾",
  "🔧",
  "🖌️",
  "🛋️",
  "🎁",
  "💛",
  "🎯",
  "🧁",
  "🧸",
  "🥕",
  "🍇",
];
export function emptyDocument(): Document {
  return {
    schemaVersion: 1,
    currency: "EUR",
    revision: uid(),
    transactions: [],
    categories: [
      ...expenses.map((name, i) => ({
        id: "expense-" + i,
        name,
        type: "expense" as Kind,
        icon: icons[i],
        color: ["#ead4bc", "#cce9dc", "#e2d5ec", "#cfe4ee", "#f6df98"][i % 5],
      })),
      ..."Ingresos piso,Salario,Inversiones,Tiempo parcial,Premios,Otros"
        .split(",")
        .map((name, i) => ({
          id: "income-" + i,
          name,
          type: "income" as Kind,
          icon: ["🏡", "💳", "📈", "⏱️", "🏆", "✨"][i],
          color: "#cce9dc",
        })),
    ],
    budgets: {},
    settings: {
      reminder: false,
      reminderTime: "20:00",
      maxFileMB: 10,
      favorites: [],
    },
    savedAt: "",
  };
}
export const blankFilter = (): Filter => ({
  from: "",
  to: "",
  type: "both",
  categories: [],
  months: [],
  text: "",
  min: "",
  max: "",
  receipts: "all",
});
export function filterTransactions(ts: Transaction[], f: Filter) {
  if (
    (f.from && !validDate(f.from)) ||
    (f.to && !validDate(f.to)) ||
    (f.from && f.to && f.from > f.to)
  )
    throw Error("El rango de fechas no es válido");
  const minimum = f.min ? cents(f.min) : 0,
    maximum = f.max ? cents(f.max) : Number.MAX_SAFE_INTEGER;
  if (minimum > maximum) throw Error("El mínimo no puede superar el máximo");
  return ts.filter(
    (t) =>
      (!f.from || t.date >= f.from) &&
      (!f.to || t.date <= f.to) &&
      (f.type === "both" || t.type === f.type) &&
      (!f.categories.length || f.categories.includes(t.categoryId)) &&
      (!f.months.length || f.months.includes(t.date.slice(0, 7))) &&
      normalize(t.note).includes(normalize(f.text)) &&
      t.amountCents >= minimum &&
      t.amountCents <= maximum &&
      (f.receipts === "all" ||
        (f.receipts === "with"
          ? t.attachments.length > 0
          : t.attachments.length === 0)),
  );
}
export function totals(ts: Transaction[]) {
  const income = ts
      .filter((t) => t.type === "income")
      .reduce((a, t) => a + t.amountCents, 0),
    expense = ts
      .filter((t) => t.type === "expense")
      .reduce((a, t) => a + t.amountCents, 0);
  return { income, expense, balance: income - expense, count: ts.length };
}
export function budget(doc: Document, month: string, cat = "global") {
  return doc.budgets[month]?.[cat] ?? doc.budgets.default?.[cat];
}
export function validate(raw: unknown): Document {
  const d = raw as Document;
  if (
    !d ||
    d.schemaVersion !== 1 ||
    d.currency !== "EUR" ||
    !Array.isArray(d.transactions) ||
    !Array.isArray(d.categories) ||
    !d.budgets ||
    !d.settings
  )
    throw Error(
      "Documento no válido o versión no compatible. Versión actual: 1.",
    );
  const ids = new Set<string>();
  if (
    typeof d.settings.reminder !== "boolean" ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.settings.reminderTime) ||
    !Number.isFinite(d.settings.maxFileMB) ||
    d.settings.maxFileMB < 1 ||
    d.settings.maxFileMB > 100 ||
    !Array.isArray(d.settings.favorites)
  )
    throw Error("Configuración inválida");
  for (const c of d.categories) {
    if (
      !c.id ||
      !c.name ||
      typeof c.icon !== "string" ||
      !/^#[0-9a-f]{6}$/i.test(c.color) ||
      !["expense", "income"].includes(c.type) ||
      ids.has(c.id)
    )
      throw Error("Categorías inválidas");
    ids.add(c.id);
  }
  const tids = new Set();
  const attachmentIds = new Set<string>();
  for (const t of d.transactions) {
    if (
      !t.id ||
      tids.has(t.id) ||
      !validDate(t.date) ||
      !Number.isSafeInteger(t.amountCents) ||
      t.amountCents <= 0 ||
      !["expense", "income"].includes(t.type) ||
      !d.categories.some((c) => c.id === t.categoryId && c.type === t.type) ||
      typeof t.note !== "string" ||
      !Array.isArray(t.attachments)
    )
      throw Error("Movimiento inválido");
    tids.add(t.id);
    for (const a of t.attachments) {
      if (
        !a.id ||
        !a.name ||
        attachmentIds.has(a.id) ||
        !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
          a.mime,
        ) ||
        !Number.isSafeInteger(a.size) ||
        a.size < 1 ||
        typeof a.base64 !== "string"
      )
        throw Error("Adjunto inválido");
      attachmentIds.add(a.id);
      let bytes;
      try {
        bytes = atob(a.base64);
      } catch {
        throw Error("Base64 inválido");
      }
      if (
        bytes.length !== a.size ||
        !signature(
          Uint8Array.from(bytes, (x) => x.charCodeAt(0)),
          a.mime,
        )
      )
        throw Error("Contenido de adjunto inválido");
    }
  }
  for (const b of Object.values(d.budgets))
    for (const n of Object.values(b))
      if (!Number.isSafeInteger(n) || n < 0)
        throw Error("Presupuesto inválido");
  return { ...d, revision: d.revision || uid() };
}
export function signature(b: Uint8Array, mime: string) {
  return mime === "application/pdf"
    ? new TextDecoder().decode(b.slice(0, 5)) === "%PDF-"
    : mime === "image/png"
      ? b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71
      : mime === "image/jpeg"
        ? b[0] === 255 && b[1] === 216 && b[2] === 255
        : new TextDecoder().decode(b.slice(0, 4)) === "RIFF" &&
          new TextDecoder().decode(b.slice(8, 12)) === "WEBP";
}
export async function attachment(file: File, max: number): Promise<Attachment> {
  if (file.size > max * 1024 * 1024 || !file.size)
    throw Error("Archivo vacío o supera " + max + " MB");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ].find((m) => signature(bytes, m));
  if (!mime) throw Error("Contenido no reconocido: " + file.name);
  if (mime.startsWith("image/") && typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
    } catch {
      throw Error("Imagen dañada: " + file.name);
    }
  }
  const base64 = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  return {
    id: uid(),
    name: file.name,
    mime,
    size: file.size,
    addedAt: new Date().toISOString(),
    base64,
  };
}
export const attachmentBlob = (a: Attachment) =>
  new Blob([Uint8Array.from(atob(a.base64), (x) => x.charCodeAt(0))], {
    type: a.mime,
  });
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csv(rows: unknown[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map(
            (v) =>
              '"' +
              (typeof v === "number"
                ? v.toLocaleString("es-ES", {
                    useGrouping: false,
                    maximumFractionDigits: 2,
                  })
                : String(v ?? "").replace(/^(?:\s*[=+\-@]|[\t\r\n])/, "'$&")
              ).replaceAll('"', '""') +
              '"',
          )
          .join(";"),
      )
      .join("\r\n")
  );
}
