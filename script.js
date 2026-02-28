let inventory = [];
let history = [];
let sortDir = { name: 1, qty: 1 };
const STAFF_PASS = "107979tles";

function init() {
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
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
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    
    document.getElementById('view-' + viewId).style.display = 'block';
    if (viewId === 'dashboard') document.getElementById('btn-dash').classList.add('active');
    if (viewId === 'history') document.getElementById('btn-logs').classList.add('active');
}

function updateUI() {
    const tbody = document.querySelector('#inventory-table tbody');
    const filterCat = document.getElementById('filter-category').value;
    const search = document.getElementById('inventory-search').value.toLowerCase();
    if (!tbody) return;
    tbody.innerHTML = '';

    if (inventory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:3rem; color:#94a3b8;">No items in stock. Click "+ New Item" to begin.</td></tr>';
    }

    inventory.forEach(item => {
        const matchesCat = filterCat === "All" || item.category === filterCat;
        const matchesSearch = item.name.toLowerCase().includes(search) || item.spec.toLowerCase().includes(search);
        
        if (matchesCat && matchesSearch) {
            const isLow = parseInt(item.qty) <= parseInt(item.min || 5);
            tbody.innerHTML += `
                <tr>
                    <td><strong>${item.name}</strong><br><small style="color:#64748b">${item.spec}</small></td>
                    <td><span class="cat-badge">${item.category || 'Others'}</span></td>
                    <td>
                        <span class="qty-pill ${isLow ? 'qty-low' : ''}">${item.qty} ${item.unit}</span>
                    </td>
                    <td style="text-align:right;">
                        <button class="btn-row btn-add" onclick="restockItem('${item.id}')">Add</button>
                        <button class="btn-row btn-edit" onclick="editItem('${item.id}')">Edit</button>
                        <button class="btn-row btn-del" onclick="deleteItem('${item.id}')">✕</button>
                    </td>
                </tr>`;
        }
    });

    const feed = document.getElementById('activity-feed');
    if (feed) {
        feed.innerHTML = '';
        [...history].reverse().slice(0, 15).forEach(log => {
            feed.innerHTML += `<div class="feed-item">
                <span class="feed-time">${log.time}</span>
                <strong>${log.msg}</strong><br>
                <small>${log.recipient}</small>
            </div>`;
        });
    }

    const histTbody = document.querySelector('#history-table tbody');
    if(histTbody) {
        histTbody.innerHTML = '';
        [...history].reverse().forEach(log => {
            histTbody.innerHTML += `<tr><td>${log.time}</td><td>${log.msg}</td><td>${log.recipient}</td><td>${log.purpose}</td></tr>`;
        });
    }

    const sel = document.getElementById('issue-select');
    if (sel) {
        sel.innerHTML = '<option value="">-- Search Item --</option>';
        inventory.forEach(i => sel.innerHTML += `<option value="${i.id}">${i.name} (${i.qty} avail)</option>`);
    }
}

// Logic functions remain unchanged from previous stable core...
function restockItem(id) {
    const item = inventory.find(i => i.id === id);
    const addQty = prompt(`Restock ${item.name}: Qty to add?`);
    if (addQty && !isNaN(addQty)) {
        window.fb.update(window.fb.ref(window.fb.db, 'inventory/' + id), { qty: parseInt(item.qty) + parseInt(addQty) });
        logAction(`Added ${addQty} units`, "Stockroom Update", "Procurement");
    }
}

function editItem(id) {
    const item = inventory.find(i => i.id === id);
    showView('add-stock');
    document.getElementById('edit-id').value = id;
    document.getElementById('item-name').value = item.name;
    document.getElementById('item-category').value = item.category;
    document.getElementById('item-spec').value = item.spec;
    document.getElementById('item-unit').value = item.unit;
    document.getElementById('item-qty').value = item.qty;
    document.getElementById('item-min').value = item.min;
}

function deleteItem(id) {
    if (prompt("Staff Password:") === STAFF_PASS) {
        window.fb.remove(window.fb.ref(window.fb.db, 'inventory/' + id));
    }
}

function resetDatabase() {
    if (prompt("Staff Password:") === STAFF_PASS && confirm("Wipe all data?")) {
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
    } else {
        window.fb.set(window.fb.push(window.fb.ref(window.fb.db, 'inventory')), data);
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
        logAction(`Issued ${qty} ${item.unit} of ${item.name}`, document.getElementById('issue-recipient').value, document.getElementById('issue-purpose').value);
        this.reset();
        showView('dashboard');
    } else { alert("Insufficient Stock!"); }
});

function downloadInventoryCSV() {
    let csv = "Item,Category,Qty\n";
    inventory.forEach(i => csv += `"${i.name}","${i.category}",${i.qty}\n`);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
    a.download = 'TLES_Inventory.csv'; a.click();
}

function downloadLogCSV() {
    let csv = "Time,Action,Recipient,Purpose\n";
    history.forEach(l => csv += `"${l.time}","${l.msg}","${l.recipient}","${l.purpose}"\n`);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}));
    a.download = 'TLES_Audit_Log.csv'; a.click();
}

function logAction(msg, rec, purp) {
    const time = new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    window.fb.push(window.fb.ref(window.fb.db, 'history'), { time, msg, recipient: rec, purpose: purp });
}

document.getElementById('inventory-search').addEventListener('input', updateUI);
init();

// ... Keep init and showView as they were ...

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
                <tr>
                    <td><strong>${item.name}</strong><br><small style="color:#64748b">${item.spec}</small></td>
                    <td><span class="cat-badge">${item.category || 'Others'}</span></td>
                    <td>
                        <span class="qty-pill ${isLow ? 'qty-low' : ''}">${item.qty} ${item.unit}</span>
                    </td>
                    <td style="text-align:right; white-space:nowrap;">
                        <button class="btn-row btn-add" onclick="restockItem('${item.id}')">Add</button>
                        <button class="btn-row btn-edit" style="background:#fef9c3;color:#854d0e;" onclick="returnItem('${item.id}')">Return</button>
                        <button class="btn-row btn-edit" onclick="editItem('${item.id}')">Edit</button>
                        <button class="btn-row btn-del" onclick="deleteItem('${item.id}')">✕</button>
                    </td>
                </tr>`;
        }
    });

    // Restore the sidebar feed and audit table logic as before...
    updateActivityFeeds(); 
}

// RESTORED: Return to Stock function
function returnItem(id) {
    const item = inventory.find(i => i.id === id);
    const retQty = prompt(`Return ${item.name}: How many units are being returned?`);
    if (retQty && !isNaN(retQty)) {
        const teacher = prompt("Name of Teacher returning the item:");
        const reason = prompt("Reason for return (e.g., Unused, Wrong Spec):");
        const newQty = parseInt(item.qty) + parseInt(retQty);
        window.fb.update(window.fb.ref(window.fb.db, 'inventory/' + id), { qty: newQty });
        logAction(`Returned ${retQty} units`, teacher, `Return: ${reason}`);
    }
}

// RESTORED: Sort Function
function sortTable(key) {
    sortDir[key] *= -1;
    inventory.sort((a, b) => {
        if(key === 'qty') return (parseInt(a.qty) - parseInt(b.qty)) * sortDir[key];
        const valA = (a[key] || "").toLowerCase();
        const valB = (b[key] || "").toLowerCase();
        return valA.localeCompare(valB) * sortDir[key];
    });
    updateUI();
}

// RESTORED: Reset Database (Modified to fit new UI)
function resetDatabase() {
    const pass = prompt("Enter Staff Password to WIPE ALL DATA:");
    if (pass === STAFF_PASS) {
        if(confirm("DANGER: This will permanently delete all inventory and all audit logs. Are you sure?")) {
            window.fb.set(window.fb.ref(window.fb.db, 'inventory'), null);
            window.fb.set(window.fb.ref(window.fb.db, 'history'), null);
            alert("Database has been reset.");
        }
    } else if (pass !== null) { alert("Incorrect Password."); }
}

// ... Rest of the helper functions (logAction, downloadCSV, etc) ...
