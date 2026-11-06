"use client";
import { useEffect, useRef, useState } from 'react';
const masthead = '/st-masthead.png';
import './dashboard.css';

type Item = { item_id: string; country: string; source_name: string; source_type: string; language: string; title: string; url: string; published_at: string | null; published_at_text?: string; publication_note?: string; fetched_at: string; excerpt: string; collection_mode: string; collection_warning?: string };
type Card = { source_item_ids: string[]; headline: string; summary: string; why_it_matters: string; priority_band: string; priority_reason: string; verification_flags: string[] };
type Source = { country: string; source_name: string; url: string; status?: string; item_count?: number; warning?: string; error?: string; collection_mode?: string };
type Run = { run_id: string; items: Item[]; sources: Source[]; status: string; ended_at: string; input_hash: string; analysis_error?: string };
type Analysis = { run_id: string; analysed_at: string; analysis_mode: string; collection_mode: string; cards: Card[] };
type State = { latest_run: Run | null; analysis: Analysis | null; analysis_items: Item[]; stale: boolean; last_successful_run: string | null; configured_sources: Source[]; runtime_ai: string; ai_enabled: boolean; run_count: number };
const countries = ['All coverage', 'Malaysia', 'China'];
const formatTime = (value?: string | null) => value ? new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value)) + ' SGT' : 'Unknown';
const publication = (item: Item) => item.published_at ? formatTime(item.published_at) : item.published_at_text ? item.published_at_text + ' (publisher time; timezone unstated)' : 'Publication time unknown';
async function api<T = Record<string, unknown>>(path: string, body?: unknown) {
  const response = await fetch('/api/' + path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json() as {error?: string};
  if (!response.ok) throw new Error(data.error || 'Request failed. Please retry.');
  return data as T;
}
function Evidence({ items, basis }: { items: Item[]; basis?: string }) {
  return <details><summary>Inspect evidence &amp; priority basis</summary><div className="fa-evidence">{items.map(i => <div className="fa-source" key={i.item_id}><strong>{i.source_name} · Original headline</strong><p><a href={i.url} target="_blank" rel="noreferrer">{i.title}</a></p><p>{i.excerpt || 'Headline only – no excerpt available.'}</p><p className="fa-detail-meta">{publication(i)}<br/>Fetched: {formatTime(i.fetched_at)} · {i.language} · {i.collection_mode}<br/>Source ID: {i.item_id}</p>{i.publication_note && <p>{i.publication_note}</p>}{i.collection_warning && <p className="fa-check">{i.collection_warning}</p>}</div>)}<p><strong>Evidence limitation:</strong> Short source excerpts or headlines only; full reporting has not been checked.</p><p><strong>Priority basis:</strong> {basis || 'Not assessed. Collecting an item does not assign editorial priority.'}</p></div></details>;
}
export const ForeignDeskShortlistPrototype = () => {
  const [state, setState] = useState<State | null>(null);
  const [country, setCountry] = useState('All coverage');
  const [input, setInput] = useState('All inputs');
  const [priority, setPriority] = useState('All priorities');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  async function refresh() { setState(await api<State>('state')); }
  useEffect(() => { refresh().catch(() => setError('Cannot load the dashboard. Check your connection and reload this page.')); }, []);
  const evidence = new Map((state?.analysis_items || []).map(i => [i.item_id, i]));
  const allCards = (state?.analysis?.cards || []).map((card, index) => ({ ...card, id: index, items: card.source_item_ids.map(id => evidence.get(id)!).filter(Boolean) }));
  const stories = allCards.filter(c => (country === 'All coverage' || c.items[0]?.country === country) && (input === 'All inputs' || c.items[0]?.source_type === input) && (priority === 'All priorities' || c.priority_band === priority));
  const rawItems = state?.latest_run?.items || [];
  const visibleRaw = rawItems.filter(i => (country === 'All coverage' || i.country === country) && (input === 'All inputs' || i.source_type === input));
  const analysis = state?.analysis;
  const reset = () => { setCountry('All coverage'); setInput('All inputs'); setPriority('All priorities'); };
  async function collect() {
    setBusy(true); setError(''); setNotice(state?.ai_enabled ? 'Collecting news, then analysing with OpenAI…' : 'Collecting configured news sources. No AI analysis will run.');
    try { const run = await api<Run>('collect', {}); await refresh(); setNotice(`${run.items.length} source items collected. ${run.status === 'success' ? 'Both sources responded.' : 'Some sources failed; inspect Source coverage.'} ${run.analysis_error ? 'Analysis failed: ' + run.analysis_error : state?.ai_enabled ? 'Runtime analysis saved.' : 'Export inputs for manual analysis.'}`); }
    catch (e) { setError((e as Error).message); setNotice(''); await refresh().catch(() => {}); }
    finally { setBusy(false); }
  }
  async function testAI() {
    setBusy(true); setError(''); setNotice('Testing OpenAI with a small request…');
    try { await api('ai/test', {}); setNotice('Runtime AI connected. Run check will collect news and analyse it. No background checks are scheduled.'); }
    catch (e) { setError((e as Error).message); setNotice('Runtime AI remains disabled; collection and manual analysis are available.'); }
    finally { await refresh().catch(() => {}); setBusy(false); }
  }
  async function exportInputs() {
    try { const data = await api<{run_id:string}>('export'); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = `foreign-agent-inputs-${data.run_id}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice('Inputs exported with an analysis prompt and expected JSON format. No automatic AI call was made.'); }
    catch (e) { setError((e as Error).message); }
  }
  async function importFile(file?: File) {
    if (!file) return;
    setBusy(true); setError('');
    try { if (file.size > 1_000_000) throw new Error('Import exceeds 1 MB limit.'); const data = JSON.parse(await file.text()); await api('import', data); await refresh(); setNotice('Analysis validated and saved. It was manually imported; no runtime AI call occurred.'); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = ''; }
  }
  const collectionLabel = state?.latest_run ? [...new Set(rawItems.map(i => i.collection_mode))].join(' + ') || 'Collection failed' : 'Not collected yet';
  const statusText = `${collectionLabel} · ${analysis ? analysis.analysis_mode : 'Analysis pending'} · ${state?.ai_enabled ? 'Runtime AI connected' : 'Runtime AI disabled'}. Nothing has been sent.`;
  return <div className="fa-app">
    <a className="fa-skip" href="#shortlist">Skip to shortlist</a>
    <header className="fa-header"><img src={masthead} alt="The Straits Times" className="fa-masthead"/><div className="fa-brand"><strong>Foreign Agent</strong><span>FOREIGN DESK · MONITORING</span></div><span className="fa-concept">Team hackathon concept</span></header>
    <div className="fa-shell"><aside className="fa-nav"><h2>Country desks</h2><nav aria-label="Country coverage">{countries.map(c => <button key={c} aria-pressed={country === c} onClick={() => setCountry(c)}>{c}<span>{allCards.filter(s => c === 'All coverage' || s.items[0]?.country === c).length}</span></button>)}</nav><div className="fa-nav-note"><span>Pilot scope</span><strong>Malaysia + China</strong><p>Selected news sources only.<br/>Counts show analysed leads.</p></div><div className="fa-nav-note"><span>Team Foreign Agent</span><strong>Zurairi A.R.<br/>Lim Min Zhang<br/>Sharon See</strong></div></aside>
    <main className="fa-main" id="shortlist"><div className="fa-banner"><strong>{state?.ai_enabled ? 'RUNTIME AI AVAILABLE' : 'MANUAL ANALYSIS MODE'}</strong> · {statusText}</div>
      {state?.stale && <div className="fa-banner fa-stale" role="status"><strong>STALE ANALYSIS</strong> · These cards belong to a previous collection. Export the latest inputs and import fresh analysis. Previous evidence remains attached to its original run.</div>}
      <section className="fa-heading"><div><h1>{country === 'All coverage' ? 'Your editorial shortlist' : `${country} in focus`}</h1><p>What happened. Why it may matter. Where to check.</p></div><div className="fa-actions"><button onClick={() => dialog.current?.showModal()}>Preview digest</button><button className="fa-primary" disabled={busy || !state} onClick={collect}>{busy ? 'Working…' : state?.ai_enabled ? 'Run check' : 'Collect latest'}</button></div></section>
      <div className="fa-workflow"><button disabled={!rawItems.length || busy} onClick={exportInputs}>Export inputs</button><button disabled={!rawItems.length || busy} onClick={() => fileInput.current?.click()}>Import analysed results</button><input hidden ref={fileInput} type="file" accept=".json,application/json" aria-label="Import analysis JSON" onChange={e => importFile(e.target.files?.[0])}/><p>Collect → export → request analysis in your Codex chat → import the returned JSON. Each step is human-triggered.</p></div>
      <div className="fa-filters"><label>Input<select value={input} onChange={e => setInput(e.target.value)}><option>All inputs</option><option>News reports</option></select></label><label>Priority<select value={priority} onChange={e => setPriority(e.target.value)}><option>All priorities</option><option>Review now</option><option>Watch</option><option>Lower priority</option></select></label><span>Last successful collection: {state?.last_successful_run ? formatTime(state.last_successful_run) : 'None yet'}</span></div>
      <div role="status" aria-live="polite">{notice && <div className="fa-notice">{notice}</div>}</div>{error && <div className="fa-banner fa-stale" role="alert">{error} <button onClick={() => { setError(''); refresh().catch(() => setError('Server unavailable. Reload the page or try again later.')); }}>Retry connection</button></div>}
      <div className="fa-content"><section aria-labelledby="review-heading"><div className="fa-list-heading"><h2 id="review-heading">For editorial review</h2><span>{stories.length} {stories.length === 1 ? 'lead' : 'leads'}</span></div>
        {!state ? <div className="fa-empty"><h3>Loading saved results…</h3></div> : stories.length === 0 ? <div className="fa-empty"><h3>{analysis ? 'No leads match these filters' : 'Your shortlist is waiting for analysis'}</h3><p>{analysis ? 'Try another country or priority.' : rawItems.length ? 'Source items are available below. Export them for manual analysis, then import the results.' : 'Choose “Collect latest” to retrieve public news. Collection does not require an API key.'}</p>{analysis && <button onClick={reset}>Reset filters</button>}</div> : stories.map(s => <article className="fa-story" key={s.id}><div className="fa-meta"><span className={`fa-priority ${s.priority_band === 'Review now' ? 'fa-review' : ''}`}>{s.priority_band}</span><strong>{s.items[0]?.country}</strong><span>· News reports · {state.stale ? 'Stale analysis' : analysis?.analysis_mode}</span></div><h3>{s.headline}</h3><p className="fa-summary">{s.summary}</p><p className="fa-relevance"><strong>Why it may matter:</strong> Editorial suggestion – {s.why_it_matters}</p>{s.verification_flags.length > 0 && <p className="fa-check"><strong>Check:</strong> {s.verification_flags.join(' ')}</p>}<Evidence items={s.items} basis={s.priority_reason}/><footer><span>{s.items.length} {s.items.length === 1 ? 'source' : 'sources'} · {s.items.map(publication).join('; ')}</span><span>{analysis?.analysis_mode}</span></footer></article>)}
        <section className="fa-inbox" aria-labelledby="inbox-heading"><div className="fa-list-heading"><h2 id="inbox-heading">Collected source items</h2><span>{visibleRaw.length} items</span></div><p className="fa-inbox-note">Original source material, separate from the analysed shortlist. Priority filters apply to shortlist cards only.</p>{visibleRaw.map(i => <article className="fa-raw" key={i.item_id}><div className="fa-meta">{i.country} · {i.source_name} · {i.collection_mode}</div><h3><a href={i.url} target="_blank" rel="noreferrer">{i.title}</a></h3><p>{publication(i)}</p><Evidence items={[i]}/></article>)}{!visibleRaw.length && <p className="fa-inbox-note">No collected items for this selection.</p>}</section>
      </section><aside className="fa-status" aria-label="Monitoring status"><section className="fa-panel"><h2>Source coverage</h2>{(state?.latest_run?.sources || state?.configured_sources || []).map(s => <div className="fa-source-status" key={s.source_name}><div className="fa-row"><strong>{s.source_name}</strong><span>{s.status === 'success' ? `${s.item_count} items` : s.status === 'failed' ? 'Failed' : 'Not checked'}</span></div><p>{s.country} · {s.collection_mode || 'RSS configured'}</p>{s.warning && <p className="fa-check">{s.warning}</p>}{s.error && <p className="fa-check">{s.error}. Retry collection later.</p>}</div>)}<p>Public discussion is excluded from this pilot. Failed sources do not block available news.</p></section>
      <section className="fa-panel"><h2>Analysis &amp; delivery</h2>{[['Collection', collectionLabel], ['Analysis', analysis?.analysis_mode || 'Pending'], ['Analysed', analysis ? formatTime(analysis.analysed_at) : 'Not yet'], ['Runtime AI', state?.runtime_ai || 'Disabled'], ['Slack', 'Not connected'], ['Periodic checks', 'Not implemented']].map(([k,v]) => <div className="fa-row" key={k}><span>{k}</span><span>{v}</span></div>)}<details><summary>How manual analysis works</summary><p>Export inputs includes source IDs, run identity and an analysis prompt. Ask for analysis in your Codex chat, then import the returned JSON. Imports for older runs or unknown source IDs are rejected. The app never calls Codex automatically.</p></details><button className="fa-digest-button" disabled={busy} onClick={testAI}>Test AI connection</button><p className="fa-no-send">Uses a small API request. A successful test enables runtime analysis.</p><button className="fa-digest-button" onClick={() => dialog.current?.showModal()}>View digest preview</button><p className="fa-no-send">Preview only. Nothing has been sent.</p></section><section className="fa-reminder"><h2>Relevance, not popularity</h2><p>Priority considers impact, audience relevance, freshness and novelty. Verification is assessed separately. Review now is not a verified-fact badge.</p></section></aside></div>
      <footer className="fa-page-footer">Team Foreign Agent hackathon concept · Not an official ST product</footer>
    </main></div>
    <dialog ref={dialog} aria-labelledby="digest-heading" className="fa-dialog" onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}><div className="fa-dialog-header"><div><h2 id="digest-heading">Digest preview</h2><p>{stories.length} currently filtered {stories.length === 1 ? 'lead' : 'leads'}</p></div><button aria-label="Close digest preview" onClick={() => dialog.current?.close()}>Close</button></div><div className="fa-banner">Preview only – nothing has been sent. {statusText}{state?.stale && ' STALE ANALYSIS: refresh analysis before use.'}</div>{!stories.length ? <p>No analysed leads match the current filters.</p> : <ol>{stories.map(s => <li key={s.id}><span className="fa-dialog-meta">{s.items[0]?.country} · {s.priority_band}</span><h3>{s.headline}</h3><p>{s.summary}</p><p><strong>Why it may matter:</strong> Editorial suggestion – {s.why_it_matters}</p>{s.verification_flags.length > 0 && <p className="fa-check"><strong>Check:</strong> {s.verification_flags.join(' ')}</p>}<p><strong>Priority basis:</strong> {s.priority_reason}</p>{s.items.map(i => <p key={i.item_id}><a href={i.url} target="_blank" rel="noreferrer">{i.source_name}: {i.title}</a><br/><span className="fa-dialog-meta">{publication(i)}</span></p>)}</li>)}</ol>}<p className="fa-dialog-meta">Run: {analysis?.run_id || state?.latest_run?.run_id || 'None'}<br/>Analysed: {analysis ? formatTime(analysis.analysed_at) : 'Not yet'}</p></dialog>
  </div>;
};
