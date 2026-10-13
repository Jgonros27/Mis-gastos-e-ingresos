import {
  budget,
  money,
  totals,
  type Document,
  type Transaction,
} from "./model";
export function budgetReportRows(
  doc: Document,
  months: string[],
  rows: Transaction[],
) {
  return months.flatMap((month) =>
    [
      { id: "global", name: "Global" },
      ...doc.categories.filter((c) => c.type === "expense"),
    ]
      .filter((c) => budget(doc, month, c.id) !== undefined)
      .map((c) => {
        const amount = budget(doc, month, c.id)!,
          total = totals(
            doc.transactions.filter(
              (t) =>
                t.date.startsWith(month) &&
                (c.id === "global" || t.categoryId === c.id),
            ),
          ).expense,
          filtered = totals(
            rows.filter(
              (t) =>
                t.date.startsWith(month) &&
                (c.id === "global" || t.categoryId === c.id),
            ),
          ).expense;
        return {
          month,
          category: c.name,
          amount,
          total,
          filtered,
          remaining: amount - total,
          percent:
            amount === 0
              ? total
                ? "Exceso con presupuesto cero"
                : "0 %"
              : ((total / amount) * 100).toLocaleString("es-ES", {
                  maximumFractionDigits: 1,
                }) + " %",
        };
      }),
  );
}
export default function BudgetReport({
  doc,
  months,
  rows,
}: {
  doc: Document;
  months: string[];
  rows: Transaction[];
}) {
  const data = budgetReportRows(doc, months, rows);
  return (
    <section className="card">
      <h2>Gastos frente a presupuestos</h2>
      <p>
        El gasto total evalúa el presupuesto; el gasto filtrado corresponde a la
        selección del informe.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Mes</th>
              <th>Categoría</th>
              <th>Presupuestado</th>
              <th>Gasto total</th>
              <th>Gasto filtrado</th>
              <th>Restante</th>
              <th>Consumido</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i}>
                <td>{d.month}</td>
                <td>{d.category}</td>
                <td>{money(d.amount)}</td>
                <td>{money(d.total)}</td>
                <td>{money(d.filtered)}</td>
                <td className={d.remaining < 0 ? "error" : ""}>
                  {money(d.remaining)}
                </td>
                <td>{d.percent}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data.length && (
        <p>Sin presupuestos definidos para los meses seleccionados.</p>
      )}
    </section>
  );
}
