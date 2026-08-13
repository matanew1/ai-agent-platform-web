import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { FileUp, Trash2, Upload } from "lucide-react";

import { type DashboardDestination, type WorkspaceIdentity } from "../../../components/layout/DashboardSidebar";
import { ManagementPage } from "../../../components/layout/ManagementPage";
import { documentDisplayName, type IndexedDocument } from "../types";
import { useI18n } from "../../../shared/i18n/I18nProvider";

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
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const visibleDocuments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? documents.filter((document) => documentDisplayName(document.name).toLowerCase().includes(normalized)) : documents;
  }, [documents, query]);
  const totalChunks = documents.reduce((total, document) => total + document.chunks, 0);
  const summary = loading
    ? t("loadingLibrary")
    : `${documents.length} ${t("documents")} · ${totalChunks} ${t("indexed")} ${t("chunks")}`;

  const requestDelete = (sourceId: string) => {
    if (window.confirm(t("deleteDocumentConfirm", { name: documentDisplayName(sourceId) }))) onDelete(sourceId);
  };

  return (
    <ManagementPage
      identity={identity}
      connected={connected}
      activeDestination="documents"
      title={t("documents")}
      summary={summary}
      onSignOut={onSignOut}
      onNavigate={onNavigate}
      actions={(
        <>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={t("searchDocuments")}
            placeholder={t("searchDocuments")}
          />
          <input ref={inputRef} type="file" accept=".txt,.pdf,.docx" hidden onChange={onUpload} />
          <button className="primary" type="button" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? t("indexing") : <><Upload size={15} /> {t("uploadDocument")}</>}
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
        <div className="management-list" aria-label={t("documents")}>
          {visibleDocuments.map((document) => (
            <article className="management-row document-management-row" key={document.name}>
              <span className="document-kind" aria-hidden="true">{fileKind(documentDisplayName(document.name))}</span>
              <span className="management-row-copy">
                <strong>{documentDisplayName(document.name)}</strong>
                <small>{t("sharedWithAgents")}</small>
              </span>
              <span className="document-facts">
                <span>{document.chunks} {t(document.chunks === 1 ? "chunk" : "chunks")}</span>
                <span className={`status-pill ${document.status === "failed" ? "failed" : "available"}`}>
                  <i />{document.status === "failed" ? t("failed") : t("indexed")}
                </span>
              </span>
              <button
                className="row-action danger"
                type="button"
                disabled={deleting === document.name}
                aria-label={t("deleteDocument", { name: documentDisplayName(document.name) })}
                onClick={() => requestDelete(document.name)}
              >
                {deleting === document.name ? t("deleting") : <Trash2 size={14} />}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="management-empty">
          <span className="empty-mark"><FileUp size={20} /></span>
          <h2>{query ? t("noMatchingDocuments") : t("buildKnowledgeLibrary")}</h2>
          <p>{query ? t("tryDifferentFilename") : t("uploadDocumentHint")}</p>
          {!query && <button className="primary" type="button" disabled={uploading} onClick={() => inputRef.current?.click()}><Upload size={15} /> {t("uploadDocument")}</button>}
        </div>
      )}
    </ManagementPage>
  );
}

function fileKind(filename: string) {
  const extension = filename.split(".").pop()?.toUpperCase();
  return extension && extension.length <= 4 ? extension : "DOC";
}
