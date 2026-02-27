let inventory = [];
let history = [];
let currentSort = { col: 'name', dir: 'asc' };

function init() {
    if (!window.fb) return setTimeout(init, 500);

    // Watch Cloud Inventory
    window.fb.onValue(window.fb.ref(window.fb.db, 'inventory'), (snap) => {
        const data = snap.val();
        inventory = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
        updateUI();
    });

    // Watch Cloud History
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
    // Sorting logic
    inventory.sort((a,b) => {
        let vA = (a[currentSort.col] || "").toString().toLowerCase();
        let vB = (b[currentSort.col] || "").toString().toLowerCase();
        if(!isNaN(vA) && !isNaN(vB)) { vA = parseFloat(vA); vB = parseFloat(vB); }
        return currentSort.dir === 'asc' ? (vA > vB ? 1 : -1) : (vA < vB ? 1 : -1);
    });

    // Update Indicators
    document.getElementById('sort-name').textContent = currentSort.col === 'name' ? (currentSort.dir === 'asc' ? '↑' : '↓') : '↕';
    document.getElementById('sort-qty').textContent = currentSort.col === 'qty' ? (currentSort.dir === 'asc' ? '↑' : '↓') : '↕';

    // Update Stats
    document.getElementById('stat-total-items').textContent = inventory.length;
    let total = 0;

    // Build Table
    const tbody = document.querySelector('#inventory-table tbody');
    tbody.innerHTML = '';
    inventory.forEach(item => {
        total += parseInt(item.qty || 0);
        tbody.innerHTML += `
            <tr>
                <td><strong>${item.name}</strong></td>
                <td><small>${item.spec}</small></td>
                <td>${item.qty} ${item.unit}</td>
                <td>
                    <button class="btn-restock" onclick="quickRestock('${item.id}')">↻ Restock</button>
                    <button onclick="openEdit('${item.id}')" style="background:none; border:none; color:blue; cursor:pointer; font-size:12px;">Edit</button>
                    <button onclick="deleteItem('${item.id}')" style="background:none; border:none; color:red; cursor:pointer; font-size:12px; margin-left:5px;">✕</button>
                </td>
            </tr>`;
    });
    document.getElementById('stat-total-units').textContent = total;

    // Sidebar Feed
    const feed = document.getElementById('activity-feed');
    feed.innerHTML = '';
    [...history].reverse().slice(0, 10).forEach(log => {
        feed.innerHTML += `<div class="feed-item"><span class="feed-time">${log.time}</span>${log.msg}</div>`;
    });

    // Issuance Dropdown
    const sel = document.getElementById('issue-select');
    sel.innerHTML = '<option value="">-- Select Item --</option>';
    inventory.forEach(i => { if(i.qty > 0) sel.innerHTML += `<option value="${i.id}">${i.name} (${i.spec})</option>`; });
}

// FORM: ADD/EDIT
document.getElementById('item-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const itemData = {
        name: document.getElementById('item-name').value,
        spec: document.getElementById('item-spec').value,
        unit: document.getElementById('item-unit').value,
        qty: parseInt(document.getElementById('item-qty').value)
    };

    if (id) {
        window.fb.update(window.fb.ref(window.fb.db, 'inventory/' + id), itemData);
    } else {
        const newRef = window.fb.push(window.fb.ref(window.fb.db, 'inventory'));
        window.fb.set(newRef, itemData);
        logAction(`Added ${itemData.qty} ${itemData.unit} of ${itemData.name}`);
    }
    showView('dashboard');
});

// FORM: ISSUE
document.getElementById('issue-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('issue-select').value;
    const qty = parseInt(document.getElementById('issue-qty').value);
    const item = inventory.find(i => i.id === id);

    if (item && item.qty >= qty) {
        window.fb.update(window.fb.ref(window.fb.db, 'inventory/' + id), { qty: item.qty - qty });
        logAction(`${document.getElementById('issue-releaser').value} issued ${qty} ${item.unit} to ${document.getElementById('issue-recipient').value}`);
        showView('dashboard');
    } else { alert("Insufficient stock!"); }
});

function quickRestock(id) {
    const item = inventory.find(i => i.id === id);
    showView('add-stock');
    document.getElementById('edit-id').value = id;
    document.getElementById('item-name').value = item.name;
    document.getElementById('item-spec').value = item.spec;
    document.getElementById('item-unit').value = item.unit;
    document.getElementById('item-qty').value = ""; // Clear for new input
    document.getElementById('item-qty').focus();
    document.getElementById('add-view-title').textContent = "Restocking: " + item.name;
}

function openEdit(id) {
    const item = inventory.find(i => i.id === id);
    showView('add-stock');
    document.getElementById('edit-id').value = id;
    document.getElementById('item-name').value = item.name;
    document.getElementById('item-spec').value = item.spec;
    document.getElementById('item-unit').value = item.unit;
    document.getElementById('item-qty').value = item.qty;
    document.getElementById('add-view-title').textContent = "Editing Item Details";
}

function deleteItem(id) { if(confirm("Permanently delete this item?")) window.fb.remove(window.fb.ref(window.fb.db, 'inventory/' + id)); }

function logAction(msg) {
    window.fb.push(window.fb.ref(window.fb.db, 'history'), {
        time: new Date().toLocaleString([], {hour:'2-digit', minute:'2-digit', month:'short', day:'numeric'}),
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
