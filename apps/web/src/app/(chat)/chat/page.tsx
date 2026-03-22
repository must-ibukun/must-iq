'use client';
export const dynamic = 'force-dynamic';

import { useState, useCallback, useEffect } from 'react';
import { useChatStore } from '@must-iq-web/store/chat.store';
import { Source } from '@must-iq-web/types/chat.types';
import { TopBar } from '@must-iq-web/components/chat/TopBar';
import { ChatWindow } from '@must-iq-web/components/chat/ChatWindow';
import { InputBar } from '@must-iq-web/components/chat/InputBar';
import { chatApi } from '@must-iq-web/lib/api/chat';
import { Button } from '@must-iq-web/components/ui';
import { IconSparkles, IconZap, IconChevronDown, IconChevronUp, IconCheck, IconX } from '@must-iq-web/components/ui/MustIcons';
import { saveLocalImage } from '@must-iq-web/lib/utils/idb';

import { IngestionResult, NotificationModalContent } from '@must-iq/shared-types';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const {
    messages, isStreaming, isWaiting, selectedTeams, availableTeams, mode, thought,
    sessions, activeSessionId,
    addUserMessage, addAssistantMessage, updateLastAssistantMessage,
    finishStream, setTokenUsage, setStreaming, setThought,
    newSession, setSessions, setMessages,
  } = useChatStore();

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // ── Load sessions & teams from API on mount ──────────────────────────
  useEffect(() => {
    const { refreshSessions, refreshTeams } = useChatStore.getState();
    refreshSessions();
    refreshTeams();
  }, []);

  // ── Load messages when session changes ──────────────────────
  useEffect(() => {
    if (activeSessionId) {
      chatApi.getSession(activeSessionId)
        .then(data => {
          if (data?.messages) {
            setMessages(data.messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              sources: m.sources,
              createdAt: new Date(m.createdAt),
            })));
          }
        })
        .catch(() => { /* handle error */ });
    } else {
      setMessages([]);
    }
  }, [activeSessionId]);

  const [notification, setNotification] = useState<NotificationModalContent | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);

  const showNotification = useCallback((type: 'success' | 'error', title: string, message: string, details?: string) => {
    setNotification({ type, title, message, details });
    setShowTechnical(false);
  }, []);

  // ── Chat submit ───────────────────────────────────────────────
  const handleSubmit = useCallback(async (image: string | null = null) => {
    const text = input.trim();
    if ((!text && !image) || isStreaming) return;
    setInput('');
    
    let localImageId: string | undefined = undefined;
    let serverImageUrl: string | null = null;
    
    // Process image: cache locally, upload binary to server
    if (image) {
      localImageId = crypto.randomUUID();
      saveLocalImage(localImageId, image).catch(console.error);

      try {
        const res = await fetch(image);
        const blob = await res.blob();
        const file = new File([blob], `upload-${Date.now()}.png`, { type: blob.type });
        const uploadResponse = await chatApi.uploadImage(file);
        serverImageUrl = uploadResponse.url;
      } catch (err: any) {
        showNotification('error', 'Upload Failed', 'Could not upload the image file securely to the server.', err.message);
        return;
      }
    }

    // Fallback text if user sends only an image
    const displayMessage = text || 'Please analyze this screenshot.';
    addUserMessage(displayMessage, localImageId);
    addAssistantMessage('');

    try {
      let finalSessionId = activeSessionId;
      // Derive workspace identifiers from selected teams.
      // This avoids the backend needing to do a DB lookup (resolveSearchScopes) on every message.
      const workspaceIdentifiers = [
        ...new Set([
          // 'general' + 'vault-v2' are the Global Knowledge Base — only include if user selected them
          ...(selectedTeams.includes('general') ? ['general', 'vault-v2'] : []),
          // Expand each selected team into its workspace identifiers
          ...selectedTeams
            .filter(id => id !== 'general')
            .flatMap(teamId => {
              const team = availableTeams.find(t => t.id === teamId);
              return team ? team.workspaces.map(w => w.id) : [];
            })
        ])
      ];

      await chatApi.stream(
        displayMessage,
        activeSessionId,
        workspaceIdentifiers,
        mode,
        serverImageUrl,
        (chunk) => {
          try {
            const p = JSON.parse(chunk);
            if (p.isError) {
                updateLastAssistantMessage(p.chunk);
                const errorTitle = p.code === 429 ? 'Quota Reached!' : 'Unexpected Error';
                const errorHelpText = p.code === 429 
                    ? "Your AI provider is currently throttled. Please wait a moment for the limits to reset. We're eager to continue! ⏳" 
                    : "The AI encountered an issue while processing your request.";
                showNotification('error', errorTitle, errorHelpText, p.rawError);
            } else if (p.thought) {
                setThought(p.thought);
            } else if (p.chunk) {
                setThought(null); // Clear thought when first real content arrives
                updateLastAssistantMessage(p.chunk);
            }
            
            // Early sessionId handling
            if (p.sessionId && p.sessionId !== finalSessionId) {
                finalSessionId = p.sessionId;
                useChatStore.getState().refreshSessions(); // Update sidebar immediately
            }
            
            if (p.sources) finishStream(p.sources as Source[], undefined, finalSessionId || undefined);
          } catch {
            updateLastAssistantMessage(chunk);
          }
        },
        (sources, tokensUsed) => finishStream(sources as Source[], tokensUsed, finalSessionId || undefined),
        (usage) => setTokenUsage(usage),
      );
      
      setThought(null);
      finishStream(undefined, undefined, finalSessionId || undefined);
    } catch (err: any) {
      setThought(null);
      const msg = err.message || "Unknown Network Error";
      const isQuota = msg.includes('429') || msg.toLowerCase().includes('quota');
      
      const friendlyWarning = "We encountered an unexpected error while processing your request. Please view technical details.";
      updateLastAssistantMessage(friendlyWarning);
      
      showNotification(
        'error', 
        isQuota ? 'Quota Reached!' : 'Connection issue', 
        isQuota ? "Your AI provider is currently throttled. Please wait a moment for the limits to reset." : "We couldn't reach the AI provider. Please check your connection and try again.", 
        msg
      );
      
      finishStream();
    }
  }, [input, isStreaming, selectedTeams, mode, activeSessionId, showNotification]);

  return (
    <>
      <TopBar title={activeSession?.title ?? 'New conversation'} />
      <ChatWindow messages={messages} isStreaming={isStreaming} isWaiting={isWaiting} thought={thought} onSuggest={(t) => { setInput(t); }} />
      <InputBar value={input} onChange={setInput} onSubmit={(img) => handleSubmit(img)} disabled={isStreaming} />

      {/* Notification Modal */}
      {notification && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fade-in 0.2s ease' }} onClick={() => setNotification(null)}>
          <div 
            onClick={e => e.stopPropagation()}
            style={{ 
              background: 'var(--card)', border: `1px solid ${notification.type === 'success' ? 'var(--green)' : 'var(--red)'}`, 
              borderRadius: 20, width: 420, padding: 32, textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              position: 'relative', overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              {notification.type === 'success' ? <IconSparkles size={44} color="var(--primary)" /> : <IconZap size={44} color="var(--red)" />}
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', marginBottom: 12, fontFamily: '"DM Serif Display", serif' }}>{notification.title}</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24 }}>{notification.message}</p>
            
            {/* Technical details removed for security as requested */}

            <Button variant="primary" style={{ width: '100%', padding: '10px 0' }} onClick={() => setNotification(null)}>Understood</Button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}
