<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ADM | Anúncio Fantasma</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    :root {
      --bg: #030712;
      --card-bg: rgba(15, 23, 42, 0.85);
      --border: rgba(255, 255, 255, 0.08);
      --purple: #6366f1;
      --purple-hover: #4f46e5;
      --cyan: #38bdf8;
      --green: #10b981;
      --green-hover: #059669;
      --yellow: #f59e0b;
      --red: #ef4444;
      --red-hover: #dc2626;
      --text-muted: #94a3b8;
      --text-white: #f8fafc;
    }

    * { box-sizing: border-box; font-family: 'Plus Jakarta Sans', sans-serif; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text-white); min-height: 100vh; padding: 24px; }

    /* ========== HEADER ========== */
    .header {
      display: flex; justify-content: space-between; align-items: center;
      flex-wrap: wrap; gap: 16px; margin-bottom: 24px;
      padding-bottom: 16px; border-bottom: 1px solid var(--border);
    }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .header-left .logo { font-size: 2rem; }
    .header-left h1 { font-size: 1.3rem; font-weight: 800; }
    .header-left h1 span { color: var(--cyan); }
    .header-left .badge {
      background: var(--purple); padding: 2px 10px;
      border-radius: 12px; font-size: 0.6rem;
      font-weight: 700; text-transform: uppercase;
    }
    .header-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .header-right .stats {
      display: flex; gap: 10px; font-size: 0.72rem;
      color: var(--text-muted); flex-wrap: wrap;
    }
    .header-right .stats span {
      background: var(--card-bg); padding: 5px 12px;
      border-radius: 8px; border: 1px solid var(--border);
      display: inline-flex; align-items: center; gap: 5px;
    }

    /* ========== AÇÕES EM MASSA ========== */
    .mass-actions {
      display: flex; gap: 8px; flex-wrap: wrap;
      margin-bottom: 20px; padding: 14px;
      background: var(--card-bg); border: 1px solid var(--border);
      border-radius: 12px;
    }
    .mass-btn {
      border: none; padding: 8px 16px; border-radius: 8px;
      font-weight: 700; font-size: 0.72rem; cursor: pointer;
      transition: 0.2s; display: inline-flex; align-items: center; gap: 6px;
    }
    .mass-btn-danger { background: var(--red); color: #fff; }
    .mass-btn-danger:hover { background: var(--red-hover); }
    .mass-btn-success { background: var(--green); color: #000; }
    .mass-btn-success:hover { background: var(--green-hover); }
    .mass-btn-warning { background: var(--yellow); color: #000; }
    .mass-btn-warning:hover { background: #d97706; }

    /* ========== FILTROS ========== */
    .filters {
      display: flex; flex-wrap: wrap; gap: 12px;
      margin-bottom: 20px; align-items: center;
    }
    .search-box {
      flex: 1; min-width: 200px;
      display: flex; align-items: center;
      background: var(--card-bg); border: 1px solid var(--border);
      border-radius: 10px; padding: 0 12px;
    }
    .search-box:focus-within { border-color: var(--purple); }
    .search-box i { color: var(--text-muted); font-size: 0.8rem; }
    .search-box input {
      background: transparent; border: none; padding: 10px;
      color: #fff; font-size: 0.8rem; width: 100%; outline: none;
    }
    .search-box input::placeholder { color: var(--text-muted); }
    .filter-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
    .filter-btn {
      background: var(--card-bg); border: 1px solid var(--border);
      color: var(--text-muted); padding: 8px 14px;
      border-radius: 8px; font-size: 0.7rem; font-weight: 600;
      cursor: pointer; transition: 0.2s; white-space: nowrap;
      display: inline-flex; align-items: center; gap: 5px;
    }
    .filter-btn:hover { border-color: var(--purple); color: #fff; }
    .filter-btn.active { background: var(--purple); border-color: var(--purple); color: #fff; }

    /* ========== TABELA ========== */
    .table-wrapper {
      background: var(--card-bg); border: 1px solid var(--border);
      border-radius: 16px; overflow: hidden; overflow-x: auto;
    }
    table {
      width: 100%; border-collapse: collapse;
      font-size: 0.78rem; min-width: 1000px;
    }
    thead { background: rgba(99, 102, 241, 0.08); }
    th {
      padding: 14px 12px; text-align: left;
      font-weight: 700; font-size: 0.68rem;
      text-transform: uppercase; color: var(--text-muted);
      border-bottom: 1px solid var(--border); white-space: nowrap;
    }
    td {
      padding: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      vertical-align: middle;
    }
    tr:hover td { background: rgba(99, 102, 241, 0.04); }
    tr.clickable { cursor: pointer; }
    tr.clickable:hover td { background: rgba(99, 102, 241, 0.08); }

    .user-cell { display: flex; align-items: center; gap: 10px; }
    .user-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: var(--purple); display: flex; align-items: center;
      justify-content: center; font-weight: 700; font-size: 0.7rem;
      color: #fff; flex-shrink: 0;
    }
    .domain-cell { color: var(--cyan); font-weight: 600; font-size: 0.8rem; }

    .plan-badge {
      display: inline-block; padding: 2px 10px;
      border-radius: 12px; font-size: 0.65rem; font-weight: 700;
    }
    .plan-free { background: rgba(245, 158, 11, 0.15); color: var(--yellow); }
    .plan-daily { background: rgba(56, 189, 248, 0.15); color: var(--cyan); }
    .plan-weekly { background: rgba(99, 102, 241, 0.15); color: var(--purple); }
    .plan-monthly { background: rgba(16, 185, 129, 0.15); color: var(--green); }

    .status-active { color: var(--green); font-weight: 700; font-size: 0.72rem; }
    .status-pending { color: var(--yellow); font-weight: 700; font-size: 0.72rem; }
    .status-expired { color: var(--red); font-weight: 700; font-size: 0.72rem; }
    .status-revoked { color: var(--red); font-weight: 700; font-size: 0.72rem; text-decoration: line-through; }
    .status-renewal {
      color: var(--purple); font-weight: 700; font-size: 0.72rem;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .timer-cell {
      font-family: 'Courier New', monospace; font-weight: 700;
      font-size: 0.72rem; padding: 4px 8px; border-radius: 6px;
      background: rgba(245, 158, 11, 0.1);
      border: 1px solid rgba(245, 158, 11, 0.3);
      color: var(--yellow); text-align: center;
      white-space: nowrap; display: inline-block; min-width: 90px;
    }
    .timer-cell.danger {
      background: rgba(239, 68, 68, 0.1);
      border-color: rgba(239, 68, 68, 0.3);
      color: var(--red); animation: pulse 1.2s infinite;
    }
    .timer-cell.expired {
      background: rgba(107, 114, 128, 0.1);
      border-color: rgba(107, 114, 128, 0.3);
      color: #6b7280;
    }

    .date-cell { font-size: 0.68rem; color: var(--text-muted); white-space: nowrap; }
    .date-cell .label { color: var(--text-muted); font-weight: 600; font-size: 0.6rem; }

    .actions { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; }
    .btn-thin {
      border: none; padding: 6px 10px; border-radius: 6px;
      font-weight: 700; font-size: 0.62rem; cursor: pointer;
      transition: 0.2s; display: inline-flex; align-items: center;
      gap: 4px; white-space: nowrap;
    }
    .btn-approve { background: var(--green); color: #000; }
    .btn-approve:hover { background: var(--green-hover); }
    .btn-renew { background: var(--purple); color: #fff; }
    .btn-renew:hover { background: var(--purple-hover); }
    .btn-revoke { background: var(--yellow); color: #000; }
    .btn-revoke:hover { background: #d97706; }
    .btn-reactivate { background: var(--cyan); color: #000; }
    .btn-reactivate:hover { background: #0ea5e9; }
    .btn-danger { background: var(--red); color: #fff; }
    .btn-danger:hover { background: var(--red-hover); }

    .empty-state { text-align: center; padding: 48px 20px; color: var(--text-muted); }
    .empty-state i { font-size: 3rem; margin-bottom: 12px; opacity: 0.3; }
    .empty-state h3 { color: #fff; margin-bottom: 4px; }

    .notification-badge {
      background: var(--red); color: #fff;
      padding: 1px 6px; border-radius: 10px;
      font-size: 0.55rem; font-weight: 700; animation: pulse 1s infinite;
    }

    /* ========== MODAL ========== */
    .modal-overlay {
      display: none; position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.85); z-index: 999;
      justify-content: center; align-items: center; padding: 16px;
      backdrop-filter: blur(4px);
    }
    .modal-overlay.active { display: flex; }
    .modal-content {
      background: var(--card-bg); border: 1px solid var(--border);
      border-radius: 20px; padding: 24px;
      max-width: 700px; width: 100%; max-height: 90vh;
      overflow-y: auto;
      animation: modalIn 0.3s ease;
    }
    @keyframes modalIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 20px; padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    .modal-header h2 {
      font-size: 1.1rem; font-weight: 800;
      display: flex; align-items: center; gap: 10px;
    }
    .modal-header h2 .avatar-large {
      width: 42px; height: 42px; border-radius: 50%;
      background: var(--purple); display: flex; align-items: center;
      justify-content: center; font-weight: 700; font-size: 0.85rem;
    }
    .modal-close {
      background: rgba(239, 68, 68, 0.15); color: var(--red);
      border: 1px solid var(--red); width: 32px; height: 32px;
      border-radius: 8px; cursor: pointer; display: flex;
      align-items: center; justify-content: center;
      font-size: 0.85rem; transition: 0.2s;
    }
    .modal-close:hover { background: rgba(239, 68, 68, 0.3); }

    .modal-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 12px; margin-bottom: 20px;
    }
    .stat-box {
      background: rgba(3, 7, 18, 0.6);
      border: 1px solid var(--border); border-radius: 12px;
      padding: 12px; text-align: center;
    }
    .stat-box .stat-value {
      font-size: 1.5rem; font-weight: 900;
      color: var(--cyan); line-height: 1;
    }
    .stat-box .stat-label {
      font-size: 0.65rem; color: var(--text-muted);
      font-weight: 700; text-transform: uppercase;
      margin-top: 4px;
    }
    .stat-box.warning .stat-value { color: var(--yellow); }
    .stat-box.danger .stat-value { color: var(--red); }
    .stat-box.success .stat-value { color: var(--green); }

    .limit-alert {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 10px; padding: 12px 16px;
      margin-bottom: 16px;
      display: flex; align-items: center; gap: 10px;
      font-size: 0.8rem; color: var(--red); font-weight: 700;
    }

    .limit-ok {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 10px; padding: 12px 16px;
      margin-bottom: 16px;
      display: flex; align-items: center; gap: 10px;
      font-size: 0.8rem; color: var(--green); font-weight: 700;
    }

    .domain-list {
      display: flex; flex-direction: column; gap: 10px;
    }
    .domain-item {
      background: rgba(3, 7, 18, 0.6);
      border: 1px solid var(--border); border-radius: 12px;
      padding: 14px;
      transition: 0.2s;
    }
    .domain-item:hover { border-color: rgba(99, 102, 241, 0.4); }
    .domain-item-header {
      display: flex; justify-content: space-between;
      align-items: center; margin-bottom: 8px;
      flex-wrap: wrap; gap: 8px;
    }
    .domain-item-name {
      color: var(--cyan); font-weight: 700;
      font-size: 0.88rem; display: flex;
      align-items: center; gap: 6px;
    }
    .domain-item-meta {
      display: flex; gap: 12px; flex-wrap: wrap;
      font-size: 0.7rem; color: var(--text-muted);
    }
    .domain-item-meta span {
      display: inline-flex; align-items: center; gap: 4px;
    }
    .domain-item-actions {
      display: flex; gap: 6px; margin-top: 10px;
      padding-top: 10px; border-top: 1px solid var(--border);
      flex-wrap: wrap;
    }

    /* ========== RESPONSIVIDADE ========== */
    @media (max-width: 768px) {
      body { padding: 12px; }
      .header-left h1 { font-size: 1rem; }
      .header-right .stats { font-size: 0.65rem; gap: 6px; }
      .header-right .stats span { padding: 4px 8px; }
      .filter-btn { font-size: 0.6rem; padding: 6px 10px; }
      td, th { padding: 8px; font-size: 0.68rem; }
      .user-avatar { width: 26px; height: 26px; font-size: 0.6rem; }
      .btn-thin { font-size: 0.58rem; padding: 4px 8px; }
      .timer-cell { font-size: 0.65rem; padding: 3px 6px; min-width: 70px; }
      .mass-btn { font-size: 0.65rem; padding: 6px 12px; }
      .modal-content { padding: 16px; }
      .modal-stats { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 480px) {
      .header { flex-direction: column; align-items: flex-start; }
      .header-right { width: 100%; justify-content: space-between; }
      .filters { flex-direction: column; }
      .search-box { width: 100%; }
      .mass-actions { flex-direction: column; }
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    tbody tr { animation: fadeIn 0.3s ease forwards; }
  </style>

  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      <span class="logo">👻</span>
      <h1>Anúncio <span>Fantasma</span></h1>
      <span class="badge">ADMIN</span>
    </div>
    <div class="header-right">
      <div class="stats">
        <span id="totalLicenses"><i class="fas fa-hashtag"></i> 0</span>
        <span id="activeCount"><i class="fas fa-check-circle" style="color: var(--green);"></i> 0</span>
        <span id="pendingCount"><i class="fas fa-clock" style="color: var(--yellow);"></i> 0</span>
        <span id="expiredCount"><i class="fas fa-exclamation-circle" style="color: var(--red);"></i> 0</span>
        <span id="revokedCount"><i class="fas fa-ban" style="color: var(--red);"></i> 0</span>
      </div>
    </div>
  </div>

  <!-- AÇÕES EM MASSA -->
  <div class="mass-actions">
    <button class="mass-btn mass-btn-danger" onclick="revokeAll()">
      <i class="fas fa-ban"></i> REVOGAR TODAS
    </button>
    <button class="mass-btn mass-btn-success" onclick="reactivateAll()">
      <i class="fas fa-sync"></i> REATIVAR TODAS (TEMPO ZERADO)
    </button>
    <button class="mass-btn mass-btn-warning" onclick="deleteAll()">
      <i class="fas fa-trash"></i> EXCLUIR TUDO
    </button>
  </div>

  <!-- FILTROS -->
  <div class="filters">
    <div class="search-box">
      <i class="fas fa-search"></i>
      <input type="text" id="searchInput" placeholder="Buscar por domínio, usuário ou plano..." oninput="filterTable()">
    </div>
    <div class="filter-buttons">
      <button class="filter-btn active" data-filter="all" onclick="setFilter('all', this)"><i class="fas fa-list"></i> Todos</button>
      <button class="filter-btn" data-filter="active" onclick="setFilter('active', this)"><i class="fas fa-check-circle" style="color: var(--green);"></i> Ativos</button>
      <button class="filter-btn" data-filter="pending" onclick="setFilter('pending', this)"><i class="fas fa-clock" style="color: var(--yellow);"></i> Pendentes</button>
      <button class="filter-btn" data-filter="renewal" onclick="setFilter('renewal', this)"><i class="fas fa-sync" style="color: var(--purple);"></i> Renovações <span class="notification-badge" id="renewalBadge" style="display:none;">0</span></button>
      <button class="filter-btn" data-filter="expired" onclick="setFilter('expired', this)"><i class="fas fa-exclamation-circle" style="color: var(--red);"></i> Expirados</button>
      <button class="filter-btn" data-filter="revoked" onclick="setFilter('revoked', this)"><i class="fas fa-ban" style="color: var(--red);"></i> Revogados</button>
    </div>
  </div>

  <!-- TABELA -->
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>Usuário</th>
          <th>Domínio</th>
          <th>Plano</th>
          <th>Status</th>
          <th>⏱️ Restante</th>
          <th>📅 Datas</th>
          <th style="text-align: center;">Ações</th>
        </tr>
      </thead>
      <tbody id="admTable"></tbody>
    </table>
  </div>

  <!-- MODAL DE DETALHES DO USUÁRIO -->
  <div class="modal-overlay" id="userModal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>
          <div class="avatar-large" id="modalAvatar">??</div>
          <div>
            <div id="modalUserName">Usuário</div>
            <div style="font-size: 0.68rem; color: var(--text-muted); font-weight: 500;" id="modalUserId">ID: --</div>
          </div>
        </h2>
        <button class="modal-close" onclick="closeUserModal()">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-stats">
        <div class="stat-box">
          <div class="stat-value" id="modalTotalDomains">0</div>
          <div class="stat-label">Total Domínios</div>
        </div>
        <div class="stat-box success">
          <div class="stat-value" id="modalActiveDomains">0</div>
          <div class="stat-label">Ativos</div>
        </div>
        <div class="stat-box warning">
          <div class="stat-value" id="modalFreeUsed">0</div>
          <div class="stat-label">Grátis Usados</div>
        </div>
        <div class="stat-box danger">
          <div class="stat-value" id="modalFreeRemaining">3</div>
          <div class="stat-label">Grátis Restantes</div>
        </div>
      </div>

      <div id="limitAlertBox"></div>

      <h3 style="font-size: 0.85rem; font-weight: 800; margin-bottom: 12px; color: var(--cyan);">
        📋 Domínios deste usuário:
      </h3>

      <div class="domain-list" id="modalDomainList"></div>
    </div>
  </div>

<script>
  const firebaseConfig = {
    databaseURL: "https://maestro-server-pro-default-rtdb.firebaseio.com"
  };
  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();

  let allLicenses = [];
  let currentFilter = 'all';
  let searchTerm = '';
  let timerInterval = null;
  let currentModalUserId = null;

  const PLAN_DURATIONS = {
    'Grátis': 600,
    'Diário': 86400,
    'Semanal': 604800,
    'Mensal': 2592000
  };

  const MAX_FREE_PLANS_PER_USER = 3;

  // ========== CARREGAR DADOS ==========
  db.ref('licenses').on('value', snapshot => {
    const data = snapshot.val();
    allLicenses = [];

    if (data) {
      Object.keys(data).forEach(k => {
        allLicenses.push({ id: k, ...data[k] });
      });

      allLicenses.sort((a, b) => {
        if (a.renovacaoSolicitada && !b.renovacaoSolicitada) return -1;
        if (!a.renovacaoSolicitada && b.renovacaoSolicitada) return 1;
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    }

    updateStats();
    renderTable();
    startTimerUpdates();

    if (currentModalUserId) {
      openUserModal(currentModalUserId, true);
    }
  });

  // ========== TIMER ==========
  function startTimerUpdates() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
      document.querySelectorAll('.timer-cell[data-license-id]').forEach(el => {
        const licId = el.getAttribute('data-license-id');
        const lic = allLicenses.find(l => l.id === licId);
        
        if (!lic || lic.active !== true) return;
        
        const duration = PLAN_DURATIONS[lic.planName];
        if (!duration) return;
        
        const startTime = lic.spooferActivatedAt 
          ? new Date(lic.spooferActivatedAt).getTime() 
          : new Date(lic.createdAt).getTime();
        
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = Math.max(0, duration - elapsed);
        
        if (remaining <= 0) {
          el.className = 'timer-cell expired';
          el.innerHTML = '⏰ EXPIROU';
          
          db.ref('licenses/' + lic.id).update({
            active: false,
            expiredAt: new Date().toISOString(),
            expiredReason: 'Expiração automática'
          }).catch(err => console.error('Erro:', err));
        } else {
          updateTimerCell(el, lic);
        }
      });
    }, 1000);
  }

  function updateTimerCell(el, lic) {
    const duration = PLAN_DURATIONS[lic.planName];
    if (!duration) return;

    const startTime = lic.spooferActivatedAt 
      ? new Date(lic.spooferActivatedAt).getTime() 
      : new Date(lic.createdAt).getTime();
    
    const elapsed = (Date.now() - startTime) / 1000;
    const remaining = Math.max(0, duration - elapsed);

    if (remaining <= 0) {
      el.className = 'timer-cell expired';
      el.innerHTML = '⏰ EXPIROU';
      return;
    }

    el.innerHTML = formatTime(remaining);

    if (remaining < 3600) {
      el.className = 'timer-cell danger';
    } else {
      el.className = 'timer-cell';
    }
  }

  function formatTime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  }

  // 🔥 VERIFICAR SE ESTÁ EXPIRADO (CORRIGIDO!)
  function isExpired(lic) {
    // Se foi revogada, não é expiração
    if (lic.revogadaEm) return false;
    
    // 🔥 SE TEM expiredAt DEFINIDO, É EXPIRADO (para qualquer plano!)
    if (lic.expiredAt) return true;
    
    // Se não está ativa, verifica expiresAt
    if (lic.active !== true) {
      if (lic.expiresAt) return new Date(lic.expiresAt).getTime() < Date.now();
      return false;
    }
    
    // 🔥 SE ESTÁ ATIVA, VERIFICA O TEMPO REAL
    const duration = PLAN_DURATIONS[lic.planName];
    if (!duration) return false;
    
    const startTime = lic.spooferActivatedAt 
      ? new Date(lic.spooferActivatedAt).getTime() 
      : new Date(lic.createdAt).getTime();
    
    const elapsed = (Date.now() - startTime) / 1000;
    const expired = elapsed >= duration;
    
    if (expired && lic.active === true) {
      db.ref('licenses/' + lic.id).update({
        active: false,
        expiredAt: new Date().toISOString(),
        expiredReason: 'Tempo esgotado'
      }).catch(err => console.error('Erro:', err));
    }
    
    return expired;
  }

  // ========== STATS ==========
  function updateStats() {
    const total = allLicenses.length;
    const active = allLicenses.filter(l => l.active === true && !isExpired(l)).length;
    const pending = allLicenses.filter(l => l.active !== true && !l.renovacaoSolicitada && !l.revogadaEm && !isExpired(l)).length;
    const renewals = allLicenses.filter(l => l.renovacaoSolicitada === true).length;
    const expired = allLicenses.filter(l => isExpired(l)).length;
    const revoked = allLicenses.filter(l => l.revogadaEm).length;

    document.getElementById('totalLicenses').innerHTML = `<i class="fas fa-hashtag"></i> ${total}`;
    document.getElementById('activeCount').innerHTML = `<i class="fas fa-check-circle" style="color: var(--green);"></i> ${active}`;
    document.getElementById('pendingCount').innerHTML = `<i class="fas fa-clock" style="color: var(--yellow);"></i> ${pending}`;
    document.getElementById('expiredCount').innerHTML = `<i class="fas fa-exclamation-circle" style="color: var(--red);"></i> ${expired}`;
    document.getElementById('revokedCount').innerHTML = `<i class="fas fa-ban" style="color: var(--red);"></i> ${revoked}`;

    const badge = document.getElementById('renewalBadge');
    if (badge) {
      if (renewals > 0) {
        badge.textContent = renewals;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  // ========== DATAS ==========
  function getDatesHtml(lic) {
    const createdAt = lic.createdAt ? new Date(lic.createdAt) : null;
    const expiresAt = lic.expiresAt ? new Date(lic.expiresAt) : null;
    const expiredAt = lic.expiredAt ? new Date(lic.expiredAt) : null;
    const revogadaEm = lic.revogadaEm ? new Date(lic.revogadaEm) : null;
    const agora = new Date();

    let html = '';

    if (createdAt) {
      html += `<div class="date-cell"><span class="label">📅 Criado:</span> ${createdAt.toLocaleDateString('pt-BR')} ${createdAt.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</div>`;
    }

    if (expiresAt) {
      const isExp = expiresAt.getTime() < agora.getTime();
      const color = isExp ? 'var(--red)' : 'var(--green)';
      html += `<div class="date-cell" style="margin-top: 2px;"><span class="label">⏰ Expira:</span> <span style="color: ${color};">${expiresAt.toLocaleDateString('pt-BR')} ${expiresAt.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span></div>`;
    }

    if (expiredAt) {
      html += `<div class="date-cell" style="margin-top: 2px;"><span class="label" style="color: var(--red);">⏰ Expirou:</span> <span style="color: var(--red);">${expiredAt.toLocaleDateString('pt-BR')} ${expiredAt.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span></div>`;
    }

    if (revogadaEm) {
      html += `<div class="date-cell" style="margin-top: 2px;"><span class="label" style="color: var(--red);">🚫 Revogado:</span> <span style="color: var(--red);">${revogadaEm.toLocaleDateString('pt-BR')} ${revogadaEm.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}</span></div>`;
    }

    if (!html) {
      html = `<div class="date-cell" style="color: var(--yellow);"><i class="fas fa-exclamation-triangle"></i> Sem data registrada</div>`;
    }

    return html;
  }

  // ========== RENDER ==========
  function renderTable() {
    const tbody = document.getElementById('admTable');
    tbody.innerHTML = '';

    let filtered = [...allLicenses];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(item => {
        return (item.domain && item.domain.toLowerCase().includes(term)) ||
               (item.userName && item.userName.toLowerCase().includes(term)) ||
               (item.planName && item.planName.toLowerCase().includes(term)) ||
               (item.id && item.id.toLowerCase().includes(term));
      });
    }

    if (currentFilter === 'active') {
      filtered = filtered.filter(item => item.active === true && !isExpired(item));
    } else if (currentFilter === 'pending') {
      filtered = filtered.filter(item => item.active !== true && !item.renovacaoSolicitada && !item.revogadaEm && !isExpired(item));
    } else if (currentFilter === 'renewal') {
      filtered = filtered.filter(item => item.renovacaoSolicitada === true);
    } else if (currentFilter === 'expired') {
      filtered = filtered.filter(item => isExpired(item));
    } else if (currentFilter === 'revoked') {
      filtered = filtered.filter(item => item.revogadaEm);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">
              <i class="fas fa-inbox"></i>
              <h3>Nenhuma licença encontrada</h3>
              <p>${allLicenses.length === 0 ? 'Ainda não há licenças cadastradas.' : 'Tente ajustar os filtros.'}</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    filtered.forEach(item => {
      const tr = document.createElement('tr');
      tr.className = 'clickable';
      
      const isRenewal = item.renovacaoSolicitada === true;
      const isRevoked = !!item.revogadaEm;
      const expired = isExpired(item);

      tr.onclick = (e) => {
        if (e.target.closest('button') || e.target.closest('a')) return;
        if (item.userId) openUserModal(item.userId);
      };

      let statusHtml = '';
      
      // 🔥 ORDEM CORRETA: RENOVAÇÃO → REVOGADO → EXPIRADO → ATIVO → PENDENTE
      if (isRenewal) {
        statusHtml = '<span class="status-renewal"><i class="fas fa-sync fa-spin"></i> RENOVAÇÃO</span>';
      } else if (isRevoked) {
        statusHtml = '<span class="status-revoked"><i class="fas fa-ban"></i> REVOGADO</span>';
      } else if (expired) {
        statusHtml = '<span class="status-expired"><i class="fas fa-exclamation-circle"></i> EXPIRADO</span>';
      } else if (item.active === true) {
        statusHtml = '<span class="status-active"><i class="fas fa-check-circle"></i> ATIVO</span>';
      } else {
        statusHtml = '<span class="status-pending"><i class="fas fa-clock"></i> PENDENTE</span>';
      }

      let planClass = 'plan-free';
      if (item.planName === 'Diário') planClass = 'plan-daily';
      else if (item.planName === 'Semanal') planClass = 'plan-weekly';
      else if (item.planName === 'Mensal') planClass = 'plan-monthly';

      const initials = item.userName ? item.userName.substring(0, 2).toUpperCase() : '??';

      let timerHtml = '<span class="timer-cell expired">--</span>';
      if (item.active === true && !expired) {
        timerHtml = `<span class="timer-cell" data-license-id="${item.id}">...</span>`;
      } else if (expired) {
        timerHtml = '<span class="timer-cell expired">EXPIRADO</span>';
      }

      const datesHtml = getDatesHtml(item);

      let actionsHtml = '';
      
      if (isRenewal) {
        actionsHtml = `
          <button class="btn-thin btn-renew" onclick="approveRenewal('${item.id}')">
            <i class="fas fa-check"></i> APROVAR
          </button>
          <button class="btn-thin btn-danger" onclick="rejectRenewal('${item.id}')">
            <i class="fas fa-times"></i>
          </button>
        `;
      } else if (isRevoked) {
        actionsHtml = `
          <button class="btn-thin btn-reactivate" onclick="reactivate('${item.id}')">
            <i class="fas fa-sync"></i> REATIVAR
          </button>
          <button class="btn-thin btn-danger" onclick="del('${item.id}')">
            <i class="fas fa-trash"></i>
          </button>
        `;
      } else if (expired) {
        actionsHtml = `
          <button class="btn-thin btn-reactivate" onclick="reactivate('${item.id}')">
            <i class="fas fa-redo"></i> REATIVAR
          </button>
          <button class="btn-thin btn-danger" onclick="del('${item.id}')">
            <i class="fas fa-trash"></i>
          </button>
        `;
      } else if (!item.active) {
        actionsHtml = `
          <button class="btn-thin btn-approve" onclick="approve('${item.id}', '${item.planName}')">
            <i class="fas fa-check"></i> APROVAR
          </button>
          <button class="btn-thin btn-danger" onclick="del('${item.id}')">
            <i class="fas fa-trash"></i>
          </button>
        `;
      } else {
        actionsHtml = `
          <button class="btn-thin btn-revoke" onclick="revoke('${item.id}')">
            <i class="fas fa-ban"></i> REVOGAR
          </button>
          <button class="btn-thin btn-danger" onclick="del('${item.id}')">
            <i class="fas fa-trash"></i>
          </button>
        `;
      }

      tr.innerHTML = `
        <td>
          <div class="user-cell">
            <div class="user-avatar">${initials}</div>
            <div>
              <div>${item.userName || 'Cliente'}</div>
              <div style="font-size: 0.6rem; color: var(--text-muted);">
                <i class="fas fa-eye"></i> ver todos
              </div>
            </div>
          </div>
        </td>
        <td class="domain-cell">${item.domain || '--'}</td>
        <td><span class="plan-badge ${planClass}">${item.planName}</span></td>
        <td>${statusHtml}</td>
        <td>${timerHtml}</td>
        <td>${datesHtml}</td>
        <td>
          <div class="actions">
            ${actionsHtml}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('.timer-cell[data-license-id]').forEach(el => {
      const licId = el.getAttribute('data-license-id');
      const lic = allLicenses.find(l => l.id === licId);
      if (lic) updateTimerCell(el, lic);
    });
  }

  function setFilter(filter, btn) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderTable();
  }

  function filterTable() {
    searchTerm = document.getElementById('searchInput').value;
    renderTable();
  }

  // ========== MODAL DO USUÁRIO ==========
  function openUserModal(userId, keepOpen = false) {
    if (!userId) return;
    currentModalUserId = userId;

    const userLicenses = allLicenses.filter(l => l.userId === userId);

    if (userLicenses.length === 0) {
      alert('Este usuário não tem licenças cadastradas.');
      return;
    }

    const userName = userLicenses[0].userName || 'Cliente';
    const initials = userName.substring(0, 2).toUpperCase();

    document.getElementById('modalAvatar').textContent = initials;
    document.getElementById('modalUserName').textContent = userName;
    document.getElementById('modalUserId').textContent = 'ID: ' + userId.substring(0, 12) + '...';

    const totalDomains = userLicenses.length;
    const activeDomains = userLicenses.filter(l => l.active === true && !isExpired(l)).length;
    const freeUsed = userLicenses.filter(l => l.planName === 'Grátis').length;
    const freeRemaining = Math.max(0, MAX_FREE_PLANS_PER_USER - freeUsed);

    document.getElementById('modalTotalDomains').textContent = totalDomains;
    document.getElementById('modalActiveDomains').textContent = activeDomains;
    document.getElementById('modalFreeUsed').textContent = freeUsed;
    document.getElementById('modalFreeRemaining').textContent = freeRemaining;

    const limitBox = document.getElementById('limitAlertBox');
    if (freeUsed >= MAX_FREE_PLANS_PER_USER) {
      limitBox.innerHTML = `
        <div class="limit-alert">
          <i class="fas fa-exclamation-triangle" style="font-size: 1.2rem;"></i>
          <div>
            <strong>⚠️ LIMITE DE PLANOS GRÁTIS ATINGIDO!</strong><br>
            <span style="font-size: 0.72rem;">Este usuário já usou ${freeUsed}/${MAX_FREE_PLANS_PER_USER} planos grátis. Novos planos grátis serão bloqueados.</span>
          </div>
        </div>
      `;
    } else {
      limitBox.innerHTML = `
        <div class="limit-ok">
          <i class="fas fa-check-circle" style="font-size: 1.1rem;"></i>
          <div>
            ✅ Este usuário ainda pode usar <strong>${freeRemaining}</strong> plano(s) grátis.
          </div>
        </div>
      `;
    }

    const domainList = document.getElementById('modalDomainList');
    domainList.innerHTML = '';

    userLicenses.forEach(lic => {
      const isRenewal = lic.renovacaoSolicitada === true;
      const isRevoked = !!lic.revogadaEm;
      const expired = isExpired(lic);

      let statusText = '';
      let statusColor = '';

      if (isRenewal) {
        statusText = '🔄 Renovação';
        statusColor = 'var(--purple)';
      } else if (isRevoked) {
        statusText = '🚫 Revogado';
        statusColor = 'var(--red)';
      } else if (expired) {
        statusText = '⏰ Expirado';
        statusColor = 'var(--red)';
      } else if (lic.active === true) {
        statusText = '✅ Ativo';
        statusColor = 'var(--green)';
      } else {
        statusText = '⏳ Pendente';
        statusColor = 'var(--yellow)';
      }

      const planBadgeClass = lic.planName === 'Grátis' ? 'plan-free'
        : lic.planName === 'Diário' ? 'plan-daily'
        : lic.planName === 'Semanal' ? 'plan-weekly'
        : 'plan-monthly';

      const createdAt = lic.createdAt ? new Date(lic.createdAt) : null;
      const expiresAt = lic.expiresAt ? new Date(lic.expiresAt) : null;
      const expiredAt = lic.expiredAt ? new Date(lic.expiredAt) : null;
      const revogadaEm = lic.revogadaEm ? new Date(lic.revogadaEm) : null;

      const item = document.createElement('div');
      item.className = 'domain-item';
      item.innerHTML = `
        <div class="domain-item-header">
          <div class="domain-item-name">
            🌐 ${lic.domain}
          </div>
          <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
            <span class="plan-badge ${planBadgeClass}">${lic.planName}</span>
            <span style="color: ${statusColor}; font-weight: 700; font-size: 0.72rem;">
              ${statusText}
            </span>
          </div>
        </div>
        <div class="domain-item-meta">
          ${createdAt ? `<span><i class="fas fa-calendar-plus"></i> Criado: ${createdAt.toLocaleDateString('pt-BR')}</span>` : '<span style="color: var(--yellow);">📅 Sem data de criação</span>'}
          ${expiresAt ? `<span><i class="fas fa-calendar-times"></i> Expira: ${expiresAt.toLocaleDateString('pt-BR')}</span>` : ''}
          ${expiredAt ? `<span style="color: var(--red);"><i class="fas fa-hourglass-end"></i> Expirou em: ${expiredAt.toLocaleDateString('pt-BR')}</span>` : ''}
          ${revogadaEm ? `<span style="color: var(--red);"><i class="fas fa-ban"></i> Revogado: ${revogadaEm.toLocaleDateString('pt-BR')}</span>` : ''}
        </div>
        <div class="domain-item-actions">
          ${isRevoked ? `
            <button class="btn-thin btn-reactivate" onclick="reactivate('${lic.id}'); openUserModal('${userId}', true);">
              <i class="fas fa-sync"></i> REATIVAR
            </button>
          ` : expired ? `
            <button class="btn-thin btn-reactivate" onclick="reactivate('${lic.id}'); openUserModal('${userId}', true);">
              <i class="fas fa-redo"></i> REATIVAR
            </button>
          ` : !lic.active ? `
            <button class="btn-thin btn-approve" onclick="approve('${lic.id}', '${lic.planName}'); openUserModal('${userId}', true);">
              <i class="fas fa-check"></i> APROVAR
            </button>
          ` : `
            <button class="btn-thin btn-revoke" onclick="revoke('${lic.id}'); openUserModal('${userId}', true);">
              <i class="fas fa-ban"></i> REVOGAR
            </button>
          `}
          <button class="btn-thin btn-danger" onclick="del('${lic.id}'); openUserModal('${userId}', true);">
            <i class="fas fa-trash"></i> EXCLUIR
          </button>
        </div>
      `;
      domainList.appendChild(item);
    });

    document.getElementById('userModal').classList.add('active');
  }

  function closeUserModal() {
    document.getElementById('userModal').classList.remove('active');
    currentModalUserId = null;
  }

  document.getElementById('userModal').addEventListener('click', function(e) {
    if (e.target === this) closeUserModal();
  });

  // ========== APROVAR ==========
  function approve(id, planName) {
    const seconds = PLAN_DURATIONS[planName] || 86400;
    const expiresAt = new Date(Date.now() + seconds * 1000).toISOString();
    
    db.ref('licenses/' + id).update({ 
      active: true, 
      expiresAt: expiresAt,
      spooferActivatedAt: null,
      expiredAt: null,
      revogadaEm: null,
      approvedAt: new Date().toISOString()
    })
    .then(() => {
      if (!currentModalUserId) alert(`✅ Licença aprovada! Plano: ${planName}`);
    })
    .catch(err => alert('❌ Erro: ' + err.message));
  }

  // ========== APROVAR RENOVAÇÃO ==========
  function approveRenewal(id) {
    const lic = allLicenses.find(l => l.id === id);
    if (!lic) return;

    const seconds = PLAN_DURATIONS[lic.planName] || 86400;
    const expiresAt = new Date(Date.now() + seconds * 1000).toISOString();

    db.ref('licenses/' + id).update({
      active: true,
      expiresAt: expiresAt,
      spooferActivatedAt: null,
      createdAt: new Date().toISOString(),
      renovacaoSolicitada: false,
      renovacaoAprovadaEm: new Date().toISOString(),
      expiredAt: null
    })
    .then(() => {
      if (!currentModalUserId) alert(`✅ Renovação aprovada! Plano: ${lic.planName}`);
    })
    .catch(err => alert('❌ Erro: ' + err.message));
  }

  function rejectRenewal(id) {
    if (!confirm("Rejeitar esta renovação?")) return;

    db.ref('licenses/' + id).update({
      renovacaoSolicitada: false,
      renovacaoRejeitadaEm: new Date().toISOString()
    })
    .then(() => {
      if (!currentModalUserId) alert('❌ Renovação rejeitada.');
    })
    .catch(err => alert('❌ Erro: ' + err.message));
  }

  // ========== REVOGAR ==========
  function revoke(id) {
    const lic = allLicenses.find(l => l.id === id);
    if (!lic) return;

    if (!confirm(`REVOGAR a licença de ${lic.domain}?\n\nO usuário perderá o acesso imediatamente.`)) return;

    db.ref('licenses/' + id).update({
      active: false,
      revogadaEm: new Date().toISOString(),
      revogadaMotivo: 'Revogada pelo Administrador'
    })
    .then(() => {
      if (!currentModalUserId) alert(`✅ Licença REVOGADA!`);
    })
    .catch(err => alert('❌ Erro: ' + err.message));
  }

  // ========== REATIVAR ==========
  function reactivate(id) {
    const lic = allLicenses.find(l => l.id === id);
    if (!lic) return;

    const seconds = PLAN_DURATIONS[lic.planName] || 86400;
    const expiresAt = new Date(Date.now() + seconds * 1000).toISOString();
    const agora = new Date().toISOString();

    if (!confirm(`REATIVAR a licença de ${lic.domain}?\n\nO tempo será zerado.`)) return;

    db.ref('licenses/' + id).update({
      active: true,
      expiresAt: expiresAt,
      createdAt: agora,
      spooferActivatedAt: null,
      expiredAt: null,
      revogadaEm: null,
      reativadaEm: agora
    })
    .then(() => {
      if (!currentModalUserId) alert(`✅ Licença REATIVADA!`);
    })
    .catch(err => alert('❌ Erro: ' + err.message));
  }

  // ========== REVOGAR TODAS ==========
  function revokeAll() {
    if (!confirm(`🚨 REVOGAR TODAS AS LICENÇAS?\n\nTodos perderão acesso imediatamente.`)) return;
    if (!confirm(`⚠️ TEM CERTEZA? Ação irreversível!`)) return;

    const updates = {};
    const agora = new Date().toISOString();
    
    allLicenses.forEach(lic => {
      updates[`${lic.id}/active`] = false;
      updates[`${lic.id}/revogadaEm`] = agora;
      updates[`${lic.id}/revogadaMotivo`] = 'Revogação em massa';
    });

    db.ref('licenses').update(updates)
    .then(() => alert(`✅ ${allLicenses.length} licenças REVOGADAS!`))
    .catch(err => alert('❌ Erro: ' + err.message));
  }

  // ========== REATIVAR TODAS ==========
  function reactivateAll() {
    if (!confirm(`♻️ REATIVAR TODAS?\n\nO tempo será ZERADO para todas.`)) return;

    const updates = {};
    const agora = new Date().toISOString();
    
    allLicenses.forEach(lic => {
      const seconds = PLAN_DURATIONS[lic.planName] || 86400;
      const expiresAt = new Date(Date.now() + seconds * 1000).toISOString();
      
      updates[`${lic.id}/active`] = true;
      updates[`${lic.id}/expiresAt`] = expiresAt;
      updates[`${lic.id}/createdAt`] = agora;
      updates[`${lic.id}/spooferActivatedAt`] = null;
      updates[`${lic.id}/expiredAt`] = null;
      updates[`${lic.id}/revogadaEm`] = null;
      updates[`${lic.id}/reativadaEm`] = agora;
    });

    db.ref('licenses').update(updates)
    .then(() => alert(`✅ ${allLicenses.length} licenças REATIVADAS!`))
    .catch(err => alert('❌ Erro: ' + err.message));
  }

  // ========== EXCLUIR ==========
  function del(id) {
    if (confirm("Excluir esta licença permanentemente?")) {
      db.ref('licenses/' + id).remove()
        .then(() => {
          if (!currentModalUserId) console.log(`🗑️ ${id} removida`);
        })
        .catch(err => console.error('Erro:', err));
    }
  }

  function deleteAll() {
    if (!confirm("🚨 APAGAR TODAS as licenças?")) return;
    if (!confirm("⚠️ ÚLTIMA CHANCE! IRREVERSÍVEL!")) return;

    db.ref('licenses').remove()
      .then(() => alert('🗑️ Todas as licenças removidas'))
      .catch(err => console.error('Erro:', err));
  }
</script>
</body>
</html>
