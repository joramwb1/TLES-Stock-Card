let inventory = [];
let history = [];

function init() {
    // Safety check for Firebase connection
    if (!window.fb) return setTimeout(init, 500);

    // Sync Inventory Data
    window.fb.onValue(window.fb.ref(window.fb.db, 'inventory'), (snap) => {
        const data = snap.val();
        inventory = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
        updateUI();
    }, (err) => {
        document.querySelector('#inventory-table tbody').innerHTML = `<tr><td colspan="4" style="color:red">Error: ${err.message}</td></tr>`;
    });

    // Sync History/Logs
    window.fb.onValue(window.fb.ref(window.fb.db, 'history'), (snap) => {
        const data = snap.val();
        history = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
        updateUI();
    });
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const target = document.getElementById('view-' + viewId);
    if (target) target.style.display = 'block';
}

function updateUI() {
    const searchTerm = document.getElementById('inventory-search')?.value.toLowerCase() || "";
    const tbody = document.querySelector('#inventory-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    let totalUnits = 0;
    let filteredCount = 0;

    inventory.forEach(item => {
        const isMatch = item.name.toLowerCase().includes(searchTerm) || item.spec.toLowerCase().includes(searchTerm);
        if (isMatch) {
            filteredCount++;
            totalUnits += parseInt(item.qty || 0);
            const isLow = item.qty < 5;
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>${item.name}</strong></td>
                    <td><small>${item.spec}</small></td>
                    <td style="${isLow ? 'color:red; font-weight:bold;' : ''}">${item.qty} ${item.unit} ${isLow ? '⚠️' : ''}</td>
                    <td>
                        <button class="btn-restock" onclick="quickRestock('${item.id}')">↻ Restock</button>
                        <button onclick="deleteItem('${item.id}')" style="background:none; border:none; color:#cbd5e1; cursor:pointer; margin-left:8px;">✕</button>
                    </td>
                </tr>`;
        }
    });

    // Update Stats
    const itemStat = document.getElementById('stat-total-items');
    const unitStat = document.getElementById('stat-total-units');
    if (itemStat) itemStat.textContent = filteredCount;
    if (unitStat) unitStat.textContent = totalUnits;

    // Update Sidebar Activity
    const feed = document.getElementById('activity-feed');
    if (feed) {
        feed.innerHTML = '';
        [...history].reverse().slice(0, 10).forEach(log => {
            feed.innerHTML += `<div class="feed-item"><span class="feed-time">${log.time}</span>${log.msg}</div>`;
        });
    }

    // Update History Table
    const histTable = document.querySelector('#history-table tbody');
    if (histTable) {
        histTable.innerHTML = '';
        [...history].reverse().forEach(log => {
            histTable.innerHTML += `<tr><td>${log.time}</td><td>${log.msg}</td></tr>`;
        });
    }

    // Populate Issue Dropdown
    const sel = document.getElementById('issue-select');
    if (sel) {
        sel.innerHTML = '<option value="">-- Choose Item --</option>';
        inventory.forEach(i => {
            if (i.qty > 0) sel.innerHTML += `<option value="${i.id}">${i.name} (${i.spec})</option>`;
        });
    }
}

document.getElementById('inventory-search')?.addEventListener('input', updateUI);

document.getElementById('item-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const data = {
        name: document.getElementById('item-name').value,
        spec: document.getElementById('item-spec').value,
        unit: document.getElementById('item-unit').value,
        qty: parseInt(document.getElementById('item-qty').value)
    };

    if (id) {
        window.fb.update(window.fb.ref(window.fb.db, 'inventory/' + id), data);
        logAction(`Updated ${data.name}`);
    } else {
        const newRef = window.fb.push(window.fb.ref(window.fb.db, 'inventory'));
        window.fb.set(newRef, data);
        logAction(`New stock added: ${data.name} (${data.qty} ${data.unit})`);
    }
    this.reset();
    showView('dashboard');
});

document.getElementById('issue-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('issue-select').value;
    const qty = parseInt(document.getElementById('issue-qty').value);
    const item = inventory.find(i => i.id === id);

    if (item && item.qty >= qty) {
        window.fb.update(window.fb.ref(window.fb.db, 'inventory/' + id), { qty: item.qty - qty });
        logAction(`${qty} ${item.unit} of ${item.name} issued to ${document.getElementById('issue-recipient').value}`);
        this.reset();
        showView('dashboard');
    } else { alert("Insufficient quantity!"); }
});

function quickRestock(id) {
    const item = inventory.find(i => i.id === id);
    if (!item) return;
    showView('add-stock');
    document.getElementById('edit-id').value = id;
    document.getElementById('item-name').value = item.name;
    document.getElementById('item-spec').value = item.spec;
    document.getElementById('item-unit').value = item.unit;
    document.getElementById('item-qty').focus();
}

function deleteItem(id) { if (confirm("Delete this item permanently?")) window.fb.remove(window.fb.ref(window.fb.db, 'inventory/' + id)); }

function logAction(msg) {
    const time = new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    window.fb.push(window.fb.ref(window.fb.db, 'history'), { time, msg });
}

init();
showView('dashboard');
