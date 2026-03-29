let cards = JSON.parse(localStorage.getItem("cards")) || [];
let editingId = null;

function save() {
  localStorage.setItem("cards", JSON.stringify(cards));
}

function normalize(str) {
  return str.trim().toLowerCase();
}

function isDuplicate(card, excludeId=null) {
  return cards.some(c =>
    c.id !== excludeId &&
    normalize(c.retailer) === normalize(card.retailer) &&
    c.cardNumber.replace(/\D/g,'') === card.cardNumber.replace(/\D/g,'') &&
    normalize(c.code) === normalize(card.code)
  );
}

function render() {
  const list = document.getElementById("card-list");
  const search = document.getElementById("search").value.toLowerCase();

  let filtered = cards.filter(c =>
    c.retailer.toLowerCase().includes(search) ||
    c.cardNumber.includes(search) ||
    c.code.includes(search)
  );

  list.innerHTML = filtered.map(c => `
    <div class="card">
      <b>${c.retailer}</b> •••• ${c.cardNumber.slice(-4)}<br>
      Balance: $${c.balance.toFixed(2)}<br>
      <button onclick="editCard('${c.id}')">Edit</button>
      <button onclick="deleteCard('${c.id}')">Delete</button>
    </div>
  `).join("");

  renderTotals();
}

function renderTotals() {
  const totals = {};

  cards.forEach(c => {
    totals[c.retailer] = (totals[c.retailer] || 0) + c.balance;
  });

  document.getElementById("totals").innerHTML =
    Object.entries(totals).map(([r, b]) =>
      `<div>${r}: $${b.toFixed(2)}</div>`
    ).join("");
}

function openForm() {
  editingId = null;
  document.getElementById("modal").classList.remove("hidden");
}

function closeForm() {
  document.getElementById("modal").classList.add("hidden");
}

function saveCard() {
  const card = {
    id: editingId || crypto.randomUUID(),
    retailer: retailer.value,
    cardNumber: cardNumber.value,
    code: code.value,
    percentDiscount: parseFloat(discount.value) || 0,
    balance: parseFloat(balance.value) || 0
  };

  if (!card.retailer || !card.cardNumber || !card.code) {
    alert("Missing required fields");
    return;
  }

  if (isDuplicate(card, editingId)) {
    alert("Duplicate card");
    return;
  }

  if (editingId) {
    cards = cards.map(c => c.id === editingId ? card : c);
  } else {
    cards.push(card);
  }

  save();
  closeForm();
  render();
}

function editCard(id) {
  const c = cards.find(c => c.id === id);
  editingId = id;

  retailer.value = c.retailer;
  cardNumber.value = c.cardNumber;
  code.value = c.code;
  discount.value = c.percentDiscount;
  balance.value = c.balance;

  openForm();
}

function deleteCard(id) {
  cards = cards.filter(c => c.id !== id);
  save();
  render();
}

render();