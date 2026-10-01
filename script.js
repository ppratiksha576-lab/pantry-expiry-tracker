const itemForm = document.getElementById('item-form');
const itemNameInput = document.getElementById('item-name');
const itemQtyInput = document.getElementById('item-qty');
const itemLocationInput = document.getElementById('item-location');
const itemCategoryInput = document.getElementById('item-category');
const expiryDateInput = document.getElementById('expiry-date');
const searchBar = document.getElementById('search-bar');
const sortSelect = document.getElementById('sort-select');
const itemList = document.getElementById('item-list');

let items = JSON.parse(localStorage.getItem('pantryItems')) || [];
let currentFilter = 'all';

// Add new item
itemForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const newItem = {
    id: Date.now(),
    name: itemNameInput.value.trim(),
    qty: parseInt(itemQtyInput.value, 10),
    location: itemLocationInput.value,
    category: itemCategoryInput.value,
    expiryDate: expiryDateInput.value
  };

  items.push(newItem);
  saveAndRender();

  itemNameInput.value = '';
  itemQtyInput.value = '1';
  expiryDateInput.value = '';
});

// Delete single item
function deleteItem(id) {
  items = items.filter(item => item.id !== id);
  saveAndRender();
}

// Adjust quantity
function adjustQty(id, delta) {
  items = items.map(item => {
    if (item.id === id) {
      const newQty = item.qty + delta;
      return { ...item, qty: newQty > 0 ? newQty : 1 };
    }
    return item;
  });
  saveAndRender();
}

// Clear all items
function clearAllItems() {
  if (confirm('Are you sure you want to clear all items?')) {
    items = [];
    saveAndRender();
  }
}

// Recipe Search
function findRecipes(itemName) {
  const query = encodeURIComponent(`recipes with ${itemName}`);
  window.open(`https://www.google.com/search?q=${query}`, '_blank');
}

// Status calculation
function getStatus(expiryDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiryDate = new Date(expiryDateStr);
  const diffTime = expiryDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { status: 'expired', days: diffDays, text: `Expired ${Math.abs(diffDays)}d ago` };
  if (diffDays <= 3) return { status: 'warning', days: diffDays, text: `Expires in ${diffDays}d` };
  return { status: 'good', days: diffDays, text: `Expires in ${diffDays}d` };
}

// Filter selector
function filterItems(category, event) {
  currentFilter = category;
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  renderItems();
}

// Update dashboard + Pantry Health Score + Cook-it-First Alert
function updateMetrics() {
  let good = 0, warning = 0, expired = 0;
  let priorityItem = null;
  let minDays = Infinity;

  items.forEach(item => {
    const { status, days } = getStatus(item.expiryDate);
    if (status === 'good') good++;
    if (status === 'warning') warning++;
    if (status === 'expired') expired++;

    // Identify item closest to expiring (or already expired)
    if (days < minDays) {
      minDays = days;
      priorityItem = { name: item.name, days: days, status: status };
    }
  });

  // Health Score Calculation
  const total = items.length;
  const score = total > 0 ? Math.round(((good + warning * 0.5) / total) * 100) : 100;
  const healthScoreEl = document.getElementById('health-score');
  healthScoreEl.textContent = `${score}%`;
  healthScoreEl.style.color = score > 75 ? '#2ecc71' : score > 40 ? '#f39c12' : '#e74c3c';

  // Cook-it-First Priority Alert
  const alertEl = document.getElementById('priority-alert');
  if (!priorityItem) {
    alertEl.className = 'priority-alert';
    alertEl.textContent = '✨ Pantry is empty!';
  } else if (priorityItem.status === 'expired') {
    alertEl.className = 'priority-alert critical';
    alertEl.textContent = `🚨 Action Needed: ${priorityItem.name} has expired!`;
  } else if (priorityItem.status === 'warning') {
    alertEl.className = 'priority-alert urgent';
    alertEl.textContent = `⚠️️ Priority: Use ${priorityItem.name} soon (expires in ${priorityItem.days}d)!`;
  } else {
    alertEl.className = 'priority-alert';
    alertEl.textContent = `✨ Everything is fresh! (${priorityItem.name} expires next in ${priorityItem.days}d)`;
  }

  document.getElementById('total-count').textContent = total;
  document.getElementById('good-count').textContent = good;
  document.getElementById('warning-count').textContent = warning;
  document.getElementById('expired-count').textContent = expired;
}

// Export JSON
function exportData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "pantry_backup.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Import JSON
function importData(event) {
  const fileReader = new FileReader();
  fileReader.onload = function(e) {
    try {
      const importedItems = JSON.parse(e.target.result);
      if (Array.isArray(importedItems)) {
        items = importedItems;
        saveAndRender();
        alert('Data imported successfully!');
      }
    } catch (err) {
      alert('Invalid JSON file format.');
    }
  };
  fileReader.readAsText(event.target.files[0]);
}

// Save & render wrapper
function saveAndRender() {
  localStorage.setItem('pantryItems', JSON.stringify(items));
  renderItems();
}

// Main Render Logic
function renderItems() {
  updateMetrics();
  itemList.innerHTML = '';

  const searchTerm = searchBar.value.toLowerCase();
  const sortMode = sortSelect.value;

  let filteredItems = items.filter(item => {
    const { status } = getStatus(item.expiryDate);
    const matchesSearch = item.name.toLowerCase().includes(searchTerm);

    if (!matchesSearch) return false;
    if (currentFilter === 'expiring') return status === 'warning';
    if (currentFilter === 'expired') return status === 'expired';
    return true;
  });

  filteredItems.sort((a, b) => {
    if (sortMode === 'date') return new Date(a.expiryDate) - new Date(b.expiryDate);
    if (sortMode === 'name') return a.name.localeCompare(b.name);
  });

  if (filteredItems.length === 0) {
    itemList.innerHTML = '<li style="text-align: center; color: #888; padding: 10px;">No items found.</li>';
    return;
  }

  filteredItems.forEach(item => {
    const { status, text } = getStatus(item.expiryDate);

    const li = document.createElement('li');
    li.className = `item-card ${status}`;
    li.innerHTML = `
      <div class="item-info">
        <strong>${item.name} (${item.qty}) 
          <span class="location-tag">${item.location}</span>
          <span class="qty-controls">
            <button class="qty-btn" onclick="adjustQty(${item.id}, 1)">+</button>
            <button class="qty-btn" onclick="adjustQty(${item.id}, -1)">-</button>
          </span>
        </strong>
        <span>Category: ${item.category} | ${text}</span>
      </div>
      <div class="actions">
        <button class="recipe-btn" onclick="findRecipes('${item.name}')">💡 Recipe</button>
        <button class="delete-btn" onclick="deleteItem(${item.id})">✕</button>
      </div>
    `;

    itemList.appendChild(li);
  });
}

// Initial render
renderItems();