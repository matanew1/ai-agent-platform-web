import { ChangeEvent, RefObject } from "react";
import { Trash2, Upload } from "lucide-react";

import { documentDisplayName, type IndexedDocument } from "../types";

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
  return (
    <div className="inspector-content">
      <input ref={inputRef} type="file" accept=".txt,.pdf,.docx" hidden onChange={onUpload} />
      <div className="documents-empty">
        <div className="upload-mark"><Upload size={20} /></div>
        <h3>Workspace document library</h3>
        <p>{loading ? "Loading the shared library…" : "Every agent in this workspace can retrieve these documents."}</p>
        <button className="primary" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? "Indexing…" : <><Upload size={15} /> Upload document</>}
        </button>
      </div>
      {documents.length > 0 && (
        <div className="document-list">
          {documents.map((document) => (
            <div key={document.name}>
              <span>⌕</span>
              <p><strong>{documentDisplayName(document.name)}</strong><small>{document.chunks} chunks · {document.status || "indexed"}</small></p>
              <button type="button" disabled={deleting === document.name} aria-label={`Delete ${documentDisplayName(document.name)}`} onClick={() => onDelete(document.name)}>
                {deleting === document.name ? "…" : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="panel-footnote">Documents are shared by every agent owned by this workspace.</p>
    </div>
  );
}
