import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import worker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { attachmentBlob, download, type Attachment } from "./model";
pdfjs.GlobalWorkerOptions.workerSrc = worker;
export default function ReceiptViewer({
  items,
  index,
  onClose,
}: {
  items: Attachment[];
  index: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(index),
    [zoom, setZoom] = useState(1),
    [page, setPage] = useState(1),
    [pages, setPages] = useState(0),
    [error, setError] = useState(""),
    [url, setUrl] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null),
    pdf = useRef<pdfjs.PDFDocumentProxy | null>(null);
  const a = items[i];
  useEffect(() => {
    setError("");
    setPage(1);
    setPages(0);
    setZoom(1);
    const u = URL.createObjectURL(attachmentBlob(a));
    setUrl(u);
    let cancelled = false;
    const task =
      a.mime === "application/pdf"
        ? pdfjs.getDocument({
            cMapUrl: new URL("pdf-assets/cmaps/", document.baseURI).href,
            cMapPacked: true,
            standardFontDataUrl: new URL(
              "pdf-assets/standard_fonts/",
              document.baseURI,
            ).href,
            wasmUrl: new URL("pdf-assets/wasm/", document.baseURI).href,
            iccUrl: new URL("pdf-assets/iccs/", document.baseURI).href,

            data: new Uint8Array(
              Uint8Array.from(atob(a.base64), (c) => c.charCodeAt(0)),
            ),
          })
        : null;
    task?.promise
      .then((p) => {
        if (cancelled) {
          return;
        }
        pdf.current = p;
        setPages(p.numPages);
      })
      .catch((e) =>
        setError(
          e.name === "PasswordException"
            ? "Este PDF necesita contraseña. Puedes descargarlo para abrirlo."
            : "PDF dañado o no compatible. Puedes descargar el original.",
        ),
      );
    return () => {
      cancelled = true;
      URL.revokeObjectURL(u);
      pdf.current = null;
      task?.destroy();
    };
  }, [a]);
  useEffect(() => {
    if (!pages || !pdf.current || !canvas.current) return;
    let render: pdfjs.RenderTask | undefined,
      cancelled = false;
    pdf.current.getPage(page).then((p) => {
      if (cancelled || !canvas.current) return;
      const viewport = p.getViewport({ scale: zoom * 1.3 }),
        c = canvas.current;
      c.width = viewport.width;
      c.height = viewport.height;
      render = p.render({ canvas: c, viewport });
      render.promise.catch(() => {});
    });
    return () => {
      cancelled = true;
      render?.cancel();
    };
  }, [page, pages, zoom]);
  return (
    <div
      className="overlay viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Visor de recibos"
    >
      <div className="viewer-head">
        <strong>{a.name}</strong>
        <button onClick={onClose}>Cerrar ✕</button>
      </div>
      <div className="toolbar">
        <button disabled={!i} onClick={() => setI(i - 1)}>
          ← Recibo
        </button>
        <span>
          {i + 1} / {items.length}
        </span>
        <button disabled={i === items.length - 1} onClick={() => setI(i + 1)}>
          Recibo →
        </button>
        <button onClick={() => setZoom(Math.max(0.3, zoom - 0.2))}>
          − Zoom
        </button>
        <button onClick={() => setZoom(Math.min(4, zoom + 0.2))}>+ Zoom</button>
        <button onClick={() => download(attachmentBlob(a), a.name)}>
          Descargar
        </button>
      </div>
      {a.mime === "application/pdf" && (
        <div className="toolbar">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Página anterior
          </button>
          <span>
            Página {page} de {pages || "…"}
          </span>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Página siguiente
          </button>
        </div>
      )}
      <div className="receipt-stage">
        {error ? (
          <p role="alert">{error}</p>
        ) : a.mime === "application/pdf" ? (
          <canvas ref={canvas} />
        ) : (
          <img
            src={url}
            alt={a.name}
            style={{ width: zoom * 80 + "%", maxWidth: "none" }}
          />
        )}
      </div>
    </div>
  );
}

