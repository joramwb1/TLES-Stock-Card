<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TLES Stock Manager</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <nav class="navbar">
        <div class="logo">📦 TLES Stock Manager</div>
        <div class="nav-links">
            <button onclick="showView('dashboard')" class="nav-btn">Dashboard</button>
            <button onclick="showView('history')" class="nav-btn">Detailed Logs</button>
        </div>
    </nav>

    <div class="container">
        <section id="view-dashboard" class="view">
            <div class="header-row">
                <h2>Inventory Dashboard</h2>
                <div style="display: flex; gap: 10px;">
                    <button onclick="showView('add-stock')" class="btn-primary">+ Add New Item</button>
                    <button onclick="showView('issue-stock')" class="btn-issue">- Issue Stock</button>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <span class="label">TOTAL ITEM TYPES</span>
                    <span id="stat-total-items" class="value">0</span>
                </div>
                <div class="stat-card">
                    <span id="stat-total-units" class="value" style="float:right;">0</span>
                    <span class="label">TOTAL UNITS ON HAND</span>
                </div>
            </div>

            <div class="main-layout">
                <div class="inventory-content card">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                        <h3>Current Stocks</h3>
                        <input type="text" id="inventory-search" placeholder="🔍 Search items..." style="padding:8px; border-radius:6px; border:1px solid #ddd; width:250px;">
                    </div>
                    
                    <table id="inventory-table">
                        <thead>
                            <tr>
                                <th>ITEM NAME</th>
                                <th>SPECIFICATION</th>
                                <th>STOCK LEVEL</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>

                <aside class="activity-sidebar card">
                    <h3>Recent Activity</h3>
                    <div id="activity-feed"></div>
                </aside>
            </div>
        </section>

        <section id="view-add-stock" class="view" style="display:none;">
            <div class="header-row"><button onclick="showView('dashboard')" class="btn-back">← Back</button><h2 id="add-view-title">Add New Item</h2></div>
            <div class="card">
                <form id="item-form">
                    <input type="hidden" id="edit-id" value="">
                    <div class="input-row">
                        <div class="input-group"><label>Item Name</label><input type="text" id="item-name" required></div>
                        <div class="input-group"><label>Specification</label><input type="text" id="item-spec" required></div>
                    </div>
                    <div class="input-row">
                        <div class="input-group"><label>Unit</label><input type="text" id="item-unit" required></div>
                        <div class="input-group"><label>Quantity</label><input type="number" id="item-qty" required></div>
                    </div>
                    <button type="submit" class="btn-primary" style="width:100%">Save to Cloud</button>
                </form>
            </div>
        </section>

        <section id="view-issue-stock" class="view" style="display:none;">
            <div class="header-row"><button onclick="showView('dashboard')" class="btn-back">← Back</button><h2>Issue Stock</h2></div>
            <div class="card">
                <form id="issue-form">
                    <div class="input-group"><label>Select Item</label><select id="issue-select" required></select></div>
                    <div class="input-row">
                        <div class="input-group"><label>Recipient</label><input type="text" id="issue-recipient" required></div>
                        <div class="input-group"><label>Released By</label><input type="text" id="issue-releaser" required></div>
                    </div>
                    <div class="input-row">
                        <div class="input-group"><label>Qty</label><input type="number" id="issue-qty" required></div>
                        <div class="input-group"><label>Purpose</label><input type="text" id="issue-purpose" required></div>
                    </div>
                    <button type="submit" class="btn-issue" style="width:100%">Confirm Issue</button>
                </form>
            </div>
        </section>

        <section id="view-history" class="view" style="display:none;">
            <div class="header-row"><button onclick="showView('dashboard')" class="btn-back">← Back</button><h2>Detailed Logs</h2></div>
            <div class="card"><table id="history-table"><thead><tr><th>Date</th><th>Activity</th></tr></thead><tbody></tbody></table></div>
        </section>
    </div>

    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
        import { getDatabase, ref, set, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

        const firebaseConfig = {
            apiKey: "AIzaSyDSwIKdik8L3blJwDFw5TYWhJi2I_Vo9_I",
            authDomain: "tles-se-and-stock-manager.firebaseapp.com",
            projectId: "tles-se-and-stock-manager",
            storageBucket: "tles-se-and-stock-manager.firebasestorage.app",
            messagingSenderId: "183419608950",
            appId: "1:183419608950:web:41f41a274465df34e7a457",
            databaseURL: "https://tles-se-and-stock-manager-default-rtdb.asia-southeast1.firebasedatabase.app/"
        };

        const app = initializeApp(firebaseConfig);
        const db = getDatabase(app);
        window.fb = { db, ref, set, push, onValue, update, remove };
    </script>
    <script src="script.js"></script>
</body>
</html>
