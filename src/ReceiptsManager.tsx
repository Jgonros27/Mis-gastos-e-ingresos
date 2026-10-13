import { useState } from "react";
import {
  attachment,
  attachmentBlob,
  download,
  type Attachment,
  type Transaction,
} from "./model";
import ReceiptThumbnail from "./ReceiptThumbnail";
export default function ReceiptsManager({
  transaction,
  maxFileMB,
  onSave,
  onView,
  onClose,
}: {
  transaction: Transaction;
  maxFileMB: number;
  onSave: (items: Attachment[]) => void;
  onView: (items: Attachment[], index: number) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState(transaction.attachments),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false);
  const files = async (list: FileList | File[]) => {
    try {
      const additions: Attachment[] = [];
      const capacity = await navigator.storage?.estimate?.();
      const size = Array.from(list).reduce((n, f) => n + (f.size * 4) / 3, 0);
      if (
        capacity?.quota &&
        capacity.usage !== undefined &&
        size * 2 > capacity.quota - capacity.usage
      )
        throw Error("No hay espacio suficiente para estos archivos.");
      for (const file of Array.from(list)) {
        setBusy("Procesando " + file.name);
        additions.push(await attachment(file, maxFileMB));
      }
      setItems((current) => [...current, ...additions]);
      setDirty(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  const close = () => {
    if (!dirty || confirm("¿Descartar los cambios en los recibos?")) onClose();
  };
  return (
    <div className="overlay">
      <section
        className="modal receipts-manager"
        role="dialog"
        aria-modal="true"
        aria-label="Gestionar recibos"
      >
        <header>
          <div>
            <small>TODO JUNTO, CUANDO LO NECESITES</small>
            <h2>Recibos del movimiento</h2>
          </div>
          <button aria-label="Cerrar recibos" onClick={close}>
            ✕
          </button>
        </header>
        <p>{transaction.note || "Movimiento sin nota"}</p>
        <section
          className="dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void files(e.dataTransfer.files);
          }}
        >
          <strong>Imágenes o PDF · máximo {maxFileMB} MB por archivo</strong>
          <p>
            Selecciona archivos o arrástralos aquí. Se guardan dentro del
            documento.
          </p>
          <label className="button">
            Adjuntar archivos
            <input
              type="file"
              multiple
              hidden
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => e.target.files && void files(e.target.files)}
            />
          </label>
          <label className="button">
            📷 Cámara
            <input
              type="file"
              hidden
              accept="image/*"
              capture="environment"
              onChange={(e) => e.target.files && void files(e.target.files)}
            />
          </label>
        </section>
        <div className="receipts-list">
          {items.map((a, i) => (
            <div className="attachment" key={a.id}>
              <button onClick={() => onView(items, i)}>
                <ReceiptThumbnail item={a} />
                <span>
                  {a.name}
                  <small>
                    {(a.size / 1024).toFixed(1).replace(".", ",")} KB
                  </small>
                </span>
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
                  setDirty(true);
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        {!items.length && <p>Aún no has adjuntado ningún recibo.</p>}
        {busy && <p role="status">{busy}</p>}
        {error && <p className="error">{error}</p>}
        {dirty && <small>Cambios pendientes de guardar</small>}
        <footer>
          <button onClick={close}>Cancelar</button>
          <button
            className="primary"
            disabled={!!busy}
            onClick={() => onSave(items)}
          >
            Guardar recibos
          </button>
        </footer>
      </section>
    </div>
  );
}
