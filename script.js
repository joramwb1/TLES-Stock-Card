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

    inventory.forEach(item => {
        const matchesCat = filterCat === "All" || item.category === filterCat;
        // Smart Search: Checks Name, Specs, and Category
        const matchesSearch = item.name.toLowerCase().includes(search) || 
                             item.spec.toLowerCase().includes(search) ||
                             (item.category && item.category.toLowerCase().includes(search));
        
        if (matchesCat && matchesSearch) {
            const isLow = parseInt(item.qty) <= parseInt(item.min || 5);
            tbody.innerHTML += `
                <tr>
                    <td><strong>${item.name}</strong><br><small style="color:#64748b">${item.spec}</small></td>
                    <td><span class="cat-badge">${item.category || 'Others'}</span></td>
                    <td><span class="qty-pill ${isLow ? 'qty-low' : ''}">${item.qty} ${item.unit}</span></td>
                    <td style="text-align:right; white-space:nowrap;">
                        <button class="btn-row btn-add" onclick="restockItem('${item.id}')">Add</button>
                        <button class="btn-row btn-ret" onclick="returnItem('${item.id}')">Return</button>
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
            const isIncrease = log.type === 'plus';
            const qtyColor = isIncrease ? '#166534' : '#be123c'; 
            const qtySign = isIncrease ? '+' : '-';

            feed.innerHTML += `
                <div class="feed-item">
                    <span class="feed-time">${log.time}</span>
                    <div style="margin-top:4px;">
                        <span style="color:${qtyColor}; font-weight:800; font-size:1.1rem;">${qtySign}${log.amount}</span> 
                        <strong>${log.fullItemLabel}</strong>
                    </div>
                    <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">
                        Person: <strong>${log.recipient}</strong><br>
                        Purpose: ${log.purpose}
                    </div>
                </div>`;
        });
    }

    const histTbody = document.querySelector('#history-table tbody');
    if(histTbody) {
        histTbody.innerHTML = '';
        [...history].reverse().forEach(log => {
            histTbody.innerHTML += `<tr><td>${log.time}</td><td>${log.msg}: ${log.fullItemLabel}</td><td>${log.recipient}</td><td>${log.purpose}</td></tr>`;
        });
    }

    const sel = document.getElementById('issue-select');
    if (sel) {
        sel.innerHTML = '<option value="">-- Choose Item --</option>';
        inventory.sort((a,b) => a.name.localeCompare(b.name)).forEach(i => {
            sel.innerHTML += `<option value="${i.id}">${i.name} (${i.spec}) — ${i.qty} left</option>`;
        });
    }
}

// ... Sort, Restock, Return, Edit, Delete functions remain the same as previous stable version ...
function sortTable(key) {
    sortDir[key] *= -1;
    inventory.sort((a, b) => {
        if(key === 'qty') return (parseInt(a.qty) - parseInt(b.qty)) * sortDir[key];
        return a.name.localeCompare(b.name) * sortDir[key];
    });
    updateUI();
}

function restockItem(id) {
    const item = inventory.find(i => i.id === id);
    const addQty = prompt(`Restock ${item.name}: Quantity to add?`);
    if (addQty && !isNaN(addQty)) {
        window.fb.update(window.fb.ref(window.fb.db, 'inventory/' + id), { qty: parseInt(item.qty) + parseInt(addQty) });
        logAction(`Stock In`, "Supply Office", "New Delivery", addQty, item, 'plus');
    }
}

function returnItem(id) {
    const item = inventory.find(i => i.id === id);
    const retQty = prompt(`Return ${item.name}: Quantity returned?`);
    if (retQty && !isNaN(retQty)) {
        const teacher = prompt("Who returned this?");
        const reason = prompt("Reason for return?");
        window.fb.update(window.fb.ref(window.fb.db, 'inventory/' + id), { qty: parseInt(item.qty) + parseInt(retQty) });
        logAction(`Stock Return`, teacher, reason, retQty, item, 'plus');
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
    if (prompt("Staff Password:") === STAFF_PASS && confirm("ERASE ALL DATA?")) {
        window.fb.set(window.fb.ref(window.fb.db, 'inventory'), null);
        window.fb.set(window.fb.ref(window.fb.db, 'history'), null);
    }
}

document.getElementById('item-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    const name = document.getElementById('item-name').value;
    const spec = document.getElementById('item-spec').value;
    const qty = parseInt(document.getElementById('item-qty').value);
    
    const data = {
        name: name,
        category: document.getElementById('item-category').value,
        spec: spec,
        unit: document.getElementById('item-unit').value,
        qty: qty,
        min: parseInt(document.getElementById('item-min').value)
    };

    if (id) {
        window.fb.update(window.fb.ref(window.fb.db, 'inventory/' + id), data);
    } else {
        window.fb.set(window.fb.push(window.fb.ref(window.fb.db, 'inventory')), data);
        logAction(`Initial Stock`, "System", "Inventory Registry", qty, data, 'plus');
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
        logAction(`Stock Out`, document.getElementById('issue-recipient').value, document.getElementById('issue-purpose').value, qty, item, 'minus');
        this.reset();
        showView('dashboard');
    } else { alert("Insufficient Stock!"); }
});

// IMPROVED DOWNLOAD LOGIC
function downloadInventoryCSV() {
    let csv = "\uFEFFItem,Category,Specification,Quantity,Unit\n"; // Added BOM for Excel compatibility
    inventory.forEach(i => {
        csv += `"${i.name}","${i.category}","${i.spec}",${i.qty},"${i.unit}"\n`;
    });
    triggerDownload(csv, `TLES_Inventory_${new Date().toISOString().slice(0,10)}.csv`);
}

function downloadLogCSV() {
    let csv = "\uFEFFTimestamp,Action,Item,Recipient,Purpose,Amount\n";
    history.forEach(l => {
        csv += `"${l.time}","${l.msg}","${l.fullItemLabel}","${l.recipient}","${l.purpose}","${l.amount}"\n`;
    });
    triggerDownload(csv, `TLES_Audit_Logs_${new Date().toISOString().slice(0,10)}.csv`);
}

function triggerDownload(csvContent, fileName) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // Clean up memory
    }
}

function logAction(msg, rec, purp, amount, itemObj, type) {
    const time = new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const fullItemLabel = `${itemObj.name} (${itemObj.spec})`;
    
    window.fb.push(window.fb.ref(window.fb.db, 'history'), { 
        time, msg, recipient: rec, purpose: purp, amount, fullItemLabel, type 
    });
}

document.getElementById('inventory-search').addEventListener('input', updateUI);
init();
