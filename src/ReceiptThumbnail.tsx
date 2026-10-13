import { useEffect, useState } from "react";
import { attachmentBlob, type Attachment } from "./model";
export default function ReceiptThumbnail({ item }: { item: Attachment }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!item.mime.startsWith("image/")) return;
    const url = URL.createObjectURL(attachmentBlob(item));
    setUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [item]);
  return item.mime === "application/pdf" ? (
    <span className="pdf-thumbnail">PDF</span>
  ) : (
    <img
      className="receipt-thumbnail"
      src={url}
      alt="Vista previa del recibo"
    />
  );
}
