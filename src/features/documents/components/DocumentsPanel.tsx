import { ChangeEvent, RefObject } from "react";
import { Trash2, Upload } from "lucide-react";

import { documentDisplayName, type IndexedDocument } from "../types";
import { useI18n } from "../../../shared/i18n/I18nProvider";

type DocumentsPanelProps = {
  documents: IndexedDocument[];
  loading: boolean;
  uploading: boolean;
  deleting: string | null;
  inputRef: RefObject<HTMLInputElement | null>;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onDelete: (sourceId: string) => void;
};

export function DocumentsPanel({ documents, loading, uploading, deleting, inputRef, onUpload, onDelete }: DocumentsPanelProps) {
  const { t } = useI18n();
  return (
    <div className="inspector-content">
      <input ref={inputRef} type="file" accept=".txt,.pdf,.docx" hidden onChange={onUpload} />
      <div className="documents-empty">
        <div className="upload-mark"><Upload size={20} /></div>
        <h3>{t("workspaceLibrary")}</h3>
        <p>{loading ? t("loadingLibrary") : t("workspaceDocumentsHint")}</p>
        <button className="primary" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? t("indexing") : <><Upload size={15} /> {t("uploadDocument")}</>}
        </button>
      </div>
      {documents.length > 0 && (
        <div className="document-list">
          {documents.map((document) => (
            <div key={document.name}>
              <span>⌕</span>
              <p><strong>{documentDisplayName(document.name)}</strong><small>{document.chunks} {t(document.chunks === 1 ? "chunk" : "chunks")} · {document.status === "failed" ? t("failed") : t("indexed")}</small></p>
              <button type="button" disabled={deleting === document.name} aria-label={t("deleteDocument", { name: documentDisplayName(document.name) })} onClick={() => onDelete(document.name)}>
                {deleting === document.name ? "…" : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="panel-footnote">{t("workspaceDocumentsHint")}</p>
    </div>
  );
}
