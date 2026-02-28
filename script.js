let inventory = [];
let history = [];
let currentSort = { col: 'name', dir: 'asc' };

// Initialize Firebase Sync
function init() {
    if (!window.fb) {
        console.log("Waiting for Firebase...");
        return setTimeout(init, 500);
    }

    // 1. Sync Inventory
    window.fb.onValue(window.fb.ref(window.fb.db, 'inventory'), (snap) => {
        const data = snap.val();
        inventory = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
        updateUI();
    });

    // 2. Sync Logs
    window.fb.onValue(window.fb.ref(window.fb.db, 'history'), (snap) => {
        const data = snap.val();
        history = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
        updateUI();
    });
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.getElementById('view-' + viewId).style.display = 'block';
}

function updateUI() {
    const searchTerm = document.getElementById('inventory-search')?.value.toLowerCase() || "";
    
    // Sort
    inventory.sort((a,b) => {
        let vA = (a[currentSort.col] || "").toString().toLowerCase();
        let vB = (b[currentSort.col] || "").toString().toLowerCase();
        if(!isNaN(vA) && !isNaN(vB)) { vA = parseFloat(vA); vB = parseFloat(vB); }
        return currentSort.dir === 'asc' ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
    });

    // Update Tables
    const tbody = document.querySelector('#inventory-table tbody');
    tbody.innerHTML = '';
    let totalUnits = 0;
    let filteredCount = 0;

    inventory.forEach(item => {
        const isMatch = item.name.toLowerCase().includes(searchTerm) || item.spec.toLowerCase().includes(searchTerm);
        if(isMatch) {
            filteredCount++;
            totalUnits += parseInt(item.qty || 0);
            const isLow = item.qty < 5;
            
            tbody.innerHTML += `
                <tr>
                    <td><strong>${item.name}</strong></td>
                    <td><small>${item.spec}</small></td>
                    <td class="${isLow ? 'low-stock' : ''}">${item.qty} ${item.unit} ${isLow ? '⚠️' : ''}</td>
                    <td>
                        <button class="btn-restock" onclick="quickRestock('${item.id}')">↻ Restock</button>
                        <button onclick="deleteItem('${item.id}')" style="background:none;color:red;border:none;cursor:pointer;margin-left:10px">✕</button>
                    </td>
                </tr>`;
        }
    });

    document.getElementById('stat-total-items').textContent = filteredCount;
    document.getElementById('stat-total-units').textContent = totalUnits;

    // Sidebar Feed
    const feed = document.getElementById('activity-feed');
    feed.innerHTML = '';
    [...history].reverse().slice(0, 10).forEach(log => {
        feed.innerHTML += `<div class="feed-item"><span class="feed-time">${log.time}</span>${log.msg}</div>`;
    });

    // Dropdown for Issue View
    const sel = document.getElementById('issue-select');
    if(sel) {
        sel.innerHTML = '<option value="">-- Choose Item --</option>';
        inventory.forEach(i => { if(i.qty > 0) sel.innerHTML += `<option value="${i.id}">${i.name}</option>`; });
    }
}

// Search Event
document.getElementById('inventory-search')?.addEventListener('input', updateUI);

// Forms
document.getElementById('item-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const data = {
        name: document.getElementById('item-name').value,
        spec: document.getElementById('item-spec').value,
        unit: document.getElementById('item-unit').value,
        qty: parseInt(document.getElementById('item-qty').value)
    };

    if(id) {
        window.fb.update(window.fb.ref(window.fb.db, 'inventory/'+id), data);
        logAction(`Updated ${data.name} details`);
    } else {
        const newRef = window.fb.push(window.fb.ref(window.fb.db, 'inventory'));
        window.fb.set(newRef, data);
        logAction(`Added new item: ${data.name} (${data.qty} ${data.unit})`);
    }
    this.reset();
    showView('dashboard');
});

document.getElementById('issue-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('issue-select').value;
    const qty = parseInt(document.getElementById('issue-qty').value);
    const item = inventory.find(i => i.id === id);

    if(item && item.qty >= qty) {
        window.fb.update(window.fb.ref(window.fb.db, 'inventory/'+id), { qty: item.qty - qty });
        logAction(`${document.getElementById('issue-releaser').value} issued ${qty} ${item.unit} of ${item.name} to ${document.getElementById('issue-recipient').value}`);
        this.reset();
        showView('dashboard');
    } else { alert("Insufficient Stock!"); }
});

function quickRestock(id) {
    const item = inventory.find(i => i.id === id);
    showView('add-stock');
    document.getElementById('edit-id').value = id;
    document.getElementById('item-name').value = item.name;
    document.getElementById('item-spec').value = item.spec;
    document.getElementById('item-unit').value = item.unit;
    document.getElementById('item-qty').focus();
    document.getElementById('add-view-title').textContent = "Restocking: " + item.name;
}

function deleteItem(id) { if(confirm("Delete item permanently?")) window.fb.remove(window.fb.ref(window.fb.db, 'inventory/'+id)); }

function logAction(msg) {
    window.fb.push(window.fb.ref(window.fb.db, 'history'), {
        time: new Date().toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}),
        msg: msg
    });
}

function toggleSort(col) {
    currentSort.dir = (currentSort.col === col && currentSort.dir === 'asc') ? 'desc' : 'asc';
    currentSort.col = col;
    updateUI();
}

init();
showView('dashboard');
