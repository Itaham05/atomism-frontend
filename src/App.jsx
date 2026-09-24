import { useState } from 'react';
import './index.css';

const API = 'https://atomism-backend-production.up.railway.app';

function decodeRole(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role;
  } catch {
    return null;
  }
}

function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [error, setError] = useState('');

  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);

  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);

  const [aggregates, setAggregates] = useState([]);
  const [selectedAggregate, setSelectedAggregate] = useState(null);

  const [assemblies, setAssemblies] = useState([]);
  const [selectedAssembly, setSelectedAssembly] = useState(null);

  const [subassemblies, setSubassemblies] = useState([]);
  const [selectedSubassembly, setSelectedSubassembly] = useState(null);

  const [art, setArt] = useState(null);
  const [parts, setParts] = useState([]);
  const [hoveredPartId, setHoveredPartId] = useState(null);

  const [selectedPart, setSelectedPart] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);
  const [docInfo, setDocInfo] = useState(null);

  const [newPartNumber, setNewPartNumber] = useState('');
  const [newPartDescription, setNewPartDescription] = useState('');
  const [newPartX, setNewPartX] = useState('');
  const [newPartY, setNewPartY] = useState('');
  const [addPartError, setAddPartError] = useState('');

  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantVin, setNewVariantVin] = useState('');
  const [addVariantError, setAddVariantError] = useState('');
  const [newAggregateName, setNewAggregateName] = useState('');
  const [addAggregateError, setAddAggregateError] = useState('');
  const [newAssemblyName, setNewAssemblyName] = useState('');
  const [addAssemblyError, setAddAssemblyError] = useState('');
  const [newSubassemblyName, setNewSubassemblyName] = useState('');
  const [addSubassemblyError, setAddSubassemblyError] = useState('');
  
  const [searchType, setSearchType] = useState('description');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  const [chatQuery, setChatQuery] = useState('');
  const [chatResult, setChatResult] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  // Art+BOM toolbar state
  const [viewMode, setViewMode] = useState('both'); // 'both' | 'art' | 'bom'
  const [zoomLevel, setZoomLevel] = useState(1);
  const [notice, setNotice] = useState(null);

  function authHeader(authToken) {
    return { Authorization: `Bearer ${authToken}` };
  }

  function resetAllScreens() {
    setSelectedModel(null);
    setSelectedVariant(null);
    setSelectedAggregate(null);
    setSelectedAssembly(null);
    setSelectedSubassembly(null);
    setSelectedPart(null);
    setSearchResults(null);
    setChatResult(null);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    const body = new URLSearchParams();
    body.append('username', username);
    body.append('password', password);
    try {
      const response = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!response.ok) {
        setError('Incorrect username or password');
        return;
      }
      const data = await response.json();
      setToken(data.access_token);
      setUserRole(decodeRole(data.access_token));
      fetchModels(data.access_token);
    } catch {
      setError('Could not reach the server');
    }
  }

  function handleLogout() {
    setToken(null);
    setUserRole(null);
    setUsername('');
    setPassword('');
    setModels([]);
    resetAllScreens();
  }

  async function fetchModels(authToken) {
    const res = await fetch(`${API}/models`, { headers: authHeader(authToken) });
    setModels(await res.json());
  }

  async function handleSelectModel(model) {
    setSelectedModel(model);
    setSelectedVariant(null);
    setSelectedAggregate(null);
    setSelectedAssembly(null);
    setSelectedSubassembly(null);
    setSelectedPart(null);
    const res = await fetch(`${API}/models/${model.id}/variants`, { headers: authHeader(token) });
    setVariants(await res.json());
  }

  async function handleSelectVariant(variant) {
    setSelectedVariant(variant);
    setSelectedAggregate(null);
    setSelectedAssembly(null);
    setSelectedSubassembly(null);
    setSelectedPart(null);
    const res = await fetch(`${API}/variants/${variant.id}/aggregates`, { headers: authHeader(token) });
    setAggregates(await res.json());
  }

  async function handleSelectAggregate(aggregate) {
    setSelectedAggregate(aggregate);
    setSelectedAssembly(null);
    setSelectedSubassembly(null);
    setSelectedPart(null);
    const res = await fetch(`${API}/aggregates/${aggregate.id}/assemblies`, { headers: authHeader(token) });
    setAssemblies(await res.json());
  }

  async function handleSelectAssembly(assembly) {
    setSelectedAssembly(assembly);
    setSelectedSubassembly(null);
    setSelectedPart(null);
    const res = await fetch(`${API}/assemblies/${assembly.id}/subassemblies`, { headers: authHeader(token) });
    setSubassemblies(await res.json());
  }

  async function handleSelectSubassembly(subassembly) {
    setSelectedSubassembly(subassembly);
    setSelectedPart(null);
    setViewMode('both');
    setZoomLevel(1);
    const artRes = await fetch(`${API}/subassemblies/${subassembly.id}/art`, { headers: authHeader(token) });
    const artData = await artRes.json();
    setArt(artData);
    if (artData) {
      const partsRes = await fetch(`${API}/art/${artData.id}/parts`, { headers: authHeader(token) });
      setParts(await partsRes.json());
    }
  }

  async function handleSelectPart(part) {
    setSelectedPart(part);
    const videoRes = await fetch(`${API}/parts/${part.id}/videos`, { headers: authHeader(token) });
    setVideoInfo(await videoRes.json());
    const docRes = await fetch(`${API}/parts/${part.id}/servicedocs`, { headers: authHeader(token) });
    setDocInfo(await docRes.json());
  }

  async function handleJumpToPart(partLike) {
    setSelectedPart(partLike);
    const videoRes = await fetch(`${API}/parts/${partLike.id}/videos`, { headers: authHeader(token) });
    setVideoInfo(await videoRes.json());
    const docRes = await fetch(`${API}/parts/${partLike.id}/servicedocs`, { headers: authHeader(token) });
    setDocInfo(await docRes.json());
  }

  function buildTimestampedUrl(url, timestamp) {
    if (!timestamp) return url;
    const seconds = parseInt(timestamp, 10);
    if (isNaN(seconds)) return url;
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}t=${seconds}s`;
    }
    return `${url}#t=${seconds}`;
  }

  async function handleAddPart() {
    setAddPartError('');
    if (!newPartNumber.trim() || !newPartDescription.trim()) {
      setAddPartError('Both fields are required');
      return;
    }
    const params = new URLSearchParams({
      part_number: newPartNumber,
      description: newPartDescription,
      art_id: art.id,
      hotspot_x: newPartX || 50,
      hotspot_y: newPartY || 50,
    });
    const res = await fetch(`${API}/parts?${params}`, { method: 'POST', headers: authHeader(token) });
    if (!res.ok) {
      setAddPartError('Failed to add part — are you sure you are an admin?');
      return;
    }
    setNewPartNumber('');
    setNewPartDescription('');
    setNewPartX('');
    setNewPartY('');
    const partsRes = await fetch(`${API}/art/${art.id}/parts`, { headers: authHeader(token) });
    setParts(await partsRes.json());
  }

  async function handleDeletePart(partId) {
    await fetch(`${API}/parts/${partId}`, { method: 'DELETE', headers: authHeader(token) });
    const partsRes = await fetch(`${API}/art/${art.id}/parts`, { headers: authHeader(token) });
    setParts(await partsRes.json());
  }

  async function handleAddVariant() {
    setAddVariantError('');
    if (!newVariantName.trim()) { setAddVariantError('Name is required'); return; }
    const params = new URLSearchParams({ name: newVariantName });
    if (newVariantVin.trim()) params.append('vin', newVariantVin);
    const res = await fetch(`${API}/models/${selectedModel.id}/variants?${params}`, { method: 'POST', headers: authHeader(token) });
    if (!res.ok) { setAddVariantError('Failed to add — are you sure you are an admin?'); return; }
    setNewVariantName('');
    setNewVariantVin('');
    const r = await fetch(`${API}/models/${selectedModel.id}/variants`, { headers: authHeader(token) });
    setVariants(await r.json());
  }

  async function handleDeleteVariant(id) {
    await fetch(`${API}/variants/${id}`, { method: 'DELETE', headers: authHeader(token) });
    const r = await fetch(`${API}/models/${selectedModel.id}/variants`, { headers: authHeader(token) });
    setVariants(await r.json());
  }

  async function handleAddAggregate() {
    setAddAggregateError('');
    if (!newAggregateName.trim()) { setAddAggregateError('Name is required'); return; }
    const params = new URLSearchParams({ name: newAggregateName });
    const res = await fetch(`${API}/variants/${selectedVariant.id}/aggregates?${params}`, { method: 'POST', headers: authHeader(token) });
    if (!res.ok) { setAddAggregateError('Failed to add — are you sure you are an admin?'); return; }
    setNewAggregateName('');
    const r = await fetch(`${API}/variants/${selectedVariant.id}/aggregates`, { headers: authHeader(token) });
    setAggregates(await r.json());
  }

  async function handleDeleteAggregate(id) {
    await fetch(`${API}/aggregates/${id}`, { method: 'DELETE', headers: authHeader(token) });
    const r = await fetch(`${API}/variants/${selectedVariant.id}/aggregates`, { headers: authHeader(token) });
    setAggregates(await r.json());
  }

  async function handleAddAssembly() {
    setAddAssemblyError('');
    if (!newAssemblyName.trim()) { setAddAssemblyError('Name is required'); return; }
    const params = new URLSearchParams({ name: newAssemblyName });
    const res = await fetch(`${API}/aggregates/${selectedAggregate.id}/assemblies?${params}`, { method: 'POST', headers: authHeader(token) });
    if (!res.ok) { setAddAssemblyError('Failed to add — are you sure you are an admin?'); return; }
    setNewAssemblyName('');
    const r = await fetch(`${API}/aggregates/${selectedAggregate.id}/assemblies`, { headers: authHeader(token) });
    setAssemblies(await r.json());
  }

  async function handleDeleteAssembly(id) {
    await fetch(`${API}/assemblies/${id}`, { method: 'DELETE', headers: authHeader(token) });
    const r = await fetch(`${API}/aggregates/${selectedAggregate.id}/assemblies`, { headers: authHeader(token) });
    setAssemblies(await r.json());
  }

  async function handleAddSubassembly() {
    setAddSubassemblyError('');
    if (!newSubassemblyName.trim()) { setAddSubassemblyError('Name is required'); return; }
    const params = new URLSearchParams({ name: newSubassemblyName });
    const res = await fetch(`${API}/assemblies/${selectedAssembly.id}/subassemblies?${params}`, { method: 'POST', headers: authHeader(token) });
    if (!res.ok) { setAddSubassemblyError('Failed to add — are you sure you are an admin?'); return; }
    setNewSubassemblyName('');
    const r = await fetch(`${API}/assemblies/${selectedAssembly.id}/subassemblies`, { headers: authHeader(token) });
    setSubassemblies(await r.json());
  }

  async function handleDeleteSubassembly(id) {
    await fetch(`${API}/subassemblies/${id}`, { method: 'DELETE', headers: authHeader(token) });
    const r = await fetch(`${API}/assemblies/${selectedAssembly.id}/subassemblies`, { headers: authHeader(token) });
    setSubassemblies(await r.json());
  }

  async function handleAdvancedSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setChatResult(null);

    if (searchType === 'description' || searchType === 'part_number') {
      const res = await fetch(`${API}/parts/search?q=${encodeURIComponent(searchQuery)}`, { headers: authHeader(token) });
      setSearchResults(await res.json());
    } else if (searchType === 'vin') {
      const res = await fetch(`${API}/variants/by-vin/${encodeURIComponent(searchQuery)}`, { headers: authHeader(token) });
      const data = await res.json();
      setSearchResults(data ? [data] : []);
    } else if (searchType === 'engine') {
      const res = await fetch(`${API}/variants/by-engine/${encodeURIComponent(searchQuery)}`, { headers: authHeader(token) });
      const data = await res.json();
      setSearchResults(data ? [data] : []);
    } else if (searchType === 'module') {
      const res = await fetch(`${API}/aggregates/search?q=${encodeURIComponent(searchQuery)}`, { headers: authHeader(token) });
      setSearchResults(await res.json());
    }
  }

  function handleAdvancedResultClick(result) {
    if (result.part_number) {
      handleJumpToPart(result);
    }
    // Variant/Aggregate results: just shown as info for now, no drill-down wired yet
  }

  async function handleAskChatbot(e) {
    e.preventDefault();
    if (!chatQuery.trim()) return;
    setSearchResults(null);
    setChatLoading(true);
    const res = await fetch(`${API}/chatbot/ask?q=${encodeURIComponent(chatQuery)}`, { headers: authHeader(token) });
    setChatResult(await res.json());
    setChatLoading(false);
  }

  const listItem = { padding: 12, marginBottom: 8, border: '1px solid #e2e0da', borderRadius: 6, cursor: 'pointer' };

  // ---------- Tree sidebar ----------
  function TreeSidebar() {
    return (
      <div className="tree-sidebar">
        {models.map((m) => (
          <div key={m.id}>
            <div
              className={`tree-node tree-depth-1 ${selectedModel?.id === m.id ? 'active' : ''}`}
              onClick={() => handleSelectModel(m)}
            >
              <span className="tree-caret">{selectedModel?.id === m.id ? '▾' : '▸'}</span>
              {m.name}
            </div>
            {selectedModel?.id === m.id && variants.map((v) => (
              <div key={v.id}>
                <div
                  className={`tree-node tree-depth-2 ${selectedVariant?.id === v.id ? 'active' : ''}`}
                  onClick={() => handleSelectVariant(v)}
                >
                  <span className="tree-caret">{selectedVariant?.id === v.id ? '▾' : '▸'}</span>
                  {v.name}
                </div>
                {selectedVariant?.id === v.id && aggregates.map((agg) => (
                  <div key={agg.id}>
                    <div
                      className={`tree-node tree-depth-3 ${selectedAggregate?.id === agg.id ? 'active' : ''}`}
                      onClick={() => handleSelectAggregate(agg)}
                    >
                      <span className="tree-caret">{selectedAggregate?.id === agg.id ? '▾' : '▸'}</span>
                      {agg.name}
                    </div>
                    {selectedAggregate?.id === agg.id && assemblies.map((asm) => (
                      <div key={asm.id}>
                        <div
                          className={`tree-node tree-depth-4 ${selectedAssembly?.id === asm.id ? 'active' : ''}`}
                          onClick={() => handleSelectAssembly(asm)}
                        >
                          <span className="tree-caret">{selectedAssembly?.id === asm.id ? '▾' : '▸'}</span>
                          {asm.name}
                        </div>
                        {selectedAssembly?.id === asm.id && subassemblies.map((sub) => (
                          <div
                            key={sub.id}
                            className={`tree-node tree-depth-5 ${selectedSubassembly?.id === sub.id ? 'active' : ''}`}
                            onClick={() => handleSelectSubassembly(sub)}
                          >
                            <span className="tree-caret">•</span>
                            {sub.name}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  function TopNav() {
    return (
      <>
        <div className="topnav">
          <div className="topnav-links">
            <span onClick={resetAllScreens}>Home</span>
            <span>Catalogue</span>
            <span>Downloads</span>
            <span>Support</span>
            <span>Contact Us</span>
          </div>
          <div className="topnav-right">
            <span
              title="Bookmarks — coming in Phase 2"
              style={{ cursor: 'pointer', fontSize: 18 }}
              onClick={() => setNotice('🔖 Bookmarks are planned for Phase 2 of this project.')}
            >
              🔖
            </span>
            <span
              title="Cart & Ordering — coming in Phase 2"
              style={{ cursor: 'pointer', fontSize: 18 }}
              onClick={() => setNotice('🛒 Cart & ordering are planned for Phase 2 of this project.')}
            >
              🛒
            </span>
            <span className={`badge ${userRole === 'admin' ? 'badge-admin' : 'badge-tech'}`}>
              {userRole === 'admin' ? 'Admin' : userRole === 'approver' ? 'Approver' : 'Technician'}
            </span>
            <button className="btn btn-secondary" onClick={handleLogout}>Log out</button>
          </div>
        </div>
        {notice && (
          <div style={{ background: '#fff8e1', borderBottom: '1px solid #f0d97a', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{notice}</span>
            <button className="btn btn-secondary" onClick={() => setNotice(null)}>Dismiss</button>
          </div>
        )}
      </>
    );
  }

  // ---------- Main pane content, by selection depth ----------
  function mainPaneContent() {
    if (selectedPart) {
      return (
        <div className="card">
          <h2 className="title mono">{selectedPart.part_number}</h2>
          <p className="subtitle" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>{selectedPart.description}</p>
          <div className="section-title">Training Video</div>
            {videoInfo?.available ? (
            videoInfo.videos.map((v) => (
              <p key={v.id}>🎥 <a className="link" href={buildTimestampedUrl(v.url, v.timestamp)} target="_blank" rel="noreferrer">{v.title || v.url}</a>{v.timestamp ? ` (jumps to ${v.timestamp}s)` : ''}</p>
            ))
          ) : (
            <p className="muted">No video available for this part.</p>
          )}
          <div className="section-title" style={{ marginTop: 20 }}>Service Document</div>
          {docInfo?.available ? (
            docInfo.servicedocs.map((d) => (
              <p key={d.id}>📄 <a className="link" href={d.url} target="_blank" rel="noreferrer">{d.url}</a></p>
            ))
          ) : (
            <p className="muted">No service document available for this part.</p>
          )}
        </div>
      );
    }

    if (selectedSubassembly) {
      return (
        <>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h2 className="title" style={{ margin: 0 }}>{selectedSubassembly.name}</h2>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary" onClick={() => setViewMode('art')}>Art Only</button>
                <button className="btn btn-secondary" onClick={() => setViewMode('bom')}>BOM Only</button>
                <button className="btn btn-secondary" onClick={() => setViewMode('both')}>Both</button>
                <button className="btn btn-secondary" onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 2))}>Zoom In</button>
                <button className="btn btn-secondary" onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.6))}>Zoom Out</button>
                <button className="btn btn-secondary" onClick={() => window.print()}>Print</button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {viewMode !== 'bom' && (
              <div className="card" style={{ flex: 1, minWidth: 300 }}>
                <div className="section-title">Exploded Diagram</div>
                <div className="diagram-box" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}>
                  {parts.map((part) => (
                    <div
                      key={part.id}
                      className={`hotspot ${hoveredPartId === part.id ? 'hotspot-active' : ''}`}
                      style={{ left: `${part.hotspot_x}%`, top: `${part.hotspot_y}%` }}
                      onClick={() => setHoveredPartId(part.id)}
                      title={part.part_number}
                    >
                      {parts.indexOf(part) + 1}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewMode !== 'art' && (
              <div className="card-flat" style={{ flex: 1, minWidth: 340 }}>
                <div style={{ padding: '14px 14px 0 14px' }} className="section-title">Bill of Materials</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px' }}>S.No</th>
                      <th style={{ padding: '8px 10px' }}>Part Number</th>
                      <th style={{ padding: '8px 10px' }}>Description</th>
                      <th style={{ padding: '8px 10px' }}>Qty</th>
                      <th style={{ padding: '8px 10px' }}>Rate</th>
                      {userRole === 'admin' && <th></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {parts.map((part, i) => (
                      <tr
                        key={part.id}
                        style={{ borderBottom: '1px solid #f0efe9', background: hoveredPartId === part.id ? 'var(--orange-light)' : 'white', cursor: 'pointer' }}
                        onMouseEnter={() => setHoveredPartId(part.id)}
                        onClick={() => handleSelectPart(part)}
                      >
                        <td style={{ padding: '8px 10px' }}>{i + 1}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--orange-dark)', fontWeight: 600, textDecoration: 'underline' }}>{part.part_number}</td>
                        <td style={{ padding: '8px 10px' }}>{part.description}</td>
                        <td style={{ padding: '8px 10px' }}>1</td>
                        <td style={{ padding: '8px 10px' }}>-</td>
                        {userRole === 'admin' && (
                          <td style={{ padding: '8px 10px' }}>
                            <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); handleDeletePart(part.id); }}>Delete</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {userRole === 'admin' && (
                  <div className="admin-box">
                    <div className="section-title">Add a New Part (Admin)</div>
                    <input className="input" placeholder="Part number" value={newPartNumber} onChange={(e) => setNewPartNumber(e.target.value)} />
                    <input className="input" placeholder="Description" value={newPartDescription} onChange={(e) => setNewPartDescription(e.target.value)} />
                    <input className="input" placeholder="Hotspot X (0-100)" type="number" value={newPartX} onChange={(e) => setNewPartX(e.target.value)} />
                    <input className="input" placeholder="Hotspot Y (0-100)" type="number" value={newPartY} onChange={(e) => setNewPartY(e.target.value)} />
                    <button className="btn" onClick={handleAddPart}>Add Part</button>
                    {addPartError && <p className="error-text">{addPartError}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      );
    }

    if (selectedAssembly) {
      return (
        <div className="card-flat">
          <div style={{ padding: '18px 18px 0 18px' }}>
            <h2 className="title">{selectedAssembly.name}</h2>
            <p className="subtitle">Sub-Assemblies</p>
          </div>
          <ul className="list">
            {subassemblies.map((sa) => (
              <li key={sa.id} style={{ ...listItem, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ cursor: 'pointer', flex: 1 }} onClick={() => handleSelectSubassembly(sa)}>{sa.name}</span>
                {userRole === 'admin' && <button className="btn btn-danger" onClick={() => handleDeleteSubassembly(sa.id)}>Delete</button>}
              </li>
            ))}
          </ul>
          {userRole === 'admin' && (
            <div className="admin-box">
              <div className="section-title">Add a New Sub-Assembly (Admin)</div>
              <input className="input" placeholder="Sub-Assembly name" value={newSubassemblyName} onChange={(e) => setNewSubassemblyName(e.target.value)} />
              <button className="btn" onClick={handleAddSubassembly}>Add Sub-Assembly</button>
              {addSubassemblyError && <p className="error-text">{addSubassemblyError}</p>}
            </div>
          )}
        </div>
      );
    }

    if (selectedAggregate) {
      return (
        <div className="card-flat">
          <div style={{ padding: '18px 18px 0 18px' }}>
            <h2 className="title">{selectedAggregate.name}</h2>
            <p className="subtitle">Assemblies</p>
          </div>
          <ul className="list">
            {assemblies.map((a) => (
              <li key={a.id} style={{ ...listItem, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ cursor: 'pointer', flex: 1 }} onClick={() => handleSelectAssembly(a)}>{a.name}</span>
                {userRole === 'admin' && <button className="btn btn-danger" onClick={() => handleDeleteAssembly(a.id)}>Delete</button>}
              </li>
            ))}
          </ul>
          {userRole === 'admin' && (
            <div className="admin-box">
              <div className="section-title">Add a New Assembly (Admin)</div>
              <input className="input" placeholder="Assembly name" value={newAssemblyName} onChange={(e) => setNewAssemblyName(e.target.value)} />
              <button className="btn" onClick={handleAddAssembly}>Add Assembly</button>
              {addAssemblyError && <p className="error-text">{addAssemblyError}</p>}
            </div>
          )}
        </div>
      );
    }

    if (selectedVariant) {
      return (
        <div className="card-flat">
          <div style={{ padding: '18px 18px 0 18px' }}>
            <h2 className="title">{selectedVariant.name}</h2>
            <p className="subtitle">Aggregates</p>
          </div>
          <ul className="list">
            {aggregates.map((agg) => (
              <li key={agg.id} style={{ ...listItem, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ cursor: 'pointer', flex: 1 }} onClick={() => handleSelectAggregate(agg)}>{agg.name}</span>
                {userRole === 'admin' && <button className="btn btn-danger" onClick={() => handleDeleteAggregate(agg.id)}>Delete</button>}
              </li>
            ))}
          </ul>
          {userRole === 'admin' && (
            <div className="admin-box">
              <div className="section-title">Add a New Aggregate (Admin)</div>
              <input className="input" placeholder="Aggregate name" value={newAggregateName} onChange={(e) => setNewAggregateName(e.target.value)} />
              <button className="btn" onClick={handleAddAggregate}>Add Aggregate</button>
              {addAggregateError && <p className="error-text">{addAggregateError}</p>}
            </div>
          )}
        </div>
      );
    }

    if (selectedModel) {
      return (
        <div className="card-flat">
          <div style={{ padding: '18px 18px 0 18px' }}>
            <h2 className="title">{selectedModel.name}</h2>
            <p className="subtitle">Variants</p>
          </div>
          <ul className="list">
            {variants.map((v) => (
              <li key={v.id} style={{ ...listItem, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ cursor: 'pointer', flex: 1 }} onClick={() => handleSelectVariant(v)}>{v.name}</span>
                {userRole === 'admin' && <button className="btn btn-danger" onClick={() => handleDeleteVariant(v.id)}>Delete</button>}
              </li>
            ))}
          </ul>
          {userRole === 'admin' && (
            <div className="admin-box">
              <div className="section-title">Add a New Variant (Admin)</div>
              <input className="input" placeholder="Variant name" value={newVariantName} onChange={(e) => setNewVariantName(e.target.value)} />
              <input className="input" placeholder="VIN (optional)" value={newVariantVin} onChange={(e) => setNewVariantVin(e.target.value)} />
              <button className="btn" onClick={handleAddVariant}>Add Variant</button>
              {addVariantError && <p className="error-text">{addVariantError}</p>}
            </div>
          )}
        </div>
      );
    }

    // Home
    return (
      <>
          <div className="card">
          <div className="section-title">Advance Search</div>
          <form onSubmit={handleAdvancedSearch} style={{ display: 'flex', gap: 8 }}>
            <select className="input" style={{ marginBottom: 0, width: 160, flexShrink: 0 }} value={searchType} onChange={(e) => setSearchType(e.target.value)}>
              <option value="description">Part Description</option>
              <option value="part_number">Part Number</option>
              <option value="vin">VIN / UIN</option>
              <option value="engine">Engine Number</option>
              <option value="module">Module / Aggregate</option>
            </select>
            <input className="input" style={{ marginBottom: 0 }} placeholder="Enter search term..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <button className="btn" type="submit">Search</button>
          </form>
          {searchResults && (
            <ul className="list" style={{ marginTop: 14 }}>
              {searchResults.length === 0 && <li className="muted">No results found.</li>}
              {searchResults.map((r) => (
                <li key={r.id} style={listItem} onClick={() => handleAdvancedResultClick(r)}>
                  {r.part_number ? (
                    <><span className="mono part-number">{r.part_number}</span>{r.description}</>
                  ) : (
                    <>{r.name}</>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="section-title">Intelli-Search (AI Assistant)</div>
          <form onSubmit={handleAskChatbot} style={{ display: 'flex', gap: 8 }}>
            <input className="input" style={{ marginBottom: 0 }} placeholder="e.g. my brake is making a squeaking noise" value={chatQuery} onChange={(e) => setChatQuery(e.target.value)} />
            <button className="btn" type="submit">Ask</button>
          </form>
          {chatLoading && <p className="muted" style={{ marginTop: 10 }}>Thinking...</p>}
          {chatResult?.best_match && (
            <div style={{ ...listItem, marginTop: 12 }} onClick={() => handleJumpToPart(chatResult.best_match)}>
              <span className="mono part-number">{chatResult.best_match.part_number}</span>{chatResult.best_match.description}
              <br /><small className="muted">Confidence: {(chatResult.confidence * 100).toFixed(1)}%</small>
            </div>
          )}
            {chatResult?.answer && <p className="muted" style={{ marginTop: 10 }}>{chatResult.answer}</p>}
            {chatResult?.citations?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {chatResult.citations.map((c, i) => (
                <p key={i}>
                  {c.type === 'video' ? (
                    <a href={buildTimestampedUrl(c.url, c.timestamp)} target="_blank" rel="noreferrer">
                      📹 {c.label}{c.timestamp ? ` — jumps to ${c.timestamp}s` : ''}
                    </a>
                  ) : (
                    <a href={c.url} target="_blank" rel="noreferrer">📄 {c.label}</a>
                  )}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="card-flat">
          <div style={{ padding: '16px 18px 0 18px' }} className="section-title">Browse by Model</div>
          <ul className="list">
            {models.map((m) => (
              <li key={m.id} style={listItem} onClick={() => handleSelectModel(m)}>{m.name}</li>
            ))}
          </ul>
        </div>
      </>
    );
  }

  // ---------- Top-level render ----------
  if (!token) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="brand" style={{ color: 'var(--charcoal)', marginBottom: 4 }}>
            <span className="dot"></span>ATOMISM
          </div>
          <p className="subtitle" style={{ marginBottom: 20 }}>Parts · Service · Training</p>
          <form onSubmit={handleLogin}>
            <input className="input" type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="btn" type="submit" style={{ width: '100%' }}>Log in</button>
            {error && <p className="error-text">{error}</p>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopNav />
      <div className="body-shell">
        <TreeSidebar />
        <div className="main-pane">{mainPaneContent()}</div>
      </div>
    </div>
  );
}

export default App;