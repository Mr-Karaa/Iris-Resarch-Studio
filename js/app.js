/**
 * IRIS Research Studio v2.0 - Core Application Controller (app.js)
 * Fully updated for next-generation Research OS.
 */

// Global Variables
let currentTab = 'dashboard';
let activeTypeFilter = 'all';
let currentRecordId = null;
let editorMode = 'a4'; // a4, canvas, split
let activeBPTab = 'comments'; // comments, tasks, attachments, versions, timeline
let canvasZoom = 1.0;
let canvasOffsetX = 0;
let canvasOffsetY = 0;
let isDraggingCanvas = false;
let startDragX = 0;
let startDragY = 0;
let currentReportType = 'pdf';
let selectedContextRecordId = null;

// Global Error Boundary for Debugging
window.onerror = function(message, source, lineno, colno, error) {
  const errDiv = document.createElement('div');
  errDiv.style.position = 'fixed';
  errDiv.style.top = '10px';
  errDiv.style.left = '10px';
  errDiv.style.background = 'rgba(244,63,94,0.95)';
  errDiv.style.color = '#fff';
  errDiv.style.padding = '12px 18px';
  errDiv.style.borderRadius = '8px';
  errDiv.style.zIndex = '999999';
  errDiv.style.fontSize = '12px';
  errDiv.style.fontFamily = 'monospace';
  errDiv.style.border = '1px solid #f43f5e';
  errDiv.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
  errDiv.innerHTML = `<strong>JS Hata Yakalandı:</strong> ${message}<br><small>${source}:${lineno}:${colno}</small>`;
  document.body.appendChild(errDiv);
  setTimeout(() => errDiv.remove(), 10000);
  return false;
};

// Lifecycle
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  // Try loading Lucide icons
  tryCreateIcons();

  // Load Theme
  const savedTheme = localStorage.getItem('iris_theme') || 'midnight';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeUI(savedTheme);

  // Load Profile
  loadProfile();

  // Load Workspace Date
  updateWorkspaceDate();

  // Load Sidebar Explorer Trees
  seedSampleRecordsIfEmpty();
  renderSidebarTrees();

  // Setup Event Listeners
  setupGlobalListeners();
  if (typeof setupImageDragAndDrop === 'function') setupImageDragAndDrop();

  // Initial Navigation
  switchTab('dashboard');

  // Log activity
  logActivity('visit');

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Service Worker registered successfully:', reg.scope))
        .catch(err => console.log('Service Worker registration failed:', err));
    });
  }
}

function tryCreateIcons() {
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function updateWorkspaceDate() {
  const dateEl = document.getElementById('dash-date-display');
  if (dateEl) {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = now.toLocaleDateString('tr-TR', options);
  }
}

// ====================================================
// GREETINGS & NOTIFICATIONS (TOASTS)
// ====================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle-2';
  if (type === 'danger') iconName = 'alert-triangle';
  if (type === 'warning') iconName = 'alert-circle';

  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  tryCreateIcons();

  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 10);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// ====================================================
// EVENT LISTENERS & SHORTCUTS
// ====================================================
function setupGlobalListeners() {
  // Global search input
  const globSearch = document.getElementById('global-search-input');
  if (globSearch) {
    globSearch.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      // If we are not in library, switch to it to show results
      if (currentTab !== 'library' && currentTab !== 'editor') {
        switchTab('library');
      }
      if (currentTab === 'library') {
        document.getElementById('lib-search').value = e.target.value;
        filterLibrary();
      } else if (currentTab === 'editor') {
        // filter explorer tree
        filterExplorerTree(q);
      }
    });
  }

  // Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    // CMD/Ctrl + K Focus Search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      const globSearch = document.getElementById('global-search-input');
      if (globSearch) globSearch.focus();
    }
    
    // Esc closes modals
    if (e.key === 'Escape') {
      closeAllModals();
    }

    // CMD/Ctrl + S in Editor Saves
    if ((e.metaKey || e.ctrlKey) && e.key === 's' && currentTab === 'editor') {
      e.preventDefault();
      saveCurrentRecord();
    }
  });

  // Global Context Menu Closer
  document.addEventListener('click', () => {
    const menu = document.getElementById('ctx-menu');
    if (menu) menu.style.display = 'none';
  });

  // Split View change listeners
  const notesSplit = document.getElementById('rec-form-notes-split');
  const notesMain = document.getElementById('rec-form-notes');
  if (notesSplit && notesMain) {
    notesSplit.addEventListener('input', (e) => {
      notesMain.value = e.target.value;
      triggerWordCount();
      triggerAutosave();
    });
    notesMain.addEventListener('input', (e) => {
      notesSplit.value = e.target.value;
      triggerWordCount();
      triggerAutosave();
    });
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

// ====================================================
// NAVIGATION & TABS
// ====================================================
function switchTab(tabId) {
  currentTab = tabId;

  // Update nav UI
  document.querySelectorAll('#sidebar-nav .nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-tab') === tabId);
  });

  // Show/Hide tab panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabId}`);
  });

  // Reload data for specific tab
  if (tabId === 'dashboard') {
    renderDashboard();
  } else if (tabId === 'library') {
    renderLibrary();
  } else if (tabId === 'trash') {
    renderTrash();
  } else if (tabId === 'reports') {
    renderReportsPage();
  } else if (tabId === 'editor') {
    const records = window.IRIS_DB.getRecords();
    if (currentRecordId) {
      populateEditorFields(currentRecordId);
    } else if (records.length > 0) {
      currentRecordId = records[0].id;
      populateEditorFields(records[0].id);
    }
  }

  updateSidebarBadges();
}

function updateSidebarBadges() {
  const records = window.IRIS_DB.getRecords();
  const allRecords = window.IRIS_DB.getRecords(true);
  const deletedCount = allRecords.filter(r => r.isDeleted).length;

  const libBadge = document.getElementById('nav-badge-library');
  const trashBadge = document.getElementById('nav-badge-trash');

  if (libBadge) libBadge.textContent = records.length;
  if (trashBadge) {
    trashBadge.textContent = deletedCount;
    trashBadge.style.display = deletedCount > 0 ? 'inline-flex' : 'none';
  }
}

// ====================================================
// SIDEBAR EXPLORER TREES
// ====================================================
function renderSidebarTrees() {
  renderExplorerCollections();
  renderExplorerTypes();
  renderExplorerFavorites();
}

function renderExplorerCollections() {
  const tree = document.getElementById('exp-collections-tree');
  if (!tree) return;

  const cols = window.IRIS_DB.getCollections();
  const records = window.IRIS_DB.getRecords();

  if (cols.length === 0) {
    tree.innerHTML = `<span class="exp-empty">Koleksiyon yok</span>`;
    return;
  }

  let html = '';
  cols.forEach(col => {
    const colCount = records.filter(r => String(r.collectionId) === String(col.id)).length;
    html += `
      <div class="exp-node" onclick="filterLibraryByCollection('${col.id}')">
        <i data-lucide="folder" class="exp-icon" style="color:var(--primary-light)"></i>
        <span class="exp-text">${escapeHTML(col.name)}</span>
        <span class="exp-badge">${colCount}</span>
      </div>
    `;
  });
  tree.innerHTML = html;
  tryCreateIcons();
}

function renderExplorerTypes() {
  const tree = document.getElementById('exp-types-tree');
  if (!tree) return;

  const records = window.IRIS_DB.getRecords();
  const typeMap = {
    patent: { name: 'Patent', icon: 'scroll-text', color: 'var(--primary-light)' },
    article: { name: 'Makale / Yayın', icon: 'book-open', color: 'var(--primary-light)' },
    standard: { name: 'Standart / Norm', icon: 'shield-check', color: 'var(--primary-light)' },
    project: { name: 'Proje', icon: 'folder-kanban', color: 'var(--primary-light)' },
    note: { name: 'Araştırma Notu', icon: 'sticky-note', color: 'var(--primary-light)' },
    other: { name: 'Diğer', icon: 'file', color: 'var(--text-muted)' }
  };

  let html = '';
  Object.keys(typeMap).forEach(key => {
    const count = records.filter(r => r.type === key).length;
    if (count > 0) {
      html += `
        <div class="exp-node" onclick="filterLibraryByType('${key}')">
          <i data-lucide="${typeMap[key].icon}" class="exp-icon" style="color:${typeMap[key].color}"></i>
          <span class="exp-text">${typeMap[key].name}</span>
          <span class="exp-badge">${count}</span>
        </div>
      `;
    }
  });

  if (!html) {
    tree.innerHTML = `<span class="exp-empty">Kayıt yok</span>`;
  } else {
    tree.innerHTML = html;
  }
  tryCreateIcons();
}

function renderExplorerFavorites() {
  const tree = document.getElementById('exp-fav-tree');
  if (!tree) return;

  const favs = window.IRIS_DB.getRecords().filter(r => r.isFavorite);
  if (favs.length === 0) {
    tree.innerHTML = `<span class="exp-empty">Favori yok</span>`;
    return;
  }

  let html = '';
  favs.forEach(r => {
    html += `
      <div class="exp-node" onclick="openRecordEditor('${r.id}')">
        <i data-lucide="star" class="exp-icon" style="color:var(--accent-amber)"></i>
        <span class="exp-text text-truncate" style="max-width:140px;">${escapeHTML(r.title)}</span>
      </div>
    `;
  });
  tree.innerHTML = html;
  tryCreateIcons();
}

function toggleExpSection(hdr) {
  const arrow = hdr.querySelector('.exp-arrow');
  const content = hdr.nextElementSibling;
  if (!content) return;

  if (content.style.display === 'none') {
    content.style.display = 'block';
    if (arrow) arrow.style.transform = 'rotate(0deg)';
  } else {
    content.style.display = 'none';
    if (arrow) arrow.style.transform = 'rotate(-90deg)';
  }
}

// ====================================================
// DASHBOARD VIEW
// ====================================================
function renderDashboard() {
  const records = window.IRIS_DB.getRecords();
  
  // Set Username
  const profName = localStorage.getItem('iris_profile_name') || 'Araştırmacı';
  const nameEl = document.getElementById('dash-user-name');
  if (nameEl) nameEl.textContent = profName;

  // Stat Cards
  const statTotal = document.getElementById('stat-total');
  const statCompleted = document.getElementById('stat-completed');
  const statFav = document.getElementById('stat-fav');
  const statWords = document.getElementById('stat-words');

  const completedCount = records.filter(r => r.status === 'tamamlandi').length;
  const favCount = records.filter(r => r.isFavorite).length;

  let totalWords = 0;
  records.forEach(r => {
    if (r.analysisNotes) {
      totalWords += r.analysisNotes.trim().split(/\s+/).filter(w => w.length > 0).length;
    }
  });

  if (statTotal) statTotal.textContent = records.length;
  if (statCompleted) statCompleted.textContent = completedCount;
  if (statFav) statFav.textContent = favCount;
  if (statWords) statWords.textContent = formatWordCount(totalWords);

  // Heatmap
  renderActivityHeatmap();

  // Recent list
  renderRecentDocuments();

  // Research score
  renderResearchScore(records, completedCount, totalWords);

  // Type breakdown
  renderTypeBreakdown(records);
}

function formatWordCount(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num;
}

function renderActivityHeatmap() {
  const grid = document.getElementById('heatmap-grid');
  if (!grid) return;

  grid.innerHTML = '';
  const logs = JSON.parse(localStorage.getItem('iris_activity_log') || '{}');
  const now = new Date();
  
  // Compute activity levels for the last 35 days (5 weeks)
  const cells = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const count = logs[dateStr] || 0;
    
    let level = 0;
    if (count > 0 && count <= 2) level = 1;
    else if (count > 2 && count <= 5) level = 2;
    else if (count > 5) level = 3;

    cells.push({ date: dateStr, count, level });
  }

  cells.forEach(c => {
    const cell = document.createElement('div');
    cell.className = `heatmap-cell level-${c.level}`;
    cell.setAttribute('title', `${c.date}: ${c.count} aktivite`);
    grid.appendChild(cell);
  });
}

function renderRecentDocuments() {
  const container = document.getElementById('dash-recent-list');
  if (!container) return;

  const records = window.IRIS_DB.getRecords();
  const sorted = records.slice().sort((a, b) => new Date(b.dateUpdated || 0) - new Date(a.dateUpdated || 0)).slice(0, 5);

  if (sorted.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:20px 0">
        <div class="empty-icon"><i data-lucide="inbox"></i></div>
        <p>Henüz bilgi nesnesi yok.</p>
      </div>
    `;
    tryCreateIcons();
    return;
  }

  const typeIcons = {
    patent: 'scroll-text', article: 'book-open', standard: 'shield-check',
    project: 'folder-kanban', note: 'sticky-note', other: 'file'
  };
  const typeLabels = { patent: 'Patent', article: 'Makale', standard: 'Standart', project: 'Proje', note: 'Not', other: 'Diğer' };

  let html = '';
  sorted.forEach(rec => {
    const icon = typeIcons[rec.type] || 'file';
    const lbl  = typeLabels[rec.type] || rec.type;
    html += `
      <div class="recent-item" onclick="openRecordEditor('${rec.id}')">
        <div class="recent-item-icon type-${rec.type}">
          <i data-lucide="${icon}"></i>
        </div>
        <div class="recent-item-info">
          <div class="recent-item-title">${escapeHTML(rec.title)}</div>
          <div class="recent-item-meta">${rec.code || 'DOC'} · ${rec.dateUpdated ? rec.dateUpdated.substring(0, 10) : ''}</div>
        </div>
        <span class="ri-badge type-${rec.type}">${lbl}</span>
      </div>
    `;
  });
  container.innerHTML = html;
  tryCreateIcons();
}


function renderResearchScore(records, completed, words) {
  const scoreValueEl = document.getElementById('score-value');
  const scoreLabelEl = document.getElementById('score-label');
  const ringFill = document.getElementById('score-ring-fill');

  if (!scoreValueEl || !scoreLabelEl || !ringFill) return;

  // Algorithm: Total objects (10pts each, max 40), Completed objects (15pts each, max 30), Words (1pt per 100 words, max 30)
  const objPoints = Math.min(records.length * 10, 40);
  const compPoints = Math.min(completed * 15, 30);
  const wordPoints = Math.min(Math.floor(words / 100), 30);
  const totalScore = objPoints + compPoints + wordPoints;

  scoreValueEl.textContent = totalScore;
  
  let label = 'Başlangıç';
  if (totalScore > 80) label = 'Bilim İnsanı';
  else if (totalScore > 60) label = 'Uzman Mucit';
  else if (totalScore > 40) label = 'Deneyimli';
  else if (totalScore > 20) label = 'Gelişmekte Olan';

  scoreLabelEl.textContent = label;

  // Circumference is 239
  const offset = 239 - (totalScore / 100) * 239;
  ringFill.setAttribute('stroke-dashoffset', offset);
}

function renderTypeBreakdown(records) {
  const container = document.getElementById('type-breakdown-list');
  if (!container) return;

  const counts = { patent: 0, article: 0, standard: 0, project: 0, note: 0, other: 0 };
  records.forEach(r => {
    if (counts[r.type] !== undefined) counts[r.type]++;
    else counts.other++;
  });

  const total = records.length || 1;
  const types = [
    { key: 'patent', label: 'Patent', color: '#6366f1' },
    { key: 'article', label: 'Makale / Yayın', color: '#10b981' },
    { key: 'standard', label: 'Standart / Norm', color: '#fbbf24' },
    { key: 'project', label: 'Proje', color: '#0ea5e9' },
    { key: 'note', label: 'Araştırma Notu', color: '#ec4899' },
    { key: 'other', label: 'Diğer', color: '#94a3b8' }
  ];

  let html = '';
  types.forEach(t => {
    const val = counts[t.key];
    const pct = Math.round((val / total) * 100);
    html += `
      <div class="type-bd-row">
        <div class="tbd-hdr">
          <span class="tbd-lbl"><span class="tbd-dot" style="background:${t.color}"></span>${t.label}</span>
          <span class="tbd-val">${val} (${pct}%)</span>
        </div>
        <div class="tbd-bar-bg">
          <div class="tbd-bar-fill" style="width:${pct}%; background:${t.color}"></div>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

// ====================================================
// LIBRARY VIEW
// ====================================================
let libViewMode = 'grid'; // grid, list

function setLibView(mode) {
  libViewMode = mode;
  document.getElementById('view-btn-grid').classList.toggle('active', mode === 'grid');
  document.getElementById('view-btn-list').classList.toggle('active', mode === 'list');
  
  document.getElementById('lib-grid').classList.toggle('hidden', mode !== 'grid');
  document.getElementById('lib-list').classList.toggle('hidden', mode !== 'list');
  renderLibrary();
}

function setTypeFilter(type, chip) {
  activeTypeFilter = type;
  document.querySelectorAll('#lib-filters .filter-chip').forEach(btn => {
    btn.classList.remove('active');
  });
  if (chip) chip.classList.add('active');
  renderLibrary();
}

function filterLibrary() {
  renderLibrary();
}

function renderLibrary() {
  const records = window.IRIS_DB.getRecords();
  const searchQ = document.getElementById('lib-search').value.toLowerCase();
  const sortBy = document.getElementById('lib-sort').value;

  // Filter
  let filtered = records.filter(r => {
    const matchSearch = r.title.toLowerCase().includes(searchQ) ||
      (r.code && r.code.toLowerCase().includes(searchQ)) ||
      (r.authors && r.authors.toLowerCase().includes(searchQ)) ||
      (r.tags && r.tags.some(t => t.toLowerCase().includes(searchQ)));

    let matchType = true;
    if (activeTypeFilter === 'favorite') {
      matchType = r.isFavorite;
    } else if (activeTypeFilter !== 'all') {
      matchType = r.type === activeTypeFilter;
    }

    return matchSearch && matchType;
  });

  // Sort
  if (sortBy === 'newest') {
    filtered.sort((a,b) => new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0));
  } else if (sortBy === 'oldest') {
    filtered.sort((a,b) => new Date(a.dateAdded || 0) - new Date(b.dateAdded || 0));
  } else if (sortBy === 'title') {
    filtered.sort((a,b) => a.title.localeCompare(b.title));
  } else if (sortBy === 'progress') {
    filtered.sort((a,b) => (b.progress || 0) - (a.progress || 0));
  }

  // Display control
  const gridContainer = document.getElementById('lib-grid');
  const listBody = document.getElementById('lib-list-body');
  const emptyState = document.getElementById('lib-empty');

  if (filtered.length === 0) {
    gridContainer.innerHTML = '';
    listBody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  const typeLabels = { patent: 'Patent', article: 'Makale', standard: 'Standart', project: 'Proje', note: 'Not', other: 'Diğer' };
  const typeIcons = { patent: 'scroll-text', article: 'book-open', standard: 'shield-check', project: 'folder-kanban', note: 'sticky-note', other: 'file' };

  if (libViewMode === 'grid') {
    let html = '';
    filtered.forEach(rec => {
      const isFav = rec.isFavorite ? 'active' : '';
      const progress = rec.progress || 0;
      const tagHtml = (rec.tags || []).map(t => `<span class="tag">#${escapeHTML(t)}</span>`).join('');
      
      html += `
        <div class="doc-card" data-id="${rec.id}" oncontextmenu="showContextMenu(event, '${rec.id}')">
          <div class="record-card-top">
            <div class="record-header">
              <span class="badge badge-${rec.type}">${typeLabels[rec.type]}</span>
              <span class="record-code">${rec.code || 'DOC'}</span>
              <i data-lucide="star" class="fav-star ${isFav}" onclick="toggleRecordFavorite('${rec.id}', event)"></i>
            </div>
            <h3 class="doc-card-title" onclick="openRecordDetail('${rec.id}')">${escapeHTML(rec.title)}</h3>
            <p class="doc-card-excerpt">${escapeHTML(rec.authors || 'Yazar belirtilmemiş')}</p>
          </div>
          
          <div style="margin:12px 0">
            <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--text-muted); margin-bottom:3px">
              <span>Süreç İlerlemesi</span>
              <strong>${progress}%</strong>
            </div>
            <div class="doc-progress"><div class="doc-progress-fill" style="width:${progress}%"></div></div>
          </div>

          <div class="record-tags">${tagHtml}</div>
          
          <div class="record-actions">
            <button class="btn btn-secondary btn-sm" onclick="openRecordEditor('${rec.id}')">
              <i data-lucide="file-edit" style="width:10px;height:10px"></i> Düzenle
            </button>
            <button class="btn btn-secondary btn-sm" onclick="openRecordDetail('${rec.id}')">
              <i data-lucide="eye" style="width:10px;height:10px"></i> İncele
            </button>
          </div>
        </div>
      `;
    });
    gridContainer.innerHTML = html;
  } else {
    // List Mode
    let html = '';
    filtered.forEach(rec => {
      const isFav = rec.isFavorite ? 'active' : '';
      const progress = rec.progress || 0;
      const icon = typeIcons[rec.type] || 'file';
      const statusLabel = rec.status === 'tamamlandi' ? 'Tamamlandı' : (rec.status === 'incelemede' ? 'İncelemede' : 'Taslak');

      html += `
        <div class="doc-row" onclick="openRecordDetail('${rec.id}')" oncontextmenu="showContextMenu(event, '${rec.id}')">
          <div style="display:flex;align-items:center;gap:6px">
            <i data-lucide="star" class="fav-star ${isFav}" style="width:12px;height:12px" onclick="toggleRecordFavorite('${rec.id}', event)"></i>
            <i data-lucide="${icon}" style="width:12px;height:12px;color:var(--primary-light)"></i>
          </div>
          <div class="doc-row-title" style="font-weight:700">${escapeHTML(rec.title)}</div>
          <div><span class="badge badge-${rec.type}" style="padding:1px 5px;font-size:9px;">${typeLabels[rec.type]}</span></div>
          <div><span style="font-size:10px;color:var(--text-secondary)">${statusLabel}</span></div>
          <div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:9px">${progress}%</span>
              <div class="doc-progress" style="width:50px;height:4px;margin:0"><div class="doc-progress-fill" style="width:${progress}%"></div></div>
            </div>
          </div>
          <div style="font-size:10px;color:var(--text-faint)">${rec.dateAdded || ''}</div>
        </div>
      `;
    });
    listBody.innerHTML = html;
  }
  tryCreateIcons();
}

function filterLibraryByCollection(colId) {
  switchTab('library');
  activeTypeFilter = 'all';
  // Filter dynamically
  const records = window.IRIS_DB.getRecords().filter(r => String(r.collectionId) === String(colId));
  renderLibraryCardsDirect(records);
}

function filterLibraryByType(type) {
  switchTab('library');
  activeTypeFilter = type;
  document.querySelectorAll('#lib-filters .filter-chip').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-filter') === type);
  });
  renderLibrary();
}

function renderLibraryCardsDirect(records) {
  const gridContainer = document.getElementById('lib-grid');
  const emptyState = document.getElementById('lib-empty');
  const listBody = document.getElementById('lib-list-body');
  
  if (records.length === 0) {
    gridContainer.innerHTML = '';
    listBody.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  const typeLabels = { patent: 'Patent', article: 'Makale', standard: 'Standart', project: 'Proje', note: 'Not', other: 'Diğer' };

  let html = '';
  records.forEach(rec => {
    const isFav = rec.isFavorite ? 'active' : '';
    const progress = rec.progress || 0;
    const tagHtml = (rec.tags || []).map(t => `<span class="tag">#${escapeHTML(t)}</span>`).join('');
    
    html += `
      <div class="doc-card" data-id="${rec.id}" oncontextmenu="showContextMenu(event, '${rec.id}')">
        <div class="record-card-top">
          <div class="record-header">
            <span class="badge badge-${rec.type}">${typeLabels[rec.type]}</span>
            <span class="record-code">${rec.code || 'DOC'}</span>
            <i data-lucide="star" class="fav-star ${isFav}" onclick="toggleRecordFavorite('${rec.id}', event)"></i>
          </div>
          <h3 class="doc-card-title" onclick="openRecordDetail('${rec.id}')">${escapeHTML(rec.title)}</h3>
          <p class="doc-card-excerpt">${escapeHTML(rec.authors || 'Yazar belirtilmemiş')}</p>
        </div>
        
        <div style="margin:12px 0">
          <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--text-muted); margin-bottom:3px">
            <span>Süreç İlerlemesi</span>
            <strong>${progress}%</strong>
          </div>
          <div class="doc-progress"><div class="doc-progress-fill" style="width:${progress}%"></div></div>
        </div>

        <div class="record-tags">${tagHtml}</div>
        
        <div class="record-actions">
          <button class="btn btn-secondary btn-sm" onclick="openRecordEditor('${rec.id}')">
            <i data-lucide="file-edit" style="width:10px;height:10px"></i> Düzenle
          </button>
          <button class="btn btn-secondary btn-sm" onclick="openRecordDetail('${rec.id}')">
            <i data-lucide="eye" style="width:10px;height:10px"></i> İncele
          </button>
        </div>
      </div>
    `;
  });
  gridContainer.innerHTML = html;
  tryCreateIcons();
}

function toggleRecordFavorite(id, event) {
  if (event) event.stopPropagation();
  const records = window.IRIS_DB.getRecords(true);
  const rec = records.find(r => String(r.id) === String(id));
  if (rec) {
    rec.isFavorite = !rec.isFavorite;
    window.IRIS_DB.saveRecord(rec);
    showToast(rec.isFavorite ? 'Favorilere eklendi' : 'Favorilerden çıkarıldı', 'success');
    renderLibrary();
    seedSampleRecordsIfEmpty();
  renderSidebarTrees();
  }
}

// ====================================================
// CONTEXT MENU
// ====================================================
function showContextMenu(e, id) {
  e.preventDefault();
  selectedContextRecordId = id;
  const menu = document.getElementById('ctx-menu');
  if (!menu) return;

  const records = window.IRIS_DB.getRecords();
  const rec = records.find(r => String(r.id) === String(id));
  if (!rec) return;

  // Toggle favorite text
  const favItem = document.getElementById('ctx-fav');
  if (favItem) {
    favItem.innerHTML = rec.isFavorite 
      ? `<i data-lucide="star-off" style="width:12px;height:12px;"></i> Favorilerden Çıkar`
      : `<i data-lucide="star" style="width:12px;height:12px;"></i> Favorilere Ekle`;
  }

  menu.style.display = 'block';
  menu.style.left = `${e.pageX}px`;
  menu.style.top = `${e.pageY}px`;
  tryCreateIcons();
}

function ctxAction(action) {
  if (!selectedContextRecordId) return;
  
  if (action === 'edit') {
    openRecordEditor(selectedContextRecordId);
  } else if (action === 'detail') {
    openRecordDetail(selectedContextRecordId);
  } else if (action === 'fav') {
    toggleRecordFavorite(selectedContextRecordId);
  } else if (action === 'delete') {
    deleteRecordWithConfirm(selectedContextRecordId);
  }
}

// ====================================================
// MODAL FOR NEW / EDIT OBJECT
// ====================================================
function openNewObjectModal(defaultType = 'patent') {
  const modal = document.getElementById('new-object-modal');
  if (!modal) return;

  // Reset form
  document.getElementById('modal-record-id').value = '';
  document.getElementById('modal-title').value = '';
  document.getElementById('modal-type').value = defaultType;
  document.getElementById('modal-authors').value = '';
  document.getElementById('modal-source').value = '';
  document.getElementById('modal-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('modal-url').value = '';
  document.getElementById('modal-tags').value = '';
  document.getElementById('modal-status').value = 'taslak';
  document.getElementById('modal-priority').value = 'orta';

  // Load collections
  const colSelect = document.getElementById('modal-collection');
  if (colSelect) {
    const cols = window.IRIS_DB.getCollections();
    let colOptions = '<option value="">— Koleksiyon Seç —</option>';
    cols.forEach(c => {
      colOptions += `<option value="${c.id}">${escapeHTML(c.name)}</option>`;
    });
    colSelect.innerHTML = colOptions;
  }

  document.getElementById('new-object-modal-title').textContent = 'Yeni Bilgi Nesnesi';
  modal.classList.add('active');
}

function saveFromModal() {
  const id = document.getElementById('modal-record-id').value;
  const title = document.getElementById('modal-title').value.trim();
  if (!title) {
    showToast('Lütfen başlık girin!', 'warning');
    return;
  }

  const type = document.getElementById('modal-type').value;
  const collectionId = document.getElementById('modal-collection').value;
  const authors = document.getElementById('modal-authors').value.trim();
  const source = document.getElementById('modal-source').value.trim();
  const datePublished = document.getElementById('modal-date').value;
  const url = document.getElementById('modal-url').value.trim();
  const status = document.getElementById('modal-status').value;
  const priority = document.getElementById('modal-priority').value;
  
  const tagsStr = document.getElementById('modal-tags').value;
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];

  let record = {
    title, type, collectionId, authors, source, datePublished, url, status, priority, tags
  };

  if (id) {
    record.id = id;
    const records = window.IRIS_DB.getRecords(true);
    const existing = records.find(r => String(r.id) === String(id));
    if (existing) {
      record = { ...existing, ...record };
    }
  } else {
    // apply default templates content on new creation
    if (window.TEMPLATES && window.TEMPLATES[type]) {
      record.analysisNotes = window.TEMPLATES[type].content;
    }
  }

  const saved = window.IRIS_DB.saveRecord(record);
  closeAllModals();
  seedSampleRecordsIfEmpty();
  renderSidebarTrees();
  showToast('Belge kaydedildi.', 'success');
  
  // Directly open it in the editor
  openRecordEditor(saved.id);
  logActivity('edit');
}

// ====================================================
// NEW COLLECTION MODAL
// ====================================================
function openNewCollectionModal() {
  const modal = document.getElementById('collection-modal');
  if (!modal) return;
  document.getElementById('col-name').value = '';
  document.getElementById('col-desc').value = '';
  modal.classList.add('active');
}

function saveCollection() {
  const name = document.getElementById('col-name').value.trim();
  const desc = document.getElementById('col-desc').value.trim();
  if (!name) {
    showToast('Lütfen koleksiyon adı girin!', 'warning');
    return;
  }

  // Predefined gorgeous colors for collections
  const colors = ['#6366f1', '#10b981', '#fbbf24', '#0ea5e9', '#ec4899', '#f43f5e', '#8b5cf6'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  window.IRIS_DB.saveCollection({
    name, description: desc, color: randomColor
  });

  closeAllModals();
  seedSampleRecordsIfEmpty();
  renderSidebarTrees();
  showToast('Koleksiyon oluşturuldu', 'success');
  logActivity('collection');
}

// ====================================================
// CONFIRMATION POPUP (MODAL)
// ====================================================
let activeConfirmCallback = null;

function showConfirmation(title, desc, callback, btnText = 'Evet, Devam Et', isDanger = true) {
  const modal = document.getElementById('confirm-modal');
  if (!modal) return;

  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-desc').textContent = desc;
  
  const okBtn = document.getElementById('confirm-ok-btn');
  okBtn.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';
  okBtn.innerHTML = `<i data-lucide="check"></i> ${btnText}`;
  tryCreateIcons();

  activeConfirmCallback = callback;
  okBtn.onclick = () => {
    if (activeConfirmCallback) activeConfirmCallback();
    closeAllModals();
  };

  modal.classList.add('active');
}

// ====================================================
// DETAIL VIEW MODAL
// ====================================================
let detailRecordId = null;

function openRecordDetail(id) {
  detailRecordId = id;
  const modal = document.getElementById('detail-modal');
  if (!modal) return;

  const records = window.IRIS_DB.getRecords();
  const rec = records.find(r => String(r.id) === String(id));
  if (!rec) return;

  document.getElementById('detail-modal-title').textContent = rec.title;
  document.getElementById('detail-modal-sub').textContent = `${rec.code || 'DOC'} · Eklendi: ${rec.dateAdded || ''}`;

  const typeLabels = { patent: 'Patent', article: 'Makale', standard: 'Standart', project: 'Proje', note: 'Not', other: 'Diğer' };
  const statusLabels = { taslak: 'Taslak', incelemede: 'İncelemede', tamamlandi: 'Tamamlandı' };

  let metaHtml = `
    <div class="dm-item"><strong>Tür:</strong> ${typeLabels[rec.type] || 'Diğer'}</div>
    <div class="dm-item"><strong>Yazar:</strong> ${escapeHTML(rec.authors || 'Belirtilmemiş')}</div>
    <div class="dm-item"><strong>Kaynak:</strong> ${escapeHTML(rec.source || 'Belirtilmemiş')}</div>
    <div class="dm-item"><strong>Durum:</strong> ${statusLabels[rec.status] || 'Taslak'}</div>
    <div class="dm-item"><strong>Öncelik:</strong> ${rec.priority ? rec.priority.toUpperCase() : 'ORTA'}</div>
    <div class="dm-item"><strong>Tarih:</strong> ${rec.datePublished || 'Belirtilmemiş'}</div>
  `;
  if (rec.url) {
    metaHtml += `<div class="dm-item" style="grid-column: 1 / -1"><strong>Link:</strong> <a href="${rec.url}" target="_blank">${rec.url}</a></div>`;
  }
  document.getElementById('detail-meta-grid').innerHTML = metaHtml;

  // Simple Markdown Parser for notes
  const notesHtml = rec.analysisNotes 
    ? parseMarkdownSimple(rec.analysisNotes) 
    : '<em>Analiz ve araştırma notu yazılmamış.</em>';
  document.getElementById('detail-notes').innerHTML = notesHtml;

  modal.classList.add('active');
}

function editFromDetail() {
  if (detailRecordId) {
    const id = detailRecordId;
    closeAllModals();
    openRecordEditor(id);
  }
}

function deleteFromDetail() {
  if (detailRecordId) {
    const id = detailRecordId;
    closeAllModals();
    deleteRecordWithConfirm(id);
  }
}

function parseMarkdownSimple(md) {
  let html = md;
  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  // Bold/Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Headings
  html = html.replace(/^### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2>$1</h2>');
  // Bullets
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

// ====================================================
// ARAŞTIRMA EDİTÖRÜ (EDITOR TAB)
// ====================================================
let autosaveTimer = null;


function openRecordEditor(id) {
  if (!id) return;
  currentRecordId = id;
  
  // Directly set tab visibility without calling switchTab to prevent recursion loop
  currentTab = 'editor';
  document.querySelectorAll('#sidebar-nav .nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-tab') === 'editor');
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === 'tab-editor');
  });
  
  populateEditorFields(id);
  updateSidebarBadges();
}

function populateEditorFields(id) {
  const records = window.IRIS_DB.getRecords();
  const rec = records.find(r => String(r.id) === String(id));
  if (!rec) return;

  // Safe helper to set value/text
  const setVal = (elemId, val) => {
    const el = document.getElementById(elemId);
    if (el) el.value = val || '';
  };
  const setTxt = (elemId, txt) => {
    const el = document.getElementById(elemId);
    if (el) el.textContent = txt || '';
  };

  try {
    renderEditorExplorer(id);

    setVal('record-id', rec.id);
    setVal('rec-form-title', rec.title);
    setVal('rec-form-notes', rec.analysisNotes || '');
    setVal('rec-form-notes-split', rec.analysisNotes || '');

    // Restore word layout properties
    const wl = rec.wordLayout || {};
    document.documentElement.dataset.margin = wl.margin || 'normal';
    document.documentElement.dataset.lineSpacing = wl.lineSpacing || '1';
    document.documentElement.dataset.colLayout = wl.colLayout || '1';
    
    setVal('hf-left', wl.headerLeft || '');
    setVal('hf-center', wl.headerCenter || '');
    setVal('hf-right', wl.headerRight || '');
    setVal('hf-ftr-left', wl.footerLeft || '');
    setVal('hf-ftr-center', wl.footerCenter || '');
    setVal('hf-ftr-right', wl.footerRight || '');
    

    setTxt('prop-code', rec.code || 'DOC');
    setVal('rec-form-type', rec.type);
    setVal('rec-form-status', rec.status || 'taslak');
    setVal('rec-form-priority', rec.priority || 'orta');

    const progress = rec.progress || 0;
    setVal('rec-form-progress', progress);
    setTxt('prop-progress-pct', `${progress}%`);
    const fill = document.getElementById('prop-prog-fill');
    if (fill) fill.style.width = `${progress}%`;

    setVal('rec-form-authors', rec.authors || '');
    setVal('rec-form-source', rec.source || '');
    setVal('rec-form-url', rec.url || '');
    setVal('rec-form-date', rec.datePublished || '');

    const fav = document.getElementById('rec-form-fav');
    if (fav) fav.checked = !!rec.isFavorite;

    const colSelect = document.getElementById('rec-form-collection');
    if (colSelect) {
      const cols = window.IRIS_DB.getCollections();
      let colOptions = '<option value="">— Koleksiyon Seç —</option>';
      cols.forEach(c => {
        colOptions += `<option value="${c.id}">${escapeHTML(c.name)}</option>`;
      });
      colSelect.innerHTML = colOptions;
      colSelect.value = rec.collectionId || '';
    }

    if (typeof renderTagsWrap === 'function') renderTagsWrap(rec);
    if (typeof populateRelationsDropdown === 'function') populateRelationsDropdown(rec);
    if (typeof renderRelationsList === 'function') renderRelationsList(rec);

    if (typeof renderCommentsPanel === 'function') renderCommentsPanel(rec);
    if (typeof renderTasksPanel === 'function') renderTasksPanel(rec);
    if (typeof renderAttachmentsPanel === 'function') renderAttachmentsPanel(rec);
    if (typeof renderVersionsPanel === 'function') renderVersionsPanel(rec);
    if (typeof renderTimelinePanel === 'function') renderTimelinePanel(rec);

    if (typeof setEditorMode === 'function') setEditorMode(editorMode || 'a4');
    if (typeof triggerWordCount === 'function') triggerWordCount();
    if (typeof renderMultiPageA4Sheets === 'function') renderMultiPageA4Sheets();
    if (typeof renderDocumentOutline === 'function') renderDocumentOutline();

    const indicator = document.getElementById('autosave-indicator');
    if (indicator) indicator.style.opacity = '1';
  } catch (err) {
    console.error('Error populating editor fields:', err);
  }
}


function renderEditorExplorer(activeId) {
  const tree = document.getElementById('editor-exp-tree');
  if (!tree) return;

  const records = window.IRIS_DB.getRecords();
  if (records.length === 0) {
    tree.innerHTML = `<span class="exp-empty">Belge yok</span>`;
    return;
  }

  let html = '';
  records.forEach(r => {
    const isActive = String(r.id) === String(activeId) ? 'active' : '';
    html += `
      <div class="exp-node ${isActive}" onclick="openRecordEditor('${r.id}')">
        <i data-lucide="file-text" class="exp-icon"></i>
        <span class="exp-text text-truncate" style="max-width:145px">${escapeHTML(r.title)}</span>
      </div>
    `;
  });
  tree.innerHTML = html;
  tryCreateIcons();
}

function filterExplorerTree(query) {
  const nodes = document.querySelectorAll('#editor-exp-tree .exp-node');
  nodes.forEach(node => {
    const text = node.querySelector('.exp-text').textContent.toLowerCase();
    if (text.includes(query)) {
      node.style.display = 'flex';
    } else {
      node.style.display = 'none';
    }
  });
}

function setEditorMode(mode) {
  editorMode = mode;
  document.getElementById('mode-tab-a4').classList.toggle('active', mode === 'a4');
  document.getElementById('mode-tab-canvas').classList.toggle('active', mode === 'canvas');
  document.getElementById('mode-tab-split').classList.toggle('active', mode === 'split');

  document.getElementById('editor-a4-area').style.display = mode === 'a4' ? 'flex' : 'none';
  document.getElementById('editor-canvas-area').style.display = mode === 'canvas' ? 'block' : 'none';
  document.getElementById('editor-split-area').style.display = mode === 'split' ? 'flex' : 'none';

  if (mode === 'canvas') {
    renderCanvasNodes();
  }
}

// Word Count
function triggerWordCount() {
  const text = document.getElementById('rec-form-notes').value;
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(w => w.length > 0).length : 0;

  const wEl = document.getElementById('editor-word-count');
  const cEl = document.getElementById('editor-char-count');
  if (wEl) wEl.textContent = `${wordCount} kelime`;
  if (cEl) cEl.textContent = `${charCount} karakter`;
}

// Auto Save Indicator
function triggerAutosave() {
  const indicator = document.getElementById('autosave-indicator');
  if (indicator) {
    indicator.querySelector('span').textContent = 'Kaydediliyor...';
    indicator.querySelector('i').setAttribute('data-lucide', 'clock');
    tryCreateIcons();
  }

  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(performAutosave, 2000);
}

function performAutosave() {
  if (!currentRecordId) return;

  const title = document.getElementById('rec-form-title').value.trim() || 'Başlıksız Belge';
  const notes = document.getElementById('rec-form-notes').value;
  const type = document.getElementById('rec-form-type').value;
  const status = document.getElementById('rec-form-status').value;
  const priority = document.getElementById('rec-form-priority').value;
  const progress = parseInt(document.getElementById('rec-form-progress').value) || 0;
  const authors = document.getElementById('rec-form-authors').value.trim();
  const source = document.getElementById('rec-form-source').value.trim();
  const url = document.getElementById('rec-form-url').value.trim();
  const datePublished = document.getElementById('rec-form-date').value;
  const isFavorite = document.getElementById('rec-form-fav').checked;
  const collectionId = document.getElementById('rec-form-collection').value;
  
  // Word layout properties
  const page = document.getElementById('main-a4-page');
  const wordLayout = {
    margin: document.documentElement.dataset.margin || 'normal',
    lineSpacing: document.documentElement.dataset.lineSpacing || '1',
    colLayout: document.documentElement.dataset.colLayout || '1',
    headerLeft: document.getElementById('hf-left')?.value || '',
    headerCenter: document.getElementById('hf-center')?.value || '',
    headerRight: document.getElementById('hf-right')?.value || '',
    footerLeft: document.getElementById('hf-ftr-left')?.value || '',
    footerCenter: document.getElementById('hf-ftr-center')?.value || '',
    footerRight: document.getElementById('hf-ftr-right')?.value || ''
  };

  const records = window.IRIS_DB.getRecords(true);
  const existing = records.find(r => String(r.id) === String(currentRecordId));

  if (existing) {
    const updated = {
      ...existing,
      title,
      analysisNotes: notes,
      type,
      status,
      priority,
      progress,
      authors,
      source,
      url,
      datePublished,
      isFavorite,
      collectionId,
      wordLayout
    };
    window.IRIS_DB.saveRecord(updated);

    const indicator = document.getElementById('autosave-indicator');
    if (indicator) {
      indicator.querySelector('span').textContent = 'Kaydedildi';
      indicator.querySelector('i').setAttribute('data-lucide', 'check-circle-2');
      tryCreateIcons();
    }

    renderEditorExplorer(currentRecordId);
  }
}

function saveCurrentRecord() {
  performAutosave();
  showToast('Belge başarıyla kaydedildi.', 'success');
  logActivity('edit');
}

function deleteCurrentRecord() {
  if (currentRecordId) {
    deleteRecordWithConfirm(currentRecordId);
  }
}

function deleteRecordWithConfirm(id) {
  showConfirmation(
    'Belgeyi silmek istediğinize emin misiniz?',
    'Seçtiğiniz bilgi nesnesi Çöp Kutusu klasörüne taşınacaktır.',
    () => {
      window.IRIS_DB.deleteRecord(id);
      showToast('Belge çöp kutusuna taşındı', 'success');
      
      // If we are currently editing it, navigate back
      if (String(currentRecordId) === String(id)) {
        currentRecordId = null;
        switchTab('library');
      } else {
        renderLibrary();
      }
      seedSampleRecordsIfEmpty();
  renderSidebarTrees();
      logActivity('delete');
    }
  );
}

// Ribbon Toolbar Actions
function switchRibbon(ribName, btn) {
  document.querySelectorAll('.ribbon-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.ribbon-content').forEach(c => c.classList.remove('active'));

  if (btn) btn.classList.add('active');
  const panel = document.getElementById(`ribbon-${ribName}`);
  if (panel) panel.classList.add('active');
}

function wrapText(before, after) {
  const area = document.getElementById('rec-form-notes');
  if (!area) return;

  const start = area.selectionStart;
  const end = area.selectionEnd;
  const text = area.value;
  const selected = text.substring(start, end);
  
  const replacement = before + selected + after;
  area.value = text.substring(0, start) + replacement + text.substring(end);
  
  area.selectionStart = start + before.length;
  area.selectionEnd = area.selectionStart + selected.length;
  area.focus();

  triggerWordCount();
  triggerAutosave();
}

function insertPrefix(prefix) {
  const area = document.getElementById('rec-form-notes');
  if (!area) return;

  const start = area.selectionStart;
  const text = area.value;
  
  // Find start of current line
  const lastNewLine = text.lastIndexOf('\n', start - 1);
  const lineStart = lastNewLine === -1 ? 0 : lastNewLine + 1;

  area.value = text.substring(0, lineStart) + prefix + text.substring(lineStart);
  area.selectionStart = start + prefix.length;
  area.selectionEnd = start + prefix.length;
  area.focus();

  triggerWordCount();
  triggerAutosave();
}

function applyFontSize(size) {
  const area = document.getElementById('rec-form-notes');
  if (area) {
    area.style.fontSize = size;
  }
}

function insertTable() {
  const tableStr = `
| Başlık 1 | Başlık 2 | Başlık 3 |
| :--- | :--- | :--- |
| Veri A | Veri B | Veri C |
| Veri D | Veri E | Veri F |
`;
  wrapText(tableStr, '');
}

function insertCodeBlock() {
  wrapText('\n```javascript\n', '\n```\n');
}

function insertLink() {
  const url = prompt('Eklemek istediğiniz Link URL adresini girin:');
  if (!url) return;
  const text = prompt('Görünecek Metin (İsteğe bağlı):');
  wrapText(`[${text || url}](`, `)`);
}

function insertHR() {
  wrapText('\n---\n', '');
}

function applyTemplate(key) {
  if (window.TEMPLATES && window.TEMPLATES[key]) {
    const area = document.getElementById('rec-form-notes');
    if (area) {
      if (area.value.trim() && !confirm('Mevcut not içeriğinizi şablon ile değiştirmek istediğinizden emin misiniz?')) {
        return;
      }
      area.value = window.TEMPLATES[key].content;
      triggerWordCount();
      triggerAutosave();
      showToast('Şablon uygulandı', 'success');
    }
  }
}

function exportCurrentMD() {
  const title = document.getElementById('rec-form-title').value.trim() || 'arastirma';
  const text = document.getElementById('rec-form-notes').value;
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.md`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Markdown dosyası indirildi', 'success');
}

function exportCurrentPDF() {
  if (currentRecordId) {
    const recs = window.IRIS_DB.getRecords().filter(r => String(r.id) === String(currentRecordId));
    if (recs.length > 0) {
      window.IRIS_EXPORT.pdf(recs, { title: recs[0].title, subtitle: recs[0].code || 'IRIS' });
      showToast('PDF Raporu hazırlanıyor...', 'success');
    }
  }
}

function copyCurrentText() {
  const area = document.getElementById('rec-form-notes');
  if (area) {
    navigator.clipboard.writeText(area.value);
    showToast('Tüm metin panoya kopyalandı.', 'success');
  }
}

// Split View URL Loader
function loadSplitURL() {
  const input = document.getElementById('split-url-input');
  const iframe = document.getElementById('split-iframe');
  if (!input || !iframe) return;

  let url = input.value.trim();
  if (!url) return;

  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  
  iframe.src = url;
  showToast('Referans URL yükleniyor...', 'info');
}

// ====================================================
// PROPERTIES PANEL HELPERS
// ====================================================
function renderTagsWrap(rec) {
  const wrap = document.getElementById('prop-tags-wrap');
  if (!wrap) return;

  wrap.innerHTML = '';
  if (!rec.tags || rec.tags.length === 0) {
    return;
  }

  rec.tags.forEach((tag, index) => {
    const tagEl = document.createElement('span');
    tagEl.className = 'tag';
    tagEl.innerHTML = `
      #${escapeHTML(tag)}
      <i data-lucide="x" class="tag-del-icon" onclick="deleteTag(${index})"></i>
    `;
    wrap.appendChild(tagEl);
  });
  tryCreateIcons();
}

function addTagFromInput() {
  const input = document.getElementById('rec-form-tags');
  if (!input || !input.value.trim() || !currentRecordId) return;

  const raw = input.value.trim();
  const newTags = raw.split(',').map(t => t.trim()).filter(t => t.length > 0);

  const records = window.IRIS_DB.getRecords(true);
  const rec = records.find(r => String(r.id) === String(currentRecordId));
  if (rec) {
    rec.tags = rec.tags || [];
    newTags.forEach(t => {
      if (!rec.tags.includes(t)) rec.tags.push(t);
    });
    window.IRIS_DB.saveRecord(rec);
    input.value = '';
    renderTagsWrap(rec);
    triggerAutosave();
  }
}

function deleteTag(index) {
  if (!currentRecordId) return;
  const records = window.IRIS_DB.getRecords(true);
  const rec = records.find(r => String(r.id) === String(currentRecordId));
  if (rec && rec.tags) {
    rec.tags.splice(index, 1);
    window.IRIS_DB.saveRecord(rec);
    renderTagsWrap(rec);
    triggerAutosave();
  }
}

function populateRelationsDropdown(rec) {
  const select = document.getElementById('prop-relations-add');
  if (!select) return;

  const all = window.IRIS_DB.getRecords();
  let html = '<option value="">+ İlişki Ekle...</option>';
  
  all.forEach(r => {
    // Cannot relate to itself, and cannot relate if already related
    if (String(r.id) !== String(rec.id) && (!rec.relations || !rec.relations.includes(String(r.id)))) {
      html += `<option value="${r.id}">${r.code || 'DOC'} — ${escapeHTML(r.title)}</option>`;
    }
  });
  select.innerHTML = html;
}

function addRelationFromSelect(select) {
  const targetId = select.value;
  if (!targetId || !currentRecordId) return;

  window.IRIS_DB.addRelation(currentRecordId, targetId);
  showToast('Belgeler arası ilişki kuruldu', 'success');

  const records = window.IRIS_DB.getRecords(true);
  const rec = records.find(r => String(r.id) === String(currentRecordId));
  
  populateRelationsDropdown(rec);
  renderRelationsList(rec);
  triggerAutosave();
  select.value = '';
}

function renderRelationsList(rec) {
  const container = document.getElementById('prop-relations-list');
  if (!container) return;

  container.innerHTML = '';
  if (!rec.relations || rec.relations.length === 0) {
    container.innerHTML = `<span class="prop-faint-label">İlişkili belge yok.</span>`;
    return;
  }

  const all = window.IRIS_DB.getRecords();
  rec.relations.forEach(relId => {
    const target = all.find(r => String(r.id) === String(relId));
    if (target) {
      const relEl = document.createElement('div');
      relEl.className = 'relation-row-item';
      relEl.innerHTML = `
        <span class="rel-code" onclick="openRecordEditor('${target.id}')">${target.code || 'DOC'}</span>
        <span class="rel-title text-truncate" onclick="openRecordEditor('${target.id}')">${escapeHTML(target.title)}</span>
        <i data-lucide="x" class="rel-del-btn" onclick="removeRelation('${target.id}')"></i>
      `;
      container.appendChild(relEl);
    }
  });
  tryCreateIcons();
}

function removeRelation(targetId) {
  if (!currentRecordId) return;
  window.IRIS_DB.removeRelation(currentRecordId, targetId);
  
  const records = window.IRIS_DB.getRecords(true);
  const rec = records.find(r => String(r.id) === String(currentRecordId));

  populateRelationsDropdown(rec);
  renderRelationsList(rec);
  triggerAutosave();
  showToast('İlişki kaldırıldı.', 'info');
}

// ====================================================
// EDITOR BOTTOM PANEL TABS
// ====================================================
function switchBPTab(tabName, btn) {
  activeBPTab = tabName;
  document.querySelectorAll('.bp-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.bp-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.bp-add-row').forEach(row => row.classList.add('hidden'));

  if (btn) btn.classList.add('active');
  const panel = document.getElementById(`bp-${tabName}`);
  if (panel) panel.classList.add('active');

  const addRow = document.getElementById(`bp-add-row-${tabName}`);
  if (addRow) addRow.classList.remove('hidden');
}

function renderCommentsPanel(rec) {
  const container = document.getElementById('comments-list');
  const badge = document.getElementById('bp-cnt-comments');
  if (!container) return;

  container.innerHTML = '';
  const comments = rec.comments || [];
  if (badge) badge.textContent = comments.length;

  if (comments.length === 0) {
    container.innerHTML = `<span class="bp-empty">Yorum yok. Eklemek için aşağıyı kullanın.</span>`;
    return;
  }

  comments.forEach((c, index) => {
    const item = document.createElement('div');
    item.className = 'bp-item-row';
    item.innerHTML = `
      <div style="flex:1">
        <div class="bp-item-hdr">
          <strong style="color:var(--primary-light)">${escapeHTML(c.author)}</strong>
          <span>${c.date}</span>
        </div>
        <div class="bp-item-text">${escapeHTML(c.text)}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="deleteComment(${index})"><i data-lucide="x" style="width:10px;height:10px;color:var(--danger)"></i></button>
    `;
    container.appendChild(item);
  });
  tryCreateIcons();
}

function addComment() {
  const input = document.getElementById('comment-input');
  if (!input || !input.value.trim() || !currentRecordId) return;

  const records = window.IRIS_DB.getRecords(true);
  const rec = records.find(r => String(r.id) === String(currentRecordId));
  if (rec) {
    rec.comments = rec.comments || [];
    rec.comments.push({
      author: localStorage.getItem('iris_profile_name') || 'Ar-Ge Mühendisi',
      text: input.value.trim(),
      date: new Date().toLocaleString('tr-TR')
    });
    window.IRIS_DB.saveRecord(rec);
    input.value = '';
    renderCommentsPanel(rec);
    triggerAutosave();
  }
}

function deleteComment(index) {
  if (!currentRecordId) return;
  const records = window.IRIS_DB.getRecords(true);
  const rec = records.find(r => String(r.id) === String(currentRecordId));
  if (rec && rec.comments) {
    rec.comments.splice(index, 1);
    window.IRIS_DB.saveRecord(rec);
    renderCommentsPanel(rec);
    triggerAutosave();
  }
}

// Tasks
function renderTasksPanel(rec) {
  const container = document.getElementById('tasks-list');
  const badge = document.getElementById('bp-cnt-tasks');
  if (!container) return;

  container.innerHTML = '';
  const tasks = rec.tasks || [];
  if (badge) badge.textContent = tasks.length;

  if (tasks.length === 0) {
    container.innerHTML = `<span class="bp-empty">Görev yok. Eklemek için aşağıyı kullanın.</span>`;
    return;
  }

  tasks.forEach((t, index) => {
    const item = document.createElement('div');
    item.className = 'bp-item-row';
    const checked = t.completed ? 'checked' : '';
    item.innerHTML = `
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;flex:1;">
        <input type="checkbox" ${checked} onchange="toggleTask(${index})" style="accent-color:var(--primary)">
        <span class="${t.completed ? 'completed-task' : ''}">${escapeHTML(t.text)}</span>
      </label>
      <button class="btn btn-ghost btn-sm" onclick="deleteTask(${index})"><i data-lucide="x" style="width:10px;height:10px;color:var(--danger)"></i></button>
    `;
    container.appendChild(item);
  });
  tryCreateIcons();
}

function addTask() {
  const input = document.getElementById('task-input');
  if (!input || !input.value.trim() || !currentRecordId) return;

  const records = window.IRIS_DB.getRecords(true);
  const rec = records.find(r => String(r.id) === String(currentRecordId));
  if (rec) {
    rec.tasks = rec.tasks || [];
    rec.tasks.push({
      text: input.value.trim(),
      completed: false
    });
    window.IRIS_DB.saveRecord(rec);
    input.value = '';
    renderTasksPanel(rec);
    triggerAutosave();
  }
}

function toggleTask(index) {
  if (!currentRecordId) return;
  const records = window.IRIS_DB.getRecords(true);
  const rec = records.find(r => String(r.id) === String(currentRecordId));
  if (rec && rec.tasks) {
    rec.tasks[index].completed = !rec.tasks[index].completed;
    window.IRIS_DB.saveRecord(rec);
    renderTasksPanel(rec);
    triggerAutosave();
  }
}

function deleteTask(index) {
  if (!currentRecordId) return;
  const records = window.IRIS_DB.getRecords(true);
  const rec = records.find(r => String(r.id) === String(currentRecordId));
  if (rec && rec.tasks) {
    rec.tasks.splice(index, 1);
    window.IRIS_DB.saveRecord(rec);
    renderTasksPanel(rec);
    triggerAutosave();
  }
}

// Attachments
function renderAttachmentsPanel(rec) {
  const container = document.getElementById('attachments-list');
  const badge = document.getElementById('bp-cnt-attachments');
  if (!container) return;

  container.innerHTML = '';
  const attaches = rec.attachments || [];
  if (badge) badge.textContent = attaches.length;

  if (attaches.length === 0) {
    container.innerHTML = `<span class="bp-empty">Ekli dosya veya bağlantı yok.</span>`;
    return;
  }

  attaches.forEach((a, index) => {
    const item = document.createElement('div');
    item.className = 'bp-item-row';
    item.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;flex:1">
        <i data-lucide="paperclip" style="width:12px;height:12px;color:var(--primary-light)"></i>
        <a href="${a.url}" target="_blank" class="att-link">${escapeHTML(a.title)}</a>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="deleteAttachment(${index})"><i data-lucide="x" style="width:10px;height:10px;color:var(--danger)"></i></button>
    `;
    container.appendChild(item);
  });
  tryCreateIcons();
}

function addAttachment() {
  const input = document.getElementById('attach-input');
  if (!input || !input.value.trim() || !currentRecordId) return;

  let url = input.value.trim();
  let title = url;
  
  // Cut title from url
  try {
    const u = new URL(url);
    title = u.hostname + u.pathname;
    if (title.length > 30) title = title.substring(0, 30) + '...';
  } catch {
    // raw string
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
  }

  const records = window.IRIS_DB.getRecords(true);
  const rec = records.find(r => String(r.id) === String(currentRecordId));
  if (rec) {
    rec.attachments = rec.attachments || [];
    rec.attachments.push({ title, url });
    window.IRIS_DB.saveRecord(rec);
    input.value = '';
    renderAttachmentsPanel(rec);
    triggerAutosave();
  }
}

function deleteAttachment(index) {
  if (!currentRecordId) return;
  const records = window.IRIS_DB.getRecords(true);
  const rec = records.find(r => String(r.id) === String(currentRecordId));
  if (rec && rec.attachments) {
    rec.attachments.splice(index, 1);
    window.IRIS_DB.saveRecord(rec);
    renderAttachmentsPanel(rec);
    triggerAutosave();
  }
}

// Versions Panel
function renderVersionsPanel(rec) {
  const container = document.getElementById('versions-list');
  const badge = document.getElementById('bp-cnt-versions');
  if (!container) return;

  container.innerHTML = '';
  const versions = rec.versions || [];
  if (badge) badge.textContent = versions.length;

  if (versions.length === 0) {
    container.innerHTML = `<span class="bp-empty">Metin değişikliği yapılmadığı için geçmiş sürüm yok.</span>`;
    return;
  }

  // Reverse list to show newest version first
  versions.slice().reverse().forEach((v) => {
    const item = document.createElement('div');
    item.className = 'bp-item-row';
    item.innerHTML = `
      <div style="flex:1">
        <strong style="color:var(--accent-amber)">Sürüm ${v.version}</strong>
        <div style="font-size:9px;color:var(--text-faint);margin-top:2px;">Kayıt Tarihi: ${v.date}</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="rollbackVersion('${v.version}')">Geri Yükle</button>
    `;
    container.appendChild(item);
  });
}

function rollbackVersion(verName) {
  if (!currentRecordId) return;
  
  showConfirmation(
    `Metni Geri Yükle: Sürüm ${verName}`,
    'Bu işlemi onaylarsanız editördeki notlarınız eski sürümün içeriği ile güncellenecektir. Mevcut yazınız ezilecektir.',
    () => {
      const records = window.IRIS_DB.getRecords(true);
      const rec = records.find(r => String(r.id) === String(currentRecordId));
      if (rec && rec.versions) {
        const ver = rec.versions.find(v => String(v.version) === String(verName));
        if (ver) {
          document.getElementById('rec-form-notes').value = ver.notes;
          document.getElementById('rec-form-notes-split').value = ver.notes;
          triggerWordCount();
          triggerAutosave();
          showToast(`Sürüm ${verName} geri yüklendi.`, 'success');
        }
      }
    },
    'Geri Yükle'
  );
}

// Timeline Panel
function renderTimelinePanel(rec) {
  const container = document.getElementById('timeline-content');
  if (!container) return;

  container.innerHTML = `
    <div>📅 <strong>Oluşturulma Tarihi:</strong> ${rec.dateAdded || '-'}</div>
    <div style="margin-top:5px;">🕒 <strong>Son Değişiklik:</strong> ${rec.dateUpdated ? rec.dateUpdated.substring(0, 16).replace('T', ' ') : '-'}</div>
    <div style="margin-top:5px;">📜 <strong>Kayıtlı Sürüm Sayısı:</strong> ${(rec.versions || []).length}</div>
    <div style="margin-top:5px;">💬 <strong>Yorumlar:</strong> ${(rec.comments || []).length} yorum</div>
    <div style="margin-top:5px;">✅ <strong>Görevler:</strong> ${(rec.tasks || []).length} toplam, ${(rec.tasks || []).filter(t => t.completed).length} tamamlanan</div>
  `;
}

// ====================================================
// CANVAS (TUVAL) VISUAL WORKSPACE
// ====================================================
function renderCanvasNodes() {
  const vp = document.getElementById('canvas-vp');
  if (!vp) return;

  // Clear existing cards
  vp.querySelectorAll('.canvas-card').forEach(c => c.remove());

  const records = window.IRIS_DB.getRecords();
  if (records.length === 0) return;

  const typeLabels = { patent: 'Patent', article: 'Makale', standard: 'Standart', project: 'Proje', note: 'Not', other: 'Diğer' };

  records.forEach(rec => {
    const card = document.createElement('div');
    card.className = `canvas-card canvas-card-${rec.type}`;
    card.id = `canvas-node-${rec.id}`;
    card.style.left = `${rec.canvas_x || 100}px`;
    card.style.top = `${rec.canvas_y || 100}px`;

    const progress = rec.progress || 0;

    card.innerHTML = `
      <div class="cc-header">
        <span class="cc-badge badge-${rec.type}">${typeLabels[rec.type]}</span>
        <span class="cc-code">${rec.code || 'DOC'}</span>
      </div>
      <div class="cc-title text-truncate-2">${escapeHTML(rec.title)}</div>
      <div class="cc-progress">
        <div class="cc-prog-fill" style="width:${progress}%"></div>
      </div>
      <div class="cc-footer">
        <i data-lucide="file-edit" title="Editörde Aç" onclick="event.stopPropagation(); openRecordEditor('${rec.id}')"></i>
        <i data-lucide="eye" title="Belge Detayı" onclick="event.stopPropagation(); openRecordDetail('${rec.id}')"></i>
      </div>
    `;

    // Make Card Draggable
    setupCardDraggability(card, rec.id);

    vp.appendChild(card);
  });
  tryCreateIcons();

  // Draw lines
  drawCanvasConnections();
}

function setupCardDraggability(card, recordId) {
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  card.addEventListener('mousedown', (e) => {
    // Prevent drag if clicking on buttons
    if (e.target.closest('.cc-footer') || e.target.closest('.cc-badge')) return;
    
    isDragging = true;
    card.style.cursor = 'grabbing';
    card.style.zIndex = '1000';

    offsetX = e.clientX - card.getBoundingClientRect().left;
    offsetY = e.clientY - card.getBoundingClientRect().top;
    
    e.stopPropagation();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const vp = document.getElementById('canvas-vp');
    const vpRect = vp.getBoundingClientRect();
    
    // Position relative to viewport
    let x = (e.clientX - vpRect.left - offsetX) / canvasZoom;
    let y = (e.clientY - vpRect.top - offsetY) / canvasZoom;

    // Boundary constraints
    x = Math.max(20, Math.min(x, 4000));
    y = Math.max(20, Math.min(y, 3000));

    card.style.left = `${x}px`;
    card.style.top = `${y}px`;

    // Real-time redraw connections
    drawCanvasConnections();
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    card.style.cursor = 'grab';
    card.style.zIndex = '1';

    // Save final position to DB
    const records = window.IRIS_DB.getRecords(true);
    const rec = records.find(r => String(r.id) === String(recordId));
    if (rec) {
      rec.canvas_x = parseFloat(card.style.left);
      rec.canvas_y = parseFloat(card.style.top);
      window.IRIS_DB.saveRecord(rec);
    }
  });
}

function drawCanvasConnections() {
  const svg = document.getElementById('canvas-svg');
  if (!svg) return;

  // Clear connection paths
  svg.querySelectorAll('.canvas-line').forEach(l => l.remove());

  const records = window.IRIS_DB.getRecords();
  const drawn = new Set();

  records.forEach(rec => {
    const sourceCard = document.getElementById(`canvas-node-${rec.id}`);
    if (!sourceCard || !rec.relations) return;

    const sX = parseFloat(sourceCard.style.left) + 100; // Half card width (200px / 2)
    const sY = parseFloat(sourceCard.style.top) + 60;   // Half card height (~120px / 2)

    rec.relations.forEach(targetId => {
      const pairKey = [rec.id, targetId].sort().join('-');
      if (drawn.has(pairKey)) return;

      const targetCard = document.getElementById(`canvas-node-${targetId}`);
      if (targetCard) {
        const tX = parseFloat(targetCard.style.left) + 100;
        const tY = parseFloat(targetCard.style.top) + 60;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        // Simple cubic bezier curve for connection
        const dx = Math.abs(tX - sX) * 0.5;
        const cX1 = sX + (tX > sX ? dx : -dx);
        const cY1 = sY;
        const cX2 = tX + (tX > sX ? -dx : dx);
        const cY2 = tY;

        path.setAttribute('d', `M ${sX} ${sY} C ${cX1} ${cY1}, ${cX2} ${cY2}, ${tX} ${tY}`);
        path.setAttribute('class', 'canvas-line');
        path.setAttribute('marker-end', 'url(#arrowhead)');
        svg.appendChild(path);

        drawn.add(pairKey);
      }
    });
  });
}

// Canvas Zoom Controls
function canvasZoomIn() {
  canvasZoom = Math.min(canvasZoom + 0.1, 2.0);
  applyCanvasTransform();
}

function canvasZoomOut() {
  canvasZoom = Math.max(canvasZoom - 0.1, 0.5);
  applyCanvasTransform();
}

function canvasReset() {
  canvasZoom = 1.0;
  canvasOffsetX = 0;
  canvasOffsetY = 0;
  applyCanvasTransform();
}

function applyCanvasTransform() {
  const vp = document.getElementById('canvas-vp');
  if (vp) {
    vp.style.transform = `scale(${canvasZoom})`;
  }
}

function canvasAutoLayout() {
  const cards = document.querySelectorAll('#editor-canvas-area .canvas-card');
  if (cards.length === 0) return;

  const center_x = 400;
  const center_y = 300;
  const radius = 220;

  cards.forEach((card, index) => {
    const angle = (index / cards.length) * 2 * Math.PI;
    const x = center_x + radius * Math.cos(angle) - 100;
    const y = center_y + radius * Math.sin(angle) - 60;

    card.style.left = `${x}px`;
    card.style.top = `${y}px`;

    // Save to DB
    const recId = card.id.replace('canvas-node-', '');
    const records = window.IRIS_DB.getRecords(true);
    const rec = records.find(r => String(r.id) === String(recId));
    if (rec) {
      rec.canvas_x = x;
      rec.canvas_y = y;
      window.IRIS_DB.saveRecord(rec);
    }
  });

  drawCanvasConnections();
  showToast('Otomatik dairesel yerleşim uygulandı', 'success');
}

// ====================================================
// PROFESSIONAL REPORT GENERATOR (REPORTS TAB)
// ====================================================
function renderReportsPage() {
  const container = document.getElementById('report-doc-list');
  if (!container) return;

  container.innerHTML = '';
  const records = window.IRIS_DB.getRecords();
  if (records.length === 0) {
    container.innerHTML = `<span class="exp-empty" style="padding:20px 0">Raporlanacak belge yok.</span>`;
    return;
  }

  const typeLabels = { patent: 'Patent', article: 'Makale', standard: 'Standart', project: 'Proje', note: 'Not', other: 'Diğer' };

  let html = '';
  records.forEach(rec => {
    html += `
      <div class="report-select-row">
        <input type="checkbox" class="report-doc-checkbox" value="${rec.id}" onchange="updateReportSelectCount()" style="accent-color:var(--primary)">
        <span class="badge badge-${rec.type}" style="padding:2px 6px;font-size:9px;">${typeLabels[rec.type]}</span>
        <span style="font-size:11px;color:var(--text-secondary)">${rec.code || 'DOC'}</span>
        <span class="report-doc-title text-truncate" style="flex:1;font-weight:700">${escapeHTML(rec.title)}</span>
      </div>
    `;
  });
  container.innerHTML = html;
  updateReportSelectCount();
}

function selectReportType(format) {
  currentReportType = format;
  document.getElementById('rtype-pdf').classList.toggle('sel', format === 'pdf');
  document.getElementById('rtype-word').classList.toggle('sel', format === 'word');
  document.getElementById('rtype-excel').classList.toggle('sel', format === 'excel');
}

function selectAllReportDocs() {
  document.querySelectorAll('.report-doc-checkbox').forEach(cb => cb.checked = true);
  updateReportSelectCount();
}

function clearReportDocs() {
  document.querySelectorAll('.report-doc-checkbox').forEach(cb => cb.checked = false);
  updateReportSelectCount();
}

function updateReportSelectCount() {
  const checked = document.querySelectorAll('.report-doc-checkbox:checked').length;
  document.getElementById('report-select-count').textContent = `${checked} seçili`;
}

function generateReport() {
  const checkboxes = document.querySelectorAll('.report-doc-checkbox:checked');
  if (checkboxes.length === 0) {
    showToast('Lütfen rapora dahil edilecek en az bir belge seçin!', 'warning');
    return;
  }

  const selectedIds = Array.from(checkboxes).map(cb => cb.value);
  const records = window.IRIS_DB.getRecords();
  const selectedRecords = records.filter(r => selectedIds.includes(String(r.id)));

  const title = document.getElementById('report-title').value.trim() || 'Araştırma Raporu';
  const subtitle = document.getElementById('report-subtitle').value.trim() || 'IRIS Research Studio';
  const description = document.getElementById('report-desc').value.trim() || '';

  // Log report counts for activity metrics
  const logs = JSON.parse(localStorage.getItem('iris_activity_log') || '{}');
  const todayStr = new Date().toISOString().split('T')[0];
  logs[todayStr] = (logs[todayStr] || 0) + 1;
  localStorage.setItem('iris_activity_log', JSON.stringify(logs));
  
  // Track report count in stats
  let repCount = parseInt(localStorage.getItem('iris_report_count') || '0');
  localStorage.setItem('iris_report_count', repCount + 1);

  if (currentReportType === 'pdf') {
    window.IRIS_EXPORT.pdf(selectedRecords, { title, subtitle, description });
    showToast('PDF rapor indiriliyor...', 'success');
  } else if (currentReportType === 'word') {
    window.IRIS_EXPORT.word(selectedRecords, { title, subtitle, description });
    showToast('Word belgesi indiriliyor...', 'success');
  } else if (currentReportType === 'excel') {
    window.IRIS_EXPORT.excel(selectedRecords);
    showToast('Excel tablosu indiriliyor...', 'success');
  }
}

// ====================================================
// TRASH VIEW
// ====================================================
function renderTrash() {
  const container = document.getElementById('trash-list');
  if (!container) return;

  const all = window.IRIS_DB.getRecords(true);
  const deleted = all.filter(r => r.isDeleted);

  if (deleted.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i data-lucide="check-circle-2"></i></div>
        <h3>Çöp Kutusu Boş</h3>
        <p>Silinen bilgi nesneleri burada görünür ve kurtarılabilir.</p>
      </div>
    `;
    tryCreateIcons();
    return;
  }

  const typeLabels = { patent: 'Patent', article: 'Makale', standard: 'Standart', project: 'Proje', note: 'Not', other: 'Diğer' };

  let html = '';
  deleted.forEach(rec => {
    html += `
      <div class="trash-row-item">
        <span class="badge badge-${rec.type}">${typeLabels[rec.type]}</span>
        <span style="font-size:11px;color:var(--text-faint)">${rec.code || 'DOC'}</span>
        <strong style="flex:1" class="text-truncate">${escapeHTML(rec.title)}</strong>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary btn-sm" onclick="restoreFromTrash('${rec.id}')">
            <i data-lucide="rotate-ccw" style="width:10px;height:10px"></i> Kurtar
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteRecordPermanently('${rec.id}')">
            <i data-lucide="trash-2" style="width:10px;height:10px"></i> Kalıcı Sil
          </button>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
  tryCreateIcons();
}

function restoreFromTrash(id) {
  window.IRIS_DB.restoreRecord(id);
  showToast('Belge çöp kutusundan geri yüklendi', 'success');
  renderTrash();
  seedSampleRecordsIfEmpty();
  renderSidebarTrees();
  updateSidebarBadges();
}

function deleteRecordPermanently(id) {
  showConfirmation(
    'Belgeyi Kalıcı Olarak Sil',
    'UYARI: Çöp kutusundan silinen bilgi nesnesi tamamen yok edilecektir. Bu işlem geri alınamaz!',
    () => {
      window.IRIS_DB.deleteRecordPermanently(id);
      showToast('Belge kalıcı olarak silindi', 'success');
      renderTrash();
      seedSampleRecordsIfEmpty();
  renderSidebarTrees();
      updateSidebarBadges();
    }
  );
}

function emptyTrash() {
  const all = window.IRIS_DB.getRecords(true);
  const deleted = all.filter(r => r.isDeleted);
  
  if (deleted.length === 0) {
    showToast('Çöp kutusu zaten boş.', 'info');
    return;
  }

  showConfirmation(
    'Çöp Kutusunu Boşalt',
    'TÜM silinmiş belgeleri kalıcı olarak yok etmek istediğinizden emin misiniz? Bu işlem asla geri alınamaz!',
    () => {
      deleted.forEach(r => {
        window.IRIS_DB.deleteRecordPermanently(r.id);
      });
      showToast('Çöp kutusu tamamen boşaltıldı', 'success');
      renderTrash();
      seedSampleRecordsIfEmpty();
  renderSidebarTrees();
      updateSidebarBadges();
    }
  );
}

// ====================================================
// SYSTEM SETTINGS & PROFILE MANAGEMENT
// ====================================================
function saveProfile() {
  const name = document.getElementById('profile-name').value.trim();
  const role = document.getElementById('profile-role').value.trim();
  const email = document.getElementById('profile-email').value.trim();
  const inst = document.getElementById('profile-institution').value.trim();

  if (!name) {
    showToast('Lütfen ad soyad girin!', 'warning');
    return;
  }

  localStorage.setItem('iris_profile_name', name);
  localStorage.setItem('iris_profile_role', role);
  localStorage.setItem('iris_profile_email', email);
  localStorage.setItem('iris_profile_institution', inst);

  // Update topbar initials
  updateTopbarInitials(name);
  showToast('Profil başarıyla kaydedildi.', 'success');
}

function loadProfile() {
  const name = localStorage.getItem('iris_profile_name') || 'Ar-Ge Mühendisi';
  const role = localStorage.getItem('iris_profile_role') || 'Araştırma Lideri';
  const email = localStorage.getItem('iris_profile_email') || 'arastirma@kurum.com';
  const inst = localStorage.getItem('iris_profile_institution') || 'IRIS Araştırma Grubu';
  const avatarData = localStorage.getItem('iris_profile_image');

  // Fill settings inputs
  const nameInput = document.getElementById('profile-name');
  const roleInput = document.getElementById('profile-role');
  const emailInput = document.getElementById('profile-email');
  const instInput = document.getElementById('profile-institution');

  if (nameInput) nameInput.value = name;
  if (roleInput) roleInput.value = role;
  if (emailInput) emailInput.value = email;
  if (instInput) instInput.value = inst;

  updateTopbarInitials(name);
  updateSettingsAvatar(name, avatarData);
}

function updateTopbarInitials(name) {
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const el = document.getElementById('topbar-avatar-initials');
  if (el) el.textContent = initials || 'AR';
}

function updateSettingsAvatar(name, data) {
  const avatarEl = document.getElementById('profile-avatar-el');
  if (!avatarEl) return;

  if (data) {
    avatarEl.innerHTML = `<img src="${data}" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-lg)">`;
  } else {
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    avatarEl.innerHTML = `<span id="profile-av-initials" style="font-weight:700;font-size:16px;">${initials || 'AR'}</span>`;
  }
}

function uploadProfileImage(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    localStorage.setItem('iris_profile_image', dataUrl);
    loadProfile();
    showToast('Profil fotoğrafı güncellendi', 'success');
  };
  reader.readAsDataURL(file);
}

// Theme Picker
function applyTheme(themeName, opt) {
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('iris_theme', themeName);

  document.querySelectorAll('.theme-opt').forEach(el => el.classList.remove('active'));
  if (opt) {
    opt.classList.add('active');
  } else {
    const targetOpt = document.querySelector(`.theme-opt[data-theme-val="${themeName}"]`);
    if (targetOpt) targetOpt.classList.add('active');
  }

  showToast(`Tema değiştirildi: ${themeName}`, 'success');
}

function updateThemeUI(themeName) {
  const targetOpt = document.querySelector(`.theme-opt[data-theme-val="${themeName}"]`);
  if (targetOpt) {
    document.querySelectorAll('.theme-opt').forEach(el => el.classList.remove('active'));
    targetOpt.classList.add('active');
  }
}

// Database Actions
function exportDB() {
  const backup = window.IRIS_DB.exportDatabase();
  const blob = new Blob([backup], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `iris_database_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Veritabanı yedeği indirildi', 'success');
}

function importDB(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const result = window.IRIS_DB.importDatabase(evt.target.result);
    if (result.success) {
      showToast('Veri içe aktarma başarılı!', 'success');
      setTimeout(() => location.reload(), 1000);
    } else {
      showToast('HATA: ' + result.message, 'danger');
    }
  };
  reader.readAsText(file);
}

function resetAppConfirm() {
  const modal = document.getElementById('reset-modal');
  if (modal) {
    document.getElementById('reset-confirm-input').value = '';
    modal.classList.add('active');
  }
}

function resetApp() {
  const input = document.getElementById('reset-confirm-input').value.trim();
  if (input.toUpperCase() !== 'SIFIRLA') {
    showToast('Lütfen onay kutusuna SIFIRLA yazın!', 'warning');
    return;
  }

  window.IRIS_DB.resetDatabase();
  localStorage.clear();
  showToast('Fabrika ayarlarına dönüldü.', 'danger');
  setTimeout(() => location.reload(), 1200);
}

// ====================================================
// LOGGING UTILITIES
// ====================================================
function logActivity(type) {
  const logs = JSON.parse(localStorage.getItem('iris_activity_log') || '{}');
  const todayStr = new Date().toISOString().split('T')[0];
  logs[todayStr] = (logs[todayStr] || 0) + 1;
  localStorage.setItem('iris_activity_log', JSON.stringify(logs));
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function togglePropertiesPanel() {
  const panel = document.getElementById('editor-properties');
  const wrapper = document.getElementById('tab-editor');
  const icon = document.getElementById('props-toggle-icon');
  if (!panel || !wrapper || !icon) return;

  const isCollapsed = panel.classList.toggle('collapsed');
  wrapper.classList.toggle('props-collapsed', isCollapsed);

  if (isCollapsed) {
    icon.setAttribute('data-lucide', 'chevron-left');
  } else {
    icon.setAttribute('data-lucide', 'chevron-right');
  }
  tryCreateIcons();
}


// ====================================================
// MULTI-PAGE A4 ENGINE & COVER PAGES v2.2
// ====================================================
function openCoverModal() {
  const modal = document.getElementById('cover-modal');
  if (modal) modal.classList.add('active');
}

function applyCoverTemplate(type) {
  if (!currentRecordId) return;

  const records = window.IRIS_DB.getRecords(true);
  const rec = records.find(r => String(r.id) === String(currentRecordId));
  if (!rec) return;

  const author = rec.authors || localStorage.getItem('iris_profile_name') || 'Ar-Ge Mühendisi';
  const inst = localStorage.getItem('iris_profile_institution') || 'IRIS Research Studio';
  const date = rec.datePublished || new Date().toISOString().split('T')[0];

  let coverContent = '';
  if (type === 'executive') {
    coverContent = `<!-- COVER:EXECUTIVE -->
# ${rec.title}
## ${rec.code || 'DOC'} — Kurumsal Ar-Ge Değerlendirme Raporu

**Hazırlayan:** ${author}
**Kurum:** ${inst}
**Tarih:** ${date}
**Gizlilik Derecesi:** HİZMETE ÖZEL / GİZLİ

--- [Sayfa Sonu] ---
`;
  } else if (type === 'academic') {
    coverContent = `<!-- COVER:ACADEMIC -->
# ${rec.title}
## Bilimsel Araştırma ve Literatür İnceleme Raporu

**Yazar(lar):** ${author}
**Araştırma Grubu:** ${inst}
**Yayın Tarihi:** ${date}

--- [Sayfa Sonu] ---
`;
  } else if (type === 'patent') {
    coverContent = `<!-- COVER:PATENT -->
# ${rec.title}
## Patent İnceleme ve Fikri Mülkiyet (FTO) Analizi

**Buluş Sahibi / Mucit:** ${author}
**Doküman Kodu:** ${rec.code || 'PAT-001'}
**İnceleme Tarihi:** ${date}

--- [Sayfa Sonu] ---
`;
  } else {
    coverContent = `<!-- COVER:MINIMAL -->
# ${rec.title}
## ${rec.code || 'RESEARCH'}

**Yazar:** ${author}
**Tarih:** ${date}

--- [Sayfa Sonu] ---
`;
  }

  // Prepend cover to notes
  const notesArea = document.getElementById('rec-form-notes');
  if (notesArea) {
    // Remove existing cover if present
    let text = notesArea.value;
    text = text.replace(/<!-- COVER:[\s\S]*?--- \[Sayfa Sonu\] ---\n?/, '');
    notesArea.value = coverContent + text;
    triggerWordCount();
    triggerAutosave();
    renderMultiPageA4Sheets();
    if (typeof renderDocumentOutline === 'function') renderDocumentOutline();
    showToast('Kapak sayfası eklendi.', 'success');
  }
  closeAllModals();
}

function removeCoverPage() {
  const notesArea = document.getElementById('rec-form-notes');
  if (notesArea) {
    let text = notesArea.value;
    text = text.replace(/<!-- COVER:[\s\S]*?--- \[Sayfa Sonu\] ---\n?/, '');
    notesArea.value = text;
    triggerWordCount();
    triggerAutosave();
    renderMultiPageA4Sheets();
    if (typeof renderDocumentOutline === 'function') renderDocumentOutline();
    showToast('Kapak sayfası kaldırıldı.', 'info');
  }
  closeAllModals();
}

function insertPageBreak() {
  const notesArea = document.getElementById('rec-form-notes');
  if (!notesArea) return;

  const breakText = '\n\n--- [Sayfa Sonu] ---\n\n';
  insertPrefix(breakText);
  renderMultiPageA4Sheets();
  if (typeof renderDocumentOutline === 'function') renderDocumentOutline();
  showToast('Sayfa sonu eklendi (A4).', 'info');
}

function renderMultiPageA4Sheets() {
  const scrollArea = document.querySelector('.a4-scroll-area');
  const mainNotes = document.getElementById('rec-form-notes');
  if (!scrollArea || !mainNotes) return;

  const text = mainNotes.value;
  let pageSections = text.split(/--- \[Sayfa Sonu\] ---/g);
  if (pageSections.length === 0) pageSections = [""];

  scrollArea.innerHTML = '';
  const totalPages = pageSections.length;
  
  // Read templates from input bars
  const hL_tpl = document.getElementById('hf-left')?.value || '';
  const hC_tpl = document.getElementById('hf-center')?.value || '';
  const hR_tpl = document.getElementById('hf-right')?.value || '';
  const fL_tpl = document.getElementById('hf-ftr-left')?.value || '';
  const fC_tpl = document.getElementById('hf-ftr-center')?.value || '';
  const fR_tpl = document.getElementById('hf-ftr-right')?.value || 'Sayfa {sayfa} / {toplam}';

  const processTemplate = (tpl, pageNum) => {
    if (!tpl) return '';
    let s = tpl;
    s = s.replace(/{sayfa}/g, pageNum);
    s = s.replace(/{toplam}/g, totalPages);
    s = s.replace(/{tarih}/g, new Date().toLocaleDateString('tr-TR'));
    return escapeHTML(s);
  };

  const margin = document.documentElement.dataset.margin || 'normal';
  const lineSpacing = document.documentElement.dataset.lineSpacing || '1';
  const colLayout = document.documentElement.dataset.colLayout || '1';

  pageSections.forEach((sectionText, idx) => {
    const pageNum = idx + 1;
    const pageSheet = document.createElement('div');
    const isCover = sectionText.includes('<!-- COVER:');
    
    pageSheet.className = `a4-page ${isCover ? 'a4-cover-page' : ''}`;
    if (margin !== 'normal') pageSheet.classList.add('margin-' + margin);
    if (lineSpacing !== '1') pageSheet.classList.add('line-spacing-' + lineSpacing.replace('.','-'));
    if (colLayout === '2') pageSheet.classList.add('col-layout-2');

    // Header
    const hdr = document.createElement('div');
    hdr.className = 'a4-page-header';
    hdr.innerHTML = `<span>${processTemplate(hL_tpl, pageNum)}</span><span>${processTemplate(hC_tpl, pageNum)}</span><span>${processTemplate(hR_tpl, pageNum)}</span>`;
    pageSheet.appendChild(hdr);

    // Textarea
    const area = document.createElement('textarea');
    area.className = 'a4-section-textarea';
    area.style.cssText = 'width:100%;flex:1;border:none;outline:none;resize:none !important;background:transparent;color:var(--text-primary);font-family:Inter,sans-serif;font-size:14px;line-height:inherit;overflow-y:auto;';
    area.value = sectionText.replace(/<!-- COVER:.*?-->\n?/, '').trim();
    area.placeholder = "Araştırma notlarınızı buraya yazın...\n/ komutlarını kullanabilirsiniz.";
    
    area.oninput = () => {
      pageSections[idx] = (isCover ? (sectionText.match(/<!-- COVER:.*?-->/)?.[0] || '') + '\n' : '') + area.value;
      mainNotes.value = pageSections.join('\n\n--- [Sayfa Sonu] ---\n\n');
      if (typeof triggerWordCount === 'function') triggerWordCount();
      if (typeof triggerAutosave === 'function') triggerAutosave();
    };

    pageSheet.appendChild(area);

    // Footer
    const ftr = document.createElement('div');
    ftr.className = 'a4-page-footer';
    ftr.innerHTML = `<span>${processTemplate(fL_tpl, pageNum)}</span><span>${processTemplate(fC_tpl, pageNum)}</span><span>${processTemplate(fR_tpl, pageNum)}</span>`;
    pageSheet.appendChild(ftr);

    scrollArea.appendChild(pageSheet);
  });

  if (typeof tryCreateIcons === 'function') tryCreateIcons();
}


// ====================================================
// ADVANCED RESEARCH OS ENGINE v2.3
// (TOC Outline, Image Drag-Drop, Citations & Print)
// ====================================================

// 1. Document Outline / TOC Generator
function renderDocumentOutline() {
  const container = document.getElementById('doc-outline-tree');
  const mainNotes = document.getElementById('rec-form-notes');
  if (!container || !mainNotes) return;

  const text = mainNotes.value;
  const lines = text.split('\n');
  const headings = [];

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      headings.push({ level: 'h1', text: trimmed.substring(2) });
    } else if (trimmed.startsWith('## ')) {
      headings.push({ level: 'h2', text: trimmed.substring(3) });
    } else if (trimmed.startsWith('### ')) {
      headings.push({ level: 'h3', text: trimmed.substring(4) });
    }
  });

  if (headings.length === 0) {
    container.innerHTML = '<span style="font-size:10px;color:var(--text-faint)">Başlık eklenmedi</span>';
    return;
  }

  let html = '';
  headings.forEach((h) => {
    html += `
      <div class="outline-item ${h.level}" onclick="scrollToHeading('${escapeHTML(h.text)}')">
        ${escapeHTML(h.text)}
      </div>
    `;
  });
  container.innerHTML = html;
}

function scrollToHeading(headingText) {
  const scrollArea = document.querySelector('.a4-scroll-area');
  if (!scrollArea) return;

  // Find textarea containing heading or scroll into view
  const textareas = scrollArea.querySelectorAll('textarea');
  textareas.forEach(area => {
    if (area.value.includes(headingText)) {
      area.focus();
      area.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

// 2. Image Drag & Drop Engine
function setupImageDragAndDrop() {
  const scrollArea = document.querySelector('.a4-scroll-area');
  if (!scrollArea) return;

  scrollArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    scrollArea.classList.add('drag-over');
  });

  scrollArea.addEventListener('dragleave', () => {
    scrollArea.classList.remove('drag-over');
  });

  scrollArea.addEventListener('drop', (e) => {
    e.preventDefault();
    scrollArea.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        processAndInsertImage(file);
      }
    }
  });
}

function triggerImageUpload() {
  const input = document.getElementById('image-upload-input');
  if (input) input.click();
}

function handleImageFileSelect(input) {
  const file = input.files[0];
  if (file && file.type.startsWith('image/')) {
    processAndInsertImage(file);
  }
}

function processAndInsertImage(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    const imgMarkdown = `

![${file.name}](${dataUrl})
*Görsel: ${escapeHTML(file.name)}*

`;
    wrapText(imgMarkdown, '');
    showToast('Görsel kâğıda başarıyla eklendi.', 'success');
  };
  reader.readAsDataURL(file);
}

// 3. Citation & Bibliography Manager
function insertCitation() {
  const refTitle = prompt('Atıf yapılacak kaynak / yazar adı:');
  if (!refTitle) return;
  const year = prompt('Yayın Yılı:', new Date().getFullYear());

  const citationTag = ` [Ref: ${refTitle}, ${year || ''}] `;
  wrapText(citationTag, '');
  showToast('Atıf eklendi.', 'info');
}

function generateBibliography() {
  const mainNotes = document.getElementById('rec-form-notes');
  if (!mainNotes) return;

  const text = mainNotes.value;
  const citations = text.match(/\[Ref:\s*([^\]]+)\]/g);

  if (!citations || citations.length === 0) {
    showToast('Metinde henüz atıf [Ref: ...] bulunmuyor.', 'warning');
    return;
  }

  const uniqueRefs = Array.from(new Set(citations));
  let bibText = '\n\n--- [Sayfa Sonu] ---\n\n### Kaynakça (References)\n\n';

  uniqueRefs.forEach((ref, idx) => {
    const clean = ref.replace('[Ref:', '').replace(']', '').trim();
    bibText += `${idx + 1}. **${clean}** — *IRIS Research Studio Kaynak Kaydı.*\n`;
  });

  // Prepend or append to notes
  if (!text.includes('### Kaynakça (References)')) {
    mainNotes.value = text + bibText;
    triggerWordCount();
    triggerAutosave();
    renderMultiPageA4Sheets();
  if (typeof renderDocumentOutline === 'function') renderDocumentOutline();
    showToast('Kaynakça otomatik derlendi ve sona eklendi.', 'success');
  } else {
    showToast('Kaynakça zaten belgenin sonunda mevcut.', 'info');
  }
}

function seedSampleRecordsIfEmpty() {
  if (!window.IRIS_DB) return;
  const existing = window.IRIS_DB.getRecords(true);
  if (existing.length > 0) return;

  // Create default collections
  const col1 = window.IRIS_DB.saveCollection({ name: 'Ar-Ge Projeleri', color: '#6366f1', description: 'Otonom ve Yapay Zekâ çalışmaları' });
  const col2 = window.IRIS_DB.saveCollection({ name: 'Literatür Taraması', color: '#10b981', description: 'Akademik yayınlar ve makaleler' });

  // Sample Record 1: Patent
  window.IRIS_DB.saveRecord({
    title: 'Otonom Robotlar İçin LiDAR-SLAM Navigasyon Patenti',
    type: 'patent',
    code: 'PAT-2026-001',
    collectionId: col1.id,
    authors: 'Dr. Ahmet Yılmaz, Ar-Ge Ekibi',
    source: 'TPE / EP2026194',
    status: 'incelemede',
    priority: 'yuksek',
    isFavorite: true,
    progress: 75,
    tags: ['patent', 'lidar', 'slam', 'otonom'],
    analysisNotes: `<!-- COVER:EXECUTIVE -->
# Otonom Robotlar İçin LiDAR-SLAM Navigasyon Patenti
## PAT-2026-001 — Kurumsal Ar-Ge Değerlendirme Raporu

**Hazırlayan:** Dr. Ahmet Yılmaz
**Kurum:** IRIS Research Studio
**Tarih:** 2026-07-21
**Gizlilik Derecesi:** HİZMETE ÖZEL / GİZLİ

--- [Sayfa Sonu] ---

### 1. Genel Bilgiler
- **Buluş Başlığı:** Otonom Mobil Robotlarda Anlık Haritalama ve LiDAR-SLAM Yöntemi
- **Patent No:** EP2026194-A1
- **Mucitler:** Dr. Ahmet Yılmaz, Müh. Zeynep Kaya

### 2. Teknik Problem ve Çözüm
Mevcut SLAM algoritmalarında kapalı alan sensör gürültüsü yüksek dinamik sapmalara yol açmaktadır. Önerilen buluş, filtrelenmiş nokta bulutunu donanımsal ivmeölçer verileriyle senkronize ederek hata payını %85 oranında azaltmaktadır.
`
  });

  // Sample Record 2: Article
  window.IRIS_DB.saveRecord({
    title: 'Derin Öğrenme Tabanlı Kuantum Algoritmaları Analizi',
    type: 'article',
    code: 'ART-2026-002',
    collectionId: col2.id,
    authors: 'Prof. Dr. Mehmet Demir',
    source: 'Nature Quantum Information',
    status: 'tamamlandi',
    priority: 'orta',
    isFavorite: false,
    progress: 100,
    tags: ['kuantum', 'derin-ogrenme', 'makale'],
    analysisNotes: `<!-- COVER:ACADEMIC -->
# Derin Öğrenme Tabanlı Kuantum Algoritmaları Analizi
## Bilimsel Araştırma ve Literatür İnceleme Raporu

**Yazar:** Prof. Dr. Mehmet Demir
**Araştırma Grubu:** Kuantum Yazılım Laboratuvarı
**Yayın Tarihi:** 2026-05-14

--- [Sayfa Sonu] ---

### 1. Çalışmanın Amacı
Kuantum devre simülasyonlarında evrişimli sinir ağları (CNN) kullanarak optimizasyon süresini kısaltmak.
`
  });
}

function quickCreateAndOpen(type = 'patent') {
  const titles = {
    patent: 'Yeni Patent İnceleme Analizi',
    article: 'Yeni Makale Araştırma Notu',
    standard: 'Yeni Standart Değerlendirmesi',
    project: 'Yeni Ar-Ge Proje Dokümanı'
  };

  const rec = window.IRIS_DB.saveRecord({
    title: titles[type] || 'Yeni Araştırma Notu',
    type: type,
    status: 'taslak',
    priority: 'orta',
    analysisNotes: window.TEMPLATES && window.TEMPLATES[type] ? window.TEMPLATES[type].content : '# Yeni Araştırma Belgesi\n\nNotlarınızı buraya ekleyin.'
  });

  renderSidebarTrees();
  openRecordEditor(rec.id);
  showToast('Yeni çalışma oluşturuldu ve Editörde açıldı.', 'success');
}


// ============================================================
// WORD-LIKE FEATURES (Layout, Headers, Footers)
// ============================================================

function toggleHeaderEditor() {
  const bar = document.getElementById('header-editor-bar');
  if (bar) bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
}

function toggleFooterEditor() {
  const bar = document.getElementById('footer-editor-bar');
  if (bar) bar.style.display = bar.style.display === 'none' ? 'flex' : 'none';
}

function closeHeaderFooterBar(type) {
  const bar = document.getElementById(type + '-editor-bar');
  if (bar) bar.style.display = 'none';
}

function applyHeaderFooter() {
  triggerAutosave();
  if (typeof renderMultiPageA4Sheets === 'function') {
    renderMultiPageA4Sheets();
  }
  showToast('Üst/Alt bilgi güncellendi.', 'success');
}

function setPageMargin(type) {
  document.documentElement.dataset.margin = type;
  triggerAutosave();
  if (typeof renderMultiPageA4Sheets === 'function') renderMultiPageA4Sheets();
}

function setLineSpacing(val) {
  document.documentElement.dataset.lineSpacing = val;
  triggerAutosave();
  if (typeof renderMultiPageA4Sheets === 'function') renderMultiPageA4Sheets();
}

function setColumnLayout(cols) {
  document.documentElement.dataset.colLayout = cols;
  triggerAutosave();
  if (typeof renderMultiPageA4Sheets === 'function') renderMultiPageA4Sheets();
}

function openCoverModal() {
  if (confirm("Belgenizin başına bir kapak sayfası (Cover Page) eklemek istiyor musunuz?")) {
    const title = document.getElementById('rec-form-title').value || "Araştırma Başlığı";
    const authors = document.getElementById('rec-form-authors').value || "Yazar Adı";
    const date = new Date().toLocaleDateString('tr-TR');
    
    const coverHTML = `\n<div class="cover-page-block">\n  <div class="cover-title">${title}</div>\n  <div class="cover-subtitle">Araştırma Raporu</div>\n  <div class="cover-meta">Hazırlayan: ${authors}<br>Tarih: ${date}</div>\n</div>\n\n`;
    
    const area = document.getElementById('rec-form-notes');
    area.value = coverHTML + area.value;
    triggerAutosave();
    triggerWordCount();
  }
}

// ============================================================
// CITATION MANAGER
// ============================================================
let currentCitationStyle = 'apa';

function showCitationManager() {
  renderCitationList();
  const modal = document.getElementById('citation-manager-modal');
  if(modal) modal.classList.add('active');
}

function openAddCitationModal() {
  const modal = document.getElementById('add-citation-modal');
  if(modal) modal.classList.add('active');
  // Auto-generate cite key if empty
  if (!document.getElementById('cite-key').value) {
    document.getElementById('cite-key').value = 'ref' + Math.floor(Math.random() * 10000);
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if(modal) modal.classList.remove('active');
}

function setCitationStyle(style, btn) {
  currentCitationStyle = style;
  
  // Update buttons in modal
  document.querySelectorAll('#cite-style-btns .filter-chip').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  else {
    const b = document.querySelector(`#cite-style-btns .filter-chip[data-style="${style}"]`);
    if(b) b.classList.add('active');
  }
  
  // Update badge in editor
  const badge = document.getElementById('citation-style-badge');
  if(badge) badge.textContent = style.toUpperCase();
  
  renderCitationList();
}

function showCitationStylePicker() {
  showCitationManager();
}

function updateCiteForm() {
  const type = document.getElementById('cite-type').value;
  const journalGroup = document.getElementById('cite-journal-group');
  if (type === 'book' || type === 'website') {
    journalGroup.style.display = 'none';
  } else {
    journalGroup.style.display = 'block';
  }
}

function saveCitation() {
  const title = document.getElementById('cite-title').value.trim();
  if (!title) { alert('Lütfen kaynak başlığını girin.'); return; }
  
  const citation = {
    id: Date.now().toString(),
    type: document.getElementById('cite-type').value,
    authors: document.getElementById('cite-authors').value.trim(),
    title: title,
    year: document.getElementById('cite-year').value.trim(),
    pages: document.getElementById('cite-pages').value.trim(),
    journal: document.getElementById('cite-journal').value.trim(),
    url: document.getElementById('cite-url').value.trim(),
    key: document.getElementById('cite-key').value.trim() || 'ref' + Date.now()
  };
  
  let citations = JSON.parse(localStorage.getItem('iris_citations') || '[]');
  citations.push(citation);
  localStorage.setItem('iris_citations', JSON.stringify(citations));
  
  closeModal('add-citation-modal');
  showToast('Kaynak başarıyla eklendi', 'success');
  renderCitationList();
}

function getCitations() {
  return JSON.parse(localStorage.getItem('iris_citations') || '[]');
}

function renderCitationList(filterText = '') {
  const list = document.getElementById('citation-list');
  if (!list) return;
  
  const citations = getCitations();
  list.innerHTML = '';
  
  if (citations.length === 0) {
    list.innerHTML = '<div class="empty-state" style="padding:20px 0"><p>Henüz kaynak eklenmedi.</p></div>';
    return;
  }
  
  citations.forEach(c => {
    const searchStr = `${c.title} ${c.authors} ${c.key}`.toLowerCase();
    if (filterText && !searchStr.includes(filterText.toLowerCase())) return;
    
    let refText = formatCitationText(c, currentCitationStyle);
    
    list.innerHTML += `
      <div class="citation-list-item">
        <div style="flex:1">
          <div class="citation-ref-key">[${c.key}]</div>
          <div class="citation-ref-text">${refText}</div>
        </div>
        <div style="display:flex;gap:4px;flex-direction:column;">
          <button class="btn btn-ghost btn-sm" style="padding:2px 6px;font-size:10px;" onclick="copyToClipboard('[${c.key}]')">Atıf Al</button>
        </div>
      </div>
    `;
  });
}

function filterCitations() {
  const txt = document.getElementById('cite-search').value;
  renderCitationList(txt);
}

function formatCitationText(c, style) {
  const authors = c.authors || 'Bilinmeyen Yazar';
  const year = c.year || 'Tarih Yok';
  const title = c.title || 'Başlık Yok';
  const journal = c.journal ? `<i>${c.journal}</i>` : '';
  const url = c.url ? `<a href="${c.url}" target="_blank">${c.url}</a>` : '';
  
  if (style === 'apa') {
    return `${authors}. (${year}). ${title}. ${journal}. ${url}`;
  } else if (style === 'mla') {
    return `${authors}. "${title}." ${journal}, ${year}. ${url}`;
  } else if (style === 'ieee') {
    return `${authors}, "${title}," ${journal}, ${year}. ${url}`;
  }
  return `${authors}. ${title}. ${year}.`;
}

function generateBibliography() {
  const citations = getCitations();
  if (citations.length === 0) {
    alert("Kütüphanenizde kaynak bulunamadı.");
    return;
  }
  
  let bibHTML = '\n<br><hr>\n<h3>Kaynakça</h3>\n<ul style="list-style-type:none;padding-left:0;font-size:12px;line-height:1.6;">\n';
  
  // Sort alphabetically by authors
  citations.sort((a,b) => (a.authors||'').localeCompare(b.authors||''));
  
  citations.forEach(c => {
    bibHTML += `<li style="margin-bottom:8px;">${formatCitationText(c, currentCitationStyle)}</li>\n`;
  });
  bibHTML += '</ul>\n';
  
  const area = document.getElementById('rec-form-notes');
  area.value = area.value + bibHTML;
  triggerAutosave();
  triggerWordCount();
  showToast('Kaynakça belgenin sonuna eklendi.', 'success');
}

function insertInlineCitation() {
  const key = prompt("Eklemek istediğiniz kaynağın Kısa Etiketini (örn: Smith2024) girin:");
  if (key) {
    insertPrefix(`[${key}]`);
  }
}
