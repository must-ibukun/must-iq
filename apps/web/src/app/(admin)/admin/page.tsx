'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useRef } from 'react';

import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@must-iq-web/store/auth.store';
import { Badge, Button, Toggle, ProgressBar, Paginator, ConfirmModal, Spinner } from '@must-iq-web/components/ui';
import { paginate, totalPages } from '@must-iq-web/lib/pagination';
import { guessLayer } from '@must-iq-web/lib/utils';
import { getLLMSettings, saveLLMSettings, getAvailableProviders, getSystemSettings, saveSystemSettings } from '@must-iq-web/lib/api/admin/settings';
import { getStats } from '@must-iq-web/lib/api/admin/stats';
import { NotificationModal } from '@must-iq-web/components/modals/admin/NotificationModal';
import { InviteUserModal } from '@must-iq-web/components/modals/admin/InviteUserModal';
import { AddApiKeyModal } from '@must-iq-web/components/modals/admin/AddApiKeyModal';
import { CreateTeamModal } from '@must-iq-web/components/modals/admin/CreateTeamModal';
import { ViewTeamModal } from '@must-iq-web/components/modals/admin/ViewTeamModal';
import { EditTeamModal } from '@must-iq-web/components/modals/admin/EditTeamModal';
import { ViewWorkspaceModal } from '@must-iq-web/components/modals/admin/ViewWorkspaceModal';
import { EditWorkspaceModal } from '@must-iq-web/components/modals/admin/EditWorkspaceModal';
import { getUsers, inviteUser, updateUser, updateUserTeams } from '@must-iq-web/lib/api/admin/users';
import { getTokenUsage } from '@must-iq-web/lib/api/admin/tokens';
import { getAuditLog } from '@must-iq-web/lib/api/admin/audit';
import { getWorkspacesGrouped, getAvailableWorkspaces, bulkSyncWorkspaces, updateWorkspace, deleteWorkspace, createWorkspace } from '@must-iq-web/lib/api/admin/workspaces';
import { getIngestionEvents, uploadDocument, bulkIngest } from '@must-iq-web/lib/api/admin/ingestion';
import { getTeams, createTeam, updateTeam, deleteTeam, syncTeam, discoverWorkspaces } from '@must-iq-web/lib/api/admin/teams';
import { getAdminDocs, getAdminDocContent } from '@must-iq-web/lib/api/admin/docs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { WORKSPACE_COLORS, NAV, AI_PROVIDERS, type Section } from '@must-iq-web/lib/constants/admin.constants';
import { StatCard, Table, Panel, DeptBar, LLMSettingsSection, ProfileSection } from '@must-iq-web/components/admin';
import {
  MustLogo, NAV_ICONS,
  IconLogout, IconEdit, IconTrash,
  IconCopy, IconEye, IconSearch, IconRefresh, IconPlus, IconTokens, IconAudit,
  IconChat, IconUsers, IconKnowledge, IconDollar, IconZap,
  IconChevronDown, IconX,
  IconBrain,
  IconAI,
  IconInfo
} from '@must-iq-web/components/ui/MustIcons';
import { InfoTooltip } from '@must-iq-web/components/ui/InfoTooltip';
import { SYSTEM_SETTINGS_DESCRIPTIONS } from '../../../lib/constants/settingsConstants';
import { IngestionResult, NotificationModalContent, IngestionEvent, PaginatedResponse } from '@must-iq/shared-types';


// ── MAIN PAGE ─────────────────────────────────────────────────
const Mermaid = ({ chart }: { chart: string }) => {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const renderChart = async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === 'dark' ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'var(--font-body)',
        });
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
        setError(null);
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError(chart); // fallback to showing the code if it fails
      }
    };
    renderChart();
  }, [chart, theme]);

  if (error) return <pre className="p-4 bg-red-500/10 text-red-500 rounded-lg text-xs overflow-auto">{error}</pre>;
  if (!svg) return <div className="animate-pulse h-40 bg-surface rounded-lg my-6" />;

  return (
    <div 
      className="mermaid-wrapper my-8 p-6 bg-surface rounded-2xl border border-border overflow-auto flex justify-center shadow-sm"
      dangerouslySetInnerHTML={{ __html: svg }} 
    />
  );
};

export default function AdminPage() {
  const [section, setSection] = useState<Section>('overview');
  const [activeProvider, setActiveProvider] = useState('anthropic');
  const [showModal, setShowModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [notification, setNotification] = useState<NotificationModalContent | null>(null);
  const [systemSettings, setSystemSettings] = useState({ cache: true, audit: true, piiMasking: false, globalDailyTokenCap: 5000000, baseUserDailyTokenLimit: 50000 });
  const [isSavingSystem, setIsSavingSystem] = useState(false);
  const [discoveryResults, setDiscoveryResults] = useState<any>({ jira: [], slack: [], github: [] });
  const [discoveredGuesses, setDiscoveredGuesses] = useState<Record<string, string>>({});
  const [selectedToSync, setSelectedToSync] = useState<Record<string, boolean>>({});
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const toggleKey = (id: string) => setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme === 'dark';

  // ── Data state ────────────────────────────────────
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [tokenData, setTokenData] = useState<any>(null);
  const [auditData, setAuditData] = useState<any[]>([]);
  const [groupedWorkspaces, setGroupedWorkspaces] = useState<Record<string, any[]>>({ ALL: [], SLACK: [], JIRA: [], GITHUB: [] });
  const [availableWorkspaces, setAvailableWorkspaces] = useState<any[]>([]);
  const [activeWsTab, setActiveWsTab] = useState('ALL');
  const [ingestionData, setIngestionData] = useState<IngestionEvent[]>([]);
  const [ingestionMeta, setIngestionMeta] = useState<PaginatedResponse<IngestionEvent>['meta'] | null>(null);
  const [ingestionPage, setIngestionPage] = useState(1);
  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTeamId, setUploadTeamId] = useState<string>('all');
  const [uploadWorkspace, setUploadWorkspace] = useState('vault-v2');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<IngestionResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [sectionLoading, setSectionLoading] = useState(false);
  // which user is currently being edited (team edit)
  const [teamEditTarget, setTeamEditTarget] = useState<any | null>(null);
  const [teamEditDraft, setTeamEditDraft] = useState<string[]>([]);
  // Team modals
  const [viewTeam, setViewTeam] = useState<any | null>(null);
  const [editTeam, setEditTeam] = useState<any | null>(null);
  // Workspace (Integration) modals
  const [viewWs, setViewWs] = useState<any | null>(null);
  const [editWs, setEditWs] = useState<any | null>(null);
  // User edit state
  const [editUserTarget, setEditUserTarget] = useState<any | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState('');
  const [editUserBudget, setEditUserBudget] = useState('');
  const [editUserActive, setEditUserActive] = useState(true);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isSavingUserRef, setIsSavingUserRef] = useState(false); // To avoid conflict with isSavingUser which was for teams
  const [isSyncingSources, setIsSyncingSources] = useState(false);

  // Bulk Ingest UI states
  const [ingestWsIds, setIngestWsIds] = useState<string[]>([]);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestStartDate, setIngestStartDate] = useState('');
  const [ingestEndDate, setIngestEndDate] = useState('');
  const [ingestFilterType, setIngestFilterType] = useState('');
  const [ingestFilterStart, setIngestFilterStart] = useState('');
  const [ingestFilterEnd, setIngestFilterEnd] = useState('');

  // Bulk Ingest UI states
  const [ingestTeamId, setIngestTeamId] = useState<string>(''); // Initialized in useEffect

  // Form states for New Team
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamOwner, setNewTeamOwner] = useState('');
  const [newTeamSlackEnabled, setNewTeamSlackEnabled] = useState(false);
  const [newTeamJiraEnabled, setNewTeamJiraEnabled] = useState(false);
  const [newTeamGithubEnabled, setNewTeamGithubEnabled] = useState(false);
  const [newTeamSlack, setNewTeamSlack] = useState<string[]>([]);
  const [newTeamJira, setNewTeamJira] = useState<string[]>([]);
  const [newTeamGithub, setNewTeamGithub] = useState<string[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // ── Pagination state ────────────────
  const [teamsPage, setTeamsPage] = useState(1);
  const [usersPage, setUsersPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [workspacesPage, setWorkspacesPage] = useState(1);
  const [channelsPage, setChannelsPage] = useState(1);
  const [topUsersPage, setTopUsersPage] = useState(1);
  const [discoveryPage, setDiscoveryPage] = useState(1);
  // Confirm Modal state
  const [confirmCfg, setConfirmCfg] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void; variant: 'primary' | 'danger'; isLoading: boolean }>({
    open: false, title: '', message: '', onConfirm: () => { }, variant: 'primary', isLoading: false
  });

  // Documentation state
  const [adminDocs, setAdminDocs] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<string>('');
  const [isDocLoading, setIsDocLoading] = useState(false);

  // ── Add Workspace form state ─────────────────────────────
  const [showAddWs, setShowAddWs] = useState(true);
  const [newWsType, setNewWsType] = useState('SLACK');
  const [newWsId, setNewWsId] = useState('');
  const [newWsBudget, setNewWsBudget] = useState('');
  const [newWsLayer, setNewWsLayer] = useState('docs');
  const [workspaceIds, setWorkspaceIds] = useState<string[]>([]);

  // Search states for dropdowns
  const [ingestSearch, setIngestSearch] = useState('');
  const [userTeamSearch, setUserTeamSearch] = useState('');
  const [workspaceSearch, setWorkspaceSearch] = useState('');
  const [discoverySearch, setDiscoverySearch] = useState('');
  const [discoveryTypeFilter, setDiscoveryTypeFilter] = useState('');



  useEffect(() => {
    setSectionLoading(true);
    const loaders: Record<string, () => Promise<void>> = {
      overview: async () => { const d = await getStats(); setStats(d); },
      // Paginated endpoints — unwrap .data from Pagination<T>
      users: async () => {
        const [d, teamsData] = await Promise.all([getUsers(), getTeams()]);
        setUsers(d?.data ?? []);
        setTeams(teamsData?.data ?? []);
      },
      tokens: async () => { const d = await getTokenUsage(); setTokenData(d); },
      audit: async () => { const d = await getAuditLog(); setAuditData(d?.data ?? []); },
      workspaces: async () => {
        const [grouped, available] = await Promise.all([getWorkspacesGrouped(), getAvailableWorkspaces()]);
        setGroupedWorkspaces(grouped);
        setAvailableWorkspaces(available);
      },
      teams: async () => {
        const [d, ws] = await Promise.all([getTeams(), getAvailableWorkspaces()]);
        setTeams(d?.data ?? []);
        setAvailableWorkspaces(ws);
      },
      settings: async () => {
        const s = await getSystemSettings();
        setSystemSettings(s);
      },
      llm: async () => {
        const [s, m] = await Promise.all([getLLMSettings(), getAvailableProviders()]);
        setLlmSettings(s);
        setLlmMeta(m);
        setActiveProvider(s?.provider?.toLowerCase() ?? 'anthropic');
      },
      knowledge: async () => {
        const [d, tms, allWs] = await Promise.all([
          getIngestionEvents({
            page: ingestionPage,
            size: 20,
            type: ingestFilterType || undefined,
            startDate: ingestFilterStart || undefined,
            endDate: ingestFilterEnd || undefined
          }),
          getTeams(),
          getWorkspacesGrouped()
        ]);
        const fetchedTeams = tms?.data ?? [];
        setIngestionData(d?.data ?? []);
        setIngestionMeta(d?.meta ?? null);
        setTeams(fetchedTeams);
        setGroupedWorkspaces(allWs);
        // Ensure ingestTeamId is set to first team if empty
        if (fetchedTeams.length > 0) {
          setIngestTeamId(prev => prev || fetchedTeams[0].id);
        }
      },
      docs: async () => {
        const d = await getAdminDocs();
        setAdminDocs(d);
        if (d.length > 0 && !selectedDoc) {
          handleSelectDoc(d[0].filename);
        }
      },
    };
    loaders[section]?.().catch(() => { }).finally(() => setSectionLoading(false));
  }, [section, ingestionPage, ingestFilterType, ingestFilterStart, ingestFilterEnd]);

  // ── LLM Settings state ─────────────────────────────────────
  const [llmSettings, setLlmSettings] = useState<any>(null);
  const [llmMeta, setLlmMeta] = useState<{ providers: Record<string, string[]>, embeddingProviders: Record<string, { model: string, dimensions: number }[]> } | null>(null);
  const [llmSaving, setLlmSaving] = useState(false);
  const [addingKeyForProvider, setAddingKeyForProvider] = useState<string | null>(null);

  const topKRef = useRef<HTMLInputElement>(null);
  const [ragEnabled, setRagEnabled] = useState(true);
  const [agenticReasoningEnabled, setAgenticReasoningEnabled] = useState(false);

  useEffect(() => {
    if (section === 'llm') {
      getLLMSettings().then(s => {
        setLlmSettings(s);
        setActiveProvider(s?.provider?.toLowerCase() ?? 'anthropic');
        setRagEnabled(s?.ragEnabled ?? true);
        setAgenticReasoningEnabled(s?.agenticReasoningEnabled ?? false);
      }).catch(() => { });
    }
  }, [section]);

  async function handleSaveLLM(
    updates?: Partial<any>,
    updatedApiKeys?: any[],
    newProvider?: string,
    newModel?: string,
    silentSave = false   // if true, don't re-fetch after save (state already updated)
  ) {
    if (!llmSettings) return;
    setLlmSaving(true);
    try {
      const payload: any = {
        ...llmSettings,
        ...updates,
        provider: (newProvider || llmSettings.provider || activeProvider).toLowerCase(),
        model: newModel || llmSettings.model,
        ragEnabled,
        agenticReasoningEnabled,
        topK: topKRef.current ? parseInt(topKRef.current.value) : (llmSettings?.topK ?? 41),
        apiKeys: updatedApiKeys || llmSettings.apiKeys,
      };

      await saveLLMSettings(payload);

      if (!silentSave) {
        // Only re-fetch when needed (e.g. adding a brand new key)
        const refreshed = await getLLMSettings();
        setLlmSettings(refreshed);
      }

      showToast('✓ LLM settings saved');
    } catch (e: any) {
      showToast(`Error: ${e?.response?.data?.message ?? 'Could not save settings'}`);
      // Revert to last known good state on failure
      const reverted = await getLLMSettings();
      setLlmSettings(reverted);
    } finally {
      setLlmSaving(false);
      setAddingKeyForProvider(null);
    }
  }

  function handleSaveNewKey(provider: string, label: string, model: string, key: string) {
    const existingKeys = Array.isArray(llmSettings?.apiKeys) ? llmSettings.apiKeys : [];
    const hasKeysForProvider = existingKeys.some((k: any) => k.provider === provider);

    const newEntry = {
      id: Math.random().toString(36).substring(2, 9),
      provider: provider,
      label: label || `${provider} Key`,
      model: model || (AI_PROVIDERS.find(p => p.id === provider)?.model ?? ''),
      key: key,
      isActive: !hasKeysForProvider
    };

    handleSaveLLM(undefined, [...existingKeys, newEntry]);
  }

  function handleActivateKey(keyId: string, provider: string) {
    const existingKeys = Array.isArray(llmSettings?.apiKeys) ? llmSettings.apiKeys : [];
    const targetKey = existingKeys.find((k: any) => k.id === keyId);

    if (!targetKey) return;

    // ① Apply globally: deactivate ALL keys, then activate only this one
    const updated = existingKeys.map((k: any) => ({
      ...k,
      isActive: k.id === keyId
    }));

    // ② Update UI immediately (optimistic) — user sees the change instantly
    setLlmSettings((prev: any) => prev ? ({
      ...prev,
      provider: provider as any,
      model: targetKey.model,
      apiKeys: updated
    }) : prev);

    // ③ Persist to backend silently (don't re-fetch, state already correct)
    handleSaveLLM(undefined, updated, provider, targetKey.model, true);
  }

  function handleDeleteKey(keyId: string) {
    const existingKeys = Array.isArray(llmSettings?.apiKeys) ? llmSettings.apiKeys : [];
    const updated = existingKeys.filter((k: any) => k.id !== keyId);
    handleSaveLLM(undefined, updated);
  }

  async function handleSyncTeam(teamId: string) {
    showToast('⚙ Syncing team data...');
    try {
      await syncTeam(teamId);
      showToast('✓ Sync completed');
      const d = await getTeams();
      setTeams(d?.data ?? []);
    } catch (e) {
      showToast('× Sync failed');
    }
  }

  const refetchTeamsAndWorkspaces = async () => {
    const d = await getTeams();
    setTeams(d?.data ?? []);
    const ws = await getAvailableWorkspaces();
    setAvailableWorkspaces(ws);
  };

  const handleEditTeams = (user: any) => {
    setTeamEditTarget(user);
    setTeamEditDraft(user.teamIds || []);
    setUserTeamSearch('');
  };

  const saveTeamMapping = async () => {
    if (!teamEditTarget) return;
    setIsSavingUser(true);
    try {
      await updateUserTeams(teamEditTarget.id, teamEditDraft);
      showToast('✓ Teams updated successfully');
      setTeamEditTarget(null);
      // Refresh users
      const res = await getUsers();
      setUsers(res.data);
    } catch (err: any) {
      showToast('× Update failed: ' + err.message);
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleEditUser = (u: any) => {
    setEditUserTarget(u);
    setEditUserName(u.name);
    setEditUserRole(u.role);
    setEditUserBudget(u.tokenBudget.toString());
    setEditUserActive(u.isActive);
  };

  const saveUserEdit = async () => {
    if (!editUserTarget) return;
    setIsSavingUserRef(true);
    try {
      await updateUser(editUserTarget.id, {
        name: editUserName,
        role: editUserRole,
        tokenBudgetOverride: parseInt(editUserBudget) || 0,
        isActive: editUserActive,
      });
      showToast('✓ User details updated');
      setEditUserTarget(null);
      const res = await getUsers();
      setUsers(res.data);
    } catch (err: any) {
      showToast('× Update failed: ' + err.message);
    } finally {
      setIsSavingUserRef(false);
    }
  };

  async function handleDiscover() {
    setIsDiscovering(true);
    try {
      const results = await discoverWorkspaces();
      const guesses: Record<string, string> = {};
      const selected: Record<string, boolean> = {};
      const errors = results.errors || {};

      results.slack.forEach((c: any) => {
        const key = `SLACK:${c.id}`;
        guesses[key] = guessLayer(c.name, 'SLACK');
        selected[key] = true;
      });
      results.jira.forEach((p: any) => {
        const key = `JIRA:${p.key}`;
        guesses[key] = guessLayer(p.name, 'JIRA');
        selected[key] = true;
      });
      results.github.forEach((r: any) => {
        const key = `GITHUB:${r.full_name}`;
        guesses[key] = guessLayer(r.full_name, 'GITHUB');
        selected[key] = true;
      });

      setDiscoveredGuesses(guesses);
      setSelectedToSync(selected);
      setDiscoveryResults(results);

      const hasResults = (results.slack?.length || 0) > 0 || (results.jira?.length || 0) > 0 || (results.github?.length || 0) > 0;
      const hasErrors = Object.keys(errors).length > 0;

      if (hasErrors) {
        let errorMsg = "Some sources could not be reached:";
        if (errors.slack) errorMsg += `\n• Slack: ${errors.slack}`;
        if (errors.jira) errorMsg += `\n• Jira: ${errors.jira}`;
        if (errors.github) errorMsg += `\n• GitHub: ${errors.github}`;
        
        showNotification('error', 'Discovery Partial Success', hasResults ? "Some sources were found, but others failed:" : "Failed to discover sources:", errorMsg);
      } else if (hasResults) {
        showToast('✓ Sources discovered. Review and click "Sync Selected"');
      } else {
        showNotification('success', 'Discovery Complete', 'No new sources were found. All your current channels/projects are already added or your tokens have no access to new ones.');
      }
    } catch (e) {
      showToast('× Discovery failed');
    } finally {
      setIsDiscovering(false);
    }
  }

  async function syncGlobalSources() {
    setIsSyncingSources(true);
    showToast('⚙ Syncing selected sources...');
    try {
      // Build items payload from discoveryResults + discoveredGuesses + selectedToSync
      const items: any[] = [];

      discoveryResults.slack.forEach((c: any) => {
        const key = `SLACK:${c.id}`;
        if (selectedToSync[key]) {
          items.push({ identifier: c.name, externalId: c.id, type: 'SLACK', layer: discoveredGuesses[key] || 'docs' });
        }
      });
      discoveryResults.jira.forEach((p: any) => {
        const key = `JIRA:${p.key}`;
        if (selectedToSync[key]) {
          items.push({ identifier: p.name, externalId: p.key, type: 'JIRA', layer: discoveredGuesses[key] || 'docs' });
        }
      });
      discoveryResults.github.forEach((r: any) => {
        const key = `GITHUB:${r.full_name}`;
        if (selectedToSync[key]) {
          items.push({ identifier: r.name, externalId: r.full_name, type: 'GITHUB', layer: discoveredGuesses[key] || 'docs' });
        }
      });

      if (items.length === 0 && !discoveryResults.slack.length && !discoveryResults.jira.length && !discoveryResults.github.length) {
        // Fallback to automatic full sync if no discovery data (legacy behavior)
        await bulkSyncWorkspaces();
      } else {
        await bulkSyncWorkspaces({ items });
      }

      showToast(`✓ Sync completed (${items.length} sources)`);
      // After bulk sync, we can just clear the results or refresh
      setDiscoveryResults({ jira: [], slack: [], github: [] });
      const d = await getWorkspacesGrouped();
      setGroupedWorkspaces(d);
      const ws = await getAvailableWorkspaces();
      setAvailableWorkspaces(ws);
    } catch (e) {
      showToast('× Sync failed');
    } finally {
      setIsSyncingSources(false);
    }
  }

  async function handleSaveDiscoveredSource(id: string, type: 'SLACK' | 'JIRA' | 'GITHUB', identifier: string, originalName?: string) {
    setIsSyncingSources(true);
    // Remember id here is passed as item.id originally where item.id might be the name.
    // wait, I need to check how it's called. Above I found it was handleSaveDiscoveredSource(item.id, item.type, item.identifier)
    // Actually let's look at the callers below to fix them.
    const key = `${type}:${identifier}`;
    const layer = discoveredGuesses[key] || 'docs';
    
    try {
      await createWorkspace({
        type,
        identifier: originalName || id, // Name for UI
        externalId: identifier, // API ID
        tokenBudget: 20000,
        layer
      });
      
      showToast(`✓ ${type} source added`);
      
      // Remove from discovery results state
      setDiscoveryResults((prev: any) => {
        const updated = { ...prev };
        if (type === 'SLACK') updated.slack = updated.slack.filter((x: any) => x.id !== identifier);
        if (type === 'JIRA') updated.jira = updated.jira.filter((x: any) => x.key !== identifier);
        if (type === 'GITHUB') updated.github = updated.github.filter((x: any) => x.full_name !== identifier);
        return updated;
      });

      // Refresh active workspaces
      const d = await getWorkspacesGrouped();
      setGroupedWorkspaces(d);
    } catch (e) {
      showToast('× Failed to save source');
    } finally {
      setIsSyncingSources(false);
    }
  }

  async function handleAddWorkspace() {
    if (!newWsId) return showToast('Identifier is required');
    setIsSyncingSources(true);
    try {
      await createWorkspace({
        type: newWsType,
        identifier: newWsId,
        tokenBudget: parseInt(newWsBudget) || 20000,
        layer: newWsLayer
      });
      showToast('✓ Workspace added manually');
      // setShowAddWs(false); // Keep the form visible as requested
      setNewWsId('');
      setNewWsBudget('');
      // Refresh
      const d = await getWorkspacesGrouped();
      setGroupedWorkspaces(d);
    } catch (e) {
      showToast('× Failed to add workspace');
    } finally {
      setIsSyncingSources(false);
    }
  }

  function showNotification(type: 'success' | 'error', title: string, message: string, details?: string) {
    setNotification({ type, title, message, details });
  }

  // Backwards compatibility for now
  function showToast(msg: string) {
    showNotification(msg.includes('✓') || msg.includes('✅') ? 'success' : 'error',
      msg.includes('✓') || msg.includes('✅') ? 'Success' : 'Attention', msg);
  }

  async function handleBulkIngestRequest() {
    setIsIngesting(true);
    try {
      const payload = {
        teamId: ingestTeamId === 'all' ? undefined : ingestTeamId,
        workspaceIds: ingestWsIds,
        all: ingestWsIds.length === 0,
        startDate: ingestStartDate || undefined,
        endDate: ingestEndDate || undefined,
      };
      await bulkIngest(payload);
      showToast('✓ Ingestion triggered');
      // Refresh ingestion events after a short delay
      setTimeout(async () => {
        const d = await getIngestionEvents({ page: 1, size: 20 });
        setIngestionData(d?.data ?? []);
      }, 1000);
    } catch (e) {
      showToast('× Ingestion failed');
    } finally {
      setIsIngesting(false);
    }
  }

  const refetchUsers = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data);
    } catch (e) {
      showToast('× Failed to update users list');
    }
  };

  const handleSelectDoc = async (filename: string) => {
    setSelectedDoc(filename);
    setIsDocLoading(true);
    try {
      const data = await getAdminDocContent(filename);
      setDocContent(data.content);
    } catch (e) {
      showToast('× Failed to load document');
    } finally {
      setIsDocLoading(false);
    }
  };

  const sectionTitles: Record<Section, string> = {
    overview: 'Dashboard', teams: 'Teams',
    users: 'Users', workspaces: 'Workspace', llm: 'LLM Settings',
    tokens: 'Token Usage', audit: 'Audit Log', settings: 'System Settings',
    knowledge: 'Knowledge Base', profile: 'User Profile', docs: 'Internal Docs',
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)', position: 'relative', zIndex: 1 }}>
      <div className="bg-dots" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />

      {/* ── NAV ── */}
      <nav style={{ width: 220, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Must Company brand logo mark */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30 }}>
            <MustLogo size={26} />
          </div>
          <div style={{ fontFamily: '"DM Serif Display",Georgia,serif', fontSize: 16, color: 'var(--ink)' }}>must<span style={{ color: 'var(--primary)' }}>-iq</span></div>
          <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', background: user?.role === 'MANAGER' ? 'rgba(79,70,229,0.12)' : 'rgba(255,183,64,0.12)', border: `1px solid ${user?.role === 'MANAGER' ? 'rgba(79,70,229,0.3)' : 'rgba(255,183,64,0.3)'}`, color: user?.role === 'MANAGER' ? 'var(--primary)' : 'var(--amber)', padding: '2px 7px', borderRadius: 20 }}>{user?.role ?? 'ADMIN'}</span>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 8px' }}>
          {NAV.filter(item => {
            if (user?.role === 'MANAGER') {
              return !['workspaces', 'llm', 'settings'].includes(item.section);
            }
            return true;
          }).map(item => (
            <div key={item.section} onClick={() => setSection(item.section)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 7, cursor: 'pointer', marginBottom: 4, background: section === item.section ? 'rgba(var(--primary-rgb),0.08)' : 'transparent', color: section === item.section ? 'var(--ink)' : 'var(--muted)', fontSize: 14 }}>
              {(() => {
                const NavIcon = NAV_ICONS[item.section];
                return NavIcon ? (
                  <NavIcon
                    size={17}
                    color={section === item.section ? 'var(--primary)' : 'var(--ink)'}
                    style={{ flexShrink: 0, opacity: section === item.section ? 1 : 0.45 }}
                  />
                ) : null;
              })()}
              {item.label}
              {item.badge && (
                <span style={{ marginLeft: 'auto', fontSize: 9.5, fontFamily: '"DM Mono",monospace', padding: '2px 6px', borderRadius: 10, background: item.badgeType === 'warn' ? 'rgba(255,183,64,0.12)' : 'rgba(var(--primary-rgb),0.10)', color: item.badgeType === 'warn' ? 'var(--amber)' : 'var(--primary)', border: `1px solid ${item.badgeType === 'warn' ? 'rgba(255,183,64,0.25)' : 'rgba(var(--primary-rgb),0.25)'}` }}>
                  {item.badge}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 9 }}>
          <div 
            onClick={() => setSection('profile')}
            style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, cursor: 'pointer', padding: '4px', margin: '-4px', borderRadius: 8 }}
            className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,rgba(var(--primary-rgb),0.3),rgba(157,111,255,0.3))', border: '1px solid var(--border-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>{user?.initials ?? 'AD'}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 500 }}>{user?.name ?? 'Admin'}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)' }}>{user?.role === 'MANAGER' ? 'Team Manager' : 'Super Admin'}</div>
            </div>
          </div>
          <button onClick={() => router.push('/chat?from=admin')} title="Back to chat" style={{ opacity: 0.4, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--ink)' }}>
            <IconChat size={16} />
          </button>
          <button onClick={() => { logout(); router.push('/login'); }} title="Sign out" style={{ opacity: 0.4, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: 'var(--ink)' }}>
            <IconLogout size={16} />
          </button>
        </div>
      </nav>

      {/* ── MAIN ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {/* Topbar */}
        <div style={{ height: 52, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 14, background: 'var(--bg)', backdropFilter: 'blur(10px)', flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: '"DM Serif Display",Georgia,serif', fontSize: 16, color: 'var(--ink)' }}>{sectionTitles[section]}</div>
          </div>
          {section === 'workspaces' && user?.role === 'ADMIN' && (
            <Button variant="primary" size="sm" onClick={handleDiscover} disabled={isDiscovering}>
              <IconRefresh size={14} style={{ marginRight: 6 }} /> {isDiscovering ? 'Discovering...' : 'Discover Sources'}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => router.push('/chat?from=admin')} style={{ color: 'var(--primary)', borderColor: 'rgba(var(--primary-rgb),0.3)' }}>
            <IconChat size={14} style={{ marginRight: 6 }} /> Chat with Must IQ
          </Button>
          <Button variant="ghost" size="sm" onClick={() => showToast('Refreshing…')}>
            <IconRefresh size={14} style={{ marginRight: 6 }} /> Refresh
          </Button>
          {mounted && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? '☀️ Light' : '🌙 Dark'}
            </Button>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>

          {/* ── OVERVIEW ── */}
          {section === 'overview' && (sectionLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 80, width: '100%' }}>
              <Spinner size={32} />
            </div>
          ) : (
            <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
              <StatCard label="Total Chunks" value={stats ? stats.chunksByWorkspace.reduce((s: number, d: any) => s + d.count, 0).toLocaleString() : (sectionLoading ? <Spinner size={18} /> : '0')} delta="Knowledge base" accent="var(--primary)" icon={<IconKnowledge />} />
              <StatCard label="Active Users" value={stats ? stats.totalUsers.toLocaleString() : (sectionLoading ? <Spinner size={18} /> : '0')} delta="Registered accounts" accent="var(--green)" icon={<IconUsers />} />
              <StatCard label="Tokens Today" value={stats ? (stats.tokensToday >= 1000 ? `${(stats.tokensToday / 1000).toFixed(0)}K` : stats.tokensToday.toString()) : (sectionLoading ? <Spinner size={18} /> : '0')} delta={`${stats?.cacheRate ?? 0}% cache hit`} accent="var(--amber)" icon={<IconTokens />} />
              <StatCard label="Total Sessions" value={stats ? stats.totalSessions.toLocaleString() : (sectionLoading ? <Spinner size={18} /> : '0')} delta="Across all users" accent="var(--purple)" icon={<IconChat />} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
              <Panel title="Recent Activity" dot="var(--green)" action={<button onClick={() => setSection('audit')} style={{ fontSize: 11.5, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>View all →</button>}>
                {auditData.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 12, padding: '12px 0', textAlign: 'center' }}>No activity yet</div>}
                {auditData.slice(0, 4).map((a: any, i: number) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(0,82,204,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                      📋
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.action}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 3 }}>
                        {a.user?.name ?? 'System'} · {new Date(a.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </Panel>
              <Panel title="Knowledge by Workspace">
                {stats?.chunksByWorkspace?.length ? (
                  (() => {
                    const max = Math.max(...stats.chunksByWorkspace.map((d: any) => d.count), 1);
                    return stats.chunksByWorkspace.slice(0, 6).map((d: any, i: number) => {
                      const deptStyle = WORKSPACE_COLORS[d.workspace.toLowerCase()] ?? 'var(--ink)';
                      return (
                        <DeptBar key={d.workspace} label={d.workspace} pct={Math.round((d.count / max) * 100)} count={d.count.toLocaleString()} color={deptStyle} />
                      );
                    });
                  })()
                ) : <div style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>No chunks yet</div>}
              </Panel>
            </div>
          </>))}



          {/* ── TEAMS ── */}
          {section === 'teams' && (
            <Panel title={`Teams (${teams.length})`} action={user?.role === 'ADMIN' && <Button variant="primary" size="sm" onClick={() => setShowModal(true)}><IconPlus size={14} style={{ marginRight: 6 }} /> New Team</Button>}>
              {sectionLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 48, width: '100%' }}>
                  <Spinner size={32} />
                </div>
              ) :
                teams.length === 0 ?
                  <div style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: 24 }}>No teams yet. Click "+ New Team" to onboard your first team.</div> :
                  <>
                    <Table headers={['Team', 'Sources Linked', 'Workspaces', 'Status', 'Actions']} rows={
                      paginate(teams, teamsPage).map((t: any) => [
                        <strong key="n" style={{ color: 'var(--ink)' }}>{t.name}</strong>,
                        <span key="c" style={{ fontFamily: 'monospace', fontSize: 13 }}>{(t.identifiers || []).length} Source(s)</span>,
                        <div key="i" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 300 }}>
                          {(t.identifiers || []).length > 0 ? (
                            (t.identifiers || []).map((id: string, idx: number) => (
                              <Badge key={idx} variant="info" style={{ fontSize: 10, padding: '1px 6px' }}>{id}</Badge>
                            ))
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>
                          )}
                        </div>,
                        <Badge key="s" variant={t.status === 'active' ? 'active' : 'warn'}>{t.status ?? 'active'}</Badge>,
                        <div key="a" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {/* View */}
                          <button onClick={() => setViewTeam(t)} title="View" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#4f46e5', display: 'flex' }}>
                            <IconEye size={17} />
                          </button>
                          {/* Edit */}
                          <button onClick={() => setEditTeam(t)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#d97706', display: 'flex' }}>
                            <IconEdit size={17} />
                          </button>
                          {/* Copy ID */}
                          <button onClick={() => { navigator.clipboard?.writeText(t.id); showToast('Team ID copied!'); }} title="Copy ID" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#16a34a', display: 'flex' }}>
                            <IconCopy size={17} />
                          </button>
                          {/* Delete */}
                          {user?.role === 'ADMIN' && (
                            <button onClick={() => {
                              setConfirmCfg({
                                open: true,
                                title: 'Delete Team',
                                message: `Are you sure you want to delete "${t.name}"? This action cannot be undone.`,
                                variant: 'danger',
                                isLoading: false,
                                onConfirm: async () => {
                                  setConfirmCfg(prev => ({ ...prev, isLoading: true }));
                                  try {
                                    await deleteTeam(t.id);
                                    setTeams(prev => prev.filter(x => x.id !== t.id));
                                    showToast(`Team "${t.name}" deleted`);
                                  } catch { showToast('Delete failed'); }
                                  setConfirmCfg(prev => ({ ...prev, open: false, isLoading: false }));
                                }
                              });
                            }} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#ef4444', display: 'flex' }}>
                              <IconTrash size={17} />
                            </button>
                          )}
                        </div>,
                      ])
                    } />
                    <Paginator page={teamsPage} setPage={setTeamsPage} total={totalPages(teams)} />
                  </>
              }
            </Panel>
          )}


          {section === 'users' && (
            <Panel title={`Users (${users.length})`} action={user?.role === 'ADMIN' && <Button variant="primary" size="sm" onClick={() => setShowInviteModal(true)}><IconPlus size={14} style={{ marginRight: 6 }} /> Invite User</Button>}>
              {sectionLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 48, width: '100%' }}>
                  <Spinner size={32} />
                </div>
              ) :
                users.length === 0 ?
                  <div style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: 24 }}>No users found.</div> :
                  <>
                    <Table headers={['User', 'Team(s)', 'Role', 'Token Budget', 'Today Usage', 'Status', 'Actions']} rows={
                      paginate(users, usersPage).map((u: any) => {
                        const pct = u.tokenBudget > 0 ? Math.round((u.tokensToday / u.tokenBudget) * 100) : 0;
                        const isAdmin = u.role === 'ADMIN';
                        return [
                          <div key="u"><div style={{ color: 'var(--ink)' }}>{u.name}</div><div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{u.email}</div></div>,
                          <div key="w" style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', maxWidth: 220 }}>
                            {isAdmin ? (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>🔑 ALL TEAMS</span>
                            ) : !u.teamIds || u.teamIds.length === 0 ? (
                              <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {(u.teams || []).map((t: any) => (
                                  <span key={t.id} style={{ fontSize: 10, fontWeight: 600, color: 'var(--primary)', background: 'rgba(var(--primary-rgb),0.08)', border: '1px solid rgba(var(--primary-rgb),0.2)', padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                                    {t.name}
                                  </span>
                                ))}
                              </div>
                            )}
                            {u.role !== 'ADMIN' && (
                              <button
                                onClick={() => handleEditTeams(u)}
                                title="Edit teams"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', opacity: 0.5, padding: '1px 4px' }}
                              >
                                <IconEdit size={14} />
                              </button>
                            )}
                          </div>,
                          <Badge key="r" variant={u.role === 'ADMIN' ? 'warn' : 'muted'}>{u.role}</Badge>,
                          <span key="b">{u.tokenBudget > 0 ? u.tokenBudget.toLocaleString() : '∞'}</span>,
                          <div key="t" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 80 }}><ProgressBar value={pct} color={pct > 80 ? 'var(--red)' : 'var(--primary)'} /></div>
                            <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)' }}>{u.tokensToday.toLocaleString()}</span>
                          </div>,
                          <Badge key="s" variant={u.isActive ? 'active' : 'muted'}>{u.isActive ? 'active' : 'inactive'}</Badge>,
                          <div key="a" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button onClick={() => handleEditUser(u)} title="Edit Details" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#d97706', display: 'flex' }}>
                              <IconEdit size={17} />
                            </button>
                          </div>
                        ];
                      })
                    } />
                    <Paginator page={usersPage} setPage={setUsersPage} total={totalPages(users)} />
                  </>
              }

              {/* ── Team Edit Modal ── */}
              {teamEditTarget && (
                <div
                  onClick={(e) => e.target === e.currentTarget && setTeamEditTarget(null)}
                  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}
                >
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border-2)', borderRadius: 16, width: 440, maxWidth: '95vw', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Edit Teams for {teamEditTarget.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{teamEditTarget.email}</div>
                      </div>
                      <button onClick={() => setTeamEditTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', opacity: 0.5, display: 'flex' }}>
                        <IconX size={18} />
                      </button>
                    </div>

                    {/* Search */}
                    <div style={{ padding: '16px 24px 8px' }}>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none' }}>
                          <IconSearch size={14} color="var(--ink)" />
                        </span>
                        <input
                          value={userTeamSearch}
                          onChange={e => setUserTeamSearch(e.target.value)}
                          placeholder="Search teams..."
                          style={{ width: '100%', padding: '8px 12px 8px 32px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>

                    {/* Team List */}
                    <div style={{ padding: '0', maxHeight: 300, overflowY: 'auto' }}>
                      {(() => {
                        const filtered = teams.filter(t =>
                          t.name.toLowerCase().includes(userTeamSearch.toLowerCase()) ||
                          t.identifiers?.some((id: string) => id.toLowerCase().includes(userTeamSearch.toLowerCase()))
                        );
                        if (filtered.length === 0) {
                          return <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>{userTeamSearch ? 'No matches found.' : 'No teams configured yet.'}</div>;
                        }
                        return filtered.map((team: any) => {
                          const isChecked = teamEditDraft.includes(team.id);
                          return (
                            <div
                              key={team.id}
                              onClick={() => {
                                setTeamEditDraft(prev =>
                                  prev.includes(team.id) ? prev.filter(id => id !== team.id) : [...prev, team.id]
                                );
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 24px', cursor: 'pointer', transition: 'background 0.12s', borderBottom: '1px solid var(--border)' }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              {/* Checkbox-style check */}
                              <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isChecked ? 'var(--primary)' : 'var(--border-2)'}`, background: isChecked ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
                                {isChecked && <div style={{ fontSize: 12, color: '#fff', fontWeight: 900 }}>✓</div>}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{team.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                                  {(team.identifiers || []).join(' · ') || 'No workspaces'}
                                </div>
                              </div>
                              {isChecked && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', background: 'rgba(var(--primary-rgb),0.1)', padding: '2px 8px', borderRadius: 12 }}>SELECTED</span>}
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* Footer actions */}
                    <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>{teamEditDraft.length} team(s) selected</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button
                          variant="secondary"
                          onClick={() => setTeamEditTarget(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          onClick={saveTeamMapping}
                          isLoading={isSavingUser}
                        >
                          {isSavingUser ? 'Saving...' : 'Save Teams'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Edit User Modal ── */}
              {editUserTarget && (
                <div
                  onClick={(e) => e.target === e.currentTarget && setEditUserTarget(null)}
                  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}
                >
                  <div style={{ background: 'var(--card)', border: '1px solid var(--border-2)', borderRadius: 16, width: 440, maxWidth: '95vw', boxShadow: '0 32px 80px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>Edit User: {editUserTarget.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{editUserTarget.email}</div>
                      </div>
                      <button onClick={() => setEditUserTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', opacity: 0.5, display: 'flex' }}>
                        <IconX size={18} />
                      </button>
                    </div>

                    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div className="form-group">
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Full Name</label>
                        <input
                          value={editUserName}
                          onChange={e => setEditUserName(e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: 16 }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6, display: 'block', letterSpacing: '0.06em' }}>Role</label>
                          <select
                            value={editUserRole}
                            onChange={e => setEditUserRole(e.target.value)}
                            style={{ width: '100%', padding: '10px 32px 10px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 14, outline: 'none', appearance: 'none', cursor: 'pointer' }}
                          >
                            <option value="EMPLOYEE">EMPLOYEE</option>
                            <option value="MANAGER">MANAGER</option>
                            <option value="VIEWER">VIEWER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                          <span style={{ position: 'absolute', right: 10, top: '62%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }}>
                            <IconChevronDown size={14} />
                          </span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Token Budget</label>
                          <input
                            type="number"
                            value={editUserBudget}
                            onChange={e => setEditUserBudget(e.target.value)}
                            style={{ width: '100%', padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                            placeholder="0 for unlimited"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>Active Status</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Inactive users cannot log in.</div>
                        </div>
                        <Toggle on={editUserActive} onToggle={() => setEditUserActive(!editUserActive)} />
                      </div>
                    </div>

                    <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <Button
                        variant="secondary"
                        onClick={() => setEditUserTarget(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        onClick={saveUserEdit}
                        isLoading={isSavingUserRef}
                      >
                        {isSavingUserRef ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Panel>
          )}

          {/* ── INTEGRATIONS ── */}
          {section === 'workspaces' && (user?.role !== 'ADMIN' ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              <h3>Access Restricted</h3>
              <p>You do not have permission to manage global integration sources.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

              {/* ── Integration Sources with tabbed filter ── */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Integration Sources</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 0 }}>
                      Manage the sources of data that the AI uses for analysis and coaching.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                  </div>
                </div>

                {/* ── Discovery Results Review ── */}
                {(discoveryResults.slack.length > 0 || discoveryResults.jira.length > 0 || discoveryResults.github.length > 0) && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--primary)', borderRadius: 12, padding: 24, marginBottom: 28 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>Review Discovered Sources</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Select items to sync in bulk or save them individually.</div>
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <Button variant="ghost" size="sm" onClick={() => setDiscoveryResults({ jira: [], slack: [], github: [] })}>Dismiss All</Button>
                        <Button variant="primary" size="sm" onClick={syncGlobalSources} disabled={isSyncingSources}>
                          {isSyncingSources ? 'Syncing...' : 'Sync Selected Sources'}
                        </Button>
                      </div>
                    </div>

                    {/* Filter + Select All toolbar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      {/* Select All checkbox */}
                      {(() => {
                        const allFound = [
                          ...discoveryResults.slack.map((x: any) => ({ ...x, type: 'SLACK', key: `SLACK:${x.id}`, identifier: x.id })),
                          ...discoveryResults.jira.map((x: any) => ({ ...x, type: 'JIRA', key: `JIRA:${x.key}`, identifier: x.key })),
                          ...discoveryResults.github.map((x: any) => ({ ...x, type: 'GITHUB', key: `GITHUB:${x.full_name}`, identifier: x.full_name })),
                        ].filter(item =>
                          (!discoverySearch || (item.name || item.full_name || item.key || '').toLowerCase().includes(discoverySearch.toLowerCase())) &&
                          (!discoveryTypeFilter || item.type === discoveryTypeFilter)
                        );
                        const allChecked = allFound.length > 0 && allFound.every(item => selectedToSync[item.key]);
                        const someChecked = allFound.some(item => selectedToSync[item.key]);
                        return (
                          <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', userSelect: 'none', fontSize: 12, color: 'var(--ink)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            <input
                              type="checkbox"
                              checked={allChecked}
                              ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
                              onChange={() => {
                                const updates: Record<string, boolean> = {};
                                allFound.forEach(item => { updates[item.key] = !allChecked; });
                                setSelectedToSync(prev => ({ ...prev, ...updates }));
                              }}
                              style={{ width: 15, height: 15, accentColor: 'var(--primary)', cursor: 'pointer' }}
                            />
                            {allChecked ? 'Unselect All' : 'Select All'}
                            {someChecked && (
                              <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: 'rgba(var(--primary-rgb),0.12)', color: 'var(--primary)', border: '1px solid rgba(var(--primary-rgb),0.25)' }}>
                                {allFound.filter(item => selectedToSync[item.key]).length} selected
                              </span>
                            )}
                          </label>
                        );
                      })()}
                      {/* Filter input */}
                      <div style={{ position: 'relative', flex: 1 }}>
                        <IconSearch size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                        <input
                          value={discoverySearch}
                          onChange={e => { setDiscoverySearch(e.target.value); setDiscoveryPage(1); }}
                          placeholder="Filter by source name..."
                          style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, fontSize: 12, color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                      {/* Type filter */}
                      <select
                        value={discoveryTypeFilter}
                        onChange={e => { setDiscoveryTypeFilter(e.target.value); setDiscoveryPage(1); }}
                        style={{ padding: '7px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, fontSize: 12, color: discoveryTypeFilter ? 'var(--ink)' : 'var(--muted)', outline: 'none', flexShrink: 0 }}
                      >
                        <option value="">All Types</option>
                        <option value="SLACK">Slack</option>
                        <option value="JIRA">Jira</option>
                        <option value="GITHUB">GitHub</option>
                      </select>
                    </div>

                    <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                      {(() => {
                        const allFound = [
                          ...discoveryResults.slack.map((x: any) => ({ ...x, type: 'SLACK', key: `SLACK:${x.id}`, identifier: x.id })),
                          ...discoveryResults.jira.map((x: any) => ({ ...x, type: 'JIRA', key: `JIRA:${x.key}`, identifier: x.key })),
                          ...discoveryResults.github.map((x: any) => ({ ...x, type: 'GITHUB', key: `GITHUB:${x.full_name}`, identifier: x.full_name })),
                        ].filter(item =>
                          (!discoverySearch || (item.name || item.full_name || item.key || '').toLowerCase().includes(discoverySearch.toLowerCase())) &&
                          (!discoveryTypeFilter || item.type === discoveryTypeFilter)
                        );
                        
                        return (
                          <>
                            <Table
                              headers={['', 'Source Name', 'Type', 'Architectural Layer', 'Actions']}
                              rows={paginate(allFound, discoveryPage, 10).map((item: any) => [
                                <input 
                                  key="chk" 
                                  type="checkbox" 
                                  checked={!!selectedToSync[item.key]} 
                                  onChange={() => setSelectedToSync(prev => ({ ...prev, [item.key]: !prev[item.key] }))} 
                                  style={{ width: 15, height: 15, accentColor: 'var(--primary)', cursor: 'pointer' }}
                                />,
                                <span key="n" style={{ fontSize: 13, fontWeight: 500 }}>{item.name || item.full_name || item.key}</span>,
                                <Badge key="t" variant={item.type.toLowerCase() === 'slack' ? 'slack' : item.type.toLowerCase() === 'jira' ? 'jira' : 'info'}>{item.type}</Badge>,
                                <select 
                                  key="l" 
                                  value={discoveredGuesses[item.key]} 
                                  onChange={e => setDiscoveredGuesses(prev => ({ ...prev, [item.key]: e.target.value }))} 
                                  style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border-2)', fontSize: 12, color: 'var(--ink)', outline: 'none' }}
                                >
                                  <option value="docs">Docs / General</option>
                                  <option value="backend">Backend Logic</option>
                                  <option value="web">Web Frontend</option>
                                  <option value="mobile">Mobile App</option>
                                  <option value="infrastructure">Infrastructure</option>
                                  <option value="ai">AI / Models</option>
                                  <option value="blockchain">Blockchain</option>
                                  <option value="lambda">Lambda Functions</option>
                                  <option value="crawler">Crawler Code</option>
                                  <option value="database">Database / Schema</option>
                                  <option value="qa">Quality Assurance</option>
                                  <option value="security">Security & Compliance</option>
                                  <option value="shared">Shared / Utilities</option>
                                </select>,
                                <Button 
                                  key="s" 
                                  variant="primary" 
                                  size="sm" 
                                  onClick={() => handleSaveDiscoveredSource(item.name || item.id, item.type, item.identifier, item.name)}
                                  disabled={isSyncingSources}
                                >
                                  {isSyncingSources ? <IconRefresh size={12} className="animate-spin" /> : 'Save'}
                                </Button>
                              ])}
                            />
                            {allFound.length === 0 && (
                              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>
                                No sources match your filter.
                              </div>
                            )}
                            <Paginator page={discoveryPage} setPage={setDiscoveryPage} total={totalPages(allFound, 10)} />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* ── Add Workspace Form (toggled) ── */}
                {showAddWs && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 20, marginTop: 16 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 18 }}>Add Workspace Manually</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 20, alignItems: 'end' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>Source Type *</label>
                        <select
                          value={newWsType} onChange={e => setNewWsType(e.target.value)}
                          style={{ width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, outline: 'none' }}
                        >
                          <option value="SLACK">Slack</option>
                          <option value="JIRA">Jira</option>
                          <option value="GITHUB">GitHub</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>
                          {newWsType === 'SLACK' ? 'Slack Channel ID' : newWsType === 'JIRA' ? 'Jira Project Name' : newWsType === 'GITHUB' ? 'GitHub Repo (owner/repo)' : 'Identifier'} *
                        </label>
                        <input
                          value={newWsId}
                          onChange={e => {
                            setNewWsId(e.target.value);
                            setNewWsLayer(guessLayer(e.target.value, newWsType));
                          }}
                          placeholder={newWsType === 'SLACK' ? 'C06UUU6THEV' : newWsType === 'JIRA' ? 'My Project Name' : newWsType === 'GITHUB' ? 'must-company/backend' : 'identifier'}
                          style={{ width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>Token Budget / day</label>
                        <input
                          value={newWsBudget} onChange={e => setNewWsBudget(e.target.value)}
                          placeholder="10000"
                          style={{ width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 7 }}>Architectural Layer Choice</label>
                        <select
                          value={newWsLayer} onChange={e => setNewWsLayer(e.target.value)}
                          style={{ width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, outline: 'none' }}
                        >
                          <option value="docs">Docs / General</option>
                          <option value="backend">Backend Logic</option>
                          <option value="web">Web Frontend</option>
                          <option value="mobile">Mobile App</option>
                          <option value="infrastructure">Infrastructure</option>
                          <option value="ai">AI / Models</option>
                          <option value="blockchain">Blockchain</option>
                          <option value="lambda">Lambda Functions</option>
                          <option value="crawler">Crawler Code</option>
                          <option value="database">Database / Schema</option>
                          <option value="qa">Quality Assurance</option>
                          <option value="security">Security & Compliance</option>
                          <option value="shared">Shared / Utilities</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                      <Button variant="primary" onClick={handleAddWorkspace} disabled={isSyncingSources}>
                        {isSyncingSources ? 'Saving...' : 'Save Workspace'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Tabbed filter + Search */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['ALL', 'SLACK', 'JIRA', 'GITHUB'].map(t => (
                      <div key={t} onClick={() => setActiveWsTab(t)} style={{
                        padding: '8px 14px', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                        color: activeWsTab === t ? 'var(--primary)' : 'var(--muted)',
                        cursor: 'pointer', borderBottom: `2px solid ${activeWsTab === t ? 'var(--primary)' : 'transparent'}`,
                        transition: 'all 0.2s', textTransform: 'uppercase'
                      }}>{t}</div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 6 }}>
                    <div style={{ position: 'relative' }}>
                      <IconSearch size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', opacity: 0.5 }} />
                      <input 
                        type="text"
                        placeholder="Filter identifiers..."
                        value={workspaceSearch}
                        onChange={(e) => {
                          setWorkspaceSearch(e.target.value);
                          setWorkspacesPage(1); // Reset to first page on search
                        }}
                        style={{ padding: '6px 12px 6px 32px', fontSize: 12, background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', width: 220, outline: 'none' }}
                      />
                      {workspaceSearch && (
                        <button onClick={() => setWorkspaceSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
                          <IconX size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {(() => {
                  const filteredWorkspaces = (groupedWorkspaces[activeWsTab] || []).filter((d: any) => 
                    !workspaceSearch || 
                    d.identifier?.toLowerCase().includes(workspaceSearch.toLowerCase()) ||
                    d.id?.toLowerCase().includes(workspaceSearch.toLowerCase())
                  );

                  if (sectionLoading) {
                    return (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: 48, width: '100%' }}>
                        <Spinner size={32} />
                      </div>
                    );
                  }

                  if (filteredWorkspaces.length === 0) {
                    return (
                      <div style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: 24 }}>
                        {workspaceSearch ? 'No matches found.' : `No ${activeWsTab.toLowerCase()} integration sources found. Use "Sync Global Sources" to auto-discover, or "+ Add Workspace" to add manually.`}
                      </div>
                    );
                  }

                  return (
                    <>
                      <Table headers={['Identifier', 'Layer', 'Type', 'Chunks', 'Token Budget', 'Actions']} rows={
                        paginate(filteredWorkspaces, workspacesPage).map((d: any) => [
                          <span key="n" style={{ color: 'var(--primary)', fontWeight: 500, fontFamily: 'monospace' }}>{d.identifier || d.id}</span>,
                          <Badge key="l" variant="info" style={{ textTransform: 'uppercase', fontSize: 10, opacity: 0.8 }}>{d.layer || 'docs'}</Badge>,
                          <Badge key="t" variant="info">{d.type}</Badge>,
                          <span key="c" style={{ fontFamily: 'monospace' }}>{d.chunkCount?.toLocaleString() ?? 0}</span>,
                          <span key="b" style={{ color: 'var(--muted)' }}>{d.tokenBudget?.toLocaleString() ?? '—'}/day</span>,
                          <div key="a" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {/* View */}
                            <button onClick={() => setViewWs(d)} title="View" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#4f46e5', display: 'flex' }}>
                              <IconEye size={17} />
                            </button>
                            {/* Edit budget & layer */}
                            <button onClick={() => setEditWs(d)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#d97706', display: 'flex' }}>
                              <IconEdit size={17} />
                            </button>
                            {/* Copy ID */}
                            <button onClick={() => { navigator.clipboard?.writeText(d.identifier || d.identifier || d.id); showToast('Integration ID copied!'); }} title="Copy" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#16a34a', display: 'flex' }}>
                              <IconCopy size={17} />
                            </button>
                            {/* Delete */}
                            {user?.role === 'ADMIN' && (
                              <button onClick={() => {
                                setConfirmCfg({
                                  open: true,
                                  title: 'Remove Integration',
                                  message: `Are you sure you want to remove this integration? This cannot be undone.`,
                                  variant: 'danger',
                                  isLoading: false,
                                  onConfirm: async () => {
                                    setConfirmCfg(prev => ({ ...prev, isLoading: true }));
                                    try {
                                      await deleteWorkspace(d.id);
                                      setGroupedWorkspaces(prev => {
                                        const updated = { ...prev };
                                        Object.keys(updated).forEach(k => { updated[k] = updated[k].filter((x: any) => x.id !== d.id); });
                                        return updated;
                                      });
                                      showToast('Integration removed');
                                    } catch { showToast('Delete failed'); }
                                    setConfirmCfg(prev => ({ ...prev, open: false, isLoading: false }));
                                  }
                                });
                              }} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#ef4444', display: 'flex' }}>
                                <IconTrash size={17} />
                              </button>
                            )}
                          </div>,
                        ])
                      } />
                      <Paginator page={workspacesPage} setPage={setWorkspacesPage} total={totalPages(filteredWorkspaces)} />
                    </>
                  );
                })()}
              </div>

            </div>
          ))}

          {/* ── LLM & RAG SETTINGS ── */}
          {section === 'llm' && (sectionLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 80, width: '100%' }}>
              <Spinner size={32} />
            </div>
          ) : (user?.role !== 'ADMIN' ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              <h3>Access Restricted</h3>
              <p>You do not have permission to manage LLM & RAG settings.</p>
            </div>
          ) : (
            <LLMSettingsSection
              ragEnabled={ragEnabled}
              setRagEnabled={setRagEnabled}
              agenticReasoningEnabled={agenticReasoningEnabled}
              setAgenticReasoningEnabled={setAgenticReasoningEnabled}
              topKRef={topKRef}
              llmSettings={llmSettings}
              setLlmSettings={setLlmSettings}
              llmMeta={llmMeta}
              llmSaving={llmSaving}
              handleSaveLLM={handleSaveLLM}
              activeProvider={activeProvider}
              setActiveProvider={setActiveProvider}
              onAddKeyClick={setAddingKeyForProvider}
              visibleKeys={visibleKeys}
              toggleKey={toggleKey}
              handleActivateKey={handleActivateKey}
              handleDeleteKey={handleDeleteKey}
            />
          )))}


          {/* ── TOKENS ── */}
          {section === 'tokens' && (sectionLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 80, width: '100%' }}>
              <Spinner size={32} />
            </div>
          ) : (
            <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
              <StatCard label="Total Today" value="841K" delta="18% vs yesterday" accent="var(--primary)" icon={<IconTokens />} />
              <StatCard label="Est. Cost Today" value="$4.20" delta="$0.60 vs yesterday" accent="var(--amber)" icon={<IconDollar />} />
              <StatCard label="Cache Hit Rate" value="34%" delta="Saved ~285K tokens" accent="var(--green)" icon={<IconZap />} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              <Panel title="Daily Token Usage (7 days)">
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80, paddingBottom: 4 }}>
                  {[40, 55, 48, 70, 60, 30, 65].map((h, i) => (
                    <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '3px 3px 0 0', background: i === 6 ? 'linear-gradient(to top,var(--amber),rgba(255,183,64,0.3))' : 'linear-gradient(to top,var(--primary),rgba(var(--primary-rgb),0.3))', border: i === 6 ? '1px solid var(--amber)' : 'none', cursor: 'pointer' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'].map((d, i) => (
                    <span key={d} style={{ fontSize: 9.5, color: i === 6 ? 'var(--amber)' : 'var(--muted)', fontFamily: 'monospace' }}>{d}</span>
                  ))}
                </div>
              </Panel>
              <Panel title="Top Users Today">
                {(() => {
                  const users = tokenData?.topUsers || [];
                  if (users.length === 0) {
                    return (
                      [['alice', 65, '55.2K'], ['bob', 48, '40.7K'], ['charlie', 30, '25.4K'], ['diana', 22, '18.6K'], ['john', 5, '4.0K']].map(([name, pct, count]) => (
                        <DeptBar key={name as string} label={name as string} pct={pct as number} count={count as string} color="var(--primary)" />
                      ))
                    );
                  }
                  const max = Math.max(...users.map((u: any) => u.tokens), 1);
                  return (
                    <>
                      {paginate(users, topUsersPage, 10).map((u: any) => (
                        <DeptBar
                          key={u.name}
                          label={u.name}
                          pct={Math.round((u.tokens / max) * 100)}
                          count={(u.tokens / 1000).toFixed(1) + 'K'}
                          color="var(--primary)"
                        />
                      ))}
                      <Paginator page={topUsersPage} setPage={setTopUsersPage} total={totalPages(users, 10)} />
                    </>
                  );
                })()}
              </Panel>
            </div>
          </>))}

          {/* ── AUDIT ── */}
          {section === 'audit' && (
            <Panel title="Audit Log">
              {sectionLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 48, width: '100%' }}>
                  <Spinner size={32} />
                </div>
              ) :
                auditData.length === 0 ?
                  <div style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: 24 }}>No audit events yet. Chat queries and admin actions will appear here.</div> :
                  <>
                    <Table headers={['Time', 'User', 'Action', 'Workspace', 'Tokens']} rows={
                      paginate(auditData, auditPage).map((a: any) => [
                        <span key="t" style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)' }}>{new Date(a.createdAt).toLocaleTimeString()}</span>,
                        a.user?.name ?? 'System',
                        a.action,
                        <span key="w" style={{ color: 'var(--muted)' }}>—</span>,
                        a.tokensUsed ? <span key="tok" style={{ fontFamily: 'monospace' }}>{a.tokensUsed.toLocaleString()}</span> : <span style={{ color: 'var(--muted)' }}>—</span>,
                      ])
                    } />
                    <Paginator page={auditPage} setPage={setAuditPage} total={totalPages(auditData)} />
                   </>
               }
            </Panel>
          )}

          {/* ── PROFILE ── */}
          {section === 'profile' && <ProfileSection onBack={() => setSection('overview')} />}
          {section === 'docs' && (sectionLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 80, width: '100%' }}>
              <Spinner size={32} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', animation: 'fade-in 0.4s ease' }}>
              <div style={{ padding: '0 32px 24px', borderBottom: '1px solid var(--border)', marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ padding: 8, background: 'var(--primary-dim)', borderRadius: 8 }}>
                    <IconKnowledge size={20} color="var(--primary)" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: 24, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Internal Documentation</h2>
                    <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>System architecture, guides, and engineering handbooks</p>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '0 32px 32px', gap: 32 }}>
                {/* Sidebar Navigation */}
                <div style={{ 
                  width: 280, 
                  flexShrink: 0, 
                  padding: '12px 8px', 
                  background: 'var(--surface)', 
                  borderRadius: 16, 
                  border: '1px solid var(--border)', 
                  overflow: 'auto',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ padding: '0 12px 12px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Available Guides
                  </div>
                  {adminDocs.map(doc => (
                    <div 
                      key={doc.filename}
                      onClick={() => handleSelectDoc(doc.filename)}
                      style={{ 
                        padding: '12px 16px', 
                        borderRadius: 12, 
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: selectedDoc === doc.filename ? 600 : 500,
                        background: selectedDoc === doc.filename ? 'var(--primary-dim)' : 'transparent',
                        color: selectedDoc === doc.filename ? 'var(--primary)' : 'var(--ink)',
                        marginBottom: 4,
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10
                      }}
                      className={selectedDoc === doc.filename ? '' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'}
                    >
                      <div style={{ 
                        width: 6, 
                        height: 6, 
                        borderRadius: '50%', 
                        background: selectedDoc === doc.filename ? 'var(--primary)' : 'var(--border-2)',
                        transition: 'all 0.2s ease'
                      }} />
                      {doc.name}
                    </div>
                  ))}
                </div>

                {/* Content Area */}
                <div style={{ 
                  flex: 1, 
                  background: 'var(--bg)', 
                  borderRadius: 20, 
                  border: '1px solid var(--border)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  overflow: 'hidden',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                }}>
                  {isDocLoading ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
                      <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--primary-dim)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} />
                      <span style={{ fontSize: 14, color: 'var(--muted)', fontWeight: 500 }}>Fetching document...</span>
                    </div>
                  ) : selectedDoc ? (
                    <div style={{ flex: 1, overflow: 'auto', padding: '48px 64px' }} className="markdown-body custom-markdown">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            if (match && match[1] === 'mermaid') {
                              return <Mermaid chart={String(children).replace(/\n$/, '')} />;
                            }
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                className="rounded-lg my-6 shadow-sm border border-white/5"
                                customStyle={{ background: '#0d1117', padding: '24px', fontSize: '13px' }}
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className={className} style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: 4, fontSize: '0.9em' }} {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {docContent}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20, opacity: 0.4 }}>
                      <div style={{ padding: 24, borderRadius: '50%', background: 'var(--surface)' }}>
                        <IconKnowledge size={64} color="var(--ink-muted)" />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Select a Technical Guide</h3>
                        <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>Pick a document from the left to start reading</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {section === 'knowledge' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconKnowledge size={22} /> Knowledge Base Ingestion
              </h2>

              {/* Upload Card */}
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 16, marginTop: 0 }}>Upload Document</h3>

                {/* Drag & Drop Zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setIsDragging(false);
                    const dropped = e.dataTransfer.files[0];
                    if (dropped) setUploadFile(dropped);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 12,
                    padding: '32px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: isDragging ? 'var(--primary-dim)' : 'var(--bg)',
                    transition: 'all 0.15s ease',
                    marginBottom: 16,
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,.md,.zip"
                    style={{ display: 'none' }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) setUploadFile(f); }}
                  />
                  <div style={{ fontSize: 32, marginBottom: 8, display: 'flex', justifyContent: 'center', opacity: 0.5 }}>
                    <IconAudit size={48} />
                  </div>
                  {uploadFile ? (
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{uploadFile.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                        {(uploadFile.size / 1024 / 1024).toFixed(2)} MB — Click to change
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>Drag & drop a file here</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>PDF, DOCX, TXT, MD, ZIP — max 20MB</div>
                    </div>
                  )}
                </div>

                {/* Workspace selector + Upload button */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={{ fontSize: 12, color: 'var(--ink-muted)', display: 'block', marginBottom: 6 }}>Target Team</label>
                    <select
                      value={uploadTeamId}
                      onChange={e => {
                        setUploadTeamId(e.target.value);
                        if (e.target.value === 'all') {
                          setUploadWorkspace('vault-v2');
                        } else {
                          const firstWs = groupedWorkspaces.ALL.find(w => w.teamIds?.includes(e.target.value));
                          if (firstWs) setUploadWorkspace(firstWs.identifier || firstWs.id);
                        }
                      }}
                      style={{
                        width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '8px 12px', color: 'var(--ink)', fontSize: 14, outline: 'none'
                      }}
                    >
                      <option value="all">General (Global)</option>
                      {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  {uploadTeamId !== 'all' && (
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <label style={{ fontSize: 12, color: 'var(--ink-muted)', display: 'block', marginBottom: 6 }}>Team Workspace</label>
                      <select
                        value={uploadWorkspace}
                        onChange={e => setUploadWorkspace(e.target.value)}
                        style={{
                          width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                          borderRadius: 8, padding: '8px 12px', color: 'var(--ink)', fontSize: 14, outline: 'none'
                        }}
                      >
                        {groupedWorkspaces.ALL.filter(w => w.teamIds?.includes(uploadTeamId)).map((ws: any) => (
                          <option key={ws.id} value={ws.identifier ?? ws.id}>{ws.identifier ?? ws.id} ({ws.type})</option>
                        ))}
                        {groupedWorkspaces.ALL.filter(w => w.teamIds?.includes(uploadTeamId)).length === 0 && (
                          <option disabled>No workspaces for this team</option>
                        )}
                      </select>
                    </div>
                  )}

                  <button
                    disabled={!uploadFile || isUploading}
                    onClick={async () => {
                      if (!uploadFile) return;
                      setIsUploading(true);
                      setUploadResult(null);
                      try {
                        const result = await uploadDocument(uploadFile, uploadWorkspace);

                        // Handle silent failures where DB returned 0 chunks or status 'error'
                        if (result.status === 'error' || (result.chunksStored === 0 && !result.zipUpload)) {
                          showNotification('error', 'Ingestion Failed', 'The document was processed, but no information could be extracted. Please check the file format.', result.error);
                          setUploadResult(null);
                        } else {
                          setUploadResult(result);
                          showNotification('success', 'Knowledge Base Updated!',
                            `Incredible! Your document "${result.source}" has been successfully indexed into "${result.workspace}". These new insights (all ${result.chunksStored} chunks) are now ready to power your AI conversations! ✨`);
                        }

                        setUploadFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';

                        // Refresh ingestion log
                        const d = await getIngestionEvents({ page: 1, size: 20 });
                        setIngestionData(d?.data ?? []);
                        setIngestionMeta(d?.meta ?? null);
                        setIngestionPage(1);
                      } catch (err: any) {
                        const msg = err?.response?.data?.message || err.message;
                        if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
                          showNotification('error', 'Quota Reached!',
                            "Your AI provider's current limit has been reached. Please take a small breather and try again in a few minutes. We're almost there! ⏳", msg);
                        } else {
                          showNotification('error', 'Upload Error', `Something went wrong: ${msg}. Don't worry, we're on it! Please try again. 🛠️`, msg);
                        }
                        setUploadFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      } finally {
                        setIsUploading(false);
                      }
                    }}
                    style={{
                      background: (!uploadFile || isUploading) ? 'var(--border)' : 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      padding: '10px 24px',
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: (!uploadFile || isUploading) ? 'not-allowed' : 'pointer',
                      transition: 'background 0.15s',
                      whiteSpace: 'nowrap',
                      alignSelf: 'flex-end',
                    }}
                  >
                    {isUploading ? '⏳ Ingesting…' : '⬆ Upload & Ingest'}
                  </button>
                </div>

                {/* Success result */}
                {uploadResult && (
                  <div style={{
                    marginTop: 16,
                    background: 'var(--green-dim, rgba(22,163,74,0.08))',
                    border: '1px solid var(--green)',
                    borderRadius: 8,
                    padding: '10px 16px',
                    fontSize: 13,
                    color: 'var(--green)',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                  }}>
                    <span>✅</span>
                    <span><strong>{uploadResult.chunksStored}</strong> chunks stored from <strong>{uploadResult.source}</strong> into workspace <strong>{uploadResult.workspace}</strong></span>
                  </div>
                )}
              </div>

              {/* ── ON-DEMAND BULK INGESTION ── */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>On-Demand Ingestion</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Manually trigger a deep-sync for specific teams or individual workspaces.</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
                  {/* Team Selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Target Team</label>
                    <select
                      value={ingestTeamId}
                      onChange={e => {
                        setIngestTeamId(e.target.value);
                        setIngestWsIds([]); // Reset specific selection when team changes
                      }}
                      style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 14, outline: 'none' }}
                    >
                      {teams.length === 0 && <option disabled>No teams available</option>}
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  {/* Date Range Selector */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>From</label>
                      <input
                        type="date"
                        value={ingestStartDate}
                        onChange={e => setIngestStartDate(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, outline: 'none' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>To</label>
                      <input
                        type="date"
                        value={ingestEndDate}
                        onChange={e => setIngestEndDate(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, outline: 'none' }}
                      />
                    </div>
                  </div>

                  {/* Workspace Multi-Selector */}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Specific Workspaces (Optional)</label>
                    <div style={{ position: 'relative', marginBottom: 8 }}>
                      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none' }}>
                        <IconSearch size={14} color="var(--ink)" />
                      </span>
                      <input
                        value={ingestSearch}
                        onChange={e => setIngestSearch(e.target.value)}
                        placeholder="Filter workspaces..."
                        style={{ width: '100%', padding: '8px 12px 8px 32px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                      />
                      {ingestSearch && (
                        <button onClick={() => setIngestSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, color: 'var(--ink)', display: 'flex' }}>
                          <IconX size={12} />
                        </button>
                      )}
                    </div>
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, maxHeight: 120, overflowY: 'auto', padding: 8 }}>
                      {(() => {
                        const filtered = groupedWorkspaces.ALL.filter(w =>
                          w.teamIds?.includes(ingestTeamId) &&
                          (w.identifier?.toLowerCase().includes(ingestSearch.toLowerCase()) || w.type?.toLowerCase().includes(ingestSearch.toLowerCase()))
                        );
                        if (filtered.length === 0) {
                          return <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '12px 0' }}>{ingestSearch ? 'No matches' : 'No workspaces found'}</div>;
                        }
                        return filtered.map(w => (
                          <label key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px', fontSize: 13, color: 'var(--ink)', cursor: 'pointer', borderRadius: 4 }} className="hover-bg">
                            <input
                              type="checkbox"
                              checked={ingestWsIds.includes(w.id)}
                              onChange={() => setIngestWsIds(prev => prev.includes(w.id) ? prev.filter(id => id !== w.id) : [...prev, w.id])}
                              style={{ accentColor: 'var(--primary)' }}
                            />
                            <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{w.identifier}</span>
                            <Badge variant="info">{w.type}</Badge>
                          </label>
                        ));
                      })()}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>If none selected, all workspaces for the team will be ingested.</div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {ingestWsIds.length > 0 ? `${ingestWsIds.length} workspaces selected` : 'Full sync selected'}
                  </div>
                  <Button
                    variant="primary"
                    isLoading={isIngesting}
                    onClick={handleBulkIngestRequest}
                  >
                    {isIngesting ? '⚙ Syncing...' : '🚀 Start Targeted Sync'}
                  </Button>
                </div>
              </div>


              {/* Ingestion Event Log */}
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Ingestion History</h3>
                    <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>{ingestionMeta?.total ?? 0} total events</span>
                  </div>

                  {/* Filters */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <select
                      value={ingestFilterType}
                      onChange={e => { setIngestFilterType(e.target.value); setIngestionPage(1); }}
                      style={{ padding: '6px 10px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 6, color: 'var(--ink)', fontSize: 12, outline: 'none' }}
                    >
                      <option value="">All Types</option>
                      <option value="slack">Slack</option>
                      <option value="jira">Jira</option>
                      <option value="confluence">Confluence</option>
                      <option value="file">File Upload</option>
                      <option value="repo">Repository</option>
                    </select>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="date"
                        value={ingestFilterStart}
                        onChange={e => { setIngestFilterStart(e.target.value); setIngestionPage(1); }}
                        style={{ padding: '5px 8px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 6, color: 'var(--ink)', fontSize: 11, outline: 'none' }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>to</span>
                      <input
                        type="date"
                        value={ingestFilterEnd}
                        onChange={e => { setIngestFilterEnd(e.target.value); setIngestionPage(1); }}
                        style={{ padding: '5px 8px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 6, color: 'var(--ink)', fontSize: 11, outline: 'none' }}
                      />
                    </div>
                    {(ingestFilterType || ingestFilterStart || ingestFilterEnd) && (
                      <button
                        onClick={() => { setIngestFilterType(''); setIngestFilterStart(''); setIngestFilterEnd(''); setIngestionPage(1); }}
                        style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                {ingestionData.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-muted)', fontSize: 14 }}>
                    No documents ingested yet. Upload a file above to get started.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg)' }}>
                        {['Source', 'Workspace', 'Type', 'Chunks', 'Status', 'Date'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--ink-muted)', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ingestionData.map((ev: any, i: number) => (
                        <tr key={ev.id ?? i} style={{ borderTop: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 16px', color: 'var(--ink)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ev.sourceId}
                          </td>
                          <td style={{ padding: '10px 16px', color: 'var(--ink-muted)' }}>{ev.workspace}</td>
                          <td style={{ padding: '10px 16px', color: 'var(--ink-muted)', textTransform: 'uppercase', fontSize: 11 }}>{ev.sourceType}</td>
                          <td style={{ padding: '10px 16px', color: 'var(--ink)', fontWeight: 600 }}>{ev.chunksStored ?? '—'}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600,
                              background: ev.status === 'stored' ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
                              color: ev.status === 'stored' ? 'var(--green)' : 'var(--red)',
                            }}>
                              {ev.status === 'stored' ? '✅ Stored' : '❌ Error'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 16px', color: 'var(--ink-muted)', whiteSpace: 'nowrap' }}>
                            {ev.createdAt ? new Date(ev.createdAt).toLocaleString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {ingestionMeta && ingestionMeta.pages > 1 && (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                    <Paginator
                      page={ingestionPage}
                      total={ingestionMeta.pages}
                      setPage={(p) => {
                        setIngestionPage(p);
                        getIngestionEvents({
                          page: p,
                          size: 20,
                          type: ingestFilterType || undefined,
                          startDate: ingestFilterStart || undefined,
                          endDate: ingestFilterEnd || undefined
                        }).then(d => {
                          setIngestionData(d?.data ?? []);
                          setIngestionMeta(d?.meta ?? null);
                        });
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── SETTINGS ── */}
          {section === 'settings' && (sectionLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 80, width: '100%' }}>
              <Spinner size={32} />
            </div>
          ) : (user?.role !== 'ADMIN' ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              <h3>Access Restricted</h3>
              <p>You do not have permission to manage global system settings.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

              {/* ── Left: Settings Groups ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Performance Group */}
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16 }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
                    <IconZap size={18} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Performance</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Speed and caching configuration</div>
                    </div>
                  </div>
                  {[
                    { key: 'cache', icon: <IconKnowledge size={16} />, label: 'Response Caching', desc: SYSTEM_SETTINGS_DESCRIPTIONS.RESPONSE_CACHING },
                  ].map(({ key, icon, label, desc }) => (
                    <div
                      key={key}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(var(--primary-rgb),0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{label}</div>
                            <InfoTooltip title={label} desc={desc} />
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{desc}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        {systemSettings[key as keyof typeof systemSettings] && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', background: 'rgba(var(--primary-rgb),0.1)', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.05em' }}>ACTIVE</span>}
                        <Toggle on={Boolean(systemSettings[key as keyof typeof systemSettings])} onToggle={() => setSystemSettings(t => ({ ...t, [key]: !t[key as keyof typeof t] }))} />
                      </div>
                    </div>
                  ))}
                  
                  {/* TTL Configuration */}
                  <div style={{ padding: '20px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, background: 'rgba(var(--primary-rgb), 0.01)' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>L1 Cache TTL (ms)</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 10 }}>In-memory duration (local process)</div>
                      <input
                        type="number"
                        value={llmSettings?.cacheL1Ttl ?? 60000}
                        onChange={e => setLlmSettings({ ...llmSettings, cacheL1Ttl: parseInt(e.target.value) })}
                        style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, outline: 'none' }}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>L2 Cache TTL (seconds)</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 10 }}>Shared Redis duration (cross-instance)</div>
                      <input
                        type="number"
                        value={llmSettings?.cacheL2Ttl ?? 600}
                        onChange={e => setLlmSettings({ ...llmSettings, cacheL2Ttl: parseInt(e.target.value) })}
                        style={{ width: '100%', padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 13, outline: 'none' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Security & Compliance Group */}
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16 }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
                    <IconAudit size={18} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Security & Compliance</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Logging, approval, and audit controls</div>
                    </div>
                  </div>
                  {[
                    { key: 'audit', icon: <IconAudit size={16} />, label: 'Audit Logging', desc: SYSTEM_SETTINGS_DESCRIPTIONS.AUDIT_LOGGING },
                    { key: 'piiMasking', icon: <IconEye size={16} />, label: 'PII Masking', desc: SYSTEM_SETTINGS_DESCRIPTIONS.PII_MASKING },
                  ].map(({ key, icon, label, desc }, i, arr) => (
                    <div
                      key={key}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{label}</div>
                            <InfoTooltip title={label} desc={desc} />
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{desc}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                        {systemSettings[key as keyof typeof systemSettings] && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', background: 'rgba(var(--primary-rgb),0.1)', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.05em' }}>ACTIVE</span>}
                        <Toggle on={Boolean(systemSettings[key as keyof typeof systemSettings])} onToggle={() => setSystemSettings(t => ({ ...t, [key]: !t[key as keyof typeof t] }))} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Resource Limits Group */}
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16 }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
                    <IconTokens size={18} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Resource Limits</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>Global API token usage restrictions</div>
                    </div>
                  </div>
                  
                  {/* Global Daily Token Cap */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'rgba(245,158,11,1)' }}><IconDollar size={16} /></div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Global Daily Token Cap</div>
                          <InfoTooltip title="Global Daily Token Cap" desc={SYSTEM_SETTINGS_DESCRIPTIONS.GLOBAL_DAILY_TOKEN_CAP} />
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Total maximum tokens across all users per day</div>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <input
                        type="number"
                        value={systemSettings.globalDailyTokenCap}
                        onChange={(e) => setSystemSettings(t => ({ ...t, globalDailyTokenCap: parseInt(e.target.value) || 0 }))}
                        style={{ width: 120, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 14 }}
                      />
                    </div>
                  </div>

                  {/* Base User Token Budget */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'rgba(245,158,11,1)' }}><IconUsers size={16} /></div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Base User Daily Budget</div>
                          <InfoTooltip title="Base User Daily Budget" desc={SYSTEM_SETTINGS_DESCRIPTIONS.BASE_USER_DAILY_BUDGET} />
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Default daily prompt limit for new users</div>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <input
                        type="number"
                        value={systemSettings.baseUserDailyTokenLimit}
                        onChange={(e) => setSystemSettings(t => ({ ...t, baseUserDailyTokenLimit: parseInt(e.target.value) || 0 }))}
                        style={{ width: 120, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 14 }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  <Button
                    variant="primary"
                    isLoading={isSavingSystem}
                    onClick={async () => {
                      setIsSavingSystem(true);
                      try {
                        // 1. Save system settings (caching toggle, etc.)
                        await saveSystemSettings(systemSettings);
                        
                        // 2. Save LLM settings (L1/L2 TTLs are moved here)
                        // We use silentSave = true to avoid unnecessary UI flickers
                        if (llmSettings) {
                          await handleSaveLLM(undefined, undefined, undefined, undefined, true);
                        }
                        
                        setNotification({ 
                          title: 'Settings Saved', 
                          message: 'Both system and performance configurations have been updated.', 
                          type: 'success' 
                        });
                      } catch (err) {
                        setNotification({ title: 'Error', message: 'Failed to save settings.', type: 'error' });
                        console.error('Save settings failure:', err);
                      } finally {
                        setIsSavingSystem(false);
                      }
                    }}
                  >
                    Save System Settings
                  </Button>
                </div>
              </div>

              {/* ── Right: Summary Panel ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 80 }}>

                {/* System Health Card */}
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>System Health</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Live configuration status</div>
                  </div>
                  <div style={{ padding: '8px 0' }}>
                    {[
                      { label: 'Response Caching', on: systemSettings.cache },
                      { label: 'Audit Logging', on: systemSettings.audit },
                      { label: 'PII Masking', on: systemSettings.piiMasking },
                    ].map(({ label, on }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px' }}>
                        <span style={{ fontSize: 13, color: 'var(--ink)' }}>{label}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                          color: on ? 'var(--primary)' : 'var(--muted)',
                          background: on ? 'rgba(var(--primary-rgb),0.1)' : 'var(--surface)',
                          padding: '3px 10px', borderRadius: 20,
                          border: `1px solid ${on ? 'rgba(var(--primary-rgb),0.2)' : 'var(--border)'}`
                        }}>
                          {on ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
                      {[systemSettings.cache, systemSettings.audit, systemSettings.piiMasking].filter(Boolean).length} of 3 security features enabled
                    </div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 9999, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${([systemSettings.cache, systemSettings.audit, systemSettings.piiMasking].filter(Boolean).length / 3) * 100}%`,
                        background: 'var(--primary)',
                        borderRadius: 9999,
                        transition: 'width 0.4s ease'
                      }} />
                    </div>
                  </div>
                </div>

                {/* Tip card */}
                <div style={{ background: 'rgba(var(--primary-rgb),0.05)', border: '1px solid rgba(var(--primary-rgb),0.15)', borderRadius: 16, padding: '16px 20px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>💡</span> Tip
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                    Enable <strong style={{ color: 'var(--ink)' }}>Audit Logging</strong> alongside <strong style={{ color: 'var(--ink)' }}>PII Masking</strong> for a fully compliant and privacy-preserving knowledge workflow.
                  </div>
                </div>

              </div>
            </div>
          )))}
        </div>
      </main>

      {/* ── VIEW TEAM MODAL ── */}
      {viewTeam && (
        <ViewTeamModal
          viewTeam={viewTeam}
          onClose={() => setViewTeam(null)}
          onEditClick={() => {
            setEditTeam(viewTeam);
            setViewTeam(null);
          }}
        />
      )}

      {/* ── EDIT TEAM MODAL ── */}
      {editTeam && (
        <EditTeamModal
          editTeam={editTeam}
          availableWorkspaces={availableWorkspaces}
          onClose={() => setEditTeam(null)}
          showToast={showToast}
          onSuccess={(id, identifiers, status) => {
            setTeams(prev => prev.map(p => p.id === id ? { ...p, identifiers, status } : p));
          }}
        />
      )}
      {/* ── VIEW WORKSPACE MODAL ── */}
      {viewWs && (
        <ViewWorkspaceModal
          viewWs={viewWs}
          onClose={() => setViewWs(null)}
          onEditClick={() => {
            setEditWs(viewWs);
            setViewWs(null);
          }}
        />
      )}

      {/* ── EDIT WORKSPACE MODAL ── */}
      {editWs && (
        <EditWorkspaceModal
          editWs={editWs}
          onClose={() => setEditWs(null)}
          showToast={showToast}
          onSuccess={(id, budget, layer) => {
            setGroupedWorkspaces(prev => {
              const updated = { ...prev };
              Object.keys(updated).forEach(k => {
                updated[k] = updated[k].map((x: any) => x.id === id ? { ...x, tokenBudget: budget, layer } : x);
              });
              return updated;
            });
          }}
        />
      )}
      {/* ── NEW TEAM MODAL ── */}
      {showModal && (
        <CreateTeamModal
          onClose={() => setShowModal(false)}
          availableWorkspaces={availableWorkspaces}
          isDiscovering={isDiscovering}
          onDiscover={handleDiscover}
          showToast={showToast}
          onSuccess={refetchTeamsAndWorkspaces}
        />
      )}

      {/* ── INVITE USER MODAL ── */}
      {showInviteModal && (
        <InviteUserModal
          teams={teams}
          onClose={() => setShowInviteModal(false)}
          showToast={showToast}
          onSuccess={refetchUsers}
        />
      )}

      {/* ── ADD API KEY MODAL ── */}
      {addingKeyForProvider && (
        <AddApiKeyModal
          initialProvider={addingKeyForProvider}
          onClose={() => setAddingKeyForProvider(null)}
          onSave={handleSaveNewKey}
          showToast={showToast}
          isSaving={llmSaving}
        />
      )}

      {/* Notification Modal */}
      <NotificationModal 
        notification={notification} 
        onClose={() => setNotification(null)} 
      />

      <ConfirmModal
        isOpen={confirmCfg.open}
        title={confirmCfg.title}
        message={confirmCfg.message}
        variant={confirmCfg.variant}
        isLoading={confirmCfg.isLoading}
        onConfirm={confirmCfg.onConfirm}
        onCancel={() => setConfirmCfg(prev => ({ ...prev, open: false }))}
      />

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .custom-markdown {
          line-height: 1.8;
          font-size: 16px;
          color: var(--ink);
        }
        
        .custom-markdown h1 {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 24px;
          color: var(--ink);
          letter-spacing: -0.02em;
          border-bottom: 1px solid var(--border);
          padding-bottom: 16px;
        }

        .custom-markdown h2 {
          font-size: 24px;
          font-weight: 600;
          margin-top: 48px;
          margin-bottom: 16px;
          color: var(--ink);
          letter-spacing: -0.01em;
        }

        .custom-markdown h3 {
          font-size: 20px;
          font-weight: 600;
          margin-top: 32px;
          margin-bottom: 12px;
          color: var(--ink);
        }

        .custom-markdown p {
          margin-bottom: 20px;
          color: var(--ink-muted);
        }

        .custom-markdown ul, .custom-markdown ol {
          margin-bottom: 24px;
          padding-left: 24px;
        }

        .custom-markdown li {
          margin-bottom: 10px;
          color: var(--ink-muted);
        }

        .custom-markdown hr {
          border: 0;
          border-top: 1px solid var(--border);
          margin: 48px 0;
        }

        .custom-markdown blockquote {
          border-left: 4px solid var(--primary);
          background: var(--primary-dim);
          padding: 16px 24px;
          margin: 24px 0;
          border-radius: 0 8px 8px 0;
          font-style: italic;
          color: var(--ink);
        }

        .custom-markdown table {
          width: 100%;
          border-collapse: collapse;
          margin: 24px 0;
          font-size: 14px;
        }

        .custom-markdown th {
          background: var(--surface);
          text-align: left;
          padding: 12px 16px;
          border-bottom: 2px solid var(--border);
          font-weight: 600;
        }

        .custom-markdown td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
        }

        .custom-markdown img {
          max-width: 100%;
          border-radius: 12px;
          margin: 24px 0;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        }
      `}</style>
    </div>
  );
}
