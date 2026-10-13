import {
  emptyDocument,
  validate,
  cents,
  validDate,
  uid,
  totals,
  type Document,
  type Transaction,
} from "./model";
export interface Preview {
  doc: Document;
  invalid: string[];
  excluded: number;
  warnings: string[];
  duplicates: number;
  own: boolean;
  conflicts: number;
}
export function previewImport(raw: unknown, current: Document): Preview {
  if (!Array.isArray(raw)) {
    const doc = validate(raw);
    return {
      doc,
      invalid: [],
      excluded: 0,
      warnings: [],
      duplicates: doc.transactions.filter((t) =>
        current.transactions.some((x) => x.id === t.id),
      ).length,
      conflicts: doc.transactions.filter((t) =>
        current.transactions.some(
          (x) => x.id === t.id && JSON.stringify(x) !== JSON.stringify(t),
        ),
      ).length,
      own: true,
    };
  }
  const doc = emptyDocument(),
    invalid: string[] = [],
    warnings: string[] = [];
  let excluded = 0;
  raw.forEach((r, i) => {
    try {
      if (!["Gastos", "Ingresos"].includes(r.type)) {
        excluded++;
        return;
      }
      if (
        r.currency !== "EUR" ||
        !validDate(r.date) ||
        typeof r.category !== "string" ||
        !r.category.trim() ||
        typeof r.remark !== "string"
      )
        throw Error("Fecha, moneda o campos inválidos");
      const amountCents = cents(r.amount);
      if (amountCents <= 0) throw Error("Importe no positivo");
      const type = r.type === "Gastos" ? "expense" : "income";
      let cat = doc.categories.find(
        (c) => c.name === r.category && c.type === type,
      );
      if (!cat) {
        cat = {
          id: uid(),
          name: r.category,
          type,
          icon: "✨",
          color: "#ead4bc",
        };
        doc.categories.push(cat);
      }
      const attachments: Transaction["attachments"] = [];
      for (const p of r.pictures || []) {
        try {
          if (p && typeof p === "object" && p.base64 && p.mime) {
            const a = {
              id: uid(),
              name: p.name || "recibo",
              mime: p.mime,
              size: atob(p.base64).length,
              base64: p.base64,
              addedAt: new Date().toISOString(),
            };
            validate({
              ...doc,
              transactions: [
                {
                  id: uid(),
                  type,
                  amountCents,
                  date: r.date,
                  categoryId: cat.id,
                  note: r.remark,
                  attachments: [a],
                  createdAt: "",
                  updatedAt: "",
                },
              ],
            });
            attachments.push(a);
          } else
            warnings.push(
              "Registro " + (i + 1) + ": falta adjunto " + String(p),
            );
        } catch {
          warnings.push("Registro " + (i + 1) + ": adjunto no interpretable");
        }
      }
      const source = JSON.stringify([
        r.category,
        r.remark,
        r.amount,
        r.currency,
        r.type,
        r.date,
        r.pictures,
      ]);
      doc.transactions.push({
        id: uid(),
        type,
        amountCents,
        date: r.date,
        categoryId: cat.id,
        note: r.remark,
        attachments,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source,
      });
    } catch (e) {
      invalid.push("Registro " + (i + 1) + ": " + (e as Error).message);
    }
  });
  const counts = new Map<string, number>();
  current.transactions.forEach((t) => {
    if (t.source) counts.set(t.source, (counts.get(t.source) || 0) + 1);
  });
  let duplicates = 0;
  doc.transactions.forEach((t) => {
    const n = counts.get(t.source!) || 0;
    if (n) {
      duplicates++;
      counts.set(t.source!, n - 1);
    }
  });
  return {
    doc,
    invalid,
    excluded,
    warnings,
    duplicates,
    own: false,
    conflicts: 0,
  };
}
export function mergeImport(
  current: Document,
  p: Preview,
  keepMatches = false,
): Document {
  const result = {
    ...current,
    categories: [...current.categories],
    transactions: [...current.transactions],
  };
  const mapping = new Map<string, string>();
  p.doc.categories.forEach((c) => {
    const found = result.categories.find((x) =>
      p.own ? x.id === c.id : x.name === c.name && x.type === c.type,
    );
    mapping.set(c.id, found?.id || c.id);
    if (!found) result.categories.push(c);
  });
  const counts = new Map<string, number>();
  current.transactions.forEach((t) => {
    if (t.source) counts.set(t.source, (counts.get(t.source) || 0) + 1);
  });
  p.doc.transactions.forEach((t) => {
    if (p.own && result.transactions.some((x) => x.id === t.id)) return;
    const n = counts.get(t.source!) || 0;
    if (!p.own && n && !keepMatches) {
      counts.set(t.source!, n - 1);
      return;
    }
    result.transactions.push({ ...t, categoryId: mapping.get(t.categoryId)! });
  });
  return validate(result);
}
export const importSummary = (p: Preview) => totals(p.doc.transactions);
