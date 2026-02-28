let inventory = [];
let history = [];
let sortDir = { name: 1, qty: 1 };
const STAFF_PASS = "107979tles";

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
    const filterCat = document.getElementById('filter-category').value;
    const search = document.getElementById('inventory-search').value.toLowerCase();
    if (!tbody) return;
    tbody.innerHTML = '';

    inventory.forEach(item => {
        const matchesCat = filterCat === "All" || item.category === filterCat;
        const matchesSearch = item.name.toLowerCase().includes(search) || item.spec.toLowerCase().includes(search);
        
        if (matchesCat && matchesSearch) {
            const isLow = parseInt(item.qty) <= parseInt(item.min || 5);
            tbody.innerHTML += `
                <tr class="${isLow ? 'low-stock' : ''}">
                    <td><strong>${item.name}</strong><br><small>${item.spec}</small></td>
                    <td><span style="font-size:0.75rem; color:#64748b">${item.category || 'N/A'}</span></td>
                    <td>
                        <span style="${isLow ? 'color:var(--danger);font-weight:bold':''}">${item.qty} ${item.unit}</span>
                        ${isLow ? '<br><span class="low-badge">LOW STOCK</span>' : ''}
                    </td>
                    <td>
                        <button class="btn-restock-sm" onclick="restockItem('${item.id}')">Add</button>
                        <button class="btn-return-sm" onclick="returnItem('${item.id}')">Return</button>
                        <button class="btn-edit-sm" onclick="editItem('${item.id}')">Edit</button>
                        <button class="btn-delete-sm" onclick="deleteItem('${item.id}')">✕</button>
                    </td>
                </tr>`;
        }
    });

    // Recent Activity Feed (Brief)
    const feed = document.getElementById('activity-feed');
    if (feed) {
        feed.innerHTML = '';
        [...history].reverse().slice(0, 10).forEach(log => {
            feed.innerHTML += `<div style="font-size:0.8rem; padding:8px 0; border-bottom:1px solid #eee;">
                <span style="color:#94a3b8; font-size:0.7rem;">${log.time}</span><br>${log.msg}</div>`;
        });
    }

    // Detailed Audit Log Table
    const histTbody = document.querySelector('#history-table tbody');
    if(histTbody) {
        histTbody.innerHTML = '';
        [...history].reverse().forEach(log => {
            histTbody.innerHTML += `<tr><td>${log.time}</td><td>${log.msg}</td><td>${log.recipient || '-'}</td><td>${log.purpose || '-'}</td></tr>`;
        });
    }

    const sel = document.getElementById('issue-select');
    if (sel) {
        sel.innerHTML = '<option value="">-- Select Item --</option>';
        inventory.forEach(i => sel.innerHTML += `<option value="${i.id}">${i.name} (${i.spec})</option>`);
    }
}

function restockItem(id) {
    const item = inventory.find(i => i.id === id);
    const addQty = prompt(`Restocking ${item.name}. Qty to add:`, "0");
    if (addQty && !isNaN(addQty)) {
        const newQty = parseInt(item.qty) + parseInt(addQty);
        window.fb.update(window.fb.ref(window.fb.db, 'inventory/' + id), { qty: newQty });
        logAction(`Restock: +${addQty} units`, "Stockroom", "Procurement");
    }
}

function returnItem(id) {
    const item = inventory.find(i => i.id === id);
    const retQty = prompt(`Return to Stock: ${item.name}. Qty returned:`, "0");
    if (retQty && !isNaN(retQty)) {
        const name = prompt("Returned by (Teacher Name):");
        const reason = prompt("Reason for return:");
        const newQty = parseInt(item.qty) + parseInt(retQty);
        window.fb.update(window.fb.ref(window.fb.db, 'inventory/' + id), { qty: newQty });
        logAction(`Returned: ${retQty} units`, name, `Return: ${reason}`);
    }
}

function editItem(id) {
    const item = inventory.find(i => i.id === id);
    showView('add-stock');
    document.getElementById('edit-id').value = id;
    document.getElementById('item-name').value = item.name;
    document.getElementById('item-category').value = item.category || "Others";
    document.getElementById('item-spec').value = item.spec;
    document.getElementById('item-unit').value = item.unit;
    document.getElementById('item-qty').value = item.qty;
    document.getElementById('item-min').value = item.min || 5;
}

function deleteItem(id) {
    const item = inventory.find(i => i.id === id);
    if (prompt("Staff Password:") === STAFF_PASS) {
        if(confirm("Delete permanently?")) window.fb.remove(window.fb.ref(window.fb.db, 'inventory/' + id));
    }
}

function resetDatabase() {
    if (prompt("Staff Password:") === STAFF_PASS && confirm("ERASE EVERYTHING?")) {
        window.fb.set(window.fb.ref(window.fb.db, 'inventory'), null);
        window.fb.set(window.fb.ref(window.fb.db, 'history'), null);
    }
}

document.getElementById('item-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const data = {
        name: document.getElementById('item-name').value,
        category: document.getElementById('item-category').value,
        spec: document.getElementById('item-spec').value,
        unit: document.getElementById('item-unit').value,
        qty: parseInt(document.getElementById('item-qty').value),
        min: parseInt(document.getElementById('item-min').value)
    };
    if (id) {
        window.fb.update(window.fb.ref(window.fb.db, 'inventory/' + id), data);
        logAction(`Updated ${data.name} profile`, "System", "Adjustment");
    } else {
        window.fb.set(window.fb.push(window.fb.ref(window.fb.db, 'inventory')), data);
        logAction(`Initial Entry: ${data.name}`, "Stockroom", "New Stock");
    }
    showView('dashboard');
});

document.getElementById('issue-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('issue-select').value;
    const qty = parseInt(document.getElementById('issue-qty').value);
    const rec = document.getElementById('issue-recipient').value;
    const purp = document.getElementById('issue-purpose').value;
    const item = inventory.find(i => i.id === id);
    
    if (item && item.qty >= qty) {
        window.fb.update(window.fb.ref(window.fb.db, 'inventory/' + id), { qty: item.qty - qty });
        logAction(`Issued ${qty} ${item.unit} of ${item.name}`, rec, purp);
        this.reset();
        showView('dashboard');
    } else { alert("Insufficient Stock!"); }
});

function downloadInventoryCSV() {
    let csv = "Item,Category,Spec,Qty,Unit\n";
    inventory.forEach(i => csv += `"${i.name}","${i.category}","${i.spec}",${i.qty},"${i.unit}"\n`);
    downloadFile(csv, "TLES_Stock");
}

function downloadLogCSV() {
    let csv = "Time,Action,Recipient,Purpose\n";
    history.forEach(l => csv += `"${l.time}","${l.msg}","${l.recipient}","${l.purpose}"\n`);
    downloadFile(csv, "TLES_Audit_Log");
}

function downloadFile(csv, name) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${name}_${new Date().toLocaleDateString()}.csv`; a.click();
}

function logAction(msg, recipient = "Stockroom", purpose = "General") {
    const time = new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    window.fb.push(window.fb.ref(window.fb.db, 'history'), { time, msg, recipient, purpose });
}

document.getElementById('inventory-search').addEventListener('input', updateUI);
init();
showView('dashboard');
