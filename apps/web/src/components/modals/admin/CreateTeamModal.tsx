import React, { useState, useEffect, useRef } from 'react';
import { Button, Badge } from '@must-iq-web/components/ui';
import { IconX, IconChevronDown, IconSearch, IconRefresh } from '@must-iq-web/components/ui/MustIcons';
import { createTeam } from '@must-iq-web/lib/api/admin/teams';

interface CreateTeamModalProps {
  onClose: () => void;
  availableWorkspaces: any[];
  isDiscovering: boolean;
  onDiscover: () => void;
  showToast: (msg: string) => void;
  onSuccess: () => void;
}

export function CreateTeamModal({ onClose, availableWorkspaces, isDiscovering, onDiscover, showToast, onSuccess }: CreateTeamModalProps) {
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamOwner, setNewTeamOwner] = useState('');
  const [newTeamSlack, setNewTeamSlack] = useState<string[]>([]);
  const [newTeamJira, setNewTeamJira] = useState<string[]>([]);
  const [newTeamGithub, setNewTeamGithub] = useState<string[]>([]);

  const [newTeamSlackEnabled, setNewTeamSlackEnabled] = useState(false);
  const [newTeamJiraEnabled, setNewTeamJiraEnabled] = useState(false);
  const [newTeamGithubEnabled, setNewTeamGithubEnabled] = useState(false);

  const [openDropdown, setOpenDropdown] = useState<'slack' | 'jira' | 'github' | null>(null);
  const [slackSearch, setSlackSearch] = useState('');
  const [jiraSearch, setJiraSearch] = useState('');
  const [githubSearch, setGithubSearch] = useState('');

  const [isCreatingTeam, setIsCreatingTeam] = useState(false);

  // Refs for click-outside detection
  const slackRef = useRef<HTMLDivElement>(null);
  const jiraRef = useRef<HTMLDivElement>(null);
  const githubRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openDropdown === 'slack' && slackRef.current && !slackRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      } else if (openDropdown === 'jira' && jiraRef.current && !jiraRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      } else if (openDropdown === 'github' && githubRef.current && !githubRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  const guessLayer = (name: string, type: string) => {
    const n = name.toLowerCase();
    if (n.includes('backend') || n.includes('api') || n.includes('server') || n.includes('node') || n.includes('go-') || n.includes('eng-') || n.includes('dev-') || n.includes('worker') || n.includes('service')) return 'backend';
    if (n.includes('web') || n.includes('front') || n.includes('react') || n.includes('ui') || n.includes('dashboard') || n.includes('app-') || n.includes('design') || n.includes('ux-') || n.includes('landing') || n.includes('site') || n.includes('client')) return 'web';
    if (n.includes('mobile') || n.includes('ios') || n.includes('android') || n.includes('swift') || n.includes('kotlin') || n.includes('flutter') || n.includes('app') || n.includes('native')) return 'mobile';
    if (n.includes('infra') || n.includes('cloud') || n.includes('ops') || n.includes('devops') || n.includes('terraform') || n.includes('deploy') || n.includes('k8s') || n.includes('docker') || n.includes('aws') || n.includes('yaml')) return 'infrastructure';
    if (n.includes('ai-') || n.includes('llm') || n.includes('ml-') || n.includes('model') || n.includes('bot') || n.includes('gpt') || n.includes('embed') || n.includes('pytorch') || n.includes('tensorflow') || n.includes('training')) return 'ai';
    if (n.includes('blockchain') || n.includes('.sol') || n.includes('solidity') || n.includes('foundry') || n.includes('hardhat') || n.includes('smart-contract')) return 'blockchain';
    if (n.includes('lambda') || n.includes('serverless') || n.includes('cloud-function')) return 'lambda';
    if (n.includes('crawler') || n.includes('scraper') || n.includes('spider')) return 'crawler';
    if (n.includes('database') || n.includes('sql') || n.includes('postgres') || n.includes('mysql') || n.includes('mongodb') || n.includes('migration') || n.includes('schema') || n.includes('db')) return 'database';
    if (n.includes('qa') || n.includes('bug') || n.includes('test') || n.includes('e2e') || n.includes('playwright') || n.includes('cypress')) return 'qa';
    if (n.includes('security') || n.includes('audit') || n.includes('compliance') || n.includes('vault') || n.includes('policy')) return 'security';
    if (n.includes('shared') || n.includes('core') || n.includes('utils') || n.includes('lib') || n.includes('common')) return 'shared';
    if (n.includes('doc') || n.includes('wiki') || n.includes('general') || n.includes('handbook') || n.includes('report') || n.includes('analysis') || n.includes('spec')) return 'docs';

    return 'docs';
  };

  async function handleCreateTeam() {
    if (!newTeamName) return showToast('Team Name is required');
    setIsCreatingTeam(true);

    try {
      const combinedIds = [
        ...(newTeamSlackEnabled ? newTeamSlack : []),
        ...(newTeamJiraEnabled ? newTeamJira : []),
        ...(newTeamGithubEnabled ? newTeamGithub : [])
      ];

      const identifiers = combinedIds
        .map(id => {
          const ws = availableWorkspaces.find(x => x.id === id);
          return ws?.identifier;
        })
        .filter(Boolean) as string[];

      await createTeam({
        name: newTeamName,
        ownerEmail: newTeamOwner,
        workspaceIds: combinedIds,
        slackEnabled: newTeamSlackEnabled,
        jiraEnabled: newTeamJiraEnabled,
        githubEnabled: newTeamGithubEnabled,
        identifiers,
      });

      showToast('✓ Team created successfully');
      onSuccess();
      onClose();
    } catch (e) {
      showToast('× Creation failed');
    } finally {
      setIsCreatingTeam(false);
    }
  }

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--border-2)', borderRadius: 16, width: 500, maxWidth: '95vw', boxShadow: '0 40px 80px rgba(0,0,0,0.5)', overflow: 'hidden', animation: 'fadeUp 0.2s ease' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>Onboard New Team</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Configure workspaces and unique source mapping</div>
          </div>
          <button onClick={onClose} style={{ opacity: 0.5, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink)', display: 'flex' }}>
            <IconX size={18} />
          </button>
        </div>

        <div style={{ padding: 24, maxHeight: '75vh', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
            {/* Team Info */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Team Name *</label>
              <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="Payments API Enhancement" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>Owner Email</label>
              <input value={newTeamOwner} onChange={e => setNewTeamOwner(e.target.value)} type="email" placeholder="owner@company.com" style={{ width: '100%', padding: '10px 14px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 8, color: 'var(--ink)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>

            <hr style={{ border: '0 none', borderTop: '1px solid var(--border)', margin: '10px 0' }} />

            {/* Integrations */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)' }}>Integrations</label>
              <Button variant="ghost" size="sm" onClick={onDiscover} disabled={isDiscovering} style={{ fontSize: 10, padding: '4px 8px' }}>
                {isDiscovering ? 'Searching...' : <><IconRefresh size={12} style={{ marginRight: 4 }} /> Discover Sources</>}
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Slack */}
              <div ref={slackRef} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, position: 'relative', zIndex: 30 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: newTeamSlackEnabled ? 12 : 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={newTeamSlackEnabled} onChange={e => setNewTeamSlackEnabled(e.target.checked)} style={{ accentColor: 'var(--primary)', width: 14, height: 14 }} />
                    Enable Slack
                  </label>
                </div>
                {newTeamSlackEnabled && (
                  <div style={{ position: 'relative' }}>
                    <div onClick={() => setOpenDropdown(openDropdown === 'slack' ? null : 'slack')} style={{ padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 6, fontSize: 13, color: 'var(--ink)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{newTeamSlack.length === 0 ? 'Select Slack Channels...' : `${newTeamSlack.length} channel(s) selected`}</span>
                      <span style={{ display: 'flex', opacity: 0.5 }}>
                        <IconChevronDown size={12} />
                      </span>
                    </div>
                    {openDropdown === 'slack' && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'var(--card)', border: '1px solid var(--border-2)', borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 10, maxHeight: 200, overflowY: 'auto', padding: 4 }}>
                        <div style={{ position: 'sticky', top: 0, background: 'var(--card)', padding: '4px 4px 8px', zIndex: 5 }}>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
                              <IconSearch size={12} color="var(--ink)" />
                            </span>
                            <input
                              value={slackSearch}
                              onChange={e => setSlackSearch(e.target.value)}
                              placeholder="Search channels..."
                              style={{ width: '100%', padding: '6px 8px 6px 26px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 4, color: 'var(--ink)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                        {(() => {
                          const filtered = availableWorkspaces.filter(w => w.type === 'SLACK' && w.identifier?.toLowerCase().includes(slackSearch.toLowerCase()));
                          if (filtered.length === 0) {
                            return <div style={{ padding: 12, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>{slackSearch ? 'No matches' : 'No available slack channels'}</div>;
                          }
                          return filtered.map((w: any) => (
                            <label key={w.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', fontSize: 13, color: 'var(--ink)', cursor: 'pointer', borderRadius: 4, background: newTeamSlack.includes(w.id) ? 'var(--surface)' : 'transparent' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input type="checkbox" checked={newTeamSlack.includes(w.id)} onChange={() => { const s = newTeamSlack; setNewTeamSlack(s.includes(w.id) ? s.filter(id => id !== w.id) : [...s, w.id]); }} style={{ accentColor: 'var(--primary)' }} />
                                {w.identifier}
                              </div>
                              <Badge variant="muted" style={{ fontSize: 10, opacity: 0.7 }}>{guessLayer(w.identifier || '', 'SLACK')}</Badge>
                            </label>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Jira */}
              <div ref={jiraRef} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, position: 'relative', zIndex: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: newTeamJiraEnabled ? 12 : 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={newTeamJiraEnabled} onChange={e => setNewTeamJiraEnabled(e.target.checked)} style={{ accentColor: 'var(--primary)', width: 14, height: 14 }} />
                    Enable Jira
                  </label>
                </div>
                {newTeamJiraEnabled && (
                  <div style={{ position: 'relative' }}>
                    <div onClick={() => setOpenDropdown(openDropdown === 'jira' ? null : 'jira')} style={{ padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 6, fontSize: 13, color: 'var(--ink)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{newTeamJira.length === 0 ? 'Select Jira Projects...' : `${newTeamJira.length} project(s) selected`}</span>
                      <span style={{ display: 'flex', opacity: 0.5 }}>
                        <IconChevronDown size={12} />
                      </span>
                    </div>
                    {openDropdown === 'jira' && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'var(--card)', border: '1px solid var(--border-2)', borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 10, maxHeight: 200, overflowY: 'auto', padding: 4 }}>
                        <div style={{ position: 'sticky', top: 0, background: 'var(--card)', padding: '4px 4px 8px', zIndex: 5 }}>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
                              <IconSearch size={12} color="var(--ink)" />
                            </span>
                            <input
                              value={jiraSearch}
                              onChange={e => setJiraSearch(e.target.value)}
                              placeholder="Search projects..."
                              style={{ width: '100%', padding: '6px 8px 6px 26px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 4, color: 'var(--ink)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                        {(() => {
                          const filtered = availableWorkspaces.filter(w => w.type === 'JIRA' && w.identifier?.toLowerCase().includes(jiraSearch.toLowerCase()));
                          if (filtered.length === 0) {
                            return <div style={{ padding: 12, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>{jiraSearch ? 'No matches' : 'No available jira projects'}</div>;
                          }
                          return filtered.map((w: any) => (
                            <label key={w.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', fontSize: 13, color: 'var(--ink)', cursor: 'pointer', borderRadius: 4, background: newTeamJira.includes(w.id) ? 'var(--surface)' : 'transparent' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input type="checkbox" checked={newTeamJira.includes(w.id)} onChange={() => { const s = newTeamJira; setNewTeamJira(s.includes(w.id) ? s.filter(id => id !== w.id) : [...s, w.id]); }} style={{ accentColor: 'var(--primary)' }} />
                                {w.identifier}
                              </div>
                              <Badge variant="muted" style={{ fontSize: 10, opacity: 0.7 }}>{guessLayer(w.identifier || '', 'JIRA')}</Badge>
                            </label>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* GitHub */}
              <div ref={githubRef} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, position: 'relative', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: newTeamGithubEnabled ? 12 : 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--ink)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={newTeamGithubEnabled} onChange={e => setNewTeamGithubEnabled(e.target.checked)} style={{ accentColor: 'var(--primary)', width: 14, height: 14 }} />
                    Enable GitHub
                  </label>
                </div>
                {newTeamGithubEnabled && (
                  <div style={{ position: 'relative' }}>
                    <div onClick={() => setOpenDropdown(openDropdown === 'github' ? null : 'github')} style={{ padding: '8px 12px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 6, fontSize: 13, color: 'var(--ink)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{newTeamGithub.length === 0 ? 'Select GitHub Repos...' : `${newTeamGithub.length} repo(s) selected`}</span>
                      <span style={{ display: 'flex', opacity: 0.5 }}>
                        <IconChevronDown size={12} />
                      </span>
                    </div>
                    {openDropdown === 'github' && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'var(--card)', border: '1px solid var(--border-2)', borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 10, maxHeight: 200, overflowY: 'auto', padding: 4 }}>
                        <div style={{ position: 'sticky', top: 0, background: 'var(--card)', padding: '4px 4px 8px', zIndex: 5 }}>
                          <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
                              <IconSearch size={12} color="var(--ink)" />
                            </span>
                            <input
                              value={githubSearch}
                              onChange={e => setGithubSearch(e.target.value)}
                              placeholder="Search repos..."
                              style={{ width: '100%', padding: '6px 8px 6px 26px', background: 'var(--bg)', border: '1px solid var(--border-2)', borderRadius: 4, color: 'var(--ink)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                        {(() => {
                          const filtered = availableWorkspaces.filter(w => w.type === 'GITHUB' && w.identifier?.toLowerCase().includes(githubSearch.toLowerCase()));
                          if (filtered.length === 0) {
                            return <div style={{ padding: 12, fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>{githubSearch ? 'No matches' : 'No available github repos'}</div>;
                          }
                          return filtered.map((w: any) => (
                            <label key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 13, color: 'var(--ink)', cursor: 'pointer', borderRadius: 4, background: newTeamGithub.includes(w.id) ? 'var(--surface)' : 'transparent' }}>
                              <input type="checkbox" checked={newTeamGithub.includes(w.id)} onChange={() => { const s = newTeamGithub; setNewTeamGithub(s.includes(w.id) ? s.filter(id => id !== w.id) : [...s, w.id]); }} style={{ accentColor: 'var(--primary)' }} />
                              {w.identifier}
                            </label>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'var(--surface)' }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" isLoading={isCreatingTeam} onClick={handleCreateTeam}>{isCreatingTeam ? 'Creating...' : 'Create Team →'}</Button>
        </div>
      </div>
    </div>
  );
}
