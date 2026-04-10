'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

import { TERMINAL_LINES, THEME_COLORS, SEARCH_SCOPE_ITEMS, MOCK_SOURCES } from '@must-iq-web/lib/constants/landing.constant';

import { Terminal, Reveal, Tag, H2, Sub } from '@must-iq-web/components/landing';
import {
    MustLogo, MustLogoDark, IconDashboard, IconTeams, IconUsers, IconWorkspaces,
    IconAI, IconTokens, IconAudit, IconKnowledge, IconSettings, IconChat, IconZap,
    IconSearch, IconRefresh, IconPlus, IconX, IconChevronDown, IconCopy, IconEye,
    IconTrash, IconEdit, IconLogout, IconBrain, IconSparkles, IconSend, IconPaperclip,
    IconLock, IconCheck, IconSun, IconMoon
} from '@must-iq-web/components/ui/MustIcons';

export default function LandingPage() {
    const [scrolled, setScrolled] = useState(false);
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const fn = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', fn);
        return () => window.removeEventListener('scroll', fn);
    }, []);

    return (
        <div style={{ background: THEME_COLORS.bg, color: THEME_COLORS.text, fontFamily: '"Geist",system-ui,sans-serif', overflowX: 'hidden' }}>
            <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6%', height: 64, background: 'var(--bg)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--surface)', boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.5)' : 'none', transition: 'box-shadow 0.3s' }}>
                <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${THEME_COLORS.primary}`, background: 'rgba(var(--primary-rgb),0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MustLogo size={24} />
                    </div>
                    <span style={{ fontFamily: '"DM Serif Display",serif', fontSize: 18, color: THEME_COLORS.text }}>must<span style={{ color: THEME_COLORS.primary }}>-iq</span></span>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                    {[['#problem', 'Problem'], ['#how', 'How it works'], ['#features', 'Features'], ['#integrations', 'Integrations']].map(([h, l]) => (
                        <a key={l} href={h} className="hov-nav" style={{ color: THEME_COLORS.text, opacity: 0.8, textDecoration: 'none', fontSize: 13.5, transition: 'color 0.15s' }}>{l}</a>
                    ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    {mounted && (
                        <button
                            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                            title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                            className="px-3 h-8 rounded-lg flex items-center justify-center gap-2 transition-all flex-shrink-0 border-0 cursor-pointer hov-int"
                            style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                color: 'var(--ink-muted)',
                                fontSize: 13,
                                fontWeight: 500,
                            }}
                        >
                            {resolvedTheme === 'dark' ? (
                                <><IconSun size={14} /> Light</>
                            ) : (
                                <><IconMoon size={14} /> Dark</>
                            )}
                        </button>
                    )}
                    <Link href="/admin" className="btn-g" style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--surface)', color: THEME_COLORS.text, border: `1px solid ${THEME_COLORS.border2}`, textDecoration: 'none', transition: 'all 0.15s' }}>Admin</Link>
                    <Link href="/login" className="nav-cta" style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: THEME_COLORS.primary, color: THEME_COLORS.bg, textDecoration: 'none', transition: 'all 0.15s', display: 'inline-block' }}>Open App →</Link>
                </div>
            </nav>

            <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 6% 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                {/* Grid bg */}
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(var(--primary-rgb),0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(var(--primary-rgb),0.04) 1px,transparent 1px)', backgroundSize: '60px 60px', WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%,black 30%,transparent 100%)', maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%,black 30%,transparent 100%)', pointerEvents: 'none' }} />
                {/* Orbs */}
                <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(var(--primary-rgb),0.1),transparent 70%)', top: -120, left: -120, filter: 'blur(80px)', animation: 'drift1 18s ease-in-out infinite', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(157,111,255,0.08),transparent 70%)', bottom: -60, right: -80, filter: 'blur(80px)', animation: 'drift2 14s ease-in-out infinite', pointerEvents: 'none' }} />

                {/* Badge */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20, marginBottom: 28, border: '1px solid rgba(var(--primary-rgb),0.25)', background: 'rgba(var(--primary-rgb),0.06)', fontSize: 12, fontWeight: 500, color: THEME_COLORS.primary, letterSpacing: '0.05em', animation: 'fadeUp 0.6s ease both', position: 'relative', zIndex: 1 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: THEME_COLORS.green, boxShadow: `0 0 8px ${THEME_COLORS.green}`, animation: 'pulse 1.5s ease-in-out infinite' }} />
                    Now live at Must Company · Internal AI Platform
                </div>

                <h1 style={{ fontFamily: '"DM Serif Display",serif', fontSize: 'clamp(46px,7vw,86px)', lineHeight: 1.05, color: THEME_COLORS.text, maxWidth: 880, marginBottom: 24, animation: 'fadeUp 0.6s ease 0.1s both', position: 'relative', zIndex: 1 }}>
                    Your Company has a{' '}<em style={{ color: THEME_COLORS.primary, fontStyle: 'italic' }}>Second Brain.</em><br />
                    <span style={{ color: THEME_COLORS.muted }}>It just needed a home.</span>
                </h1>

                <p style={{ fontSize: 'clamp(15px,2vw,18px)', color: THEME_COLORS.muted, maxWidth: 560, lineHeight: 1.7, marginBottom: 44, animation: 'fadeUp 0.6s ease 0.2s both', position: 'relative', zIndex: 1 }}>
                    Must-IQ automatically captures knowledge from Jira, Slack, GitHub, and Confluence — then makes it instantly searchable for every employee, in plain language.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' as const, justifyContent: 'center', animation: 'fadeUp 0.6s ease 0.3s both', position: 'relative', zIndex: 1 }}>
                    <Link href="/chat" className="btn-p" style={{ padding: '13px 30px', borderRadius: 10, fontSize: 15, fontWeight: 600, background: THEME_COLORS.primary, color: THEME_COLORS.bg, textDecoration: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', gap: 8 }}>Start asking questions <span>→</span></Link>
                    <a href="#how" className="btn-g" style={{ padding: '13px 30px', borderRadius: 10, fontSize: 15, fontWeight: 600, background: 'var(--surface)', color: THEME_COLORS.text, border: `1px solid ${THEME_COLORS.border2}`, textDecoration: 'none', transition: 'all 0.15s', cursor: 'pointer' }}>See how it works</a>
                </div>

                {/* Chat mock-up */}
                <div style={{ position: 'relative', marginTop: 70, width: '100%', maxWidth: 880, animation: 'fadeUp 0.8s ease 0.5s both', zIndex: 1 }}>
                    <div style={{ position: 'absolute', inset: -1, borderRadius: 17, background: 'linear-gradient(135deg,rgba(var(--primary-rgb),0.22),rgba(157,111,255,0.12),rgba(var(--primary-rgb),0.08))', WebkitMask: 'linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude', padding: 1, pointerEvents: 'none' }} />
                    <div style={{ background: THEME_COLORS.card, borderRadius: 16, overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,0.6)', display: 'grid', gridTemplateColumns: '200px 1fr', minHeight: 360, textAlign: 'left' }}>
                        {/* Mock sidebar */}
                        <div style={{ background: THEME_COLORS.surface, borderRight: `1px solid ${THEME_COLORS.border}`, padding: '14px 10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottom: `1px solid ${THEME_COLORS.border}`, marginBottom: 12 }}>
                                <div style={{ width: 24, height: 24, borderRadius: 6, border: `1.5px solid ${THEME_COLORS.primary}`, background: 'rgba(var(--primary-rgb),0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MustLogo size={18} />
                                </div>
                                <span style={{ fontFamily: '"DM Serif Display",serif', fontSize: 13, color: THEME_COLORS.text }}>must<span style={{ color: THEME_COLORS.primary }}>-iq</span></span>
                            </div>
                            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: THEME_COLORS.muted, padding: '0 4px', marginBottom: 8 }}>Search Scope</div>
                            {SEARCH_SCOPE_ITEMS.map(d => (
                                <div key={d.n} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 4px', borderRadius: 4, marginBottom: 2, background: d.on ? 'rgba(var(--primary-rgb),0.07)' : 'transparent' }}>
                                    <div style={{ width: 12, height: 12, borderRadius: 3, border: `1.5px solid ${d.on ? d.c : THEME_COLORS.border2}`, background: d.on ? `${d.c}20` : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: d.c, flexShrink: 0 }}>{d.on && (d.locked ? <IconLock size={8} /> : <IconCheck size={8} />)}</div>
                                    <span style={{ fontSize: 10.5, color: d.on ? THEME_COLORS.text : THEME_COLORS.muted }}>{d.n}</span>
                                </div>
                            ))}
                        </div>
                        {/* Mock chat */}
                        <div style={{ display: 'flex', flexDirection: 'column', padding: 18 }}>
                            <div style={{ display: 'flex', gap: 9, marginBottom: 12 }}>
                                <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(var(--primary-rgb),0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: THEME_COLORS.primary, flexShrink: 0 }}>JD</div>
                                <div>
                                    <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: THEME_COLORS.primary, marginBottom: 3 }}>You</div>
                                    <div style={{ fontSize: 12, color: THEME_COLORS.text, lineHeight: 1.6 }}>Has anyone solved the 502 error on ECS deployments before?</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 9 }}>
                                <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(var(--primary-rgb),0.06)', border: '1px solid rgba(var(--primary-rgb),0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <IconBrain size={16} color="var(--primary)" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: THEME_COLORS.muted, marginBottom: 3 }}>Must-IQ</div>
                                    <div style={{ fontSize: 12, color: THEME_COLORS.text, lineHeight: 1.6 }}>Yes — this is a known issue. The <strong style={{ color: THEME_COLORS.text }}>ALB health check path</strong> is almost always the cause. Change it to <strong style={{ color: THEME_COLORS.text }}>/api/health</strong> and reduce the threshold to 2.</div>
                                    <div style={{ marginTop: 10, padding: 10, background: 'var(--surface)', borderRadius: 7, border: `1px solid ${THEME_COLORS.border}` }}>
                                        <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: THEME_COLORS.muted, marginBottom: 7 }}>Sources used</div>
                                        {MOCK_SOURCES.map(([badge, bg, border, color, text, score]) => (
                                            <div key={badge as string} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                <span style={{ fontSize: 7.5, fontFamily: '"DM Mono",monospace', padding: '1px 5px', borderRadius: 8, background: bg as string, border: `1px solid ${border}`, color: color as string }}>{badge}</span>
                                                <span style={{ fontSize: 10, color: THEME_COLORS.muted, flex: 1 }}>{text}</span>
                                                <span style={{ fontSize: 9, fontFamily: '"DM Mono",monospace', color: THEME_COLORS.green }}>{score}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginTop: 'auto', padding: '9px 12px', background: 'var(--surface)', borderRadius: 7, border: `1px solid ${THEME_COLORS.border2}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ flex: 1, fontSize: 11, color: THEME_COLORS.muted }}>Ask anything across your selected silos…</span>
                                <div style={{ width: 24, height: 24, borderRadius: 5, background: THEME_COLORS.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME_COLORS.bg }}>
                                    <IconSend size={12} />
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Floating badge */}
                    <div style={{ position: 'absolute', top: -18, right: -40, background: THEME_COLORS.card, border: `1px solid ${THEME_COLORS.border2}`, borderRadius: 12, padding: '11px 15px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)', animation: 'floatB 7s ease-in-out infinite' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: THEME_COLORS.green, boxShadow: `0 0 6px ${THEME_COLORS.green}` }} />
                            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' as const, color: THEME_COLORS.muted }}>Live ingestion</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: THEME_COLORS.text }}>INFRA-441 → Engineering KB</div>
                        <div style={{ fontSize: 10.5, color: THEME_COLORS.muted, marginTop: 2 }}>score 0.91 · 2 min ago</div>
                    </div>
                </div>
            </section>

            <section id="problem" style={{ padding: '100px 6%', background: THEME_COLORS.surface, borderTop: `1px solid ${THEME_COLORS.border}`, borderBottom: `1px solid ${THEME_COLORS.border}` }}>
                <Tag>The Problem</Tag>
                <H2>Knowledge dies in <em style={{ color: THEME_COLORS.primary, fontStyle: 'italic' }}>closed tabs.</em></H2>
                <Sub>Every resolved ticket, every Slack thread with the fix, every README explaining the architecture — it's all there. But nobody can find it.</Sub>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
                    {[
                        { bad: true, icon: <IconZap color={THEME_COLORS.red} />, title: 'The same question, asked 40 times', body: "A new engineer asks how to configure the Redis connection pool. The answer exists in a Slack thread from 8 months ago — but nobody can find it, so a senior dev has to stop and explain it again.", quote: '"Someone must know this… let me ping Slack and hope for the best."' },
                        { bad: true, icon: <IconZap color={THEME_COLORS.red} />, title: 'The incident already happened before', body: 'Your team debugs a production issue for 3 hours. Turns out the exact same thing happened 6 months ago and was fully documented in a Jira comment. Nobody found the comment.', quote: '"We literally solved this in INFRA-280. Why are we redoing it?"' },
                        { bad: true, icon: <IconLogout color={THEME_COLORS.red} />, title: 'Knowledge walks out the door', body: "When a senior engineer leaves, 3 years of context — architecture decisions, workarounds, tribal knowledge — goes with them. Documentation was always 'something we'd get to'.", quote: '"David was the only one who knew how that service worked."' },
                        { bad: false, icon: <IconSparkles color={THEME_COLORS.green} />, title: 'Must-IQ changes all of this', body: 'Must-IQ sits in the background, automatically pulling in resolved tickets, Slack threads, and GitHub READMEs. Every answer is one question away — with sources cited every time.', quote: '"Found in INFRA-441 + #backend-help · ✅ @charlie · similarity: 0.91"' },
                    ].map((c, i) => (
                        <Reveal key={i} delay={i * 70}>
                            <div className="hov-lift" style={{ padding: 28, borderRadius: 14, border: `1px solid ${THEME_COLORS.border}`, background: THEME_COLORS.card, position: 'relative', overflow: 'hidden', transition: 'all 0.2s', cursor: 'default', height: '100%' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: c.bad ? `linear-gradient(90deg,${THEME_COLORS.red},transparent)` : `linear-gradient(90deg,${THEME_COLORS.green},transparent)` }} />
                                <div style={{ marginBottom: 14, display: 'flex' }}>{c.icon}</div>
                                <div style={{ fontFamily: '"DM Serif Display",serif', fontSize: 19, color: THEME_COLORS.text, marginBottom: 8 }}>{c.title}</div>
                                <div style={{ fontSize: 13.5, color: THEME_COLORS.muted, lineHeight: 1.65 }}>{c.body}</div>
                                <div style={{ marginTop: 14, padding: '11px 13px', borderRadius: 8, background: c.bad ? 'rgba(255,77,109,0.06)' : 'rgba(0,255,157,0.06)', border: `1px solid ${c.bad ? 'rgba(255,77,109,0.2)' : 'rgba(0,255,157,0.2)'}`, fontSize: 12, color: c.bad ? '#ff8099' : THEME_COLORS.green, fontStyle: 'italic' }}>
                                    {c.quote}
                                </div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </section>

            <section id="how" style={{ padding: '100px 6%' }}>
                <Tag>How it works</Tag>
                <H2>From source to <em style={{ color: THEME_COLORS.primary, fontStyle: 'italic' }}>searchable</em> in seconds.</H2>
                <Sub>A fully automated pipeline that captures knowledge as it's created — no manual documentation required.</Sub>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14 }}>
                    {[
                        { n: '01', icon: <IconWorkspaces />, bg: 'rgba(var(--primary-rgb),0.1)', title: 'Connect sources', body: 'Register Jira projects, Slack channels, and GitHub repos in the admin panel. No code changes, no restarts.' },
                        { n: '02', icon: <IconZap />, bg: 'rgba(157,111,255,0.1)', title: 'Auto-ingest fires', body: 'When a ticket resolves or someone reacts ✅ in Slack, Must-IQ fetches the full context automatically.' },
                        { n: '03', icon: <IconBrain />, bg: 'rgba(0,255,157,0.1)', title: 'AI extracts knowledge', body: 'A utility LLM scores the entry (0–1), extracts problem, root cause, solution, then stores two chunks in pgvector.' },
                        { n: '04', icon: <IconSearch />, bg: 'rgba(255,183,64,0.1)', title: 'Instant semantic search', body: 'Employees ask in plain English. Must-IQ retrieves the most relevant chunks via HNSW cosine similarity and cites every source.' },
                    ].map((s, i) => (
                        <Reveal key={i} delay={i * 90}>
                            <div className="hov-lift" style={{ padding: '26px 20px', borderRadius: 14, border: `1px solid ${THEME_COLORS.border}`, background: THEME_COLORS.card, transition: 'all 0.2s', cursor: 'default', height: '100%' }}>
                                <div style={{ fontFamily: '"DM Mono",monospace', fontSize: 11, color: THEME_COLORS.primary, letterSpacing: '0.1em', marginBottom: 14, opacity: 0.7 }}>{s.n}</div>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, color: 'var(--primary)' }}>{s.icon}</div>
                                <div style={{ fontFamily: '"DM Serif Display",serif', fontSize: 18, color: THEME_COLORS.text, marginBottom: 7 }}>{s.title}</div>
                                <div style={{ fontSize: 13, color: THEME_COLORS.muted, lineHeight: 1.65 }}>{s.body}</div>
                            </div>
                        </Reveal>
                    ))}
                </div>
            </section>

            <section id="features" style={{ padding: '100px 6%', background: THEME_COLORS.surface, borderTop: `1px solid ${THEME_COLORS.border}`, borderBottom: `1px solid ${THEME_COLORS.border}` }}>
                <Tag>Features</Tag>
                <H2>Built for how your <em style={{ color: THEME_COLORS.primary, fontStyle: 'italic' }}>team actually works.</em></H2>
                <Sub>Not another search bar. A knowledge system that understands context, respects boundaries, and grows automatically.</Sub>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14, marginBottom: 14 }}>
                    {[
                        { icon: <IconDashboard />, title: 'User-controlled search scope', body: 'Employees choose which workspace silos to search. General Knowledge is always on. HR, Finance, and Security are opt-in per query — respecting access without blocking cross-functional work.' },
                        { icon: <IconZap />, title: 'Zero-effort auto-ingestion', body: 'No one has to remember to document anything. When a Jira ticket closes or someone reacts ✅ in Slack, Must-IQ automatically extracts the problem and solution.' },
                        { icon: <IconKnowledge />, title: 'Every answer is cited', body: "Must-IQ never makes things up. Every response includes the exact sources — Jira ticket key, Slack thread link, doc section — each with a similarity score." },
                        { icon: <IconAI />, title: 'Switchable LLM provider', body: 'Admins switch between Anthropic, OpenAI, Gemini, Azure, or Ollama from the admin panel in one click. No code changes. Takes effect in under 60 seconds.' },
                    ].map((f, i) => (
                        <Reveal key={i} delay={i * 70}>
                            <div className="hov-lift" style={{ padding: 30, borderRadius: 14, border: `1px solid ${THEME_COLORS.border}`, background: THEME_COLORS.card, transition: 'all 0.2s', cursor: 'default', height: '100%' }}>
                                <div style={{ marginBottom: 14, display: 'flex' }}>{f.icon}</div>
                                <div style={{ fontFamily: '"DM Serif Display",serif', fontSize: 20, color: THEME_COLORS.text, marginBottom: 9 }}>{f.title}</div>
                                <div style={{ fontSize: 13.5, color: THEME_COLORS.muted, lineHeight: 1.7 }}>{f.body}</div>
                            </div>
                        </Reveal>
                    ))}
                </div>
                {/* Read-only wide card */}
                <Reveal delay={150}>
                    <div style={{ padding: 32, borderRadius: 14, border: `1px solid ${THEME_COLORS.border}`, background: THEME_COLORS.card, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>
                        <div>
                            <div style={{ marginBottom: 14, display: 'flex' }}><IconAudit size={32} /></div>
                            <div style={{ fontFamily: '"DM Serif Display",serif', fontSize: 22, color: THEME_COLORS.text, marginBottom: 10 }}>Read-only integrations. Always.</div>
                            <div style={{ fontSize: 13.5, color: THEME_COLORS.muted, lineHeight: 1.7, marginBottom: 16 }}>Must-IQ reads from Jira, Slack, GitHub, and Confluence to build its knowledge base. It cannot create tickets, post messages, or modify anything externally — ever. The only thing it writes to is its own pgvector knowledge base.</div>
                            {[['#00ff9d', '→', 'Jira: reads tickets, comments, resolutions'], ['#00ff9d', '→', 'Slack: reads ✅-reacted threads'], ['#00ff9d', '→', 'GitHub: reads READMEs and issues'], ['#00ff9d', '→', 'Confluence: reads documentation pages'], ['#ff4d6d', '✕', 'Creates nothing. Posts nothing. Zero write access.']].map(([col, sym, text]) => (
                                <div key={text as string} style={{ display: 'flex', gap: 9, fontSize: 13, color: THEME_COLORS.muted, marginBottom: 7 }}><span style={{ color: col as string, flexShrink: 0 }}>{sym}</span>{text}</div>
                            ))}
                        </div>
                        <div style={{ background: THEME_COLORS.surface, border: `1px solid ${THEME_COLORS.border}`, borderRadius: 12, padding: 20, fontFamily: '"DM Mono","Fira Code",monospace', fontSize: 12, lineHeight: 1.9 }}>
                            <div style={{ color: THEME_COLORS.muted, marginBottom: 10 }}>{'// permission model'}</div>
                            <div><span style={{ color: THEME_COLORS.purple }}>const</span> <span style={{ color: THEME_COLORS.primary }}>jira</span> {' = {'}</div>
                            <div style={{ paddingLeft: 16 }}><span style={{ color: THEME_COLORS.green }}>read</span>{': '}<span style={{ color: THEME_COLORS.amber }}>true</span>,</div>
                            <div style={{ paddingLeft: 16 }}><span style={{ color: THEME_COLORS.red }}>write</span>{': '}<span style={{ color: THEME_COLORS.amber }}>false</span> <span style={{ color: THEME_COLORS.muted }}>{'// enforced'}</span></div>
                            <div>{'}'}</div>
                            <div style={{ marginTop: 8 }}><span style={{ color: THEME_COLORS.purple }}>const</span> <span style={{ color: THEME_COLORS.primary }}>slack</span> {' = {'}</div>
                            <div style={{ paddingLeft: 16 }}><span style={{ color: THEME_COLORS.green }}>read</span>{': '}<span style={{ color: THEME_COLORS.amber }}>true</span>,</div>
                            <div style={{ paddingLeft: 16 }}><span style={{ color: THEME_COLORS.red }}>post</span>{': '}<span style={{ color: THEME_COLORS.amber }}>false</span> <span style={{ color: THEME_COLORS.muted }}>{'// enforced'}</span></div>
                            <div>{'}'}</div>
                            <div style={{ marginTop: 8, color: THEME_COLORS.muted }}>{'// only write → Must-IQ KB'}</div>
                            <div><span style={{ color: THEME_COLORS.primary }}>mustiq</span>.<span style={{ color: THEME_COLORS.green }}>ingest</span>(knowledge)</div>
                        </div>
                    </div>
                </Reveal>
            </section>

            <section id="terminal" style={{ padding: '100px 6%' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
                    <Reveal><Terminal /></Reveal>
                    <Reveal delay={120}>
                        <Tag>Auto-Ingestion</Tag>
                        <H2>Knowledge captured <em style={{ color: THEME_COLORS.primary, fontStyle: 'italic' }}>automatically.</em></H2>
                        <p style={{ color: THEME_COLORS.muted, fontSize: 15, lineHeight: 1.7, marginBottom: 20 }}>The moment a Jira ticket resolves or a Slack thread gets a ✅ reaction, the pipeline fires. No human intervention required.</p>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 11 }}>
                            {['Webhooks receive events instantly from Jira and Slack', 'Background worker fetches the full ticket or thread context', 'AI scores knowledge value (0–1) and extracts structured data', 'Entries scoring below 0.30 are automatically skipped', 'High-value entries (≥ 0.85) trigger admin notifications', 'Two semantic chunks are embedded and stored in pgvector'].map(item => (
                                <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 11, fontSize: 13.5, color: THEME_COLORS.muted }}>
                                    <span style={{ color: THEME_COLORS.primary, flexShrink: 0, marginTop: 1 }}>→</span>{item}
                                </li>
                            ))}
                        </ul>
                    </Reveal>
                </div>
            </section>

            <section id="integrations" style={{ padding: '100px 6%', background: THEME_COLORS.surface, borderTop: `1px solid ${THEME_COLORS.border}`, borderBottom: `1px solid ${THEME_COLORS.border}` }}>
                <Tag>Integrations</Tag>
                <H2>Connects to where <em style={{ color: THEME_COLORS.primary, fontStyle: 'italic' }}>work actually lives.</em></H2>
                <Sub>All integrations are read-only data pipelines. Must-IQ pulls knowledge in — it never pushes anything out.</Sub>
                <Reveal>
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 10, marginBottom: 22 }}>
                        {[
                            [<IconAudit size={19} />, 'Jira', true],
                            [<IconChat size={19} />, 'Slack', true],
                            [<IconWorkspaces size={19} />, 'GitHub', true],
                            [<IconKnowledge size={19} />, 'Confluence', true],
                            [<IconTokens size={19} />, 'pgvector', false, true],
                            [<IconSettings size={19} />, 'Redis', false]
                        ].map(([icon, name, ro, cyan]) => (
                            <div key={name as string} className="hov-int" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 18px', borderRadius: 11, border: `1px solid ${cyan ? 'rgba(var(--primary-rgb),0.2)' : THEME_COLORS.border}`, background: THEME_COLORS.card, fontSize: 13.5, fontWeight: 500, color: cyan ? THEME_COLORS.primary : THEME_COLORS.text, transition: 'all 0.15s', cursor: 'default' }}>
                                <span style={{ display: 'flex' }}>{icon}</span>{name as string}
                                {ro && <span style={{ fontSize: 9, fontFamily: '"DM Mono",monospace', color: THEME_COLORS.green, background: 'rgba(0,255,157,0.08)', border: '1px solid rgba(0,255,157,0.2)', padding: '2px 7px', borderRadius: 10 }}>read-only</span>}
                            </div>
                        ))}
                    </div>
                    <div style={{ padding: '18px 22px', borderRadius: 11, border: '1px solid rgba(0,255,157,0.2)', background: 'rgba(0,255,157,0.04)', display: 'flex', gap: 13 }}>
                        <IconX size={20} color={THEME_COLORS.green} style={{ marginTop: 2 }} />
                        <div>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: THEME_COLORS.text, marginBottom: 4 }}>Zero write access to external systems</div>
                            <div style={{ fontSize: 13, color: THEME_COLORS.muted }}>Must-IQ holds read-only API tokens. It is architecturally impossible for it to create a ticket, post a message, or modify any external record. The only system it writes to is its own pgvector knowledge base.</div>
                        </div>
                    </div>
                </Reveal>
            </section>

            <section style={{ padding: '80px 6%', textAlign: 'center' }}>
                <Reveal>
                    <Tag>By the numbers</Tag>
                    <H2>Built for the whole <em style={{ color: THEME_COLORS.primary, fontStyle: 'italic' }}>company.</em></H2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 1, background: THEME_COLORS.border, borderRadius: 14, overflow: 'hidden', marginTop: 44 }}>
                        {[['27', 'K', 'Knowledge chunks\nindexed at launch'], ['0.3', 's', 'Average query\nresponse time'], ['34', '%', 'Cache hit rate\nreduces LLM cost'], ['<60', 's', 'LLM provider switch\ntakes effect']].map(([n, sup, label]) => (
                            <div key={n as string} style={{ padding: '38px 26px', background: THEME_COLORS.card, textAlign: 'center' }}>
                                <div style={{ fontFamily: '"DM Serif Display",serif', fontSize: 50, color: THEME_COLORS.text, lineHeight: 1, marginBottom: 7 }}>{n}<span style={{ color: THEME_COLORS.primary }}>{sup}</span></div>
                                <div style={{ fontSize: 13, color: THEME_COLORS.muted, lineHeight: 1.55, whiteSpace: 'pre-line' as const }}>{label}</div>
                            </div>
                        ))}
                    </div>
                </Reveal>
            </section>

            <section style={{ padding: '120px 6%', textAlign: 'center', position: 'relative', overflow: 'hidden', background: THEME_COLORS.surface, borderTop: `1px solid ${THEME_COLORS.border}` }}>
                <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle,rgba(var(--primary-rgb),0.07),transparent 70%)', top: -250, left: -150, filter: 'blur(80px)', animation: 'drift1 18s ease-in-out infinite', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle,rgba(157,111,255,0.06),transparent 70%)', bottom: -200, right: -150, filter: 'blur(80px)', animation: 'drift2 14s ease-in-out infinite', pointerEvents: 'none' }} />
                <Reveal>
                    <Tag>Get started</Tag>
                    <h2 style={{ fontFamily: '"DM Serif Display",serif', fontSize: 'clamp(36px,6vw,66px)', color: THEME_COLORS.text, lineHeight: 1.08, maxWidth: 660, margin: '0 auto 18px' }}>
                        Stop losing knowledge.<br /><em style={{ color: THEME_COLORS.primary, fontStyle: 'italic' }}>Start finding answers.</em>
                    </h2>
                    <p style={{ color: THEME_COLORS.muted, fontSize: 16, maxWidth: 460, margin: '0 auto 42px', lineHeight: 1.7 }}>Every repeated question is a failure your documentation didn't prevent. Must-IQ fixes that — automatically.</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' as const }}>
                        <Link href="/login" className="btn-p" style={{ padding: '14px 34px', borderRadius: 10, fontSize: 15, fontWeight: 600, background: THEME_COLORS.primary, color: THEME_COLORS.bg, textDecoration: 'none', transition: 'all 0.15s' }}>Open Must-IQ →</Link>
                        <Link href="/admin" className="btn-g" style={{ padding: '14px 34px', borderRadius: 10, fontSize: 15, fontWeight: 600, background: 'var(--surface)', color: THEME_COLORS.text, border: `1px solid ${THEME_COLORS.border2}`, textDecoration: 'none', transition: 'all 0.15s' }}>Admin Dashboard</Link>
                    </div>
                </Reveal>
            </section>

            <footer style={{ padding: '56px 6% 36px', borderTop: `1px solid ${THEME_COLORS.border}`, display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 36 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 7, border: `1.5px solid ${THEME_COLORS.primary}`, background: 'rgba(var(--primary-rgb),0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"DM Serif Display",serif', fontSize: 13, color: THEME_COLORS.primary }}>
                            <svg width="45%" height="45%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="2" width="4" height="20" fill="var(--ink)" />
                                <rect x="10" y="2" width="4" height="20" fill="var(--ink)" />
                                <rect x="17" y="2" width="4" height="20" fill="var(--primary)" />
                            </svg>
                        </div>
                        <span style={{ fontFamily: '"DM Serif Display",serif', fontSize: 16, color: THEME_COLORS.text }}>must<span style={{ color: THEME_COLORS.primary }}>-iq</span></span>
                    </div>
                    <p style={{ fontSize: 13, color: THEME_COLORS.muted, lineHeight: 1.65, maxWidth: 230 }}>Must Company's internal AI knowledge platform. Your second brain, built from your own work.</p>
                </div>
                {[{ title: 'Product', links: [['#problem', 'Problem'], ['#how', 'How it works'], ['#features', 'Features'], ['#integrations', 'Integrations']] }, { title: 'Platform', links: [['/chat', 'Chat'], ['/login', 'Sign In'], ['/admin', 'Admin Panel'], ['#', 'Changelog']] }, { title: 'Company', links: [['#', 'Must Company'], ['#', 'Privacy Policy'], ['#', 'Terms'], ['mailto:platform@mustcompany.com', 'Contact']] }].map(col => (
                    <div key={col.title}>
                        <h4 style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: THEME_COLORS.muted, marginBottom: 13 }}>{col.title}</h4>
                        {col.links.map(([href, label]) => <a key={label} href={href} className="footer-a" style={{ display: 'block', fontSize: 13, color: THEME_COLORS.text, opacity: 0.8, textDecoration: 'none', marginBottom: 8, transition: 'color 0.12s' }}>{label}</a>)}
                    </div>
                ))}
                <div style={{ gridColumn: '1/-1', marginTop: 36, paddingTop: 22, borderTop: `1px solid ${THEME_COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: THEME_COLORS.muted }}>
                    <span>© 2026 Must Company · Built with ♥ by the Platform team.</span>
                    <div style={{ display: 'flex', gap: 16 }}>
                        {['GitHub', 'Slack', 'Confluence'].map(s => <a key={s} href="#" className="footer-a" style={{ color: THEME_COLORS.text, opacity: 0.8, textDecoration: 'none', transition: 'color 0.12s' }}>{s}</a>)}
                    </div>
                </div>
            </footer>
        </div>
    );
}
