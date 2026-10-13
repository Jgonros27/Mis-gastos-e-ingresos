import { useState } from "react";
import {
  calculate,
  today,
  uid,
  money,
  normalize,
  type Document,
  type Transaction,
  type Attachment,
} from "./model";
export default function TransactionForm({
  doc,
  initial,
  date,
  onSave,
  onClose,
}: {
  doc: Document;
  initial?: Transaction;
  date?: string;
  onSave: (t: Transaction) => void;
  onClose: () => void;
  onView?: (a: Attachment[], i: number) => void;
}) {
  const [step, setStep] = useState(initial ? 2 : 1),
    [type, setType] = useState(initial?.type || "expense"),
    [category, setCategory] = useState(initial?.categoryId || ""),
    [expression, setExpression] = useState(
      initial?.calculationExpression ||
        (initial ? String(initial.amountCents / 100).replace(".", ",") : ""),
    ),
    [note, setNote] = useState(initial?.note || ""),
    [day, setDay] = useState(initial?.date || date || today()),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false),
    [query, setQuery] = useState(""),
    [categoryPage, setCategoryPage] = useState(0),
    [calculator, setCalculator] = useState(false);
  let result = 0;
  try {
    result = calculate(expression);
  } catch {}
  const categories = doc.categories.filter(
      (c) =>
        c.type === type &&
        (!c.archived || c.id === category) &&
        normalize(c.name).includes(normalize(query)),
    ),
    pages = Math.max(1, Math.ceil(categories.length / 8)),
    chosen = doc.categories.find((c) => c.id === category);
  const close = () => {
    if (
      !dirty ||
      confirm(
        "¿Descartar los cambios sin guardar? Cancelar conserva el formulario.",
      )
    )
      onClose();
  };
  const save = () => {
    try {
      if (!category) throw Error("Selecciona una categoría");
      onSave({
        id: initial?.id || uid(),
        type,
        categoryId: category,
        amountCents: calculate(expression),
        date: day,
        note,
        calculationExpression: expression,
        attachments: initial?.attachments || [],
        createdAt: initial?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: initial?.source,
      });
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="overlay">
      <section
        className="modal form step-form"
        role="dialog"
        aria-modal="true"
        aria-label="Movimiento"
      >
        <header>
          <div>
            <small>PASO {step} DE 2</small>
            <h2>
              {step === 1
                ? "¿Qué quieres registrar?"
                : "Los detalles del movimiento"}
            </h2>
          </div>
          <button aria-label="Cerrar formulario" onClick={close}>
            ✕
          </button>
        </header>
        <div className="step-progress">
          <i className={step >= 1 ? "done" : ""} />
          <i className={step >= 2 ? "done" : ""} />
        </div>
        {step === 1 ? (
          <>
            <div className="segmented">
              {(["expense", "income"] as const).map((t) => (
                <button
                  className={type === t ? "active" : ""}
                  key={t}
                  onClick={() => {
                    setType(t);
                    setCategory("");
                    setCategoryPage(0);
                    setQuery("");
                    setDirty(true);
                  }}
                >
                  {t === "expense" ? "↗ Gasto" : "↙ Ingreso"}
                </button>
              ))}
            </div>
            <label className="category-search">
              Categoría
              <input
                aria-label="Buscar categoría"
                placeholder="Buscar categoría"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCategoryPage(0);
                }}
              />
            </label>
            <div className="category-grid paged-categories">
              {categories
                .slice(categoryPage * 8, categoryPage * 8 + 8)
                .map((c) => (
                  <button
                    key={c.id}
                    className={category === c.id ? "selected" : ""}
                    onClick={() => {
                      setCategory(c.id);
                      setStep(2);
                      setDirty(true);
                    }}
                  >
                    <span style={{ background: c.color }}>{c.icon}</span>
                    {c.name}
                  </button>
                ))}
            </div>
            {!categories.length && <p>No hay categorías con esa búsqueda.</p>}
            <div className="category-pagination">
              <button
                disabled={categoryPage === 0}
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
            </div>
            <footer>
              <button onClick={close}>Cancelar</button>
              <button
                className="primary"
                disabled={!category}
                onClick={() => setStep(2)}
              >
                Continuar →
              </button>
            </footer>
          </>
        ) : (
          <>
            <button className="chosen-category" onClick={() => setStep(1)}>
              <span style={{ background: chosen?.color }}>{chosen?.icon}</span>
              <b>
                {type === "expense" ? "Gasto" : "Ingreso"} · {chosen?.name}
              </b>
              <small>Cambiar</small>
            </button>
            <label className="amount-label">
              Importe o cálculo
              <input
                autoFocus
                aria-label="Importe o cálculo"
                value={expression}
                inputMode="decimal"
                readOnly={calculator}
                placeholder="0,00"
                onChange={(e) => {
                  setExpression(e.target.value);
                  setDirty(true);
                }}
              />
              <span>
                {result ? money(result) : "Introduce un importe mayor que cero"}
              </span>
            </label>
            <div className="compact-form-fields">
              <label>
                Fecha
                <input
                  type="date"
                  value={day}
                  onChange={(e) => {
                    setDay(e.target.value);
                    setDirty(true);
                  }}
                />
              </label>
              <label>
                Nota (opcional)
                <input
                  value={note}
                  placeholder="¿Para qué fue?"
                  list="notes"
                  onChange={(e) => {
                    setNote(e.target.value);
                    setDirty(true);
                  }}
                />
              </label>
            </div>
            <datalist id="notes">
              {[
                ...new Set(
                  doc.transactions
                    .filter((t) => t.categoryId === category)
                    .map((t) => t.note),
                ),
              ].map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            <button
              className="calculator-toggle"
              onClick={() => setCalculator(!calculator)}
            >
              {calculator ? "Ocultar calculadora" : "＋ Usar calculadora"}
            </button>
            {calculator && (
              <div className="keypad">
                {[
                  "7",
                  "8",
                  "9",
                  "+",
                  "4",
                  "5",
                  "6",
                  "−",
                  "1",
                  "2",
                  "3",
                  "⌫",
                  ",",
                  "0",
                  "C",
                  "=",
                ].map((k) => (
                  <button
                    key={k}
                    onClick={() => {
                      setDirty(true);
                      if (k === "C") setExpression("");
                      else if (k === "⌫")
                        setExpression(expression.slice(0, -1));
                      else if (k === "=") {
                        try {
                          calculate(expression);
                          setError("");
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      } else setExpression(expression + (k === "−" ? "-" : k));
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>
            )}
            <p className="receipt-later">
              📎 Puedes añadir recibos al abrir el movimiento después de
              guardarlo.
            </p>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <footer>
              <button onClick={() => setStep(1)}>← Atrás</button>
              <button className="primary" onClick={save}>
                Guardar movimiento →
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
