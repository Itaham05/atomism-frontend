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

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  const [chatQuery, setChatQuery] = useState('');
  const [chatResult, setChatResult] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);

  const [newVariantName, setNewVariantName] = useState('');
  const [newVariantVin, setNewVariantVin] = useState('');
  const [addVariantError, setAddVariantError] = useState('');

  const [newAggregateName, setNewAggregateName] = useState('');
  const [addAggregateError, setAddAggregateError] = useState('');
  const [newAssemblyName, setNewAssemblyName] = useState('');
  const [addAssemblyError, setAddAssemblyError] = useState('');
  const [newSubassemblyName, setNewSubassemblyName] = useState('');
  const [addSubassemblyError, setAddSubassemblyError] = useState('');

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
    resetAllScreens();
    setSelectedModel(model);
    const res = await fetch(`${API}/models/${model.id}/variants`, { headers: authHeader(token) });
    setVariants(await res.json());
  }

  async function handleSelectVariant(variant) {
    setSelectedVariant(variant);
    const res = await fetch(`${API}/variants/${variant.id}/aggregates`, { headers: authHeader(token) });
    setAggregates(await res.json());
  }

  async function handleSelectAggregate(aggregate) {
    setSelectedAggregate(aggregate);
    const res = await fetch(`${API}/aggregates/${aggregate.id}/assemblies`, { headers: authHeader(token) });
    setAssemblies(await res.json());
  }

  async function handleSelectAssembly(assembly) {
    setSelectedAssembly(assembly);
    const res = await fetch(`${API}/assemblies/${assembly.id}/subassemblies`, { headers: authHeader(token) });
    setSubassemblies(await res.json());
  }

  async function handleSelectSubassembly(subassembly) {
    setSelectedSubassembly(subassembly);
    setHoveredPartId(null);
    const artRes = await fetch(`${API}/subassemblies/${subassembly.id}/art`, { headers: authHeader(token) });
    const artData = await artRes.json();
    setArt(artData);
    if (artData) {
      const partsRes = await fetch(`${API}/art/${artData.id}/parts`, { headers: authHeader(token) });
      setParts(await partsRes.json());
    }
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

  async function handleSelectPart(part) {
    setSelectedPart(part);
    const videoRes = await fetch(`${API}/parts/${part.id}/videos`);
    setVideoInfo(await videoRes.json());
    const docRes = await fetch(`${API}/parts/${part.id}/servicedocs`);
    setDocInfo(await docRes.json());
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
    const res = await fetch(`${API}/parts?${params}`, {
      method: 'POST',
      headers: authHeader(token),
    });
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
    async function handleAddVariant() {
    setAddVariantError('');
    if (!newVariantName.trim()) {
      setAddVariantError('Name is required');
      return;
    }
    const params = new URLSearchParams({ name: newVariantName });
    if (newVariantVin.trim()) params.append('vin', newVariantVin);
    const res = await fetch(`${API}/models/${selectedModel.id}/variants?${params}`, {
      method: 'POST',
      headers: authHeader(token),
    });
    if (!res.ok) {
      setAddVariantError('Failed to add variant — are you sure you are an admin?');
      return;
    }
    setNewVariantName('');
    setNewVariantVin('');
    const variantsRes = await fetch(`${API}/models/${selectedModel.id}/variants`, { headers: authHeader(token) });
    setVariants(await variantsRes.json());
  }

  async function handleDeleteVariant(variantId) {
    await fetch(`${API}/variants/${variantId}`, { method: 'DELETE', headers: authHeader(token) });
    const variantsRes = await fetch(`${API}/models/${selectedModel.id}/variants`, { headers: authHeader(token) });
    setVariants(await variantsRes.json());
  }

  async function handleDeletePart(partId) {
    await fetch(`${API}/parts/${partId}`, {
      method: 'DELETE',
      headers: authHeader(token),
    });
    const partsRes = await fetch(`${API}/art/${art.id}/parts`, { headers: authHeader(token) });
    setParts(await partsRes.json());
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setChatResult(null);
    const res = await fetch(`${API}/parts/search?q=${encodeURIComponent(searchQuery)}`, {
      headers: authHeader(token),
    });
    setSearchResults(await res.json());
  }

  async function handleAskChatbot(e) {
    e.preventDefault();
    if (!chatQuery.trim()) return;
    setSearchResults(null);
    setChatLoading(true);
    const res = await fetch(`${API}/chatbot/ask?q=${encodeURIComponent(chatQuery)}`);
    setChatResult(await res.json());
    setChatLoading(false);
  }

  async function handleJumpToPart(partLike) {
    setSelectedPart(partLike);
    const videoRes = await fetch(`${API}/parts/${partLike.id}/videos`);
    setVideoInfo(await videoRes.json());
    const docRes = await fetch(`${API}/parts/${partLike.id}/servicedocs`);
    setDocInfo(await docRes.json());
  }

  function TopBar() {
    return (
      <div className="topbar">
        <div className="brand"><span className="dot"></span>ATOMISM</div>
        <button className="btn btn-secondary" onClick={handleLogout}>Log out</button>
      </div>
    );
  }

  function Breadcrumb() {
    const crumbs = [{ label: 'Home', onClick: () => resetAllScreens() }];
    if (selectedModel) crumbs.push({ label: selectedModel.name, onClick: () => { setSelectedVariant(null); setSelectedAggregate(null); setSelectedAssembly(null); setSelectedSubassembly(null); setSelectedPart(null); } });
    if (selectedVariant) crumbs.push({ label: selectedVariant.name, onClick: () => { setSelectedAggregate(null); setSelectedAssembly(null); setSelectedSubassembly(null); setSelectedPart(null); } });
    if (selectedAggregate) crumbs.push({ label: selectedAggregate.name, onClick: () => { setSelectedAssembly(null); setSelectedSubassembly(null); setSelectedPart(null); } });
    if (selectedAssembly) crumbs.push({ label: selectedAssembly.name, onClick: () => { setSelectedSubassembly(null); setSelectedPart(null); } });
    if (selectedSubassembly) crumbs.push({ label: selectedSubassembly.name, onClick: () => setSelectedPart(null) });
    if (selectedPart) crumbs.push({ label: selectedPart.part_number, onClick: () => {} });

    return (
      <div className="breadcrumb">
        {crumbs.map((c, i) => (
          <span key={i}>
            <span className="crumb" onClick={c.onClick}>{c.label}</span>
            {i < crumbs.length - 1 && <span> / </span>}
          </span>
        ))}
      </div>
    );
  }

  // Screen 6: Part detail
  if (selectedPart) {
    return (
      <div className="page">
        <TopBar />
        <Breadcrumb />
        <div className="content">
          <div className="card">
            <h2 className="title mono">{selectedPart.part_number}</h2>
            <p className="subtitle" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>{selectedPart.description}</p>

            <div className="section-title">Training Video</div>
            {videoInfo?.available ? (
              videoInfo.videos.map((v) => (
                <p key={v.id}>🎥 <a className="link" href={v.url} target="_blank" rel="noreferrer">{v.url}</a> (jumps to {v.timestamp})</p>
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
        </div>
      </div>
    );
  }

  // Screen 5: Art + Parts (BOM) — side by side
  if (selectedSubassembly) {
    return (
      <div className="page page-wide">
        <TopBar />
        <Breadcrumb />
        <div className="content">
          <h2 className="title">{selectedSubassembly.name}</h2>
          <div className="art-bom-layout">
            <div className="card">
              <div className="section-title">Exploded diagram — click a marker or a part</div>
              <div className="diagram-box">
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
            <div className="card-flat">
              <div style={{ padding: '16px 18px 0 18px' }} className="section-title">Parts</div>
              <ul className="list">
                {parts.map((part, i) => (
                  <li
                    key={part.id}
                    className={`list-item ${hoveredPartId === part.id ? 'list-item-active' : ''}`}
                    onMouseEnter={() => setHoveredPartId(part.id)}
                  >
                    <span style={{ cursor: 'pointer', flex: 1 }} onClick={() => handleSelectPart(part)}>
                      <span className="hotspot-tag">{i + 1}</span>
                      <span className="mono part-number">{part.part_number}</span>{part.description}
                    </span>
                    {userRole === 'admin' && (
                      <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); handleDeletePart(part.id); }}>
                        Delete
                      </button>
                    )}
                  </li>
                ))}
              </ul>
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
          </div>
        </div>
      </div>
    );
  }
  // Screen 4: Sub-Assemblies
  if (selectedAssembly) {
    return (
      <div className="page">
        <TopBar />
        <Breadcrumb />
        <div className="content">
          <div className="card-flat">
            <div style={{ padding: '18px 18px 0 18px' }}>
              <h2 className="title">{selectedAssembly.name}</h2>
              <p className="subtitle">Sub-Assemblies</p>
            </div>
            <ul className="list">
              {subassemblies.map((sa) => (
                <li key={sa.id} className="list-item">
                  <span style={{ cursor: 'pointer', flex: 1 }} onClick={() => handleSelectSubassembly(sa)}>{sa.name}</span>
                  {userRole === 'admin' && (
                    <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteSubassembly(sa.id); }}>Delete</button>
                  )}
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
        </div>
      </div>
    );
  }

  // Screen 3: Assemblies
  if (selectedAggregate) {
    return (
      <div className="page">
        <TopBar />
        <Breadcrumb />
        <div className="content">
          <div className="card-flat">
            <div style={{ padding: '18px 18px 0 18px' }}>
              <h2 className="title">{selectedAggregate.name}</h2>
              <p className="subtitle">Assemblies</p>
            </div>
            <ul className="list">
              {assemblies.map((a) => (
                <li key={a.id} className="list-item">
                  <span style={{ cursor: 'pointer', flex: 1 }} onClick={() => handleSelectAssembly(a)}>{a.name}</span>
                  {userRole === 'admin' && (
                    <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteAssembly(a.id); }}>Delete</button>
                  )}
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
        </div>
      </div>
    );
  }

  // Screen 2: Aggregates
  if (selectedVariant) {
    return (
      <div className="page">
        <TopBar />
        <Breadcrumb />
        <div className="content">
          <div className="card-flat">
            <div style={{ padding: '18px 18px 0 18px' }}>
              <h2 className="title">{selectedVariant.name}</h2>
              <p className="subtitle">Aggregates</p>
            </div>
            <ul className="list">
              {aggregates.map((agg) => (
                <li key={agg.id} className="list-item">
                  <span style={{ cursor: 'pointer', flex: 1 }} onClick={() => handleSelectAggregate(agg)}>{agg.name}</span>
                  {userRole === 'admin' && (
                    <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteAggregate(agg.id); }}>Delete</button>
                  )}
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
        </div>
      </div>
    );
  }

  // Screen 1: Variants
  if (selectedModel) {
    return (
      <div className="page">
        <TopBar />
        <Breadcrumb />
        <div className="content">
          <div className="card-flat">
            <div style={{ padding: '18px 18px 0 18px' }}>
              <h2 className="title">{selectedModel.name}</h2>
              <p className="subtitle">Variants</p>
            </div>
            <ul className="list">
              {variants.map((v) => (
                <li key={v.id} className="list-item">
                  <span style={{ cursor: 'pointer', flex: 1 }} onClick={() => handleSelectVariant(v)}>{v.name}</span>
                  {userRole === 'admin' && (
                    <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); handleDeleteVariant(v.id); }}>Delete</button>
                  )}
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
        </div>
      </div>
    );
  }

  // Screen 0: Home — Models + Search + Chatbot
  if (token) {
    return (
      <div className="page">
        <div className="topbar">
          <div className="brand"><span className="dot"></span>ATOMISM</div>
          <button className="btn btn-secondary" onClick={handleLogout}>Log out</button>
        </div>
        <div className="content">
          <p className="subtitle">
            {username || 'user'} · <span className={`badge ${userRole === 'admin' ? 'badge-admin' : 'badge-tech'}`}>{userRole === 'admin' ? 'Admin' : 'Technician'}</span>
          </p>

          <div className="card">
            <div className="section-title">Search by part number or description</div>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
              <input className="input" style={{ marginBottom: 0 }} placeholder="e.g. caliper, RE-BC-001" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <button className="btn" type="submit">Go</button>
            </form>
            {searchResults && (
              <ul className="list" style={{ marginTop: 14 }}>
                {searchResults.length === 0 && <li className="muted">No parts found.</li>}
                {searchResults.map((p) => (
                  <li key={p.id} className="list-item" onClick={() => handleJumpToPart(p)}>
                    <span><span className="mono part-number">{p.part_number}</span>{p.description}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <div className="section-title">Ask the AI assistant</div>
            <form onSubmit={handleAskChatbot} style={{ display: 'flex', gap: 8 }}>
              <input className="input" style={{ marginBottom: 0 }} placeholder="e.g. my brake is making a squeaking noise" value={chatQuery} onChange={(e) => setChatQuery(e.target.value)} />
              <button className="btn" type="submit">Ask</button>
            </form>
            {chatLoading && <p className="muted" style={{ marginTop: 10 }}>Thinking...</p>}
            {chatResult?.best_match && (
              <div className="list-item" style={{ marginTop: 12, border: '1px solid var(--border)', borderRadius: 6 }} onClick={() => handleJumpToPart(chatResult.best_match)}>
                <div>
                  <span className="mono part-number">{chatResult.best_match.part_number}</span>{chatResult.best_match.description}
                  <br />
                  <small className="muted">Confidence: {(chatResult.confidence * 100).toFixed(1)}%</small>
                </div>
              </div>
            )}
            {chatResult?.answer && <p className="muted" style={{ marginTop: 10 }}>{chatResult.answer}</p>}
          </div>

          <div className="card-flat">
            <div style={{ padding: '16px 18px 0 18px' }} className="section-title">Browse by Model</div>
            <ul className="list">
              {models.map((m) => (
                <li key={m.id} className="list-item" onClick={() => handleSelectModel(m)}>{m.name}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Login screen
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

export default App;