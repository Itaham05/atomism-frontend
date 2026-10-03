import { useState } from 'react';
import './index.css';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Admin file uploads go straight from the browser to Cloudinary's free tier
// (no card required), then we save the URL Cloudinary gives back. Pravinkumar
// just needs his own Cloudinary account: cloud name + an "unsigned" upload
// preset, both free, both set here as environment variables.
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

async function uploadToCloudinary(file) {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('File upload is not configured yet — ask an admin to set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.');
  }
  const isPdf = file.type === 'application/pdf';
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${isPdf ? 'raw' : 'image'}/upload`;
  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(endpoint, { method: 'POST', body });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Cloudinary upload failed: ${detail}`);
  }
  const data = await res.json();
  return data.secure_url;
}

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
  const [loginLoading, setLoginLoading] = useState(false);

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
  const [newModelName, setNewModelName] = useState('');
  const [addModelError, setAddModelError] = useState('');

  const [editing, setEditing] = useState(null); // { type, id, values }
  const [editError, setEditError] = useState('');
  
  const [searchType, setSearchType] = useState('description');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  const [chatQuery, setChatQuery] = useState('');
  const [chatResult, setChatResult] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatWidgetOpen, setChatWidgetOpen] = useState(false);
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null); // { message, onConfirm } | null

  const [diagramUploading, setDiagramUploading] = useState(false);
  const [diagramUploadError, setDiagramUploadError] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoTimestamp, setNewVideoTimestamp] = useState('0:00');
  const [addVideoError, setAddVideoError] = useState('');
  const [docUploading, setDocUploading] = useState(false);
  const [docUploadError, setDocUploadError] = useState('');

  function requestConfirm(message, onConfirm) {
    setConfirmDialog({ message, onConfirm });
  }

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
    setLoginLoading(true);
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
        setLoginLoading(false);
        return;
      }
      const data = await response.json();
      setToken(data.access_token);
      setUserRole(decodeRole(data.access_token));
      await fetchModels(data.access_token);
      setLoginLoading(false);
    } catch {
      setError('Could not reach the server');
      setLoginLoading(false);
    }
  }

  function handleLogout() {
    // Clear EVERYTHING, not just the current screen — otherwise whatever
    // the previous person typed or clicked (chat questions, search results,
    // video/doc panels, half-filled admin forms) is still sitting in memory
    // when the next person logs in on the same browser.
    setToken(null);
    setUserRole(null);
    setUsername('');
    setPassword('');

    setModels([]);
    setVariants([]);
    setAggregates([]);
    setAssemblies([]);
    setSubassemblies([]);
    setArt(null);
    setParts([]);
    setHoveredPartId(null);

    setVideoInfo(null);
    setDocInfo(null);

    setSearchQuery('');
    setSearchResults(null);

    setChatQuery('');
    setChatResult(null);
    setChatLoading(false);
    setChatWidgetOpen(false);

    setEditing(null);
    setEditError('');
    setConfirmDialog(null);
    setMobileTreeOpen(false);
    setNotice(null);

    setNewPartNumber('');
    setNewPartDescription('');
    setNewPartX('');
    setNewPartY('');
    setAddPartError('');
    setNewVariantName('');
    setNewVariantVin('');
    setAddVariantError('');
    setNewAggregateName('');
    setAddAggregateError('');
    setNewAssemblyName('');
    setAddAssemblyError('');
    setNewSubassemblyName('');
    setAddSubassemblyError('');
    setNewModelName('');
    setAddModelError('');

    resetAllScreens();
  }

  async function fetchModels(authToken) {
    const res = await fetch(`${API}/models`, { headers: authHeader(authToken) });
    setModels(await res.json());
  }

  async function handleSelectModel(model) {
    setMobileTreeOpen(false);
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

  async function handleDiagramFileChosen(e) {
    const file = e.target.files?.[0];
    if (!file || !selectedSubassembly) return;
    setDiagramUploadError('');
    setDiagramUploading(true);
    try {
      const imageUrl = await uploadToCloudinary(file);
      const params = new URLSearchParams({ image_url: imageUrl });
      const res = await fetch(`${API}/subassemblies/${selectedSubassembly.id}/art?${params}`, {
        method: 'PUT',
        headers: authHeader(token),
      });
      if (!res.ok) throw new Error(`Server rejected the image (HTTP ${res.status})`);
      await handleSelectSubassembly(selectedSubassembly);
    } catch (err) {
      setDiagramUploadError(err.message);
    }
    setDiagramUploading(false);
  }

  async function handleAddVideo(e) {
    e.preventDefault();
    if (!selectedPart || !newVideoUrl.trim()) return;
    setAddVideoError('');
    try {
      const params = new URLSearchParams({ url: newVideoUrl.trim(), title: newVideoTitle.trim(), timestamp: newVideoTimestamp.trim() || '0:00' });
      const res = await fetch(`${API}/parts/${selectedPart.id}/videos?${params}`, { method: 'POST', headers: authHeader(token) });
      if (!res.ok) throw new Error(`Server rejected the video (HTTP ${res.status})`);
      setNewVideoUrl('');
      setNewVideoTitle('');
      setNewVideoTimestamp('0:00');
      await handleSelectPart(selectedPart);
    } catch (err) {
      setAddVideoError(err.message);
    }
  }

  async function handleDocFileChosen(e) {
    const file = e.target.files?.[0];
    if (!file || !selectedPart) return;
    setDocUploadError('');
    setDocUploading(true);
    try {
      const docUrl = await uploadToCloudinary(file);
      const params = new URLSearchParams({ url: docUrl });
      const res = await fetch(`${API}/parts/${selectedPart.id}/servicedocs?${params}`, { method: 'POST', headers: authHeader(token) });
      if (!res.ok) throw new Error(`Server rejected the document (HTTP ${res.status})`);
      await handleSelectPart(selectedPart);
    } catch (err) {
      setDocUploadError(err.message);
    }
    setDocUploading(false);
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

  async function handleAddModel() {
    setAddModelError('');
    if (!newModelName.trim()) { setAddModelError('Name is required'); return; }
    const params = new URLSearchParams({ name: newModelName });
    const res = await fetch(`${API}/models?${params}`, { method: 'POST', headers: authHeader(token) });
    if (!res.ok) { setAddModelError('Failed to add — are you sure you are an admin?'); return; }
    setNewModelName('');
    await fetchModels(token);
  }

  async function handleDeleteModel(id) {
    await fetch(`${API}/models/${id}`, { method: 'DELETE', headers: authHeader(token) });
    await fetchModels(token);
  }

  function startEdit(type, item) {
    setEditError('');
    if (type === 'model') setEditing({ type, id: item.id, values: { name: item.name } });
    if (type === 'variant') setEditing({ type, id: item.id, values: { name: item.name, vin: item.vin || '', engine_number: item.engine_number || '' } });
    if (type === 'aggregate' || type === 'assembly' || type === 'subassembly') setEditing({ type, id: item.id, values: { name: item.name } });
    if (type === 'part') setEditing({ type, id: item.id, values: { part_number: item.part_number, description: item.description, hotspot_x: item.hotspot_x ?? '', hotspot_y: item.hotspot_y ?? '', is_alternate: !!item.is_alternate, is_obsolete: !!item.is_obsolete, superseded_by: item.superseded_by || '' } });
  }

  function cancelEdit() {
    setEditing(null);
    setEditError('');
  }

  async function saveEdit() {
    const endpoints = {
      model: `/models/${editing.id}`,
      variant: `/variants/${editing.id}`,
      aggregate: `/aggregates/${editing.id}`,
      assembly: `/assemblies/${editing.id}`,
      subassembly: `/subassemblies/${editing.id}`,
      part: `/parts/${editing.id}`,
    };
    const paramsByType = {
      model: { name: editing.values.name },
      variant: { name: editing.values.name, vin: editing.values.vin, engine_number: editing.values.engine_number },
      aggregate: { name: editing.values.name },
      assembly: { name: editing.values.name },
      subassembly: { name: editing.values.name },
      part: {
        part_number: editing.values.part_number,
        description: editing.values.description,
        hotspot_x: editing.values.hotspot_x,
        hotspot_y: editing.values.hotspot_y,
        is_alternate: editing.values.is_alternate,
        is_obsolete: editing.values.is_obsolete,
        superseded_by: editing.values.superseded_by,
      },
    };
    const rawParams = paramsByType[editing.type];
    const cleanParams = {};
    Object.keys(rawParams).forEach((k) => {
      const v = rawParams[k];
      if (typeof v === 'boolean' || k === 'superseded_by') {
        cleanParams[k] = v;
      } else if (v !== '' && v !== null && v !== undefined) {
        cleanParams[k] = v;
      }
    });
    const params = new URLSearchParams(cleanParams);
    const res = await fetch(`${API}${endpoints[editing.type]}?${params}`, { method: 'PUT', headers: authHeader(token) });
    if (!res.ok) {
      setEditError('Update failed. Please check the fields and try again.');
      return;
    }
    const editedType = editing.type;
    setEditing(null);
    setEditError('');
    if (editedType === 'model') await fetchModels(token);
    if (editedType === 'variant' && selectedModel) {
      const r = await fetch(`${API}/models/${selectedModel.id}/variants`, { headers: authHeader(token) });
      setVariants(await r.json());
    }
    if (editedType === 'aggregate' && selectedVariant) {
      const r = await fetch(`${API}/variants/${selectedVariant.id}/aggregates`, { headers: authHeader(token) });
      setAggregates(await r.json());
    }
    if (editedType === 'assembly' && selectedAggregate) {
      const r = await fetch(`${API}/aggregates/${selectedAggregate.id}/assemblies`, { headers: authHeader(token) });
      setAssemblies(await r.json());
    }
    if (editedType === 'subassembly' && selectedAssembly) {
      const r = await fetch(`${API}/assemblies/${selectedAssembly.id}/subassemblies`, { headers: authHeader(token) });
      setSubassemblies(await r.json());
    }
    if (editedType === 'part' && art) {
      const r = await fetch(`${API}/art/${art.id}/parts`, { headers: authHeader(token) });
      setParts(await r.json());
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
          <button className="mobile-menu-btn" onClick={() => setMobileTreeOpen((o) => !o)} aria-label="Toggle menu">☰</button>
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

  // ---------- Breadcrumb trail ----------
  function Breadcrumb() {
    const crumbs = [{ label: 'Home', onClick: resetAllScreens }];
    if (selectedModel) crumbs.push({ label: selectedModel.name, onClick: () => handleSelectModel(selectedModel) });
    if (selectedVariant) crumbs.push({ label: selectedVariant.name, onClick: () => handleSelectVariant(selectedVariant) });
    if (selectedAggregate) crumbs.push({ label: selectedAggregate.name, onClick: () => handleSelectAggregate(selectedAggregate) });
    if (selectedAssembly) crumbs.push({ label: selectedAssembly.name, onClick: () => handleSelectAssembly(selectedAssembly) });
    if (selectedSubassembly) crumbs.push({ label: selectedSubassembly.name, onClick: () => handleSelectSubassembly(selectedSubassembly) });
    if (selectedPart) crumbs.push({ label: selectedPart.part_number, onClick: null });
    if (crumbs.length === 1) return null;
    return (
      <div className="breadcrumb">
        {crumbs.map((c, i) => (
          <span key={i}>
            {i > 0 && <span style={{ margin: '0 4px' }}>›</span>}
            {c.onClick ? <span className="crumb" onClick={c.onClick}>{c.label}</span> : <span>{c.label}</span>}
          </span>
        ))}
      </div>
    );
  }

  function PartDetailBody() {
    return (
      <>
        <h2 className="title mono">{selectedPart.part_number}</h2>
        <p className="subtitle" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>{selectedPart.description}</p>
        {selectedPart.is_obsolete && (
          <p style={{ fontSize: 13, padding: '4px 10px', borderRadius: 4, background: '#fdecea', color: '#a33', fontWeight: 600, display: 'inline-block', marginRight: 8 }}>
            ⚠ Obsolete{selectedPart.superseded_by ? ` — replaced by ${selectedPart.superseded_by}` : ''}
          </p>
        )}
        {selectedPart.is_alternate && (
          <p style={{ fontSize: 13, padding: '4px 10px', borderRadius: 4, background: '#eef4fb', color: '#2a5', fontWeight: 600, display: 'inline-block' }}>
            Alternate part available
          </p>
        )}
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

        {userRole === 'admin' && (
          <div className="admin-box" style={{ marginTop: 20 }}>
            <div className="section-title">Add Training Video (Admin)</div>
            <form onSubmit={handleAddVideo}>
              <input className="input" placeholder="YouTube or Vimeo URL" value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)} />
              <input className="input" placeholder="Title (optional)" value={newVideoTitle} onChange={(e) => setNewVideoTitle(e.target.value)} />
              <input className="input" placeholder="Jump-to timestamp, e.g. 1:24" value={newVideoTimestamp} onChange={(e) => setNewVideoTimestamp(e.target.value)} />
              <button className="btn" type="submit">Add Video</button>
            </form>
            {addVideoError && <p className="error-text">{addVideoError}</p>}

            <div className="section-title" style={{ marginTop: 16 }}>Add Service Document (Admin)</div>
            <label className="btn btn-secondary" style={{ display: 'inline-block', cursor: 'pointer' }}>
              {docUploading ? 'Uploading…' : 'Upload PDF'}
              <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleDocFileChosen} disabled={docUploading} />
            </label>
            {docUploadError && <p className="error-text">{docUploadError}</p>}
          </div>
        )}
      </>
    );
  }

  // ---------- Main pane content, by selection depth ----------
  function mainPaneContent() {
    // Reached via search or Intelli-Search with no diagram context loaded:
    // show the part on its own full page.
    if (selectedPart && !selectedSubassembly) {
      return (
        <div className="card">
          <PartDetailBody />
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
                  {art?.image_url && (
                    <img src={art.image_url} alt={selectedSubassembly.name} className="diagram-image" />
                  )}
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
                {userRole === 'admin' && (
                  <div style={{ marginTop: 10 }}>
                    <label className="btn btn-secondary" style={{ display: 'inline-block', cursor: 'pointer' }}>
                      {diagramUploading ? 'Uploading…' : (art?.image_url ? 'Replace diagram image' : 'Upload diagram image')}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleDiagramFileChosen} disabled={diagramUploading} />
                    </label>
                    {diagramUploadError && <p className="error-text">{diagramUploadError}</p>}
                  </div>
                )}
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
                    {parts.length === 0 && (
                      <tr><td colSpan={userRole === 'admin' ? 6 : 5} className="muted" style={{ padding: '14px 10px' }}>No parts added yet.</td></tr>
                    )}
                    {parts.map((part, i) => (
                      editing?.type === 'part' && editing.id === part.id ? (
                        <tr key={part.id} style={{ borderBottom: '1px solid #f0efe9', background: 'var(--orange-light)' }}>
                          <td style={{ padding: '8px 10px' }}>{i + 1}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <input className="input" style={{ marginBottom: 0 }} value={editing.values.part_number} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, part_number: e.target.value } })} />
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <input className="input" style={{ marginBottom: 0 }} value={editing.values.description} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, description: e.target.value } })} />
                          </td>
                          <td style={{ padding: '8px 10px' }} colSpan={2}>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                              <input className="input" style={{ marginBottom: 0, width: 70 }} type="number" placeholder="Hotspot X" value={editing.values.hotspot_x} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, hotspot_x: e.target.value } })} />
                              <input className="input" style={{ marginBottom: 0, width: 70 }} type="number" placeholder="Hotspot Y" value={editing.values.hotspot_y} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, hotspot_y: e.target.value } })} />
                              <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 13 }}>
                                <input type="checkbox" checked={editing.values.is_alternate} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, is_alternate: e.target.checked } })} />
                                Alternate
                              </label>
                              <label style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 13 }}>
                                <input type="checkbox" checked={editing.values.is_obsolete} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, is_obsolete: e.target.checked } })} />
                                Obsolete
                              </label>
                              <input className="input" style={{ marginBottom: 0, width: 140 }} placeholder="Superseded by (part #)" value={editing.values.superseded_by} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, superseded_by: e.target.value } })} />
                            </div>
                          </td>
                          {userRole === 'admin' && (
                            <td style={{ padding: '8px 10px' }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn" onClick={saveEdit}>Save</button>
                                <button className="btn btn-secondary" onClick={cancelEdit}>Cancel</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ) : (
                        <tr
                          key={part.id}
                          style={{ borderBottom: '1px solid #f0efe9', background: hoveredPartId === part.id ? 'var(--orange-light)' : 'white', cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredPartId(part.id)}
                          onClick={() => handleSelectPart(part)}
                        >
                          <td style={{ padding: '8px 10px' }}>{i + 1}</td>
                          <td style={{ padding: '8px 10px', color: 'var(--orange-dark)', fontWeight: 600, textDecoration: 'underline' }}>{part.part_number}</td>
                          <td style={{ padding: '8px 10px' }}>
                            {part.description}
                            {part.is_obsolete && (
                              <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 6px', borderRadius: 4, background: '#fdecea', color: '#a33', fontWeight: 600 }}>
                                Obsolete{part.superseded_by ? ` — see ${part.superseded_by}` : ''}
                              </span>
                            )}
                            {part.is_alternate && (
                              <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 6px', borderRadius: 4, background: '#eef4fb', color: '#2a5', fontWeight: 600 }}>
                                Alternate
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 10px' }}>1</td>
                          <td style={{ padding: '8px 10px' }}>-</td>
                          {userRole === 'admin' && (
                            <td style={{ padding: '8px 10px' }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); startEdit('part', part); }}>Edit</button>
                                <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); requestConfirm(`Delete part ${part.part_number}? This cannot be undone.`, () => handleDeletePart(part.id)); }}>Delete</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    ))}
                  </tbody>
                </table>
                {editError && <p className="error-text" style={{ padding: '0 14px' }}>{editError}</p>}

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

          {selectedPart && (
            <div className="part-panel-backdrop" onClick={() => setSelectedPart(null)}>
              <div className="part-panel" onClick={(e) => e.stopPropagation()}>
                <button className="part-panel-close" onClick={() => setSelectedPart(null)}>✕</button>
                <PartDetailBody />
              </div>
            </div>
          )}
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
            {subassemblies.length === 0 && <li className="muted" style={{ padding: '12px 18px' }}>No sub-assemblies yet.</li>}
            {subassemblies.map((sa) => (
              <li key={sa.id} style={{ ...listItem, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {editing?.type === 'subassembly' && editing.id === sa.id ? (
                  <div style={{ display: 'flex', gap: 6, flex: 1, alignItems: 'center' }}>
                    <input className="input" style={{ marginBottom: 0 }} value={editing.values.name} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, name: e.target.value } })} />
                    <button className="btn" onClick={saveEdit}>Save</button>
                    <button className="btn btn-secondary" onClick={cancelEdit}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <span style={{ cursor: 'pointer', flex: 1 }} onClick={() => handleSelectSubassembly(sa)}>{sa.name}</span>
                    {userRole === 'admin' && (
                      <span style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary" onClick={() => startEdit('subassembly', sa)}>Edit</button>
                        <button className="btn btn-danger" onClick={() => requestConfirm(`Delete sub-assembly "${sa.name}"? This also removes its diagram and parts.`, () => handleDeleteSubassembly(sa.id))}>Delete</button>
                      </span>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
          {editError && <p className="error-text">{editError}</p>}
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
            {assemblies.length === 0 && <li className="muted" style={{ padding: '12px 18px' }}>No assemblies yet.</li>}
            {assemblies.map((a) => (
              <li key={a.id} style={{ ...listItem, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {editing?.type === 'assembly' && editing.id === a.id ? (
                  <div style={{ display: 'flex', gap: 6, flex: 1, alignItems: 'center' }}>
                    <input className="input" style={{ marginBottom: 0 }} value={editing.values.name} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, name: e.target.value } })} />
                    <button className="btn" onClick={saveEdit}>Save</button>
                    <button className="btn btn-secondary" onClick={cancelEdit}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <span style={{ cursor: 'pointer', flex: 1 }} onClick={() => handleSelectAssembly(a)}>{a.name}</span>
                    {userRole === 'admin' && (
                      <span style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary" onClick={() => startEdit('assembly', a)}>Edit</button>
                        <button className="btn btn-danger" onClick={() => requestConfirm(`Delete assembly "${a.name}"? This also removes everything under it.`, () => handleDeleteAssembly(a.id))}>Delete</button>
                      </span>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
          {editError && <p className="error-text">{editError}</p>}
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
            {aggregates.length === 0 && <li className="muted" style={{ padding: '12px 18px' }}>No aggregates yet.</li>}
            {aggregates.map((agg) => (
              <li key={agg.id} style={{ ...listItem, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {editing?.type === 'aggregate' && editing.id === agg.id ? (
                  <div style={{ display: 'flex', gap: 6, flex: 1, alignItems: 'center' }}>
                    <input className="input" style={{ marginBottom: 0 }} value={editing.values.name} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, name: e.target.value } })} />
                    <button className="btn" onClick={saveEdit}>Save</button>
                    <button className="btn btn-secondary" onClick={cancelEdit}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <span style={{ cursor: 'pointer', flex: 1 }} onClick={() => handleSelectAggregate(agg)}>{agg.name}</span>
                    {userRole === 'admin' && (
                      <span style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary" onClick={() => startEdit('aggregate', agg)}>Edit</button>
                        <button className="btn btn-danger" onClick={() => requestConfirm(`Delete aggregate "${agg.name}"? This also removes everything under it.`, () => handleDeleteAggregate(agg.id))}>Delete</button>
                      </span>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
          {editError && <p className="error-text">{editError}</p>}
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
            {variants.length === 0 && <li className="muted" style={{ padding: '12px 18px' }}>No variants yet.</li>}
            {variants.map((v) => (
              <li key={v.id} style={{ ...listItem, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {editing?.type === 'variant' && editing.id === v.id ? (
                  <div style={{ display: 'flex', gap: 6, flex: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input className="input" style={{ marginBottom: 0, width: 140 }} placeholder="Name" value={editing.values.name} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, name: e.target.value } })} />
                    <input className="input" style={{ marginBottom: 0, width: 140 }} placeholder="VIN" value={editing.values.vin} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, vin: e.target.value } })} />
                    <input className="input" style={{ marginBottom: 0, width: 160 }} placeholder="Engine number" value={editing.values.engine_number} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, engine_number: e.target.value } })} />
                    <button className="btn" onClick={saveEdit}>Save</button>
                    <button className="btn btn-secondary" onClick={cancelEdit}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <span style={{ cursor: 'pointer', flex: 1 }} onClick={() => handleSelectVariant(v)}>{v.name}</span>
                    {userRole === 'admin' && (
                      <span style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary" onClick={() => startEdit('variant', v)}>Edit</button>
                        <button className="btn btn-danger" onClick={() => requestConfirm(`Delete variant "${v.name}"? This also removes everything under it.`, () => handleDeleteVariant(v.id))}>Delete</button>
                      </span>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
          {editError && <p className="error-text">{editError}</p>}
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
        <div className="home-hero">
          <h1>Find any part in seconds</h1>
          <p>Search by description, part number, VIN, engine number or module — or just ask Intelli-Search.</p>
        </div>
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

        <div className="card-flat">
          <div style={{ padding: '16px 18px 0 18px' }} className="section-title">Browse by Model</div>
          <div className="model-card-grid">
            {models.length === 0 && <p className="muted" style={{ padding: '0 18px' }}>No models yet. Add one below.</p>}
            {models.map((m) => (
              editing?.type === 'model' && editing.id === m.id ? (
                <div key={m.id} className="model-card" style={{ cursor: 'default' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
                    <input className="input" style={{ marginBottom: 0 }} value={editing.values.name} onChange={(e) => setEditing({ ...editing, values: { ...editing.values, name: e.target.value } })} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn" onClick={saveEdit}>Save</button>
                      <button className="btn btn-secondary" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={m.id} className="model-card" onClick={() => handleSelectModel(m)}>
                  <div className="model-card-icon">{m.name.trim().charAt(0).toUpperCase()}</div>
                  <div className="model-card-name">{m.name}</div>
                  {userRole === 'admin' && (
                    <div className="model-card-admin" onClick={(e) => e.stopPropagation()}>
                      <button className="btn btn-secondary" onClick={() => startEdit('model', m)}>Edit</button>
                      <button className="btn btn-danger" onClick={() => requestConfirm(`Delete model "${m.name}"? This also removes every variant, aggregate, assembly and part under it.`, () => handleDeleteModel(m.id))}>Delete</button>
                    </div>
                  )}
                </div>
              )
            ))}
          </div>
          {editError && <p className="error-text" style={{ padding: '0 18px' }}>{editError}</p>}
          {userRole === 'admin' && (
            <div className="admin-box">
              <div className="section-title">Add a New Model (Admin)</div>
              <input className="input" placeholder="Model name" value={newModelName} onChange={(e) => setNewModelName(e.target.value)} />
              <button className="btn" onClick={handleAddModel}>Add Model</button>
              {addModelError && <p className="error-text">{addModelError}</p>}
            </div>
          )}
        </div>
      </>
    );
  }

  // ---------- Top-level render ----------
  if (!token) {
    return (
      <div className="login-wrap">
        <div className="login-panel">
          <div className="login-panel-brand">
            <span className="dot"></span>ATOMISM
          </div>
          <h1 className="login-panel-headline">Electronic Parts Catalogue</h1>
          <p className="login-panel-copy">
            Look up parts by VIN, engine number, module or description — see the
            exploded diagram, the BOM, the right training video and the right
            service document, all in one place.
          </p>
          <ul className="login-panel-list">
            <li>5 ways to find any part</li>
            <li>Intelli-Search, the AI assistant</li>
            <li>Every answer cited back to its source</li>
          </ul>
        </div>
        <div className="login-form-side">
          <div className="login-card">
            <h2 className="login-card-title">Sign in</h2>
            <p className="subtitle" style={{ marginBottom: 20 }}>Parts · Service · Training</p>
            <form onSubmit={handleLogin}>
              <input className="input" type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
              <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button className="btn" type="submit" style={{ width: '100%' }} disabled={loginLoading}>{loginLoading ? 'Logging in…' : 'Log in'}</button>
              {error && <p className="error-text">{error}</p>}
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopNav />
      <div className="body-shell">
        <div className={`tree-sidebar-wrap ${mobileTreeOpen ? 'tree-sidebar-open' : ''}`}>
          <TreeSidebar />
        </div>
        {mobileTreeOpen && <div className="tree-sidebar-backdrop" onClick={() => setMobileTreeOpen(false)} />}
        <div className="main-pane"><Breadcrumb />{mainPaneContent()}</div>
      </div>

      {confirmDialog && (
        <div className="part-panel-backdrop" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p>{confirmDialog.message}</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDialog(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <button className="chat-fab" onClick={() => setChatWidgetOpen((o) => !o)} title="Intelli-Search">
        {chatWidgetOpen ? '✕' : '💬'}
      </button>

      {chatWidgetOpen && (
        <div className="chat-widget">
          <div className="chat-widget-header">Intelli-Search (AI Assistant)</div>
          <div className="chat-widget-body">
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
            {chatResult?.citations?.map((c, i) => (
              <div key={i} style={{ marginTop: 8 }}>
                {c.type === 'video' ? (
                  <a href={buildTimestampedUrl(c.url, c.timestamp)} target="_blank" rel="noreferrer">
                    📹 {c.label}{c.timestamp ? ` — jumps to ${c.timestamp}s` : ''}
                  </a>
                ) : (
                  <a href={c.url} target="_blank" rel="noreferrer">📄 {c.label}</a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;