import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DEFAULT_PAGE_LIMIT } from "../../../shared/api/pagination";
import { getErrorMessage } from "../../../shared/lib/errors";
import { newId, sessionTitle } from "../../../shared/lib/format";
import { deleteSession, listSessions } from "../api";
import type { Session, StoredSession } from "../types";

export function useChatSessions(
  userId: string,
  selectedAgentId: string | null,
  onError?: (message: string | null) => void,
  prefetchAgentIds: string[] = [],
) {
  const [sessionsByAgent, setSessionsByAgent] = useState<Record<string, Session[]>>({});
  const [totalByAgent, setTotalByAgent] = useState<Record<string, number>>({});
  const [selectedSessionByAgent, setSelectedSessionByAgent] = useState<Record<string, string>>({});
  const [loadedScopes, setLoadedScopes] = useState<Record<string, boolean>>({});
  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  const [loadingMoreAgentId, setLoadingMoreAgentId] = useState<string | null>(null);
  const renderedUser = useRef(userId);
  const userChanged = renderedUser.current !== userId;

  useEffect(() => {
    renderedUser.current = userId;
    setSessionsByAgent({});
    setTotalByAgent({});
    setSelectedSessionByAgent({});
    setLoadedScopes({});
    setDeletingSession(null);
  }, [userId]);

  const sessions = selectedAgentId ? sessionsByAgent[selectedAgentId] || [] : [];
  const selectedSessionId = selectedAgentId ? selectedSessionByAgent[selectedAgentId] || null : null;
  const currentSession = sessions.find((session) => session.id === selectedSessionId) || null;

  const createSession = useCallback((agentId = selectedAgentId) => {
    if (!agentId) return null;
    const session: Session = {
      id: newId(),
      title: "New conversation",
      messages: [],
      updatedAt: Date.now(),
      persisted: false,
    };
    setSessionsByAgent((current) => ({
      ...current,
      [agentId]: [session, ...(current[agentId] || [])],
    }));
    setTotalByAgent((current) => ({ ...current, [agentId]: (current[agentId] ?? 0) + 1 }));
    setSelectedSessionByAgent((current) => ({ ...current, [agentId]: session.id }));
    return session;
  }, [selectedAgentId]);

  useEffect(() => {
    if (!selectedAgentId || userChanged) return;
    const scope = `${userId}\0${selectedAgentId}`;
    if (loadedScopes[scope]) return;
    const controller = new AbortController();
    void listSessions(selectedAgentId, { limit: DEFAULT_PAGE_LIMIT, offset: 0 }, controller.signal)
      .then((page) => {
        if (controller.signal.aborted) return;
        const remoteSessions = page.items.map(fromStoredSession);
        setSessionsByAgent((current) => ({
          ...current,
          [selectedAgentId]: mergeSessions(current[selectedAgentId] || [], remoteSessions),
        }));
        setTotalByAgent((current) => ({ ...current, [selectedAgentId]: page.total }));
      })
      .catch((reason) => {
        if (!controller.signal.aborted) onError?.(getErrorMessage(reason, "Could not load session history."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedScopes((current) => ({ ...current, [scope]: true }));
      });
    return () => controller.abort();
  }, [loadedScopes, onError, selectedAgentId, userChanged, userId]);

  useEffect(() => {
    if (selectedAgentId || userChanged) return;
    const pendingAgentIds = prefetchAgentIds.filter((agentId) => !loadedScopes[`${userId}\0${agentId}`]);
    if (!pendingAgentIds.length) return;
    const controller = new AbortController();
    void Promise.all(pendingAgentIds.map(async (agentId) => ({
      agentId,
      page: await listSessions(agentId, { limit: DEFAULT_PAGE_LIMIT, offset: 0 }, controller.signal),
    })))
      .then((results) => {
        if (controller.signal.aborted) return;
        setSessionsByAgent((current) => {
          const next = { ...current };
          for (const result of results) {
            next[result.agentId] = mergeSessions(
              current[result.agentId] || [],
              result.page.items.map(fromStoredSession),
            );
          }
          return next;
        });
        setTotalByAgent((current) => ({
          ...current,
          ...Object.fromEntries(results.map((result) => [result.agentId, result.page.total])),
        }));
        setLoadedScopes((current) => ({
          ...current,
          ...Object.fromEntries(pendingAgentIds.map((agentId) => [`${userId}\0${agentId}`, true])),
        }));
      })
      .catch((reason) => {
        if (!controller.signal.aborted) onError?.(getErrorMessage(reason, "Could not load session summaries."));
      });
    return () => controller.abort();
  }, [loadedScopes, onError, prefetchAgentIds, selectedAgentId, userChanged, userId]);

  const selectedScope = selectedAgentId ? `${userId}\0${selectedAgentId}` : null;
  const historyLoaded = selectedScope ? !!loadedScopes[selectedScope] : false;

  useEffect(() => {
    if (!selectedAgentId || !historyLoaded) return;
    const available = sessionsByAgent[selectedAgentId] || [];
    const selected = selectedSessionByAgent[selectedAgentId];
    if (selected && available.some((session) => session.id === selected)) return;
    if (available[0]) {
      setSelectedSessionByAgent((current) => ({ ...current, [selectedAgentId]: available[0].id }));
    } else {
      createSession(selectedAgentId);
    }
  }, [createSession, historyLoaded, selectedAgentId, selectedSessionByAgent, sessionsByAgent]);

  const selectAgentSession = useCallback((agentId: string, sessionId: string) => {
    setSelectedSessionByAgent((current) => ({ ...current, [agentId]: sessionId }));
  }, []);

  const selectSession = (sessionId: string) => {
    if (selectedAgentId) selectAgentSession(selectedAgentId, sessionId);
  };

  const updateSession = (
    agentId: string,
    sessionId: string,
    updater: (session: Session) => Session,
  ) => {
    setSessionsByAgent((current) => ({
      ...current,
      [agentId]: (current[agentId] || []).map((session) =>
        session.id === sessionId ? updater(session) : session,
      ),
    }));
  };

  const removeAgentSessions = (agentId: string) => {
    setSessionsByAgent((current) => {
      const next = { ...current };
      delete next[agentId];
      return next;
    });
    setTotalByAgent((current) => {
      const next = { ...current };
      delete next[agentId];
      return next;
    });
    setSelectedSessionByAgent((current) => {
      const next = { ...current };
      delete next[agentId];
      return next;
    });
    setLoadedScopes((current) => Object.fromEntries(
      Object.entries(current).filter(([scope]) => !scope.endsWith(`\0${agentId}`)),
    ));
  };

  /** Fetch the next page of persisted sessions for one agent and append it -
   * used by the Sessions dashboard's "Load more" control. A no-op while
   * already loading, or once every session for that agent is loaded. */
  const loadMoreSessions = async (agentId: string) => {
    const loaded = sessionsByAgent[agentId] || [];
    const total = totalByAgent[agentId] ?? loaded.length;
    if (loadingMoreAgentId || loaded.length >= total) return;
    setLoadingMoreAgentId(agentId);
    onError?.(null);
    try {
      const page = await listSessions(agentId, { limit: DEFAULT_PAGE_LIMIT, offset: loaded.length });
      setSessionsByAgent((current) => ({
        ...current,
        [agentId]: mergeSessions(current[agentId] || [], page.items.map(fromStoredSession)),
      }));
      setTotalByAgent((current) => ({ ...current, [agentId]: page.total }));
    } catch (reason) {
      onError?.(getErrorMessage(reason, "Could not load more sessions."));
    } finally {
      setLoadingMoreAgentId((current) => current === agentId ? null : current);
    }
  };

  const removeSession = async (agentId: string, sessionId: string) => {
    const session = sessionsByAgent[agentId]?.find((candidate) => candidate.id === sessionId);
    const deletionKey = `${agentId}:${sessionId}`;
    setDeletingSession(deletionKey);
    onError?.(null);
    try {
      if (session?.persisted !== false) await deleteSession(agentId, sessionId);
      const remaining = (sessionsByAgent[agentId] || []).filter((candidate) => candidate.id !== sessionId);
      setSessionsByAgent((current) => ({
        ...current,
        [agentId]: (current[agentId] || []).filter((candidate) => candidate.id !== sessionId),
      }));
      setTotalByAgent((current) => (
        current[agentId] === undefined ? current : { ...current, [agentId]: Math.max(0, current[agentId] - 1) }
      ));
      setSelectedSessionByAgent((current) => current[agentId] === sessionId
        ? { ...current, [agentId]: remaining[0]?.id || "" }
        : current);
    } catch (reason) {
      onError?.(getErrorMessage(reason, "Could not delete the session."));
    } finally {
      setDeletingSession((current) => current === deletionKey ? null : current);
    }
  };

  /**
   * Wipe the current session's messages in place - same session id, same
   * position in the sidebar list, just an empty transcript - as opposed to
   * removeSession, which deletes the session entirely and drops it from the
   * list. Reuses the same DELETE endpoint removeSession does (deleting a
   * checkpoint doesn't retire its session id - the next real message simply
   * creates a fresh checkpoint under the same id), then resets the session
   * locally via updateSession instead of filtering it out.
   */
  const clearSession = async (agentId: string, sessionId: string) => {
    const session = sessionsByAgent[agentId]?.find((candidate) => candidate.id === sessionId);
    const deletionKey = `${agentId}:${sessionId}`;
    setDeletingSession(deletionKey);
    onError?.(null);
    try {
      if (session?.persisted !== false) await deleteSession(agentId, sessionId);
      updateSession(agentId, sessionId, (current) => ({
        ...current,
        title: "New conversation",
        messages: [],
        persisted: false,
        updatedAt: Date.now(),
      }));
    } catch (reason) {
      onError?.(getErrorMessage(reason, "Could not clear the session."));
    } finally {
      setDeletingSession((current) => current === deletionKey ? null : current);
    }
  };

  const sessionCount = useMemo(
    () => Object.entries(sessionsByAgent).reduce(
      (count, [agentId, list]) => count + (totalByAgent[agentId] ?? list.length), 0,
    ),
    [sessionsByAgent, totalByAgent],
  );
  const sessionCounts = useMemo(
    () => Object.fromEntries(
      Object.entries(sessionsByAgent).map(([agentId, list]) => [agentId, totalByAgent[agentId] ?? list.length]),
    ),
    [sessionsByAgent, totalByAgent],
  );
  const catalogLoading = prefetchAgentIds.some((agentId) => !loadedScopes[`${userId}\0${agentId}`]);

  return {
    sessions,
    sessionsByAgent,
    totalByAgent,
    currentSession,
    selectedSessionId,
    sessionCount,
    sessionCounts,
    createSession,
    selectSession,
    selectAgentSession,
    updateSession,
    removeAgentSessions,
    removeSession,
    clearSession,
    loadMoreSessions,
    loadingMoreAgentId,
    deletingSession,
    historyLoaded,
    catalogLoading,
  };
}

function fromStoredSession(stored: StoredSession): Session {
  const firstUserMessage = stored.history.find((message) => message.role === "user")?.content || "New conversation";
  return {
    id: stored.session_id,
    title: sessionTitle(firstUserMessage),
    messages: stored.history.map((message, index) => ({
      id: `${stored.session_id}:${index}`,
      role: message.role,
      content: message.content,
      meta: message.role === "assistant" && (
        message.tools_invoked?.length || message.chunks_retrieved || message.prep_time_seconds ||
        message.artifacts?.length || message.sources?.length
      ) ? {
        tools: message.tools_invoked || [],
        chunks: message.chunks_retrieved || 0,
        prepSeconds: message.prep_time_seconds || undefined,
        artifacts: message.artifacts || [],
        indexedDocuments: [],
        sources: (message.sources || []).map((source) => ({
          sourceId: source.source_id,
          excerpt: source.excerpt,
          score: source.score,
        })),
      } : undefined,
    })),
    updatedAt: Date.parse(stored.updated_at) || Date.now(),
    persisted: true,
  };
}

function mergeSessions(local: Session[], remote: Session[]) {
  const remoteById = new Map(remote.map((session) => [session.id, session]));
  for (const session of local) {
    const stored = remoteById.get(session.id);
    if (!stored || session.updatedAt >= stored.updatedAt) remoteById.set(session.id, session);
  }
  return [...remoteById.values()].sort((left, right) => right.updatedAt - left.updatedAt);
}
