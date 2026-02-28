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
        const matchesSearch = item.name.toLowerCase().includes(search) || item.spec.toLowerCase().includes(search);
        
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

    // Detailed Sidebar Feed with Color Coding
    const feed = document.getElementById('activity-feed');
    if (feed) {
        feed.innerHTML = '';
        [...history].reverse().slice(0, 15).forEach(log => {
            const isIncrease = log.type === 'plus';
            const qtyColor = isIncrease ? '#166534' : '#be123c'; // Green for plus, Red for minus
            const qtySign = isIncrease ? '+' : '-';

            feed.innerHTML += `
                <div class="feed-item">
                    <span class="feed-time">${log.time}</span>
                    <div style="margin-top:4px;">
                        <span style="color:${qtyColor}; font
