import { it, expect } from "vitest";
import { applyBudgetChange } from "./budgets";
import { emptyDocument, budget, validate } from "./model";
it("un presupuesto continúa sin crear cada mes y conserva el histórico", () => {
  let d = applyBudgetChange(emptyDocument(), "global", 215000, "2025-10");
  d = applyBudgetChange(d, "global", 230000, "2026-07");
  expect(budget(d, "2026-06")).toBe(215000);
  expect(budget(d, "2026-07")).toBe(230000);
  expect(budget(d, "2028-01")).toBe(230000);
  expect(validate(JSON.parse(JSON.stringify(d))).budgetChanges).toHaveLength(2);
});
it("permite excepciones mensuales y desactivar desde una fecha sin confundir cero", () => {
  let d = applyBudgetChange(emptyDocument(), "global", 200000, "2026-01");
  d = applyBudgetChange(d, "global", 0, "2026-06", false);
  expect(budget(d, "2026-06")).toBe(0);
  expect(budget(d, "2026-07")).toBe(200000);
  d = applyBudgetChange(d, "global", null, "2026-05", false);
  expect(budget(d, "2026-05")).toBeUndefined();
  expect(budget(d, "2026-04")).toBe(200000);
  d = applyBudgetChange(d, "global", null, "2026-07");
  expect(budget(d, "2026-06")).toBe(0);
  expect(budget(d, "2026-08")).toBeUndefined();
});
