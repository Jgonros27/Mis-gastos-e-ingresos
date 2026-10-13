import { useState } from "react";
import {
  blankFilter,
  normalize,
  today,
  type Filter,
  type Document,
} from "./model";
const labels = [
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
export default function ReportFilters({
  doc,
  filter,
  onChange,
  onClose,
  onFavorite,
}: {
  doc: Document;
  filter: Filter;
  onChange: (f: Filter) => void;
  onClose: () => void;
  onFavorite: (name: string, f: Filter) => void;
}) {
  const [query, setQuery] = useState(""),
    [categoriesOpen, setCategoriesOpen] = useState(false),
    [categoryPage, setCategoryPage] = useState(0);
  const update = (key: keyof Filter, value: any) =>
    onChange({ ...filter, [key]: value });
  const year =
    filter.from.slice(0, 4) && filter.from.slice(0, 4) === filter.to.slice(0, 4)
      ? filter.from.slice(0, 4)
      : today().slice(0, 4);
  const years = [
    ...new Set([
      today().slice(0, 4),
      ...doc.transactions.map((t) => t.date.slice(0, 4)),
    ]),
  ]
    .sort()
    .reverse();
  const cats = doc.categories.filter((c) =>
      normalize(c.name).includes(normalize(query)),
    ),
    pages = Math.max(1, Math.ceil(cats.length / 8));
  const name = filter.categories.length
    ? filter.categories
        .map((id) => doc.categories.find((c) => c.id === id)?.name)
        .join(", ")
    : "Todas las categorías";
  return (
    <div className="filter-panel">
      <header>
        <h2>Elige qué quieres ver</h2>
        <button onClick={onClose}>✕</button>
      </header>
      <div className="filter-period-row">
        <label>
          Año
          <select
            aria-label="Año del informe"
            value={
              filter.from.slice(0, 4) === filter.to.slice(0, 4) && filter.from
                ? year
                : "all"
            }
            onChange={(e) =>
              onChange({
                ...filter,
                from: e.target.value === "all" ? "" : e.target.value + "-01-01",
                to: e.target.value === "all" ? "" : e.target.value + "-12-31",
                months: [],
              })
            }
          >
            <option value="all">Todo el histórico</option>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select
            value={filter.type}
            onChange={(e) => update("type", e.target.value)}
          >
            <option value="both">Ambos</option>
            <option value="expense">Gastos</option>
            <option value="income">Ingresos</option>
          </select>
        </label>
      </div>
      <div className="month-chips" aria-label="Seleccionar meses">
        {labels.map((l, i) => {
          const m = year + "-" + String(i + 1).padStart(2, "0");
          return (
            <button
              key={m}
              aria-pressed={filter.months.includes(m)}
              className={filter.months.includes(m) ? "active" : ""}
              onClick={() =>
                onChange({
                  ...filter,
                  from: year + "-01-01",
                  to: year + "-12-31",
                  months: filter.months.includes(m)
                    ? filter.months.filter((x) => x !== m)
                    : [...filter.months, m],
                })
              }
            >
              {l}
            </button>
          );
        })}
      </div>
      <p className="filter-hint">
        {filter.months.length
          ? `${filter.months.length} meses de ${year}`
          : "Todos los meses del periodo"}
      </p>
      <button
        className="category-selector"
        onClick={() => setCategoriesOpen(!categoriesOpen)}
      >
        <span>Categorías</span>
        <b>{name}</b>
        <span>{categoriesOpen ? "⌃" : "⌄"}</span>
      </button>
      {categoriesOpen && (
        <>
          <input
            aria-label="Buscar categorías del informe"
            placeholder="Buscar categoría"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCategoryPage(0);
            }}
          />
          <div className="category-filter-chips">
            {cats.slice(categoryPage * 8, categoryPage * 8 + 8).map((c) => (
              <button
                key={c.id}
                aria-pressed={filter.categories.includes(c.id)}
                className={filter.categories.includes(c.id) ? "active" : ""}
                onClick={() =>
                  update(
                    "categories",
                    filter.categories.includes(c.id)
                      ? filter.categories.filter((id) => id !== c.id)
                      : [...filter.categories, c.id],
                  )
                }
              >
                <span style={{ background: c.color }}>{c.icon}</span>
                {c.name}
              </button>
            ))}
          </div>
          <div className="category-pagination">
            <button
              disabled={!categoryPage}
              onClick={() => setCategoryPage(categoryPage - 1)}
            >
              ←
            </button>
            <small>
              {categoryPage + 1} / {pages}
            </small>
            <button
              disabled={categoryPage + 1 >= pages}
              onClick={() => setCategoryPage(categoryPage + 1)}
            >
              →
            </button>
            <button onClick={() => update("categories", [])}>Todas</button>
          </div>
        </>
      )}
      <details className="advanced-filters">
        <summary>Rango y filtros adicionales</summary>
        <div className="filter-grid">
          <label>
            Desde
            <input
              type="date"
              value={filter.from}
              onChange={(e) => update("from", e.target.value)}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={filter.to}
              onChange={(e) => update("to", e.target.value)}
            />
          </label>
          <label>
            Buscar nota
            <input
              value={filter.text}
              onChange={(e) => update("text", e.target.value)}
            />
          </label>
          <label>
            Recibos
            <select
              value={filter.receipts}
              onChange={(e) => update("receipts", e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="with">Con recibos</option>
              <option value="without">Sin recibos</option>
            </select>
          </label>
          <label>
            Mínimo €
            <input
              value={filter.min}
              onChange={(e) => update("min", e.target.value)}
            />
          </label>
          <label>
            Máximo €
            <input
              value={filter.max}
              onChange={(e) => update("max", e.target.value)}
            />
          </label>
        </div>
      </details>
      <details className="favorite-filters">
        <summary>Vistas favoritas</summary>
        <div className="toolbar">
          {doc.settings.favorites.map((v, i) => (
            <button key={i} onClick={() => onChange(v.filter)}>
              {v.name}
            </button>
          ))}
          <button
            onClick={() => {
              const name = prompt("Nombre de la vista");
              if (name) onFavorite(name, filter);
            }}
          >
            ☆ Guardar esta vista
          </button>
        </div>
      </details>
      <footer>
        <button onClick={() => onChange(blankFilter())}>Limpiar</button>
        <button className="primary" onClick={onClose}>
          Ver resultados ✓
        </button>
      </footer>
    </div>
  );
}
