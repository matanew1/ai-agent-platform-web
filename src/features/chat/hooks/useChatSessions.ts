import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  const [selectedSessionByAgent, setSelectedSessionByAgent] = useState<Record<string, string>>({});
  const [loadedScopes, setLoadedScopes] = useState<Record<string, boolean>>({});
  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  const renderedUser = useRef(userId);
  const userChanged = renderedUser.current !== userId;

  useEffect(() => {
    renderedUser.current = userId;
    setSessionsByAgent({});
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
    setSelectedSessionByAgent((current) => ({ ...current, [agentId]: session.id }));
    return session;
  }, [selectedAgentId]);

  useEffect(() => {
    if (!selectedAgentId || userChanged) return;
    const scope = `${userId}\0${selectedAgentId}`;
    if (loadedScopes[scope]) return;
    const controller = new AbortController();
    void listSessions(selectedAgentId, controller.signal)
      .then((storedSessions) => {
        if (controller.signal.aborted) return;
        const remoteSessions = storedSessions.map(fromStoredSession);
        setSessionsByAgent((current) => ({
          ...current,
          [selectedAgentId]: mergeSessions(current[selectedAgentId] || [], remoteSessions),
        }));
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
      sessions: await listSessions(agentId, controller.signal),
    })))
      .then((results) => {
        if (controller.signal.aborted) return;
        setSessionsByAgent((current) => {
          const next = { ...current };
          for (const result of results) {
            next[result.agentId] = mergeSessions(
              current[result.agentId] || [],
              result.sessions.map(fromStoredSession),
            );
          }
          return next;
        });
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
    setSelectedSessionByAgent((current) => {
      const next = { ...current };
      delete next[agentId];
      return next;
    });
    setLoadedScopes((current) => Object.fromEntries(
      Object.entries(current).filter(([scope]) => !scope.endsWith(`\0${agentId}`)),
    ));
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
      setSelectedSessionByAgent((current) => current[agentId] === sessionId
        ? { ...current, [agentId]: remaining[0]?.id || "" }
        : current);
    } catch (reason) {
      onError?.(getErrorMessage(reason, "Could not delete the session."));
    } finally {
      setDeletingSession((current) => current === deletionKey ? null : current);
    }
  };

  const sessionCount = useMemo(
    () => Object.values(sessionsByAgent).reduce((count, list) => count + list.length, 0),
    [sessionsByAgent],
  );
  const sessionCounts = useMemo(
    () => Object.fromEntries(Object.entries(sessionsByAgent).map(([agentId, list]) => [agentId, list.length])),
    [sessionsByAgent],
  );
  const catalogLoading = prefetchAgentIds.some((agentId) => !loadedScopes[`${userId}\0${agentId}`]);

  return {
    sessions,
    sessionsByAgent,
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
