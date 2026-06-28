export function renderDebugPanel(): string {
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=1200, initial-scale=1">
    <title>Debug Panel — Ship & Equipment Management</title>
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body {
        width: 100%; height: 100%;
        background: #05070a; color: #d8dadf;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
      }
      body {
        display: flex; flex-direction: column;
        max-width: 1400px; margin: 0 auto; padding: 16px;
      }
      a { color: #8db4d6; text-decoration: none; }
      a:hover { text-decoration: underline; }

      /* Header */
      header {
        display: flex; align-items: center; gap: 24px;
        padding-bottom: 12px; border-bottom: 1px solid #1e2a36;
        margin-bottom: 16px;
      }
      header h1 { font-size: 20px; font-weight: 600; }
      header a { font-size: 13px; }

      /* Tabs */
      nav.tabs { display: flex; gap: 0; margin-bottom: 16px; }
      nav.tabs button {
        padding: 8px 24px; border: 1px solid #1e2a36; border-bottom: none;
        background: #0d1117; color: #8b949e; font: inherit; cursor: pointer;
        border-radius: 6px 6px 0 0;
      }
      nav.tabs button.active {
        background: #161b22; color: #e6edf3;
        border-color: #30363d;
      }
      nav.tabs button:hover:not(.active) { color: #c9d1d9; }

      /* Tab panels */
      .tab-panel { display: none; flex: 1; min-height: 0; }
      .tab-panel.visible { display: flex; flex-direction: column; gap: 16px; }

      /* Main content area */
      .content-area {
        display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
        flex: 1; min-height: 0;
      }
      .section {
        display: flex; flex-direction: column;
        background: #0d1117; border: 1px solid #1e2a36;
        border-radius: 8px; overflow: hidden;
      }
      .section-header {
        padding: 10px 16px; border-bottom: 1px solid #1e2a36;
        font-weight: 600; font-size: 13px; color: #8b949e;
        background: #161b22; flex-shrink: 0;
      }

      /* Search bar */
      .search-bar {
        display: flex; gap: 8px; padding: 10px 16px;
        border-bottom: 1px solid #1e2a36; flex-shrink: 0;
      }
      .search-bar input {
        flex: 1; padding: 6px 12px; border: 1px solid #30363d;
        border-radius: 6px; background: #0d1117; color: #c9d1d9;
        font: inherit; outline: none;
      }
      .search-bar input:focus { border-color: #58a6ff; }
      .search-bar button {
        padding: 6px 16px; border: 1px solid #30363d; border-radius: 6px;
        background: #21262d; color: #c9d1d9; font: inherit; cursor: pointer;
        white-space: nowrap;
      }
      .search-bar button:hover { background: #30363d; }

      /* Lists */
      .list {
        flex: 1; overflow-y: auto; min-height: 0;
      }
      .list-row {
        display: flex; align-items: center; justify-content: space-between;
        padding: 6px 16px; border-bottom: 1px solid #1e2a36;
        gap: 12px; min-height: 36px;
      }
      .list-row:hover { background: #161b22; }
      .list-row .info { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .list-row .info .name { font-weight: 500; }
      .list-row .info .meta { font-size: 12px; color: #8b949e; }
      .list-row .actions {
        display: flex; align-items: center; gap: 6px; flex-shrink: 0;
      }
      .list-row button {
        padding: 4px 14px; border: 1px solid; border-radius: 5px;
        font: inherit; font-size: 12px; cursor: pointer; white-space: nowrap;
        flex-shrink: 0;
      }
      .list-row input.level-input,
      .list-row input.count-input {
        width: 68px; padding: 4px 6px; border: 1px solid #30363d;
        border-radius: 5px; background: #0d1117; color: #c9d1d9;
        font: inherit; font-size: 12px;
      }
      .list-row .btn-small {
        padding: 4px 8px; border-color: #30363d; background: #21262d; color: #c9d1d9;
      }
      .list-row .btn-small:hover { background: #30363d; }
      .btn-set {
        border-color: #1f6feb; background: #1f6feb; color: #fff;
      }
      .btn-set:hover { background: #388bfd; }
      .btn-add {
        border-color: #238636; background: #238636; color: #fff;
      }
      .btn-add:hover { background: #2ea043; }
      .btn-remove {
        border-color: #da3633; background: transparent; color: #f85149;
      }
      .btn-remove:hover { background: #da3633; color: #fff; }
      .btn-load-more {
        width: 100%; padding: 10px; border: none; border-top: 1px solid #1e2a36;
        background: #161b22; color: #8b949e; font: inherit; cursor: pointer;
      }
      .btn-load-more:hover { background: #21262d; color: #c9d1d9; }
      .list-empty {
        padding: 32px 16px; text-align: center; color: #484f58; font-size: 13px;
      }

      /* Status bar */
      #status-bar {
        flex-shrink: 0; margin-top: 12px; padding: 8px 16px;
        border-radius: 6px; font-size: 13px; min-height: 36px;
        display: flex; align-items: center;
        transition: opacity 0.3s;
      }
      #status-bar.success { background: #0d3320; color: #3fb950; border: 1px solid #1b4a2c; }
      #status-bar.error { background: #3d1414; color: #f85149; border: 1px solid #5c1e1e; }
      #status-bar.info { background: #0d1d33; color: #58a6ff; border: 1px solid #1a3656; }

      /* Loading spinner */
      .loading { text-align: center; padding: 16px; color: #8b949e; }
      .debug-controls {
        display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 16px;
        border-bottom: 1px solid #1e2a36;
      }
      .debug-controls input {
        width: 150px; padding: 6px 10px; border: 1px solid #30363d;
        border-radius: 6px; background: #0d1117; color: #c9d1d9;
      }
      .debug-controls button {
        padding: 6px 12px; border: 1px solid #30363d; border-radius: 6px;
        background: #21262d; color: #c9d1d9; cursor: pointer;
      }

      @media (max-width: 900px) {
        .content-area { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>
    <header>
      <h1>&#x1F6E0; Debug Panel — &u8230;&u5A18; &amp; &u88C5;&u5099; Management</h1>
      <a href="/">&larr; Back to Launcher</a>
      <a href="/kcs2/index.php" target="_blank">Open Game &nearr;</a>
    </header>

    <nav class="tabs">
      <button id="tab-ships" class="active" onclick="switchTab('ships')">&u8230;&u5A18; Ships (840)</button>
      <button id="tab-equipment" onclick="switchTab('equipment')">&u88C5;&u5099; Equipment (572)</button>
      <button id="tab-items" onclick="switchTab('items')">Items</button>
      <button id="tab-expeditions" onclick="switchTab('expeditions')">Expeditions (63)</button>
    </nav>

    <!-- Ships Tab -->
    <div id="panel-ships" class="tab-panel visible">
      <div class="content-area">
        <div class="section">
          <div class="section-header">Master Ship List</div>
          <div class="search-bar">
            <input id="ship-search" type="text" placeholder="Search by name or reading..."
                   onkeydown="if(event.key==='Enter') searchShips()">
            <button onclick="searchShips()">Search</button>
          </div>
          <div id="ship-master-list" class="list"></div>
          <button id="ship-load-more" class="btn-load-more" style="display:none" onclick="loadMoreShips()">Load more...</button>
        </div>
        <div class="section">
          <div class="section-header">Owned Ships <span id="owned-ship-count" style="color:#8b949e"></span></div>
          <div id="owned-ship-list" class="list"></div>
        </div>
      </div>
    </div>

    <!-- Equipment Tab -->
    <div id="panel-equipment" class="tab-panel">
      <div class="content-area">
        <div class="section">
          <div class="section-header">Master Equipment List</div>
          <div class="search-bar">
            <input id="equip-search" type="text" placeholder="Search by name or reading..."
                   onkeydown="if(event.key==='Enter') searchEquipment()">
            <button onclick="searchEquipment()">Search</button>
          </div>
          <div id="equip-master-list" class="list"></div>
          <button id="equip-load-more" class="btn-load-more" style="display:none" onclick="loadMoreEquipment()">Load more...</button>
        </div>
        <div class="section">
          <div class="section-header">Owned Equipment <span id="owned-equip-count" style="color:#8b949e"></span></div>
          <div id="owned-equip-list" class="list"></div>
        </div>
      </div>
    </div>

    <!-- Items Tab -->
    <div id="panel-items" class="tab-panel">
      <div class="content-area">
        <div class="section">
          <div class="section-header">Common Remodel Items</div>
          <div id="common-useitem-list" class="list"></div>
        </div>
        <div class="section">
          <div class="section-header">All Editable Items</div>
          <div class="search-bar">
            <input id="useitem-search" type="text" placeholder="Search by name, description, or ID..."
                   onkeydown="if(event.key==='Enter') searchUseItems()">
            <button onclick="searchUseItems()">Search</button>
          </div>
          <div id="useitem-master-list" class="list"></div>
          <button id="useitem-load-more" class="btn-load-more" style="display:none" onclick="loadMoreUseItems()">Load more...</button>
        </div>
      </div>
    </div>

    <!-- Expeditions Tab -->
    <div id="panel-expeditions" class="tab-panel">
      <div class="section">
        <div class="section-header">Expedition state and deterministic controls</div>
        <div class="debug-controls">
          <button onclick="unlockAllExpeditions(true)">Unlock all</button>
          <button onclick="unlockAllExpeditions(false)">Use progression</button>
          <button onclick="resetExpeditions()">Reset progress</button>
          <input id="expedition-seed" type="number" placeholder="Fixed seed">
          <button onclick="configureExpeditions()">Apply seed/time</button>
          <input id="expedition-offset" type="number" value="0" placeholder="Clock offset ms">
          <button onclick="forceCompleteExpedition(2)">Force complete Fleet 2</button>
          <button onclick="forceCompleteExpedition(3)">Force complete Fleet 3</button>
          <button onclick="forceCompleteExpedition(4)">Force complete Fleet 4</button>
        </div>
        <div id="expedition-summary" class="section-header"></div>
        <div id="expedition-list" class="list"></div>
      </div>
    </div>

    <div id="status-bar"></div>

    <script>
      const LIMIT = 20;
      let shipOffset = 0, shipTotal = 0, shipSearch = "";
      let equipOffset = 0, equipTotal = 0, equipSearch = "";
      let useItemOffset = 0, useItemTotal = 0, useItemSearch = "";
      let currentTab = "ships";

      // Parse svdata= prefixed or plain JSON responses
      function parseApi(text) {
        const body = text.startsWith("svdata=") ? text.slice("svdata=".length) : text;
        return JSON.parse(body);
      }

      // ---- Init ----
      refreshOwnedShips();
      searchShips();
      refreshOwnedEquipment();
      // Pre-warm equipment search too so tab switch is instant
      searchEquipment();
      refreshUseItems();
      searchUseItems();
      refreshExpeditions();

      // ---- Tab switching ----
      function switchTab(tab) {
        currentTab = tab;
        document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("visible"));
        document.querySelectorAll("nav.tabs button").forEach(b => b.classList.remove("active"));
        document.getElementById("panel-" + tab).classList.add("visible");
        document.getElementById("tab-" + tab).classList.add("active");
        if (tab === "ships") refreshOwnedShips();
        if (tab === "equipment") refreshOwnedEquipment();
        if (tab === "items") { refreshUseItems(); searchUseItems(); }
        if (tab === "expeditions") refreshExpeditions();
      }

      // ---- Ships ----
      function searchShips() {
        shipSearch = document.getElementById("ship-search").value.trim();
        shipOffset = 0;
        document.getElementById("ship-master-list").innerHTML = "";
        loadMoreShips();
      }

      async function loadMoreShips() {
        const list = document.getElementById("ship-master-list");
        const btn = document.getElementById("ship-load-more");
        btn.style.display = "none";
        if (shipOffset === 0) list.innerHTML = '<div class="loading">Loading...</div>';

        try {
          const params = new URLSearchParams({ limit: String(LIMIT), offset: String(shipOffset) });
          if (shipSearch) params.set("search", shipSearch);

          const resp = await fetch("/debug/api/ships/masters?" + params.toString(), { cache: "no-store" });
          const json = parseApi(await resp.text());
          const data = json.api_data;
          shipTotal = data.total;

          if (shipOffset === 0) list.innerHTML = "";

          if (!data.items.length && shipOffset === 0) {
            list.innerHTML = '<div class="list-empty">No ships match your search.</div>';
            return;
          }

          for (const ship of data.items) {
            const row = document.createElement("div");
            row.className = "list-row";
            row.innerHTML =
              '<span class="info">' +
                '<span class="name">' + esc(ship.name) + '</span> ' +
                '<span class="meta">[' + ship.id + '] ' + esc(ship.stypeName) + ' &mdash; ' + esc(ship.yomi) + '</span>' +
              '</span>' +
              '<button class="btn-add" onclick="addShip(' + ship.id + ')">+ Add</button>';
            list.appendChild(row);
          }

          shipOffset += data.items.length;
          if (shipOffset < shipTotal) {
            btn.style.display = "block";
            btn.textContent = "Load more... (" + shipOffset + "/" + shipTotal + ")";
          }
        } catch (err) {
          if (shipOffset === 0) list.innerHTML = '<div class="list-empty">Failed to load: ' + esc(String(err)) + '</div>';
          showStatus("Failed to load ship masters: " + err.message, "error");
        }
      }

      async function addShip(masterId) {
        try {
          const resp = await fetch("/debug/api/ships/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({ masterId })
          });
          const json = parseApi(await resp.text());
          if (json.api_result !== 1) {
            showStatus(json.api_result_msg || "Failed to add ship", "error");
            return;
          }
          showStatus(json.api_data.message, "success");
          refreshOwnedShips();
        } catch (err) {
          showStatus("Error adding ship: " + err.message, "error");
        }
      }

      async function refreshOwnedShips() {
        const list = document.getElementById("owned-ship-list");
        const count = document.getElementById("owned-ship-count");
        list.innerHTML = '<div class="loading">Loading...</div>';
        try {
          const resp = await fetch("/debug/api/player/ships", { cache: "no-store" });
          const json = parseApi(await resp.text());
          const ships = json.api_data || [];
          count.textContent = "(" + ships.length + ")";
          list.innerHTML = "";
          if (!ships.length) {
            list.innerHTML = '<div class="list-empty">No ships owned. Add some from the master list!</div>';
            return;
          }
          for (const ship of ships) {
            const row = document.createElement("div");
            row.className = "list-row";
            row.innerHTML =
              '<span class="info">' +
                '<span class="name">#' + ship.api_id + ' [Mst:' + ship.api_ship_id + ']</span> ' +
                '<span class="meta">Lv.' + ship.api_lv + ' &middot; HP ' + ship.api_nowhp + '/' + ship.api_maxhp + '</span>' +
              '</span>' +
              '<span class="actions">' +
                '<input id="ship-level-' + ship.api_id + '" class="level-input" type="number" min="1" max="99" value="' + ship.api_lv + '" ' +
                  'onkeydown="if(event.key===\\'Enter\\') setShipLevel(' + ship.api_id + ')">' +
                '<button class="btn-set" onclick="setShipLevel(' + ship.api_id + ')">Set Lv</button>' +
                '<button class="btn-remove" onclick="removeShip(' + ship.api_id + ')">&times; Remove</button>' +
              '</span>';
            list.appendChild(row);
          }
        } catch (err) {
          list.innerHTML = '<div class="list-empty">Failed to load: ' + esc(String(err)) + '</div>';
          count.textContent = "";
        }
      }

      async function setShipLevel(shipId) {
        const input = document.getElementById("ship-level-" + shipId);
        const level = Number(input && input.value);
        if (!Number.isInteger(level) || level < 1 || level > 99) {
          showStatus("Ship level must be an integer from 1 to 99.", "error");
          return;
        }
        try {
          const resp = await fetch("/debug/api/ships/level", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({ shipId, level })
          });
          const json = parseApi(await resp.text());
          if (json.api_result !== 1) {
            showStatus(json.api_result_msg || "Failed to set ship level", "error");
            return;
          }
          showStatus(json.api_data.message, "success");
          refreshOwnedShips();
        } catch (err) {
          showStatus("Error setting ship level: " + err.message, "error");
        }
      }

      async function removeShip(shipId) {
        if (!confirm("Remove ship #" + shipId + "? This cannot be undone.")) return;
        try {
          const resp = await fetch("/debug/api/ships/remove", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({ shipId })
          });
          const json = parseApi(await resp.text());
          if (json.api_result !== 1) {
            showStatus(json.api_result_msg || "Failed to remove ship", "error");
            return;
          }
          showStatus(json.api_data.message, "success");
          refreshOwnedShips();
        } catch (err) {
          showStatus("Error removing ship: " + err.message, "error");
        }
      }

      // ---- Equipment ----
      function searchEquipment() {
        equipSearch = document.getElementById("equip-search").value.trim();
        equipOffset = 0;
        document.getElementById("equip-master-list").innerHTML = "";
        loadMoreEquipment();
      }

      async function loadMoreEquipment() {
        const list = document.getElementById("equip-master-list");
        const btn = document.getElementById("equip-load-more");
        btn.style.display = "none";
        if (equipOffset === 0) list.innerHTML = '<div class="loading">Loading...</div>';

        try {
          const params = new URLSearchParams({ limit: String(LIMIT), offset: String(equipOffset) });
          if (equipSearch) params.set("search", equipSearch);

          const resp = await fetch("/debug/api/equipment/masters?" + params.toString(), { cache: "no-store" });
          const json = parseApi(await resp.text());
          const data = json.api_data;
          equipTotal = data.total;

          if (equipOffset === 0) list.innerHTML = "";

          if (!data.items.length && equipOffset === 0) {
            list.innerHTML = '<div class="list-empty">No equipment matches your search.</div>';
            return;
          }

          for (const item of data.items) {
            const row = document.createElement("div");
            row.className = "list-row";
            row.innerHTML =
              '<span class="info">' +
                '<span class="name">' + esc(item.name) + '</span> ' +
                '<span class="meta">[' + item.id + '] Type ' + item.type + ' &mdash; ' + esc(item.yomi) + '</span>' +
              '</span>' +
              '<button class="btn-add" onclick="addEquipment(' + item.id + ')">+ Add</button>';
            list.appendChild(row);
          }

          equipOffset += data.items.length;
          if (equipOffset < equipTotal) {
            btn.style.display = "block";
            btn.textContent = "Load more... (" + equipOffset + "/" + equipTotal + ")";
          }
        } catch (err) {
          if (equipOffset === 0) list.innerHTML = '<div class="list-empty">Failed to load: ' + esc(String(err)) + '</div>';
          showStatus("Failed to load equipment masters: " + err.message, "error");
        }
      }

      async function addEquipment(masterId) {
        try {
          const resp = await fetch("/debug/api/equipment/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({ masterId })
          });
          const json = parseApi(await resp.text());
          if (json.api_result !== 1) {
            showStatus(json.api_result_msg || "Failed to add equipment", "error");
            return;
          }
          showStatus(json.api_data.message, "success");
          refreshOwnedEquipment();
        } catch (err) {
          showStatus("Error adding equipment: " + err.message, "error");
        }
      }

      async function refreshOwnedEquipment() {
        const list = document.getElementById("owned-equip-list");
        const count = document.getElementById("owned-equip-count");
        list.innerHTML = '<div class="loading">Loading...</div>';
        try {
          const resp = await fetch("/debug/api/player/equipment", { cache: "no-store" });
          const json = parseApi(await resp.text());
          const items = json.api_data || [];
          count.textContent = "(" + items.length + ")";
          list.innerHTML = "";
          if (!items.length) {
            list.innerHTML = '<div class="list-empty">No equipment owned. Add some from the master list!</div>';
            return;
          }
          for (const item of items) {
            const row = document.createElement("div");
            row.className = "list-row";
            row.innerHTML =
              '<span class="info">' +
                '<span class="name">#' + item.api_id + ' [Mst:' + item.api_slotitem_id + ']</span> ' +
                '<span class="meta">Lv.' + item.api_level + ' &middot; Prof. ' + item.api_alv + '</span>' +
              '</span>' +
              '<button class="btn-remove" onclick="removeEquipment(' + item.api_id + ')">&times; Remove</button>';
            list.appendChild(row);
          }
        } catch (err) {
          list.innerHTML = '<div class="list-empty">Failed to load: ' + esc(String(err)) + '</div>';
          count.textContent = "";
        }
      }

      async function removeEquipment(itemId) {
        if (!confirm("Remove equipment #" + itemId + "? This cannot be undone.")) return;
        try {
          const resp = await fetch("/debug/api/equipment/remove", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({ itemId })
          });
          const json = parseApi(await resp.text());
          if (json.api_result !== 1) {
            showStatus(json.api_result_msg || "Failed to remove equipment", "error");
            return;
          }
          showStatus(json.api_data.message, "success");
          refreshOwnedEquipment();
        } catch (err) {
          showStatus("Error removing equipment: " + err.message, "error");
        }
      }

      // ---- Use items ----
      async function refreshUseItems() {
        const list = document.getElementById("common-useitem-list");
        list.innerHTML = '<div class="loading">Loading...</div>';
        try {
          const resp = await fetch("/debug/api/player/useitems", { cache: "no-store" });
          const json = parseApi(await resp.text());
          const items = (json.api_data && json.api_data.commonItems) || [];
          list.innerHTML = "";
          if (!items.length) {
            list.innerHTML = '<div class="list-empty">No common items available.</div>';
            return;
          }
          for (const item of items) {
            list.appendChild(renderUseItemRow(item, "common"));
          }
        } catch (err) {
          list.innerHTML = '<div class="list-empty">Failed to load: ' + esc(String(err)) + '</div>';
        }
      }

      function searchUseItems() {
        useItemSearch = document.getElementById("useitem-search").value.trim();
        useItemOffset = 0;
        document.getElementById("useitem-master-list").innerHTML = "";
        loadMoreUseItems();
      }

      async function loadMoreUseItems() {
        const list = document.getElementById("useitem-master-list");
        const btn = document.getElementById("useitem-load-more");
        btn.style.display = "none";
        if (useItemOffset === 0) list.innerHTML = '<div class="loading">Loading...</div>';

        try {
          const params = new URLSearchParams({ limit: String(LIMIT), offset: String(useItemOffset) });
          if (useItemSearch) params.set("search", useItemSearch);

          const resp = await fetch("/debug/api/useitems/masters?" + params.toString(), { cache: "no-store" });
          const json = parseApi(await resp.text());
          const data = json.api_data;
          useItemTotal = data.total;

          if (useItemOffset === 0) list.innerHTML = "";
          if (!data.items.length && useItemOffset === 0) {
            list.innerHTML = '<div class="list-empty">No items match your search.</div>';
            return;
          }

          for (const item of data.items) {
            list.appendChild(renderUseItemRow(item, "master"));
          }

          useItemOffset += data.items.length;
          if (useItemOffset < useItemTotal) {
            btn.style.display = "block";
            btn.textContent = "Load more... (" + useItemOffset + "/" + useItemTotal + ")";
          }
        } catch (err) {
          if (useItemOffset === 0) list.innerHTML = '<div class="list-empty">Failed to load: ' + esc(String(err)) + '</div>';
          showStatus("Failed to load item masters: " + err.message, "error");
        }
      }

      function renderUseItemRow(item, source) {
        const row = document.createElement("div");
        const inputId = "useitem-" + source + "-" + item.id;
        row.className = "list-row";
        row.innerHTML =
          '<span class="info">' +
            '<span class="name">' + esc(item.name) + '</span> ' +
            '<span class="meta">[' + item.id + '] Count ' + item.count +
              (item.description ? ' &middot; ' + esc(item.description) : '') +
            '</span>' +
          '</span>' +
          '<span class="actions">' +
            '<button class="btn-small" onclick="adjustUseItem(\\'' + inputId + '\\',' + item.id + ',-10)">-10</button>' +
            '<button class="btn-small" onclick="adjustUseItem(\\'' + inputId + '\\',' + item.id + ',-1)">-1</button>' +
            '<input id="' + inputId + '" class="count-input" type="number" min="0" value="' + item.count + '" ' +
              'onkeydown="if(event.key===\\'Enter\\') setUseItemCount(\\'' + inputId + '\\',' + item.id + ')">' +
            '<button class="btn-small" onclick="adjustUseItem(\\'' + inputId + '\\',' + item.id + ',1)">+1</button>' +
            '<button class="btn-small" onclick="adjustUseItem(\\'' + inputId + '\\',' + item.id + ',10)">+10</button>' +
            '<button class="btn-set" onclick="setUseItemCount(\\'' + inputId + '\\',' + item.id + ')">Set</button>' +
          '</span>';
        return row;
      }

      async function adjustUseItem(inputId, itemId, delta) {
        const input = document.getElementById(inputId);
        if (!input) return;
        input.value = String(Math.max(0, Number(input.value || 0) + delta));
        await setUseItemCount(inputId, itemId);
      }

      async function setUseItemCount(inputId, itemId) {
        const input = document.getElementById(inputId);
        const count = Number(input && input.value);
        if (!Number.isInteger(count) || count < 0) {
          showStatus("Item count must be a non-negative integer.", "error");
          return;
        }
        try {
          const resp = await fetch("/debug/api/useitems/set", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
            body: JSON.stringify({ itemId, count })
          });
          const json = parseApi(await resp.text());
          if (json.api_result !== 1) {
            showStatus(json.api_result_msg || "Failed to set item count", "error");
            return;
          }
          showStatus(json.api_data.message, "success");
          refreshUseItems();
          searchUseItems();
        } catch (err) {
          showStatus("Error setting item count: " + err.message, "error");
        }
      }

      // ---- Expeditions ----
      async function expeditionRequest(url, body) {
        const options = { cache: "no-store" };
        if (body !== undefined) {
          options.method = "POST";
          options.headers = { "Content-Type": "application/json" };
          options.body = JSON.stringify(body);
        }
        const response = await fetch(url, options);
        const json = parseApi(await response.text());
        if (json.api_result !== 1) throw new Error(json.api_result_msg || "Expedition debug request failed");
        return json.api_data;
      }

      async function refreshExpeditions() {
        const list = document.getElementById("expedition-list");
        const summary = document.getElementById("expedition-summary");
        try {
          const data = await expeditionRequest("/debug/api/expeditions/status");
          summary.textContent =
            "Runs: " + data.runs.length +
            " | Fixed seed: " + (data.settings.fixedSeed == null ? "random" : data.settings.fixedSeed) +
            " | Clock offset: " + data.settings.clockOffsetMs + " ms" +
            " | Unlock all: " + Boolean(data.settings.unlockAll);
          document.getElementById("expedition-seed").value =
            data.settings.fixedSeed == null ? "" : String(data.settings.fixedSeed);
          document.getElementById("expedition-offset").value = String(data.settings.clockOffsetMs);
          list.innerHTML = "";
          for (const mission of data.missions) {
            const run = data.runs.find(r => r.missionId === mission.id);
            const row = document.createElement("div");
            row.className = "list-row";
            row.innerHTML =
              '<span class="info"><span class="name">[' + esc(mission.displayNo) + '] ' +
              esc(mission.name) + '</span> <span class="meta">ID ' + mission.id +
              ' | state ' + mission.state + ' | ' + mission.minutes + ' min' +
              (mission.monthly ? ' | monthly' : '') +
              (mission.combat ? ' | combat' : '') +
              (mission.support ? ' | support' : '') +
              (run ? ' | Fleet ' + run.deckId + ' ' + esc(run.status) + ' seed=' + run.seed : '') +
              '</span></span>';
            list.appendChild(row);
          }
        } catch (err) {
          list.innerHTML = '<div class="list-empty">' + esc(err.message) + '</div>';
        }
      }

      async function unlockAllExpeditions(enabled) {
        try {
          await expeditionRequest("/debug/api/expeditions/unlock-all", { enabled });
          showStatus(enabled ? "All expeditions unlocked." : "Normal progression restored.", "success");
          refreshExpeditions();
        } catch (err) { showStatus(err.message, "error"); }
      }

      async function configureExpeditions() {
        const seed = document.getElementById("expedition-seed").value;
        const offset = document.getElementById("expedition-offset").value;
        try {
          await expeditionRequest("/debug/api/expeditions/configure", {
            fixedSeed: seed === "" ? null : Number(seed),
            clockOffsetMs: Number(offset || 0)
          });
          showStatus("Expedition debug configuration updated.", "success");
          refreshExpeditions();
        } catch (err) { showStatus(err.message, "error"); }
      }

      async function forceCompleteExpedition(deckId) {
        try {
          await expeditionRequest("/debug/api/expeditions/force-complete", { deckId });
          showStatus("Fleet " + deckId + " expedition is ready to claim.", "success");
          refreshExpeditions();
        } catch (err) { showStatus(err.message, "error"); }
      }

      async function resetExpeditions() {
        if (!confirm("Reset all expedition progress and active runs?")) return;
        try {
          await expeditionRequest("/debug/api/expeditions/reset", {});
          showStatus("Expedition progress reset.", "success");
          refreshExpeditions();
        } catch (err) { showStatus(err.message, "error"); }
      }

      // ---- Status bar ----
      let statusTimeout;
      function showStatus(msg, type) {
        const bar = document.getElementById("status-bar");
        bar.textContent = msg;
        bar.className = type;
        clearTimeout(statusTimeout);
        if (type === "success") {
          statusTimeout = setTimeout(() => { bar.className = ""; bar.textContent = ""; }, 4000);
        }
      }

      function esc(s) {
        const div = document.createElement("div");
        div.textContent = String(s);
        return div.innerHTML;
      }
    </script>
  </body>
</html>`;
}
