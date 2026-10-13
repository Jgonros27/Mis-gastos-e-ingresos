import { useState } from "react";
import { money, cents, budget, today, type Document } from "./model";
import { applyBudgetChange, adjacentMonth } from "./budgets";
export default function BudgetEditor({
  doc,
  categoryId,
  month,
  onSave,
  onClose,
}: {
  doc: Document;
  categoryId: string;
  month: string;
  onSave: (doc: Document) => void;
  onClose: () => void;
}) {
  const current = budget(doc, month, categoryId);
  const [amount, setAmount] = useState(
      current === undefined ? "" : String(current / 100).replace(".", ","),
    ),
    [scope, setScope] = useState("current"),
    [custom, setCustom] = useState(month),
    [error, setError] = useState("");
  const now = today().slice(0, 7),
    start =
      scope === "previous"
        ? adjacentMonth(now, -1)
        : scope === "next"
          ? adjacentMonth(now, 1)
          : scope === "current"
            ? now
            : custom;
  const name =
    categoryId === "global"
      ? "Presupuesto mensual"
      : doc.categories.find((c) => c.id === categoryId)?.name;
  return (
    <div className="overlay">
      <section
        className="modal budget-editor"
        role="dialog"
        aria-modal="true"
        aria-label="Cambiar presupuesto"
      >
        <header>
          <div>
            <small>CONSERVA TU HISTORIAL</small>
            <h2>{name}</h2>
          </div>
          <button onClick={onClose}>✕</button>
        </header>
        <label>
          Presupuesto €
          <input
            autoFocus
            aria-label="Presupuesto €"
            value={amount}
            inputMode="decimal"
            placeholder="Sin presupuesto"
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <p>
          Actualmente:{" "}
          {current === undefined ? "sin presupuesto" : money(current)} en{" "}
          {month}.
        </p>
        <h3>¿Desde cuándo se aplica?</h3>
        <div className="budget-scope">
          {[
            ["previous", "Desde el mes anterior"],
            ["current", "Desde este mes"],
            ["next", "Desde el próximo mes"],
            ["custom", "Desde otro mes"],
            ["only", "Solo un mes"],
          ].map(([v, l]) => (
            <button
              className={scope === v ? "selected" : ""}
              key={v}
              onClick={() => setScope(v)}
            >
              {l}
            </button>
          ))}
        </div>
        {(scope === "custom" || scope === "only") && (
          <label>
            Mes de inicio
            <input
              type="month"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          </label>
        )}
        <p>
          {scope === "only"
            ? `Solo cambia ${custom}; los demás meses mantienen su presupuesto.`
            : `Se aplica desde ${start}, también en los meses siguientes. Los meses anteriores conservarán sus importes. Sustituye cualquier cambio posterior de esta categoría.`}
        </p>
        {error && <p className="error">{error}</p>}
        <footer>
          <button onClick={onClose}>Cancelar</button>
          <button
            className="primary"
            onClick={() => {
              try {
                onSave(
                  applyBudgetChange(
                    doc,
                    categoryId,
                    amount.trim() ? cents(amount) : null,
                    start,
                    scope !== "only",
                  ),
                );
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Guardar presupuesto
          </button>
        </footer>
      </section>
    </div>
  );
}
