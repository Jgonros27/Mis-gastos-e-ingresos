import { useEffect, useRef, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  blankFilter,
  filterTransactions,
  totals,
  money,
  csv,
  download,
  budget,
  today,
  type Document,
  type Filter,
  type Transaction,
  type Kind,
} from "./model";
import { effectiveDays, monthEnd } from "./analytics";
import { adjacentMonth } from "./budgets";
import { useMobile } from "./useMobile";
import ReportFilters from "./ReportFilters";
import { BudgetRing } from "./BudgetPage";
import BudgetReport, { budgetReportRows } from "./BudgetReport";
const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];
const compact = (n: number) =>
  new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n / 100);
const colors = [
  "#e9c94e",
  "#6eafcb",
  "#ea8fa7",
  "#77b8a0",
  "#82bb73",
  "#b692cf",
  "#efac6c",
  "#9eb5d7",
  "#d89378",
  "#8cbfbd",
];
function categoryColor(doc: Document, id: string) {
  const c = doc.categories.find((c) => c.id === id)!;
  const siblings = doc.categories.filter((x) => x.type === c.type);
  const index = siblings.findIndex((x) => x.id === id);
  return colors[(index + (c.type === "income" ? 2 : 0)) % colors.length];
}
export default function Reports({
  doc,
  mode = "reports",
  onEdit,
  onFavorite,
  onBudgets,
}: {
  doc: Document;
  mode?: "charts" | "reports";
  onEdit: (t: Transaction) => void;
  onFavorite: (name: string, f: Filter) => void;
  onBudgets: () => void;
}) {
  const mobile = useMobile();
  const [f, setF] = useState<Filter>(blankFilter),
    [filters, setFilters] = useState(false),
    [kind, setKind] = useState<Kind>("expense"),
    [chartView, setChartView] = useState("distribution"),
    [reportView, setReportView] = useState("overview"),
    [rankPage, setRankPage] = useState(0),
    [monthlyPage, setMonthlyPage] = useState(0),
    [overviewMonth, setOverviewMonth] = useState(today().slice(0, 7)),
    [drill, setDrill] = useState<{ title: string; rows: Transaction[] } | null>(
      null,
    ),
    [matrixWidth, setMatrixWidth] = useState(700),
    [matrixOffset, setMatrixOffset] = useState(0),
    [matrixPage, setMatrixPage] = useState(0);
  const matrixRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = matrixRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) =>
      setMatrixWidth(entries[0].contentRect.width),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [mobile, reportView, mode]);
  useEffect(() => {
    setRankPage(0);
    setMonthlyPage(0);
    setMatrixOffset(0);
    setMatrixPage(0);
  }, [f, kind]);
  let rows: Transaction[] = [];
  let error = "";
  try {
    rows = filterTransactions(doc.transactions, f);
  } catch (e) {
    error = (e as Error).message;
  }
  const sum = totals(rows),
    effective = effectiveDays(doc.transactions, f),
    from = effective[0] || f.from || today(),
    to = effective.at(-1) || f.to || today(),
    months = [...new Set(effective.map((d) => d.slice(0, 7)))].sort(),
    currentMonth = today().slice(0, 7),
    pastMonths = months
      .filter((m) => m <= currentMonth)
      .sort()
      .reverse(),
    year =
      f.from && f.from.slice(0, 4) === f.to.slice(0, 4)
        ? f.from.slice(0, 4)
        : "all",
    years = [
      ...new Set([
        today().slice(0, 4),
        ...doc.transactions.map((t) => t.date.slice(0, 4)),
      ]),
    ]
      .sort()
      .reverse();
  const chartKind = f.type === "both" ? kind : (f.type as Kind),
    typedRows = rows.filter((t) => t.type === chartKind),
    typedTotal = typedRows.reduce((a, t) => a + t.amountCents, 0),
    distribution = doc.categories
      .filter((c) => c.type === chartKind)
      .map((c) => ({
        ...c,
        color: categoryColor(doc, c.id),
        value: typedRows
          .filter((t) => t.categoryId === c.id)
          .reduce((a, t) => a + t.amountCents, 0),
      }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
  const large = distribution.filter((c) => c.value / typedTotal >= 0.06),
    small = distribution.filter((c) => c.value / typedTotal < 0.06),
    pieData = [
      ...large,
      ...(small.length
        ? [
            {
              id: "other-visual",
              name: "Otras categorías",
              value: small.reduce((a, c) => a + c.value, 0),
              color: "#a8b0a3",
              icon: "⋯",
              type: chartKind,
            },
          ]
        : []),
    ];
  let accumulated = 0;
  const timeline = months.map((month) => {
    const total = totals(rows.filter((t) => t.date.startsWith(month)));
    accumulated += total.balance;
    return {
      month,
      label: MONTHS[Number(month.slice(5)) - 1],
      Gastos: total.expense / 100,
      Ingresos: total.income / 100,
      Balance: accumulated / 100,
      ...total,
    };
  });
  const monthly = pastMonths.map((month) => ({
    month,
    ...totals(rows.filter((t) => t.date.startsWith(month))),
  }));
  const visibleMonthly = mobile
    ? monthly.slice(monthlyPage * 6, monthlyPage * 6 + 6)
    : monthly;
  const matrixCount = Math.max(
      1,
      Math.min(
        12,
        Math.floor((matrixWidth - (mobile ? 110 : 150)) / (mobile ? 77 : 100)),
      ),
    ),
    matrixMonths = pastMonths.slice(matrixOffset, matrixOffset + matrixCount),
    matrixCats = doc.categories.filter((c) =>
      rows.some((t) => t.categoryId === c.id),
    );
  let baseline: Transaction[] = [];
  try {
    baseline = filterTransactions(doc.transactions, {
      ...f,
      from: "",
      to: "",
      months: [],
    });
  } catch {}
  const categoryAmount = (id: string, month: string, source = rows) =>
    source
      .filter((t) => t.categoryId === id && t.date.startsWith(month))
      .reduce((a, t) => a + t.amountCents, 0);
  const openCategory = (id: string) =>
    setDrill({
      title:
        id === "other-visual"
          ? "Otras categorías"
          : doc.categories.find((c) => c.id === id)?.name || "Categoría",
      rows:
        id === "other-visual"
          ? typedRows.filter((t) => small.some((c) => c.id === t.categoryId))
          : typedRows.filter((t) => t.categoryId === id),
    });
  const showMonth = (month: string) =>
    setDrill({
      title: new Date(month + "-01T12:00:00").toLocaleDateString("es-ES", {
        month: "long",
        year: "numeric",
      }),
      rows: rows.filter((t) => t.date.startsWith(month)),
    });
  const exportRows = () =>
    download(
      new Blob(
        [
          csv([
            ["Periodo", from + " a " + to],
            ["Fecha", "Tipo", "Categoría", "Nota", "Importe EUR", "Recibos"],
            ...rows.map((t) => [
              t.date,
              t.type,
              doc.categories.find((c) => c.id === t.categoryId)?.name,
              t.note,
              t.amountCents / 100,
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
      new Blob(
        [
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
            ["Categoría", ...pastMonths],
            ...matrixCats.map((c) => [
              c.name,
              ...pastMonths.map((m) => categoryAmount(c.id, m) / 100),
            ]),
            [],
            [
              "Mes",
              "Categoría",
              "Presupuesto",
              "Gasto total",
              "Gasto filtrado",
              "Restante",
            ],
            ...budgetReportRows(doc, months, rows).map((b) => [
              b.month,
              b.category,
              b.amount / 100,
              b.total / 100,
              b.filtered / 100,
              b.remaining / 100,
            ]),
          ]),
        ],
        { type: "text/csv;charset=utf-8" },
      ),
      "brisa-informe.csv",
    );
  const periodControls = (
    <div className="analytics-period">
      <label>
        Año
        <select
          aria-label="Año"
          value={year}
          onChange={(e) =>
            setF({
              ...f,
              from: e.target.value === "all" ? "" : e.target.value + "-01-01",
              to: e.target.value === "all" ? "" : e.target.value + "-12-31",
              months: [],
            })
          }
        >
          <option value="all">Todo</option>
          {years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      </label>
      <button onClick={() => setFilters(true)}>
        ☷{" "}
        {f.categories.length ||
        f.months.length ||
        f.text ||
        f.min ||
        f.max ||
        f.receipts !== "all"
          ? "Filtros activos"
          : "Filtrar"}
      </button>
    </div>
  );
  const donut = (
    <div className="chart-card">
      <div className="chart-summary">
        <span>Total {chartKind === "expense" ? "gastado" : "ingresado"}</span>
        <b>{money(typedTotal)}</b>
      </div>
      {!distribution.length ? (
        <p className="empty">Sin movimientos en este periodo.</p>
      ) : (
        <ResponsiveContainer width="100%" height={mobile ? 220 : 310}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              innerRadius={mobile ? 55 : 78}
              outerRadius={mobile ? 100 : 125}
              paddingAngle={2}
              labelLine={false}
              label={({
                cx,
                cy,
                midAngle,
                innerRadius,
                outerRadius,
                percent,
              }: any) => {
                const rad = (-(midAngle || 0) * Math.PI) / 180,
                  r = (innerRadius + outerRadius) / 2;
                return (
                  <text
                    x={cx + r * Math.cos(rad)}
                    y={cy + r * Math.sin(rad)}
                    fill="#253b31"
                    fontSize={mobile ? 11 : 13}
                    fontWeight={700}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {(percent * 100).toLocaleString("es-ES", {
                      maximumFractionDigits: 1,
                    })}
                    %
                  </text>
                );
              }}
              onClick={(c: any) => openCategory(c.id)}
            >
              {pieData.map((c) => (
                <Cell key={c.id} fill={c.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v: any) => money(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
      )}
      <div className="category-ranking">
        {(mobile
          ? distribution.slice(rankPage * 4, rankPage * 4 + 4)
          : distribution
        ).map((c) => (
          <button key={c.id} onClick={() => openCategory(c.id)}>
            <span className="category-icon" style={{ background: c.color }}>
              {c.icon}
            </span>
            <div>
              <span>{c.name}</span>
              <div className="ranking-track">
                <i
                  style={{
                    width: (c.value / typedTotal) * 100 + "%",
                    background: c.color,
                  }}
                />
              </div>
            </div>
            <b>
              {money(c.value)}
              <small>
                {((c.value / typedTotal) * 100).toLocaleString("es-ES", {
                  maximumFractionDigits: 1,
                })}
                %
              </small>
            </b>
          </button>
        ))}
      </div>
      {mobile && distribution.length > 4 && (
        <div className="category-pagination">
          <button
            disabled={!rankPage}
            onClick={() => setRankPage(rankPage - 1)}
          >
            ←
          </button>
          <small>
            Categorías {rankPage * 4 + 1}–
            {Math.min(distribution.length, rankPage * 4 + 4)} de{" "}
            {distribution.length}
          </small>
          <button
            disabled={(rankPage + 1) * 4 >= distribution.length}
            onClick={() => setRankPage(rankPage + 1)}
          >
            →
          </button>
        </div>
      )}
      <small>
        Las categorías pequeñas se agrupan solo en la gráfica; toca «Otras
        categorías» para verlas.
      </small>
    </div>
  );
  const evolution = (
    <div className="chart-card">
      <div className="chart-summary">
        <span>Evolución mensual</span>
        <b>{money(typedTotal)}</b>
      </div>
      <ResponsiveContainer width="100%" height={mobile ? 260 : 310}>
        <LineChart
          data={timeline}
          onClick={(e: any) => {
            const m = timeline.find((t) => t.label === e.activeLabel);
            if (m) showMonth(m.month);
          }}
        >
          <CartesianGrid vertical={false} stroke="#ecece6" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis width={45} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: any) => money(Math.round(Number(v) * 100))} />
          <Line
            dataKey={chartKind === "expense" ? "Gastos" : "Ingresos"}
            type="monotone"
            stroke={chartKind === "expense" ? "#db8870" : "#5a9e81"}
            strokeWidth={3}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p>
        Media mensual: {money(Math.round(typedTotal / (months.length || 1)))} ·{" "}
        {months.length} meses.
      </p>
      <small>
        Toca un mes para consultar sus movimientos. Los meses actuales están en
        curso.
      </small>
    </div>
  );
  const balanceChart = (
    <div className="chart-card">
      <h2>Balance acumulado del periodo</h2>
      <ResponsiveContainer width="100%" height={mobile ? 260 : 280}>
        <LineChart data={[{ label: "Inicio", Balance: 0 }, ...timeline]}>
          <CartesianGrid vertical={false} stroke="#ecece6" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis width={48} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v: any) => money(Math.round(Number(v) * 100))} />
          <Line
            dataKey="Balance"
            stroke="#52836b"
            strokeWidth={3}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <small>
        Parte de cero. Balance de los movimientos seleccionados; no es un saldo
        bancario.
      </small>
    </div>
  );
  const monthlyTable = (
    <section className="card monthly-summary">
      <div className="section-title">
        <h2>Resumen mensual</h2>
        <small>Importes en euros</small>
      </div>
      <table>
        <thead>
          <tr>
            <th>Mes</th>
            <th>Gastos</th>
            <th>Ingresos</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {visibleMonthly.map((m) => (
            <tr key={m.month} onClick={() => showMonth(m.month)}>
              <td>
                <b>{MONTHS[Number(m.month.slice(5)) - 1]}</b>
                <small>
                  {m.month.slice(0, 4)}
                  {m.month === currentMonth ? " · actual" : ""}
                </small>
              </td>
              <td>{compact(m.expense)}</td>
              <td>{compact(m.income)}</td>
              <td className={m.balance >= 0 ? "income" : "error"}>
                {compact(m.balance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {mobile && monthly.length > 6 && (
        <div className="category-pagination">
          <button
            disabled={!monthlyPage}
            onClick={() => setMonthlyPage(monthlyPage - 1)}
          >
            ← Más recientes
          </button>
          <button
            disabled={(monthlyPage + 1) * 6 >= monthly.length}
            onClick={() => setMonthlyPage(monthlyPage + 1)}
          >
            Anteriores →
          </button>
        </div>
      )}
    </section>
  );
  const matrix = (
    <section className="card category-matrix" ref={matrixRef}>
      <div className="section-title">
        <h2>Categoría por mes</h2>
        <div className="matrix-navigation">
          <button
            aria-label="Meses anteriores"
            disabled={matrixOffset + matrixCount >= pastMonths.length}
            onClick={() => setMatrixOffset(matrixOffset + matrixCount)}
          >
            ←
          </button>
          <button
            aria-label="Meses más recientes"
            disabled={!matrixOffset}
            onClick={() =>
              setMatrixOffset(Math.max(0, matrixOffset - matrixCount))
            }
          >
            →
          </button>
        </div>
      </div>
      <p>
        Verde: mejora frente al mes anterior. Rojo: aumento de gastos o
        disminución de ingresos.
      </p>
      <table>
        <thead>
          <tr>
            <th>Categoría</th>
            {matrixMonths.map((m) => (
              <th key={m}>
                {MONTHS[Number(m.slice(5)) - 1]}
                <small>{m.slice(0, 4)}</small>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(mobile
            ? matrixCats.slice(matrixPage * 5, matrixPage * 5 + 5)
            : matrixCats
          ).map((c) => (
            <tr key={c.id}>
              <td>
                <span className="matrix-category">
                  <span style={{ background: c.color }}>{c.icon}</span>
                  <b>{c.name}</b>
                </span>
              </td>
              {matrixMonths.map((m) => {
                const value = categoryAmount(c.id, m),
                  previous = categoryAmount(
                    c.id,
                    adjacentMonth(m, -1),
                    baseline,
                  ),
                  hasPrevious = baseline.some(
                    (t) =>
                      t.categoryId === c.id &&
                      t.date.startsWith(adjacentMonth(m, -1)),
                  ),
                  delta = value - previous,
                  good = c.type === "expense" ? delta < 0 : delta > 0;
                return (
                  <td
                    key={m}
                    className={
                      hasPrevious && delta
                        ? good
                          ? "trend-good"
                          : "trend-bad"
                        : "trend-neutral"
                    }
                  >
                    <button
                      title={
                        hasPrevious
                          ? "Cambio registrado: " + money(delta)
                          : "Sin registros anteriores"
                      }
                      onClick={() =>
                        setDrill({
                          title: c.name + " · " + m,
                          rows: rows.filter(
                            (t) =>
                              t.categoryId === c.id && t.date.startsWith(m),
                          ),
                        })
                      }
                    >
                      {compact(value)}
                      {hasPrevious && delta !== 0 && (
                        <small>
                          {delta > 0 ? "↑" : "↓"} {compact(Math.abs(delta))}
                        </small>
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {mobile && matrixCats.length > 5 && (
        <div className="category-pagination">
          <button
            disabled={!matrixPage}
            onClick={() => setMatrixPage(matrixPage - 1)}
          >
            ← Categorías
          </button>
          <small>
            {matrixPage + 1} / {Math.ceil(matrixCats.length / 5)}
          </small>
          <button
            disabled={(matrixPage + 1) * 5 >= matrixCats.length}
            onClick={() => setMatrixPage(matrixPage + 1)}
          >
            Categorías →
          </button>
        </div>
      )}
      <small>
        La ausencia de registros no garantiza que no haya habido gastos.
      </small>
    </section>
  );
  const monthlyRows = rows.filter((t) => t.date.startsWith(overviewMonth)),
    monthlyTotal = totals(monthlyRows),
    globalBudget = budget(doc, overviewMonth),
    spentTotal = totals(
      doc.transactions.filter((t) => t.date.startsWith(overviewMonth)),
    ).expense;
  const overview = (
    <div className="mobile-report-overview">
      <section className="card mobile-month-stats">
        <div className="section-title">
          <h2>Estadísticas mensuales</h2>
          <input
            aria-label="Mes del resumen"
            type="month"
            value={overviewMonth}
            onChange={(e) => setOverviewMonth(e.target.value)}
          />
        </div>
        <div className="compact-stats">
          <div>
            <small>Gastos</small>
            <b>{money(monthlyTotal.expense)}</b>
          </div>
          <div>
            <small>Ingresos</small>
            <b className="income">{money(monthlyTotal.income)}</b>
          </div>
          <div>
            <small>Balance del mes</small>
            <b>{money(monthlyTotal.balance)}</b>
          </div>
        </div>
      </section>
      <button className="card report-budget-card" onClick={onBudgets}>
        <div className="section-title">
          <h2>Presupuesto mensual</h2>
          <span>›</span>
        </div>
        <div className="budget-card-body">
          <dl>
            <div>
              <dt>Presupuesto</dt>
              <dd>
                {globalBudget === undefined
                  ? "Sin definir"
                  : money(globalBudget)}
              </dd>
            </div>
            <div>
              <dt>Gastado</dt>
              <dd>{money(spentTotal)}</dd>
            </div>
            <div className="remaining">
              <dt>Restante</dt>
              <dd>
                {globalBudget === undefined
                  ? "—"
                  : money(globalBudget - spentTotal)}
              </dd>
            </div>
          </dl>
          <BudgetRing amount={globalBudget} spent={spentTotal} />
        </div>
      </button>
      <button
        className="report-link card"
        onClick={() => setReportView("monthly")}
      >
        <span>▤ Resumen mensual</span>
        <span>›</span>
      </button>
      <button
        className="report-link card"
        onClick={() => setReportView("matrix")}
      >
        <span>▦ Categorías por mes</span>
        <span>›</span>
      </button>
    </div>
  );
  return (
    <div className={mobile ? "mobile-analytics" : "desktop-analytics"}>
      <div className="page-title analytics-title">
        <div>
          <small>
            {mode === "charts"
              ? "ENTIENDE EN QUÉ SE VA"
              : "TUS PLANES, EN PERSPECTIVA"}
          </small>
          <h1>{mode === "charts" ? "Gráficos" : "Informes"}</h1>
        </div>
        {mobile && mode === "reports" && reportView !== "overview" ? (
          <button onClick={() => setReportView("overview")}>← Volver</button>
        ) : null}
      </div>
      {periodControls}
      {error && <p className="error">{error}</p>}
      <p className="analytics-filter-caption">
        {from} → {to} · {rows.length} movimientos
        {f.type !== "both" ? " · Balance parcial" : ""}
      </p>
      {mode === "charts" ? (
        <>
          <div className="segmented chart-kind">
            {(["expense", "income"] as const).map((k) => (
              <button
                key={k}
                className={chartKind === k ? "active" : ""}
                onClick={() => {
                  setKind(k);
                  setF({ ...f, type: "both" });
                }}
              >
                {k === "expense" ? "Gastos" : "Ingresos"}
              </button>
            ))}
          </div>
          {mobile ? (
            <>
              <div className="chart-view-tabs">
                {[
                  ["distribution", "Distribución"],
                  ["evolution", "Evolución"],
                  ["balance", "Balance"],
                ].map(([v, l]) => (
                  <button
                    key={v}
                    className={chartView === v ? "active" : ""}
                    onClick={() => setChartView(v)}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <section className="card mobile-chart">
                {chartView === "distribution"
                  ? donut
                  : chartView === "evolution"
                    ? evolution
                    : balanceChart}
              </section>
            </>
          ) : (
            <div className="desktop-chart-grid">
              <section className="card">{donut}</section>
              <section className="card">{evolution}</section>
              <section className="card wide">{balanceChart}</section>
            </div>
          )}
        </>
      ) : mobile ? (
        reportView === "overview" ? (
          overview
        ) : reportView === "monthly" ? (
          monthlyTable
        ) : (
          matrix
        )
      ) : (
        <>
          <div className="stats">
            <section className="card">
              <small>INGRESOS</small>
              <h2 className="income">{money(sum.income)}</h2>
            </section>
            <section className="card">
              <small>GASTOS</small>
              <h2>{money(sum.expense)}</h2>
            </section>
            <section className="card accent">
              <small>BALANCE REGISTRADO</small>
              <h2>{money(sum.balance)}</h2>
            </section>
          </div>
          <div className="desktop-report-grid">
            {monthlyTable}
            {matrix}
          </div>
          <BudgetReport doc={doc} months={months} rows={rows} />
        </>
      )}
      {mode === "reports" && (!mobile || reportView !== "overview") && (
        <details className="report-export">
          <summary>Exportar informe</summary>
          <div className="toolbar">
            <button onClick={exportSummary}>↓ CSV del informe</button>
            <button onClick={exportRows}>↓ CSV de movimientos</button>
            <button onClick={() => window.print()}>Imprimir / PDF</button>
          </div>
        </details>
      )}
      {filters && (
        <div className="overlay filter-overlay">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Filtros del informe"
          >
            <ReportFilters
              doc={doc}
              filter={f}
              onChange={setF}
              onClose={() => setFilters(false)}
              onFavorite={onFavorite}
            />
          </section>
        </div>
      )}
      {drill && (
        <div className="overlay">
          <section
            className="modal chart-detail"
            role="dialog"
            aria-modal="true"
            aria-label="Detalle de gráfica"
          >
            <header>
              <div>
                <small>MOVIMIENTOS QUE EXPLICAN EL DATO</small>
                <h2>{drill.title}</h2>
              </div>
              <button onClick={() => setDrill(null)}>✕</button>
            </header>
            <p>
              {drill.rows.length} movimientos · Gastos{" "}
              {money(totals(drill.rows).expense)} · Ingresos{" "}
              {money(totals(drill.rows).income)}
            </p>
            {drill.rows.map((t) => (
              <button
                className="transaction"
                key={t.id}
                onClick={() => onEdit(t)}
              >
                <span
                  className="category-icon"
                  style={{
                    background: doc.categories.find(
                      (c) => c.id === t.categoryId,
                    )?.color,
                  }}
                >
                  {doc.categories.find((c) => c.id === t.categoryId)?.icon}
                </span>
                <span className="transaction-note">
                  <b>{t.note || "Sin nota"}</b>
                  <small>{t.date}</small>
                </span>
                <strong>{money(t.amountCents)}</strong>
              </button>
            ))}
            {!drill.rows.length && <p>Sin movimientos registrados.</p>}
          </section>
        </div>
      )}
    </div>
  );
}
