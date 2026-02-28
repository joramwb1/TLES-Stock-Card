let inventory = [];
let history = [];

// Initialize Listeners
function init() {
    if (!window.fb) return setTimeout(init, 500);

    // Sync Inventory from Singapore DB
    window.fb.onValue(window.fb.ref(window.fb.db, 'inventory'), (snap) => {
        const data = snap.val();
        inventory = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
        updateUI();
    });

    // Sync History from Singapore DB
    window.fb.onValue(window.fb.ref(window.fb.db, 'history'), (snap) => {
        const data = snap.val();
        history = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
        updateUI();
    });
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    const target = document.getElementById('view-' + viewId);
    if(target) target.style.display = 'block';
}

function updateUI() {
    const searchTerm = document.getElementById('inventory-search')?.value.toLowerCase() || "";
    const tbody = document.querySelector('#inventory-table tbody');
    
    // Safety check: if table body doesn't exist, stop
    if (!tbody) return;

    tbody.innerHTML = '';
    let totalUnits = 0;
    let filteredCount = 0;

    inventory.forEach(item => {
        const isMatch = item.name.toLowerCase().includes(searchTerm) || item.spec.toLowerCase().includes(searchTerm);
        
        if (isMatch) {
            filteredCount++;
            totalUnits += parseInt(item.qty || 0);
            const isLow = item.qty < 10;
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>${item.name}</strong></td>
                    <td><small>${item.spec}</small></td>
                    <td style="${isLow ? 'color:red; font-weight:bold;' : ''}">${item.qty} ${item.unit}</td>
                    <td>
                        <button class="btn-restock" onclick="quickRestock('${item.id}')">↻ Restock</button>
                        <button onclick="deleteItem('${item.id}')" style="background:none; border:none; color:red; cursor:pointer; margin-left:10px;">✕</button>
                    </td>
                </tr>`;
        }
    });

    // Safety checks for stat boxes
    const itemStat = document.getElementById('stat-total-items');
    const unitStat = document.getElementById('stat-total-units');
    if (itemStat) itemStat.textContent = filteredCount;
    if (unitStat) unitStat.textContent = totalUnits;

    // Safety check for Activity Feed
    const feed = document.getElementById('activity-feed');
    if (feed) {
        feed.innerHTML = '';
        [...history].reverse().slice(0, 10).forEach(log => {
            feed.innerHTML += `
                <div style="font-size:0.85rem; padding:8px 0; border-bottom:1px solid #eee;">
                    <span style="color:#64748b; font-size:0.75rem; display:block;">${log.time}</span>
                    ${log.msg}
                </div>`;
        });
    }

    // Safety check for Issue Dropdown
    const sel = document.getElementById('issue-select');
    if (sel) {
        sel.innerHTML = '<option value="">-- Select Item --</option>';
        inventory.forEach(i => {
            if (i.qty > 0) sel.innerHTML += `<option value="${i.id}">${i.name} (${i.spec})</option>`;
        });
    }
}

// Event Listeners
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
        logAction(`Updated ${data.name} details`);
    } else {
        const newRef = window.fb.push(window.fb.ref(window.fb.db, 'inventory'));
        window.fb.set(newRef, data);
        logAction(`Added ${data.qty} ${data.unit} of ${data.name}`);
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
        logAction(`${document.getElementById('issue-releaser').value} issued ${qty} ${item.unit} to ${document.getElementById('issue-recipient').value}`);
        this.reset();
        showView('dashboard');
    } else {
        alert("Check quantity or item selection!");
    }
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
    document.getElementById('add-view-title').textContent = "Restocking: " + item.name;
}

function deleteItem(id) {
    if (confirm("Permanently delete this item?")) {
        window.fb.remove(window.fb.ref(window.fb.db, 'inventory/' + id));
    }
}

function logAction(msg) {
    window.fb.push(window.fb.ref(window.fb.db, 'history'), {
        time: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        msg: msg
    });
}

init();
showView('dashboard');
