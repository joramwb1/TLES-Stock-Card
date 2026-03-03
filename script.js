let inventory = [];
let history = [];
let sortDir = { name: 1, qty: 1 };
const STAFF_PASS = "107979tles";

// Optimization: Cached selectors
const getEl = (id) => document.getElementById(id);

function init() {
    const dateEl = getEl('current-date');
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    if (!window.fb) return setTimeout(init, 300);
    
    // Listen for Inventory
    window.fb.onValue(window.fb.ref(window.fb.db, 'inventory'), (snap) => {
        const data = snap.val();
        inventory = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
        updateUI();
    });
    
    // Listen for History
    window.fb.onValue(window.fb.ref(window.fb.db, 'history'), (snap) => {
        const data = snap.val();
        history = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
        updateUI();
    });
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    
    const target = getEl('view-' + viewId);
    if (target) target.style.display = 'block';
    
    if (viewId === 'dashboard') getEl('btn-dash').classList.add('active');
    if (viewId === 'history') getEl('btn-logs').classList.add('active');
}

function updateUI() {
    const tbody = document.querySelector('#inventory-table tbody');
    if (!tbody) return;

    const filterCat = getEl('filter-category').value;
    const search = getEl('inventory-search').value.toLowerCase();
    
    // Build Table Content
    let html = '';
    inventory.forEach(item => {
        const matchesCat = filterCat === "All" || item.category === filterCat;
        const matchesSearch = item.name.toLowerCase().includes(search) || 
                             item.spec.toLowerCase().includes(search) ||
                             (item.category && item.category.toLowerCase().includes(search));
        
        if (matchesCat && matchesSearch) {
            const isLow = parseInt(item.qty) <= parseInt(item.min || 5);
            html += `
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
    tbody.innerHTML = html || '<tr><td colspan="4" style="text-align:center; padding:2rem;">No matching items found.</td></tr>';

    // Update Activity Feed
    const feed = getEl('activity-feed');
    if (feed) {
        let feedHtml = '';
        [...history].reverse().slice(0, 15).forEach(log => {
            const isInc = log.type === 'plus';
            feedHtml += `
                <div class="feed-item">
                    <span class="feed-time">${log.time}</span>
                    <div style="margin-top:4px;">
                        <span style="color:${isInc ? '#166534' : '#be123c'}; font-weight:800; font-size:1.1rem;">
                            ${isInc ? '+' : '-'}${log.amount}
                        </span> 
                        <strong>${log.fullItemLabel}</strong>
                    </div>
                    <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">
                        Person: <strong>${log.recipient}</strong><br>
                        Purpose: ${log.purpose}
                    </div>
                </div>`;
        });
        feed.innerHTML = feedHtml;
    }

    // Update Logs Table
    const histTbody = document.querySelector('#history-table tbody');
    if (histTbody) {
        histTbody.innerHTML = history.slice().reverse().map(l => 
            `<tr><td>${l.time}</td><td>${l.msg}: ${l.fullItemLabel}</td><td>${l.recipient}</td><td>${l.purpose}</td></tr>`
        ).join('');
    }

    // Update Selectors
    const sel = getEl('issue-select');
    if (sel) {
        const currentSelection = sel.value;
        sel.innerHTML = '<option value="">-- Choose Item --</option>' + 
            inventory.sort((a,b) => a.name.localeCompare(b.name))
                     .map(i => `<option value="${i.id}">${i.name} (${i.spec}) — ${i.qty} left</option>`).join('');
        sel.value = currentSelection;
    }
}

// RESTORED & OPTIMIZED CSV EXPORT
function triggerDownload(csvContent, fileName) {
    try {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err) {
        console.error("Download failed:", err);
        alert("Download failed. If using Brave, check if 'Fingerprinting Protection' is blocking downloads.");
    }
}

function downloadInventoryCSV() {
    let csv = "\uFEFFItem,Category,Specification,Quantity,Unit\n";
    inventory.forEach(i => {
        csv += `"${i.name.replace(/"/g, '""')}","${(i.category || '').replace(/"/g, '""')}","${(i.spec || '').replace(/"/g, '""')}",${i.qty},"${(i.unit || '').replace(/"/g, '""')}"\n`;
    });
    triggerDownload(csv, `TLES_Inventory_${new Date().toISOString().slice(0,10)}.csv`);
}

function downloadLogCSV() {
    let csv = "\uFEFFTimestamp,Action,Item,Recipient,Purpose,Amount\n";
    history.forEach(l => {
        csv += `"${l.time}","${l.msg}","${(l.fullItemLabel || '').replace(/"/g, '""')}","${(l.recipient || '').replace(/"/g, '""')}","${(l.purpose || '').replace(/"/g, '""')}","${l.amount}"\n`;
    });
    triggerDownload(csv, `TLES_Audit_Logs_${new Date().toISOString().slice(0,10)}.csv`);
}

// Utility Actions
function logAction(msg, rec, purp, amount, itemObj, type) {
    const time = new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const fullItemLabel = `${itemObj.name} (${itemObj.spec})`;
    window.fb.push(window.fb.ref(window.fb.db, 'history'), { 
        time, msg, recipient: rec, purpose: purp, amount, fullItemLabel, type 
    });
}

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
    getEl('edit-id').value = id;
    getEl('item-name').value = item.name;
    getEl('item-category').value = item.category;
    getEl('item-spec').value = item.spec;
    getEl('item-unit').value = item.unit;
    getEl('item-qty').value = item.qty;
    getEl('item-min').value = item.min;
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

getEl('item-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = getEl('edit-id').value;
    const name = getEl('item-name').value;
    const spec = getEl('item-spec').value;
    const qty = parseInt(getEl('item-qty').value);
    
    const data = {
        name,
        category: getEl('item-category').value,
        spec,
        unit: getEl('item-unit').value,
        qty,
        min: parseInt(getEl('item-min').value)
    };

    if (id) {
        window.fb.update(window.fb.ref(window.fb.db, 'inventory/' + id), data);
    } else {
        window.fb.set(window.fb.push(window.fb.ref(window.fb.db, 'inventory')), data);
        logAction(`Initial Stock`, "System", "Inventory Registry", qty, data, 'plus');
    }
    showView('dashboard');
});

getEl('issue-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = getEl('issue-select').value;
    const qty = parseInt(getEl('issue-qty').value);
    const item = inventory.find(i => i.id === id);
    if (item && item.qty >= qty) {
        window.fb.update(window.fb.ref(window.fb.db, 'inventory/' + id), { qty: item.qty - qty });
        logAction(`Stock Out`, getEl('issue-recipient').value, getEl('issue-purpose').value, qty, item, 'minus');
        this.reset();
        showView('dashboard');
    } else { alert("Insufficient Stock!"); }
});

getEl('inventory-search').addEventListener('input', updateUI);
init();
