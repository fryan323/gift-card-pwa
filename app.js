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

/* DUPLICATE LOGIC */
function normalize(s) {
  return s.trim().toLowerCase();
}

function normalizeNumber(s) {
  return s.replace(/\D/g,'');
}

function normalizeCode(s) {
  return s.trim().toLowerCase().replace(/\s/g,'');
}

function isDuplicate(card, excludeId=null) {
  return cards.some(c =>
    c.id !== excludeId &&
    normalize(c.retailer) === normalize(card.retailer) &&
    normalizeNumber(c.cardNumber) === normalizeNumber(card.cardNumber) &&
    normalizeCode(c.code) === normalizeCode(card.code)
  );
}

function render() {
  if (currentTab === "cards") {
    document.getElementById("card-list").classList.remove("hidden");
    document.getElementById("totals-view").classList.add("hidden");
    renderCards();
  } else {
    document.getElementById("card-list").classList.add("hidden");
    document.getElementById("totals-view").classList.remove("hidden");
    renderTotals();
  }
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

  if (!card.retailer || !card.cardNumber || !card.code) {
    alert("Missing required fields");
    return;
  }

  if (!editingId && isDuplicate(card)) {
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
  if (!editingId) return;

  if (!confirm("Are you sure you want to delete this card?")) return;

  cards = cards.filter(c=>c.id!==editingId);
  save();
  closeForm();
  render();
  showToast("Deleted");
}

/* COPY */
function copyCardNumber(n) {
  navigator.clipboard.writeText(n);
  showToast("Copied card number");
}

function copyCode(c) {
  navigator.clipboard.writeText(c);
  showToast("Copied code");
}

/* CHECK BALANCE */
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

/* EXPORT */
function exportData() {
  const blob = new Blob([JSON.stringify(cards, null, 2)], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "gift-cards-backup.txt";
  a.click();

  URL.revokeObjectURL(url);
  showToast("Exported cards");
}

/* OCR HANDLER */
document.addEventListener("DOMContentLoaded", function() {
  const photoInput = document.getElementById("photoInput");

  if (photoInput) {
    photoInput.addEventListener("change", async function(e) {
      const file = e.target.files[0];
      if (!file) return;

      showToast("Scanning...");

      try {
        const result = await Tesseract.recognize(file, 'eng');
        const text = result.data.text;

        console.log("OCR TEXT:", text);

        extractFromText(text);

        showToast("Populated from image");
      } catch (err) {
        console.error(err);
        alert("Scan failed");
      }
    });
  }
});

/* OCR PARSER (IMPROVED LEGO PIN) */
function extractFromText(text) {
  const cleaned = text.replace(/\n/g, " ");
  const lower = cleaned.toLowerCase();

  if (lower.includes("lego")) {
    retailerSelect.value = "LEGO";

    const match = cleaned.match(/(\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{3})/);
    if (match) cardNumber.value = match[0].replace(/\s/g, "");

    /* ✅ IMPROVED PIN DETECTION */
    let pinMatch = cleaned.match(/p[\s\W]*[i1l][\s\W]*n[\s:\-]*([0-9]{4,8})/i);

    if (!pinMatch) {
      // fallback: grab last 4-digit number in text
      const fallback = cleaned.match(/([0-9]{4})(?!.*[0-9]{4})/);
      if (fallback) code.value = fallback[1];
    } else {
      code.value = pinMatch[1];
    }

    const bal = cleaned.match(/\$?\d+\.\d{2}/);
    if (bal) balance.value = bal[0].replace("$","");
    return;
  }

  if (lower.includes("giftcards.com")) {
    retailerSelect.value = "Giftcards.com";
    const match = cleaned.match(/(\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{3})/);
    if (match) cardNumber.value = match[0].replace(/\s/g, "");
    let pinMatch = cleaned.match(/p.?n[:\s]*([0-9]{4,8})/i);
    if (pinMatch) code.value = pinMatch[1];
    const bal = cleaned.match(/\$?\d+\.\d{2}/);
    if (bal) balance.value = bal[0].replace("$","");
    return;
  }

  if (lower.includes("target")) {
    retailerSelect.value = "Target";
    const card = cleaned.match(/gift\s*card\s*number[:\s]*([0-9]{12,20})/i);
    if (card) cardNumber.value = card[1];
    const access = cleaned.match(/access.*?([0-9]{6,12})/i);
    if (access) code.value = access[1];
    const bal = cleaned.match(/\$?\d+\.\d{2}/);
    if (bal) balance.value = bal[0].replace("$","");
    return;
  }

  if (cleaned.match(/\d{4}\s\d{5}\s\d{5}\s\d{5}/)) {
    retailerSelect.value = "Kohls";
    const match = cleaned.match(/(\d{4}\s\d{5}\s\d{5}\s\d{5})/);
    if (match) cardNumber.value = match[0].replace(/\s/g, "");
    const pin = cleaned.match(/pin[:\s]*([0-9]{4})/i);
    if (pin) code.value = pin[1];
    const bal = cleaned.match(/\$?\d+\.\d{2}/);
    if (bal) balance.value = bal[0].replace("$","");
    return;
  }
}

render();