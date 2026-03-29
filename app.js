let cards = JSON.parse(localStorage.getItem("cards")) || [];
let editingId = null;
let currentTab = "cards";

function save() {
  localStorage.setItem("cards", JSON.stringify(cards));
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.innerText = msg;
  t.style.display = "block";
  setTimeout(() => t.style.display = "none", 1200);
}

function toggleOther() {
  customRetailer.classList.toggle("hidden", retailerSelect.value !== "Other…");
}

function getRetailer() {
  return retailerSelect.value === "Other…" ? customRetailer.value : retailerSelect.value;
}

function render() {
  if (currentTab === "cards") renderCards();
  else renderTotals();
}

function renderCards() {
  let list = document.getElementById("card-list");

  list.innerHTML = cards.slice().reverse().map(c => `
    <div class="card" data-id="${c.id}">
      <div class="card-row">

        <div class="card-icon">💳</div>

        <div class="card-info">
          <div class="title">${c.retailer} •••• ${c.cardNumber.slice(-4)}</div>
          <div class="subtitle">
            Balance: $${c.balance.toFixed(2)}
            ${c.balance==0?'<span class="badge">Used</span>':''}
          </div>
          <div class="discount">Discount: ${c.percentDiscount || 0}%</div>
        </div>

        <div class="copy-container" onclick="event.stopPropagation()">
          <button onclick="copyCardNumber('${c.cardNumber}')">#</button>
          <button onclick="copyCode('${c.code}')">Code</button>
        </div>

      </div>
    </div>
  `).join("");

  // ✅ FIXED CLICK HANDLER
  document.querySelectorAll(".card").forEach(el => {
    el.addEventListener("click", function() {
      editCard(this.dataset.id);
    });
  });
}

function renderTotals() {
  const totals = {};
  cards.forEach(c => totals[c.retailer]=(totals[c.retailer]||0)+c.balance);

  document.getElementById("totals-view").innerHTML =
    Object.entries(totals)
      .map(([r,b])=>`<div class="card"><b>${r}</b> $${b.toFixed(2)}</div>`)
      .join("");
}

function showTab(tab) {
  currentTab = tab;
  document.getElementById("totals-view").classList.toggle("hidden", tab!=="totals");
  render();
}

function openForm() {
  editingId = null;

  retailerSelect.value = "Target";
  cardNumber.value = "";
  code.value = "";
  discount.value = "";
  balance.value = "";

  deleteBtn.style.display = "none";
  modal.classList.add("show");
}

function closeForm() {
  modal.classList.remove("show");
}

function saveCard() {
  const card = {
    id: editingId || crypto.randomUUID(),
    retailer: getRetailer(),
    cardNumber: cardNumber.value,
    code: code.value,
    percentDiscount: parseFloat(discount.value)||0,
    balance: parseFloat(balance.value)||0
  };

  if (editingId) {
    cards = cards.map(c => c.id === editingId ? card : c);
  } else {
    cards.push(card);
  }

  save();
  closeForm();
  render();
  showToast("Saved");
}

function editCard(id) {
  const c = cards.find(c=>c.id===id);
  editingId = id;

  retailerSelect.value = c.retailer;
  cardNumber.value = c.cardNumber;
  code.value = c.code;
  discount.value = c.percentDiscount;
  balance.value = c.balance;

  deleteBtn.style.display = "block";
  modal.classList.add("show");
}

function deleteCurrentCard() {
  cards = cards.filter(c=>c.id!==editingId);
  save();
  closeForm();
  render();
}

function copyCardNumber(n) {
  navigator.clipboard.writeText(n);
  showToast("Copied card number");
}

function copyCode(c) {
  navigator.clipboard.writeText(c);
  showToast("Copied code");
}

function checkBalanceFromModal() {
  const retailer = getRetailer();
  const number = cardNumber.value;

  navigator.clipboard.writeText(number);
  showToast("Card number copied");

  let url = "";

  switch (retailer.toLowerCase()) {
    case "lego":
      url = "https://www.lego.com/en-us/gift-cards/balance"; break;
    case "target":
      url = "https://www.target.com/guest/gift-card-balance"; break;
    case "walmart":
      url = "https://www.walmart.com/account/giftcards/balance"; break;
    case "kohls":
      url = "https://www.kohls.com/giftcard/gift_card_check_balance.jsp"; break;
    case "giftcards.com":
      url = "https://www.giftcards.com/us/en/self-serve/check-balance"; break;
    default:
      alert("No balance checker available"); return;
  }

  window.open(url, "_blank");
}

render();