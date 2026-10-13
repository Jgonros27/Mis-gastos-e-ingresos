import { useState } from "react";
import { budget, money, totals, type Document } from "./model";
export function BudgetRing({
  amount,
  spent,
}: {
  amount: number | undefined;
  spent: number;
}) {
  const remaining = amount === undefined ? undefined : amount - spent,
    percentage =
      amount === undefined
        ? null
        : amount === 0
          ? spent
            ? 0
            : 100
          : Math.max(0, Math.min(100, ((amount - spent) / amount) * 100));
  return (
    <div
      className={
        "budget-ring " +
        (remaining !== undefined && remaining < 0 ? "over" : "")
      }
      style={{ "--remaining": (percentage || 0) + "%" } as React.CSSProperties}
    >
      <div>
        <b>
          {percentage === null
            ? "—"
            : percentage.toLocaleString("es-ES", { maximumFractionDigits: 1 }) +
              "%"}
        </b>
        <small>
          {remaining !== undefined && remaining < 0 ? "Exceso" : "Restante"}
        </small>
      </div>
    </div>
  );
}
export default function BudgetPage({
  doc,
  month,
  onEdit,
}: {
  doc: Document;
  month: string;
  onEdit: (id: string) => void;
}) {
  const [all, setAll] = useState(false);
  const categories = [
    { id: "global", name: "Presupuesto mensual", icon: "🎯", color: "#f3cc46" },
    ...doc.categories.filter((c) => c.type === "expense"),
  ].filter(
    (c) => all || c.id === "global" || budget(doc, month, c.id) !== undefined,
  );
  return (
    <>
      <div className="budget-cards">
        {categories.map((c) => {
          const amount = budget(doc, month, c.id),
            spent = totals(
              doc.transactions.filter(
                (t) =>
                  t.date.startsWith(month) &&
                  (c.id === "global" || t.categoryId === c.id),
              ),
            ).expense;
          return (
            <section className="card budget-card" key={c.id}>
              <header>
                <h2>
                  <span
                    className="category-icon"
                    style={{ background: c.color }}
                  >
                    {c.icon}
                  </span>
                  {c.name}
                </h2>
                <button
                  aria-label={"Cambiar presupuesto " + c.name}
                  onClick={() => onEdit(c.id)}
                >
                  ✎
                </button>
              </header>
              <div className="budget-card-body">
                <dl>
                  <div>
                    <dt>Presupuesto</dt>
                    <dd>
                      {amount === undefined ? "Sin definir" : money(amount)}
                    </dd>
                  </div>
                  <div>
                    <dt>Gastado</dt>
                    <dd>{money(spent)}</dd>
                  </div>
                  <div className="remaining">
                    <dt>Restante</dt>
                    <dd
                      className={
                        amount !== undefined && amount - spent < 0
                          ? "error"
                          : ""
                      }
                    >
                      {amount === undefined ? "—" : money(amount - spent)}
                    </dd>
                  </div>
                </dl>
                <BudgetRing amount={amount} spent={spent} />
              </div>
            </section>
          );
        })}
      </div>
      <button className="primary add-budget" onClick={() => setAll(!all)}>
        {all
          ? "Ver solo presupuestos definidos"
          : "+ Añadir presupuesto de categoría"}
      </button>
      <p>
        Los presupuestos continúan automáticamente. Al cambiar uno eliges desde
        qué mes se aplica.
      </p>
    </>
  );
}
