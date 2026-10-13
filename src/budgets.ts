import { type Document, uid } from "./model";
export interface BudgetChange {
  id: string;
  from: string;
  categoryId: string;
  amountCents: number | null;
}
export function applyBudgetChange(
  doc: Document,
  categoryId: string,
  amountCents: number | null,
  from: string,
  recurring = true,
): Document {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(from))
    throw Error("Selecciona un mes válido");
  if (
    amountCents !== null &&
    (!Number.isSafeInteger(amountCents) || amountCents < 0)
  )
    throw Error("Presupuesto inválido");
  const budgets = Object.fromEntries(
    Object.entries(doc.budgets).map(([key, value]) => [key, { ...value }]),
  );
  if (!recurring) {
    budgets[from] ??= {};
    budgets[from][categoryId] = amountCents;
    return { ...doc, budgets };
  }
  for (const [key, value] of Object.entries(budgets))
    if (key >= from && key !== "default") delete value[categoryId];
  const budgetChanges = [
    ...(doc.budgetChanges || []).filter(
      (c) => c.categoryId !== categoryId || c.from < from,
    ),
    { id: uid(), from, categoryId, amountCents },
  ];
  return { ...doc, budgets, budgetChanges };
}
export function adjacentMonth(month: string, offset: number) {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(year, m - 1 + offset, 1, 12));
  return d.toISOString().slice(0, 7);
}
