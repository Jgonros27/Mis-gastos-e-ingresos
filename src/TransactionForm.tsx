import { useState } from "react";
import {
  attachment,
  calculate,
  today,
  uid,
  money,
  attachmentBlob,
  download,
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
  onView,
}: {
  doc: Document;
  initial?: Transaction;
  date?: string;
  onSave: (t: Transaction) => void;
  onClose: () => void;
  onView: (a: Attachment[], i: number) => void;
}) {
  const [type, setType] = useState(initial?.type || "expense"),
    [category, setCategory] = useState(
      initial?.categoryId ||
        doc.categories.find((c) => c.type === "expense" && !c.archived)?.id ||
        "",
    ),
    [expression, setExpression] = useState(
      initial?.calculationExpression ||
        (initial ? String(initial.amountCents / 100).replace(".", ",") : ""),
    ),
    [note, setNote] = useState(initial?.note || ""),
    [day, setDay] = useState(initial?.date || date || today()),
    [items, setItems] = useState(initial?.attachments || []),
    [error, setError] = useState(""),
    [processing, setProcessing] = useState(""),
    [dirty, setDirty] = useState(false);
  let result = 0;
  try {
    result = calculate(expression);
  } catch {
    /* affichage */
  }
  const change = () => setDirty(true);
  const close = () => {
    if (
      !dirty ||
      confirm(
        "Descartar los cambios sin guardar? Cancelar conserva el formulario.",
      )
    )
      onClose();
  };
  const files = async (fs: FileList | File[]) => {
    setError("");
    const additions: Attachment[] = [];
    try {
      const estimate = await navigator.storage?.estimate?.();
      const additionalBytes = Array.from(fs).reduce(
        (n, f) => n + Math.ceil((f.size * 4) / 3),
        0,
      );
      if (
        estimate?.quota &&
        estimate.usage !== undefined &&
        additionalBytes * 2 > estimate.quota - estimate.usage
      )
        throw Error(
          "Espacio insuficiente para los recibos y la copia de recuperación.",
        );
      for (const f of Array.from(fs)) {
        setProcessing("Procesando " + f.name);
        additions.push(await attachment(f, doc.settings.maxFileMB));
      }
      setItems((current) => [...current, ...additions]);
      change();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProcessing("");
    }
  };
  const save = () => {
    try {
      if (!category) throw Error("Selecciona una categoría");
      const amountCents = calculate(expression);
      onSave({
        id: initial?.id || uid(),
        type,
        categoryId: category,
        amountCents,
        date: day,
        note,
        calculationExpression: expression,
        attachments: items,
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
        className="modal form"
        role="dialog"
        aria-modal="true"
        aria-label="Movimiento"
      >
        <header>
          <div>
            <small>UN MOVIMIENTO, TODO EN ORDEN</small>
            <h2>{initial ? "Editar movimiento" : "Añadir movimiento"}</h2>
          </div>
          <button onClick={close}>✕</button>
        </header>
        <div className="segmented">
          {(["expense", "income"] as const).map((t) => (
            <button
              className={type === t ? "active" : ""}
              key={t}
              onClick={() => {
                setType(t);
                setCategory(
                  doc.categories.find((c) => c.type === t && !c.archived)?.id ||
                    "",
                );
                change();
              }}
            >
              {t === "expense" ? "↗ Gasto" : "↙ Ingreso"}
            </button>
          ))}
        </div>
        <label className="amount-label">
          Importe o cálculo
          <input
            autoFocus
            aria-label="Importe o cálculo"
            value={expression}
            inputMode="decimal"
            placeholder="0,00"
            onChange={(e) => {
              setExpression(e.target.value);
              change();
            }}
          />
          <span>
            {result ? money(result) : "Escribe un importe o una suma/resta"}
          </span>
        </label>
        <div className="category-grid">
          {doc.categories
            .filter(
              (c) => c.type === type && (!c.archived || c.id === category),
            )
            .map((c) => (
              <button
                key={c.id}
                className={c.id === category ? "selected" : ""}
                onClick={() => {
                  setCategory(c.id);
                  change();
                }}
              >
                <span style={{ background: c.color }}>{c.icon}</span>
                {c.name}
              </button>
            ))}
        </div>
        <div className="form-fields">
          <label>
            Nota
            <input
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                change();
              }}
              placeholder="¿En qué lo has utilizado?"
              list="notes"
            />
          </label>
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
          <label>
            Fecha
            <input
              type="date"
              required
              value={day}
              onChange={(e) => {
                setDay(e.target.value);
                change();
              }}
            />
          </label>
        </div>
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
                change();
                if (k === "C") setExpression("");
                else if (k === "⌫") setExpression(expression.slice(0, -1));
                else if (k === "=") {
                  try {
                    setExpression(
                      (calculate(expression) / 100)
                        .toFixed(2)
                        .replace(".", ","),
                    );
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
        <section
          className="dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void files(e.dataTransfer.files);
          }}
        >
          <strong>Recibos, siempre junto al movimiento</strong>
          <p>
            Arrastra imágenes o PDF · máximo {doc.settings.maxFileMB} MB por
            archivo
          </p>
          <label className="button">
            Adjuntar archivos
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => e.target.files && void files(e.target.files)}
              hidden
            />
          </label>
          <label className="button">
            📷 Cámara
            <input
              hidden
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => e.target.files && void files(e.target.files)}
            />
          </label>
          {processing && <p role="status">{processing}</p>}
          {items.map((a, i) => (
            <div className="attachment" key={a.id}>
              <button onClick={() => onView(items, i)}>
                {a.mime === "application/pdf" ? "📄" : "🖼️"} {a.name} ·{" "}
                {(a.size / 1024).toFixed(1)} KB
              </button>
              <button
                aria-label={"Descargar " + a.name}
                onClick={() => download(attachmentBlob(a), a.name)}
              >
                ↓
              </button>
              <button
                aria-label={"Eliminar " + a.name}
                onClick={() => {
                  setItems(items.filter((x) => x.id !== a.id));
                  change();
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </section>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <footer>
          <button onClick={close}>Cancelar</button>
          <button className="primary" disabled={!!processing} onClick={save}>
            Guardar movimiento →
          </button>
        </footer>
      </section>
    </div>
  );
}
