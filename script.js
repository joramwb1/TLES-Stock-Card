let inventory = [];
let history = [];
let sortDir = { name: 1, qty: 1 };

function init() {
    if (!window.fb) return setTimeout(init, 500);
    window.fb.onValue(window.fb.ref(window.fb.db, 'inventory'), (snap) => {
        const data = snap.val();
        inventory = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
        updateUI();
    });
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
    const tbody = document.querySelector('#inventory-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    let totalUnits = 0;

    inventory.forEach(item => {
        totalUnits += parseInt(item.qty || 0);
        tbody.innerHTML += `
            <tr>
                <td><strong>${item.name}</strong></td>
                <td><small>${item.spec}</small></td>
                <td style="${item.qty < 5 ? 'color:red;font-weight:bold':''}">${item.qty} ${item.unit}</td>
                <td>
                    <button class="btn-restock-sm" onclick="restockItem('${item.id}')">Add Stock</button>
                    <button class="btn-edit-sm" onclick="editItem('${item.id}')">Edit</button>
                    <button class="btn-delete-sm" onclick="deleteItem('${item.id}')">Delete</button>
                </td>
            </tr>`;
    });

    document.getElementById('stat-total-items').textContent = inventory.length;
    document.getElementById('stat-total-units').textContent = totalUnits;

    const feed = document.getElementById('activity-feed');
    if (feed) {
        feed.innerHTML = '';
        [...history].reverse().slice(0, 10).forEach(log => {
            feed.innerHTML += `<div style="font-size:0.8rem; padding:8px 0; border-bottom:1px solid #eee;">
                <span style="color:#94a3b8; font-size:0.7rem;">${log.time}</span><br>${log.msg}</div>`;
        });
    }

    const histTbody = document.querySelector('#history-table tbody');
    if(histTbody) {
        histTbody.innerHTML = '';
        [...history].reverse().forEach(log => {
            histTbody.innerHTML += `<tr><td>${log.time}</td><td>${log.msg}</td></tr>`;
        });
    }

    const sel = document.getElementById('issue-select');
    if (sel) {
        sel.innerHTML = '<option value="">-- Choose Item --</option>';
        inventory.forEach(i => sel.innerHTML += `<option value="${i.id}">${i.name} (${i.spec})</option>`);
    }
}

// 1. QUICK RESTOCK (Only adds to quantity)
function restockItem(id) {
    const item = inventory.find(i => i.id === id);
    const addQty = prompt(`Restocking ${item.name}. How many ${item.unit} are you adding?`, "0");
    if (addQty && !isNaN(addQty) && parseInt(addQty) > 0) {
        const newTotal = parseInt(item.qty) + parseInt(addQty);
        window.fb.update(window.fb.ref(window.fb.db, 'inventory/' + id), { qty: newTotal });
        logAction(`Restocked ${addQty} ${item.unit} to ${item.name}`);
    }
}

// 2. FULL EDIT (Fix typos/details)
function editItem(id) {
    const item = inventory.find(i => i.id === id);
    showView('add-stock');
    document.getElementById('edit-id').value = id;
    document.getElementById('item-name').value = item.name;
    document.getElementById('item-spec').value = item.spec;
    document.getElementById('item-unit').value = item.unit;
    document.getElementById('item-qty').value = item.qty;
    document.getElementById('add-view-title').textContent = "Edit Item Profile";
}

// 3. DELETE WITH CONFIRMATION
function deleteItem(id) {
    const item = inventory.find(i => i.id === id);
    if(confirm(`Are you sure you want to PERMANENTLY delete "${item.name}"? This cannot be undone.`)) {
        window.fb.remove(window.fb.ref(window.fb.db, 'inventory/' + id));
        logAction(`Deleted item: ${item.name}`);
    }
}

document.getElementById('item-form').addEventListener('submit', function(e) {
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
        logAction(`Corrected details for ${data.name}`);
    } else {
        const newRef = window.fb.push(window.fb.ref(window.fb.db, 'inventory'));
        window.fb.set(newRef, data);
        logAction(`Added ${data.name} to stockroom`);
    }
    showView('dashboard');
});

document.getElementById('issue-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('issue-select').value;
    const qty = parseInt(document.getElementById('issue-qty').value);
    const item = inventory.find(i => i.id === id);
    if (item && item.qty >= qty) {
        window.fb.update(window.fb.ref(window.fb.db, 'inventory/' + id), { qty: item.qty - qty });
        logAction(`Issued ${qty} ${item.unit} of ${item.name} to ${document.getElementById('issue-recipient').value}`);
        this.reset();
        showView('dashboard');
    } else { alert("Not enough stock available!"); }
});

function sortTable(key) {
    sortDir[key] *= -1;
    inventory.sort((a, b) => {
        if(key === 'qty') return (a.qty - b.qty) * sortDir[key];
        return a.name.localeCompare(b.name) * sortDir[key];
    });
    updateUI();
}

function downloadCSV() {
    let csv = "Time,Activity\n";
    history.forEach(log => csv += `"${log.time}","${log.msg}"\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TLES_StockReport_${new Date().toLocaleDateString()}.csv`;
    a.click();
}

function logAction(msg) {
    const time = new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    window.fb.push(window.fb.ref(window.fb.db, 'history'), { time, msg });
}

init();
showView('dashboard');
