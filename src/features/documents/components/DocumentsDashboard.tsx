import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { FileUp, Trash2, Upload } from "lucide-react";

import { type DashboardDestination, type WorkspaceIdentity } from "../../../components/layout/DashboardSidebar";
import { ManagementPage } from "../../../components/layout/ManagementPage";
import { documentDisplayName, type IndexedDocument } from "../types";

type DocumentsDashboardProps = {
  identity: WorkspaceIdentity;
  connected: boolean;
  documents: IndexedDocument[];
  loading: boolean;
  uploading: boolean;
  deleting: string | null;
  onSignOut?: () => void;
  onNavigate: (destination: DashboardDestination) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onDelete: (sourceId: string) => void;
};

export function DocumentsDashboard({
  identity,
  connected,
  documents,
  loading,
  uploading,
  deleting,
  onSignOut,
  onNavigate,
  onUpload,
  onDelete,
}: DocumentsDashboardProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const visibleDocuments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? documents.filter((document) => documentDisplayName(document.name).toLowerCase().includes(normalized)) : documents;
  }, [documents, query]);
  const totalChunks = documents.reduce((total, document) => total + document.chunks, 0);
  const summary = loading
    ? "Loading the workspace library…"
    : `${documents.length} ${documents.length === 1 ? "document" : "documents"} · ${totalChunks} indexed chunks`;

  const requestDelete = (sourceId: string) => {
    if (window.confirm(`Delete "${documentDisplayName(sourceId)}" from the shared document library?`)) onDelete(sourceId);
  };

  return (
    <ManagementPage
      identity={identity}
      connected={connected}
      activeDestination="documents"
      title="Documents"
      summary={summary}
      onSignOut={onSignOut}
      onNavigate={onNavigate}
      actions={(
        <>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search documents"
            placeholder="Search documents"
          />
          <input ref={inputRef} type="file" accept=".txt,.pdf,.docx" hidden onChange={onUpload} />
          <button className="primary" type="button" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? "Indexing…" : <><Upload size={15} /> Upload document</>}
          </button>
        </>
      )}
    >
      {loading && documents.length === 0 ? (
        <div className="skeleton">
          <div className="skeleton-list">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton-list-row">
                <div className="skeleton-block" style={{ width: "36px", height: "36px", borderRadius: "8px" }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div className="skeleton-block skeleton-line-sm" />
                  <div className="skeleton-block skeleton-line-md" style={{ height: "10px", width: "25%" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : visibleDocuments.length ? (
        <div className="management-list" aria-label="Documents">
          {visibleDocuments.map((document) => (
            <article className="management-row document-management-row" key={document.name}>
              <span className="document-kind" aria-hidden="true">{fileKind(documentDisplayName(document.name))}</span>
              <span className="management-row-copy">
                <strong>{documentDisplayName(document.name)}</strong>
                <small>Shared with every agent in this workspace</small>
              </span>
              <span className="document-facts">
                <span>{document.chunks} {document.chunks === 1 ? "chunk" : "chunks"}</span>
                <span className={`status-pill ${document.status === "failed" ? "failed" : "available"}`}>
                  <i />{document.status === "failed" ? "Failed" : "Indexed"}
                </span>
              </span>
              <button
                className="row-action danger"
                type="button"
                disabled={deleting === document.name}
                aria-label={`Delete ${documentDisplayName(document.name)}`}
                onClick={() => requestDelete(document.name)}
              >
                {deleting === document.name ? "Deleting…" : <Trash2 size={14} />}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="management-empty">
          <span className="empty-mark"><FileUp size={20} /></span>
          <h2>{query ? "No matching documents" : "Build a shared knowledge library"}</h2>
          <p>{query ? "Try a different filename." : "Upload a TXT, PDF, or DOCX file. Every agent in this workspace can retrieve it."}</p>
          {!query && <button className="primary" type="button" disabled={uploading} onClick={() => inputRef.current?.click()}><Upload size={15} /> Upload document</button>}
        </div>
      )}
    </ManagementPage>
  );
}

function fileKind(filename: string) {
  const extension = filename.split(".").pop()?.toUpperCase();
  return extension && extension.length <= 4 ? extension : "DOC";
}
