import { useState } from "react";
import BudgetReport, { budgetReportRows } from "./BudgetReport";
import {
  effectiveDays,
  previousDays,
  comparePercent,
  monthEnd,
} from "./analytics";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  blankFilter,
  filterTransactions,
  totals,
  money,
  csv,
  download,
  normalize,
  budget,
  today,
  type Document,
  type Filter,
  type Transaction,
} from "./model";
export default function Reports({
  doc,
  onEdit,
  onFavorite,
}: {
  doc: Document;
  onEdit: (t: Transaction) => void;
  onFavorite: (name: string, f: Filter) => void;
}) {
  const [f, setF] = useState<Filter>(blankFilter),
    [group, setGroup] = useState("month"),
    [sort, setSort] = useState("date"),
    [ascending, setAscending] = useState(false),
    [filters, setFilters] = useState(!matchMedia("(max-width:760px)").matches),
    [sameDay, setSameDay] = useState(false);
  const update = (key: keyof Filter, value: any) =>
    setF({ ...f, [key]: value });
  let rows: Transaction[] = [];
  let error = "";
  try {
    rows = filterTransactions(doc.transactions, f);
  } catch (e) {
    error = (e as Error).message;
  }
  const sum = totals(rows),
    cat = (id: string) => doc.categories.find((c) => c.id === id)!;
  const effective = effectiveDays(doc.transactions, f);
  const from = effective[0] || f.from || today(),
    to = effective.at(-1) || f.to || today();
  const days = effective.length;
  const savings =
    f.type === "both" &&
    !f.categories.length &&
    !f.text &&
    !f.min &&
    !f.max &&
    f.receipts === "all" &&
    sum.income > 0;
  const categoryTotals = (type: string) =>
    doc.categories
      .filter((c) => c.type === type)
      .map((c) => ({
        ...c,
        value: rows
          .filter((t) => t.categoryId === c.id)
          .reduce((a, t) => a + t.amountCents, 0),
      }))
      .filter((c) => c.value)
      .sort((a, b) => b.value - a.value);
  const expenses = categoryTotals("expense");
  const temporalKey = (date: string) => {
    if (group === "year") return date.slice(0, 4);
    if (group === "day") return date;
    if (group === "week") {
      const d = new Date(date + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
      return d.toISOString().slice(0, 10);
    }
    return date.slice(0, 7);
  };
  const keys = [...new Set(effective.map(temporalKey))].sort();
  let accumulated = 0;
  const timeline = keys.map((key) => {
    const s = totals(rows.filter((t) => temporalKey(t.date) === key));
    accumulated += s.balance;
    return {
      key,
      Gastos: s.expense / 100,
      Ingresos: s.income / 100,
      Acumulado: accumulated / 100,
    };
  });
  const months = [...new Set(effective.map((t) => t.slice(0, 7)))].sort();
  const monthly = months.map((m) => ({
    month: m,
    ...totals(rows.filter((t) => t.date.startsWith(m))),
  }));
  const concepts = [...new Set(rows.map((t) => normalize(t.note)))]
    .map((n) => ({
      note: n || "(Sin nota)",
      originals: [
        ...new Set(
          rows.filter((t) => normalize(t.note) === n).map((t) => t.note),
        ),
      ].join(" / "),
      ...totals(rows.filter((t) => normalize(t.note) === n)),
    }))
    .sort((a, b) => b.expense - a.expense);
  const ordered = [...rows].sort((a, b) => {
    let x: any =
        sort === "categoryId"
          ? cat(a.categoryId).name
          : a[sort as keyof Transaction],
      y: any =
        sort === "categoryId"
          ? cat(b.categoryId).name
          : b[sort as keyof Transaction];
    return (
      (typeof x === "number" ? x - y : String(x).localeCompare(String(y))) *
      (ascending ? 1 : -1)
    );
  });
  const preset = (name: string) => {
    const d = new Date(),
      y = d.getFullYear(),
      m = d.getMonth();
    let start = "",
      end = "";
    const civil = (x: Date) => x.toLocaleDateString("sv-SE");
    if (name === "month") {
      start = civil(new Date(y, m, 1));
      end = civil(new Date(y, m + 1, 0));
    } else if (name === "previous") {
      start = civil(new Date(y, m - 1, 1));
      end = civil(new Date(y, m, 0));
    } else if (name === "year" || name === "lastyear") {
      const yy = y - (name === "lastyear" ? 1 : 0);
      start = yy + "-01-01";
      end = yy + "-12-31";
    } else if (name !== "all") {
      start = civil(new Date(y, m - Number(name) + 1, 1));
      end = today();
    }
    setF({ ...f, from: start, to: end, months: [] });
  };
  const exportRows = () =>
    download(
      new Blob(
        [
          csv([
            ["Periodo", from + " a " + to],
            ["Filtros", JSON.stringify(f)],
            [
              "Fecha",
              "Tipo",
              "Categoría",
              "Nota",
              "Importe EUR",
              "Recibos",
              "Nombres de adjuntos",
            ],
            ...rows.map((t) => [
              t.date,
              t.type === "expense" ? "Gasto" : "Ingreso",
              cat(t.categoryId).name,
              t.note,
              (t.amountCents / 100).toFixed(2).replace(".", ","),
              t.attachments.length,
              t.attachments.map((a) => a.name).join(" | "),
            ]),
          ]),
        ],
        { type: "text/csv;charset=utf-8" },
      ),
      "brisa-movimientos.csv",
    );
  const exportSummary = () =>
    download(
      new Blob([
        csv([
          ["Periodo", from + " a " + to],
          ["Filtros", JSON.stringify(f)],
          ["Mes", "Ingresos", "Gastos", "Balance"],
          ...monthly.map((m) => [
            m.month,
            m.income / 100,
            m.expense / 100,
            m.balance / 100,
          ]),
          [],
          ["Categoría", ...months, "Total"],
          ...doc.categories.map((c) => [
            c.name,
            ...months.map(
              (m) =>
                rows
                  .filter((t) => t.categoryId === c.id && t.date.startsWith(m))
                  .reduce((a, t) => a + t.amountCents, 0) / 100,
            ),
            rows
              .filter((t) => t.categoryId === c.id)
              .reduce((a, t) => a + t.amountCents, 0) / 100,
          ]),
          [],
          [
            "Presupuestos",
            "Mes",
            "Categoría",
            "Presupuestado EUR",
            "Gasto total EUR",
            "Gasto filtrado EUR",
            "Restante EUR",
            "Consumido",
          ],
          ...budgetReportRows(doc, months, rows).map((d) => [
            "",
            d.month,
            d.category,
            d.amount / 100,
            d.total / 100,
            d.filtered / 100,
            d.remaining / 100,
            d.percent,
          ]),
        ]),
      ]),
      "brisa-resumen.csv",
    );
  const comparison = (shiftYear: boolean) => {
    if (error) return <p>Corrige los filtros para comparar.</p>;
    const currentDays = sameDay
      ? effective.filter((d) => d <= today())
      : effective;
    const comparedDays = previousDays(currentDays, shiftYear);
    const current = totals(rows.filter((t) => currentDays.includes(t.date)));
    const previous = totals(
      filterTransactions(doc.transactions, {
        ...f,
        from: "",
        to: "",
        months: [],
      }).filter((t) => comparedDays.includes(t.date)),
    );
    const percent = comparePercent(current.expense, previous.expense);
    return (
      <p>
        {comparedDays[0] || "—"} → {comparedDays.at(-1) || "—"} ·{" "}
        {comparedDays.length} días seleccionados ·{" "}
        {previous.count
          ? `Gastos ${money(previous.expense)} · Ingresos ${money(previous.income)} · Balance ${money(previous.balance)}`
          : "Sin registros"}{" "}
        · Variación gasto:{" "}
        {percent === null
          ? "No disponible (base cero)"
          : percent.toLocaleString("es-ES", { maximumFractionDigits: 1 }) +
            " %"}{" "}
        · Base actual: {currentDays[0] || "—"} → {currentDays.at(-1) || "—"}
      </p>
    );
  };
  return (
    <>
      <div className="page-title">
        <div>
          <small>ENTIENDE TU DINERO</small>
          <h1>Informes</h1>
          <p>Una perspectiva clara de cada movimiento.</p>
        </div>
        <button onClick={() => setFilters(!filters)}>☷ Filtros</button>
      </div>
      <p className="print-context">
        Periodo {from} → {to} · {days} días efectivos · {rows.length}{" "}
        movimientos. Filtros: {JSON.stringify(f)}
      </p>
      {filters && (
        <section className="card report-filters">
          <button
            className="mobile-filter-close"
            onClick={() => setFilters(false)}
          >
            Aplicar filtros y cerrar ✓
          </button>
          <div className="toolbar">
            <select
              aria-label="Periodo predefinido"
              defaultValue="all"
              onChange={(e) => preset(e.target.value)}
            >
              {[
                ["all", "Todo el histórico"],
                ["month", "Este mes"],
                ["previous", "Mes anterior"],
                ["year", "Este año"],
                ["lastyear", "Año anterior"],
                ["3", "Últimos 3 meses"],
                ["6", "Últimos 6 meses"],
                ["12", "Últimos 12 meses"],
              ].map(([v, l]) => (
                <option value={v} key={v}>
                  {l}
                </option>
              ))}
            </select>
            <button onClick={() => setF(blankFilter())}>Limpiar filtros</button>
            <button
              onClick={() => {
                const name = prompt("Nombre de la vista favorita");
                if (name) onFavorite(name, f);
              }}
            >
              ☆ Guardar vista
            </button>
            <select
              aria-label="Vistas favoritas"
              value=""
              onChange={(e) => {
                if (e.target.value)
                  setF(doc.settings.favorites[Number(e.target.value)].filter);
              }}
            >
              <option value="">Vistas favoritas</option>
              {doc.settings.favorites.map((v, i) => (
                <option value={i} key={i}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-grid">
            <label>
              Desde
              <input
                type="date"
                value={f.from}
                onChange={(e) => update("from", e.target.value)}
              />
            </label>
            <label>
              Hasta
              <input
                type="date"
                value={f.to}
                onChange={(e) => update("to", e.target.value)}
              />
            </label>
            <label>
              Tipo
              <select
                value={f.type}
                onChange={(e) => update("type", e.target.value)}
              >
                <option value="both">Gastos e ingresos</option>
                <option value="expense">Gastos</option>
                <option value="income">Ingresos</option>
              </select>
            </label>
            <label>
              Buscar nota
              <input
                value={f.text}
                onChange={(e) => update("text", e.target.value)}
                placeholder="Sin distinguir tildes"
              />
            </label>
            <label>
              Mínimo €
              <input
                value={f.min}
                onChange={(e) => update("min", e.target.value)}
                inputMode="decimal"
              />
            </label>
            <label>
              Máximo €
              <input
                value={f.max}
                onChange={(e) => update("max", e.target.value)}
                inputMode="decimal"
              />
            </label>
            <label>
              Recibos
              <select
                value={f.receipts}
                onChange={(e) => update("receipts", e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="with">Con recibos</option>
                <option value="without">Sin recibos</option>
              </select>
            </label>
            <label>
              Año y meses (varios)
              <select
                multiple
                value={f.months}
                onChange={(e) =>
                  update(
                    "months",
                    Array.from(e.target.selectedOptions, (x) => x.value),
                  )
                }
              >
                {[...new Set(doc.transactions.map((t) => t.date.slice(0, 7)))]
                  .sort()
                  .map((m) => (
                    <option key={m}>{m}</option>
                  ))}
              </select>
            </label>
            <label>
              Categorías (varias)
              <select
                multiple
                value={f.categories}
                onChange={(e) =>
                  update(
                    "categories",
                    Array.from(e.target.selectedOptions, (x) => x.value),
                  )
                }
              >
                {doc.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name} (
                    {c.type === "expense" ? "gasto" : "ingreso"})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p>
            Los presets sustituyen rango y meses. El rango y los meses manuales
            se intersectan. {rows.length} movimientos · {from} → {to} ·{" "}
            {f.type !== "both" ? "Balance parcial" : ""}
          </p>
          <small>Filtros activos: {JSON.stringify(f)}</small>
          {error && <p className="error">{error}</p>}
        </section>
      )}
      <div className="stats">
        <section className="card">
          <small>INGRESOS FILTRADOS</small>
          <h2 className="income">{money(sum.income)}</h2>
        </section>
        <section className="card">
          <small>GASTOS FILTRADOS</small>
          <h2>{money(sum.expense)}</h2>
        </section>
        <section className="card accent">
          <small>BALANCE {f.type === "both" ? "FILTRADO" : "PARCIAL"}</small>
          <h2>{money(sum.balance)}</h2>
        </section>
      </div>
      <section className="card metrics">
        <span>
          <b>{rows.length}</b> movimientos
        </span>
        <span>
          Media por gasto{" "}
          <b>
            {money(
              Math.round(
                sum.expense /
                  (rows.filter((t) => t.type === "expense").length || 1),
              ),
            )}
          </b>
        </span>
        <span>
          Media diaria{" "}
          <b>
            {days ? money(Math.round(sum.expense / days)) : "No disponible"}
          </b>{" "}
          / {days} días
        </span>
        <span>
          Mayor categoría <b>{expenses[0]?.name || "Sin registros"}</b>
        </span>
        <span>
          Mayor gasto{" "}
          <b>
            {money(
              Math.max(
                0,
                ...rows
                  .filter((t) => t.type === "expense")
                  .map((t) => t.amountCents),
              ),
            )}
          </b>
        </span>
        <span>
          Ahorro{" "}
          <b>
            {savings
              ? ((sum.balance / sum.income) * 100)
                  .toFixed(1)
                  .replace(".", ",") + " %"
              : "No disponible"}
          </b>
          {!savings && (
            <small>
              {" "}
              Requiere ambos tipos, ingresos positivos y ningún filtro que
              distorsione el total.
            </small>
          )}
        </span>
      </section>
      <div className="report-grid">
        <section className="card">
          <div className="section-title">
            <h2>Evolución</h2>
            <select value={group} onChange={(e) => setGroup(e.target.value)}>
              {[
                ["day", "Día"],
                ["week", "Semana"],
                ["month", "Mes"],
                ["year", "Año"],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <ResponsiveContainer width="100%" height={290}>
            <BarChart
              data={timeline}
              onClick={(e: any) => {
                if (e.activeLabel) {
                  const key = String(e.activeLabel);
                  setF({
                    ...f,
                    from:
                      key.length === 7
                        ? key + "-01"
                        : key.length === 4
                          ? key + "-01-01"
                          : key,
                    to:
                      key.length === 7
                        ? monthEnd(key)
                        : key.length === 4
                          ? key + "-12-31"
                          : key,
                    months: [],
                  });
                }
              }}
            >
              <CartesianGrid vertical={false} stroke="#ecece6" />
              <XAxis dataKey="key" />
              <YAxis />
              <Tooltip
                formatter={(v: any) => money(Math.round(Number(v) * 100))}
              />
              <Legend />
              <Bar dataKey="Ingresos" fill="#579b80" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Gastos" fill="#efc84b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className="card">
          <h2>Balance acumulado del periodo</h2>
          <p>Parte de cero; no representa un saldo bancario.</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={[{ key: "Inicio", Acumulado: 0 }, ...timeline]}>
              <XAxis dataKey="key" />
              <YAxis />
              <Tooltip
                formatter={(v: any) => money(Math.round(Number(v) * 100))}
              />
              <Line
                type="monotone"
                dataKey="Acumulado"
                stroke="#345b4b"
                strokeWidth={3}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>
        {(["expense", "income"] as const)
          .filter((k) => f.type === "both" || f.type === k)
          .map((kind) => (
            <section className="card" key={kind}>
              <h2>
                {kind === "expense"
                  ? "Distribución y ranking de gastos"
                  : "Distribución de ingresos"}
              </h2>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={categoryTotals(kind)}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={95}
                    onClick={(c: any) => update("categories", [c.id])}
                  >
                    {categoryTotals(kind).map((c) => (
                      <Cell key={c.id} fill={c.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => money(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              {categoryTotals(kind).map((c) => (
                <button
                  className="ranking"
                  key={c.id}
                  onClick={() => update("categories", [c.id])}
                >
                  <span>
                    {c.icon} {c.name}
                  </span>
                  <b>
                    {money(c.value)} ·{" "}
                    {(
                      (c.value /
                        (kind === "expense" ? sum.expense : sum.income)) *
                      100
                    )
                      .toFixed(1)
                      .replace(".", ",")}{" "}
                    %
                  </b>
                  <i
                    style={{
                      width:
                        (c.value /
                          (kind === "expense" ? sum.expense : sum.income)) *
                          100 +
                        "%",
                      background: c.color,
                    }}
                  />
                </button>
              ))}
            </section>
          ))}
      </div>
      <section className="card">
        <h2>Comparación con periodos anteriores</h2>
        <label>
          <input
            type="checkbox"
            checked={sameDay}
            onChange={(e) => setSameDay(e.target.checked)}
          />{" "}
          Comparar hasta hoy para periodos en curso
        </label>
        <p>
          Mismos filtros no temporales. Intervalos completos según la selección;
          sin registros no implica ausencia de gastos.
        </p>
        <h3>Periodo anterior</h3>
        {comparison(false)}
        <h3>Equivalente del año anterior</h3>
        {comparison(true)}
      </section>
      <BudgetReport doc={doc} months={months} rows={rows} />
      <section className="card">
        <div className="section-title">
          <h2>Resumen mensual</h2>
          <button onClick={exportSummary}>↓ CSV resumen y matriz</button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Mes</th>
                <th>Ingresos</th>
                <th>Gastos</th>
                <th>Balance</th>
                <th>Presupuesto global / gasto total</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m) => (
                <tr key={m.month}>
                  <td>
                    {m.month}
                    {m.month === today().slice(0, 7)
                      ? " · en curso"
                      : m.month > today().slice(0, 7)
                        ? " · futuro"
                        : ""}
                  </td>
                  <td>{money(m.income)}</td>
                  <td>{money(m.expense)}</td>
                  <td>{money(m.balance)}</td>
                  <td>
                    {budget(doc, m.month) === undefined
                      ? "Sin presupuesto"
                      : money(budget(doc, m.month)!)}{" "}
                    /{" "}
                    {money(
                      totals(
                        doc.transactions.filter((t) =>
                          t.date.startsWith(m.month),
                        ),
                      ).expense,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <h2>Matriz categoría × mes</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Categoría</th>
                {months.map((m) => (
                  <th key={m}>{m}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {doc.categories
                .filter((c) => rows.some((t) => t.categoryId === c.id))
                .map((c) => (
                  <tr key={c.id}>
                    <td>
                      <button onClick={() => update("categories", [c.id])}>
                        {c.name}
                      </button>
                    </td>
                    {months.map((m) => (
                      <td key={m}>
                        {money(
                          rows
                            .filter(
                              (t) =>
                                t.categoryId === c.id && t.date.startsWith(m),
                            )
                            .reduce((a, t) => a + t.amountCents, 0),
                        )}
                      </td>
                    ))}
                    <td>
                      {money(
                        rows
                          .filter((t) => t.categoryId === c.id)
                          .reduce((a, t) => a + t.amountCents, 0),
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <h2>Conceptos más frecuentes</h2>
        {concepts.slice(0, 20).map((c) => (
          <button
            className="ranking"
            title={c.originals}
            key={c.note}
            onClick={() =>
              update("text", c.note === "(Sin nota)" ? "" : c.note)
            }
          >
            <span>
              {c.originals || "Sin nota"} · {c.count} movimientos
            </span>
            <b>
              Gastos {money(c.expense)} · Ingresos {money(c.income)}
            </b>
          </button>
        ))}
      </section>
      <section className="card">
        <div className="section-title">
          <h2>Movimientos filtrados · {rows.length}</h2>
          <div>
            <button onClick={exportRows}>↓ CSV</button>
            <button onClick={() => window.print()}>Imprimir / PDF</button>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  ["date", "Fecha"],
                  ["categoryId", "Categoría"],
                  ["type", "Tipo"],
                  ["note", "Nota"],
                  ["amountCents", "Importe"],
                ].map(([k, l]) => (
                  <th key={k}>
                    <button
                      onClick={() => {
                        setSort(k);
                        setAscending(!ascending);
                      }}
                    >
                      {l} ↕
                    </button>
                  </th>
                ))}
                <th>Recibos</th>
              </tr>
            </thead>
            <tbody>
              {ordered.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => onEdit(t)}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onEdit(t)}
                >
                  <td>{t.date}</td>
                  <td>{cat(t.categoryId).name}</td>
                  <td>{t.type === "expense" ? "Gasto" : "Ingreso"}</td>
                  <td>{t.note || "Sin nota"}</td>
                  <td>{money(t.amountCents)}</td>
                  <td>{t.attachments.length} · Editar →</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <p className="empty">
            Sin movimientos con estos filtros. Prueba a ampliar el periodo.
          </p>
        )}
      </section>
    </>
  );
}
