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
    if(viewId === 'add-stock') { 
        document.getElementById('item-form').reset();
        document.getElementById('edit-id').value = '';
        document.getElementById('add-view-title').textContent = "Add New Item";
    }
}

function sortTable(key) {
    sortDir[key] *= -1;
    inventory.sort((a, b) => {
        let valA = a[key], valB = b[key];
        if(key === 'qty') return (valA - valB) * sortDir[key];
        return valA.localeCompare(valB) * sortDir[key];
    });
    updateUI();
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
                <td>${item.spec}</td>
                <td style="${item.qty < 5 ? 'color:red;font-weight:bold':''}">${item.qty} ${item.unit}</td>
                <td>
                    <button class="btn-edit" onclick="editItem('${item.id}')">✎ Edit</button>
                    <button class="btn-delete" onclick="deleteItem('${item.id}')">✕</button>
                </td>
            </tr>`;
    });

    document.getElementById('stat-total-items').textContent = inventory.length;
    document.getElementById('stat-total-units').textContent = totalUnits;

    const feed = document.getElementById('activity-feed');
    if (feed) {
        feed.innerHTML = '';
        [...history].reverse().slice(0, 8).forEach(log => {
            feed.innerHTML += `<div style="font-size:0.8rem; border-bottom:1px solid #eee; padding:8px 0;">
                <small style="color:#94a3b8">${log.time}</small><br>${log.msg}</div>`;
        });
    }

    const histTbody = document.querySelector('#history-table tbody');
    if(histTbody) {
        histTbody.innerHTML = '';
        [...history].reverse().forEach(log => {
            histTbody.innerHTML += `<tr><td>${log.time}</td><td>${log.msg}</td></tr>`;
        });
    }
}

function editItem(id) {
    const item = inventory.find(i => i.id === id);
    showView('add-stock');
    document.getElementById('edit-id').value = id;
    document.getElementById('item-name').value = item.name;
    document.getElementById('item-spec').value = item.spec;
    document.getElementById('item-unit').value = item.unit;
    document.getElementById('item-qty').value = item.qty;
    document.getElementById('add-view-title').textContent = "Correcting: " + item.name;
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

function downloadCSV() {
    let csv = "Date,Activity\n";
    history.forEach(log => { csv += `"${log.time}","${log.msg}"\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `TLES_Logs_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function deleteItem(id) { if(confirm("Delete item?")) window.fb.remove(window.fb.ref(window.fb.db, 'inventory/' + id)); }

function logAction(msg) {
    const time = new Date().toLocaleString();
    window.fb.push(window.fb.ref(window.fb.db, 'history'), { time, msg });
}

init();
showView('dashboard');
