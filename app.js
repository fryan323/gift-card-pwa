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
  const val = retailerSelect.value;
  customRetailer.classList.toggle("hidden", val !== "Other…");
}

function getRetailer() {
  return retailerSelect.value === "Other…" ? customRetailer.value : retailerSelect.value;
}

function normalize(s) {
  return s.trim().toLowerCase();
}

function normalizeNumber(s) {
  return s.replace(/\D/g,'');
}

function normalizeCode(s) {
  return s.trim().toLowerCase().replace(/\s/g,'');
}

function isDuplicate(card, exclude=null) {
  return cards.some(c =>
    c.id !== exclude &&
    normalize(c.retailer) === normalize(card.retailer) &&
    normalizeNumber(c.cardNumber) === normalizeNumber(card.cardNumber) &&
    normalizeCode(c.code) === normalizeCode(card.code)
  );
}

function render() {
  if (currentTab === "cards") renderCards();
  else renderTotals();
}

function renderCards() {
  let list = document.getElementById("card-list");
  let search = document.getElementById("search").value.toLowerCase();
  let hideZero = document.getElementById("hideZero").checked;
  let sort = document.getElementById("sort").value;

  let filtered = [...cards].reverse();

  if (hideZero) filtered = filtered.filter(c => c.balance !== 0);

  if (search) {
    filtered = filtered.filter(c =>
      c.retailer.toLowerCase().includes(search) ||
      c.cardNumber.includes(search) ||
      c.code.includes(search)
    );
  }

  if (sort === "desc") filtered.sort((a,b)=>b.balance-a.balance);
  if (sort === "asc") filtered.sort((a,b)=>a.balance-b.balance);
  if (sort === "alpha") filtered.sort((a,b)=>a.retailer.localeCompare(b.retailer));

  list.innerHTML = filtered.map(c => `
    <div class="card ${c.balance==0?'used':''}">
      
      <div class="card-row">
        <div class="card-icon">💳</div>

        <div class="card-info">
          <div class="title">
            ${c.retailer} •••• ${c.cardNumber.slice(-4)}
          </div>

          <div class="subtitle">
            Balance: $${c.balance.toFixed(2)}
            ${c.balance==0?'<span class="badge">Used</span>':''}
          </div>
        </div>
      </div>

      <div class="actions">
        <button onclick="editCard('${c.id}')">Edit</button>
        <button onclick="deleteCard('${c.id}')">Delete</button>
        <button onclick="copyCardNumber('${c.cardNumber}')">Copy #</button>
        <button onclick="copyCode('${c.code}')">Copy Code</button>
      </div>

    </div>
  `).join("");
}

function renderTotals() {
  const totals = {};
  cards.forEach(c => totals[c.retailer]=(totals[c.retailer]||0)+c.balance);

  document.getElementById("card-list").innerHTML = "";
  document.getElementById("totals-view").classList.remove("hidden");

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
  customRetailer.value = "";
  customRetailer.classList.add("hidden");

  cardNumber.value = "";
  code.value = "";
  discount.value = "";
  balance.value = "";

  document.getElementById("modal").classList.add("show");
}

function closeForm() {
  document.getElementById("modal").classList.remove("show");
}

function saveCard() {
  const card = {
    id: editingId ? editingId : crypto.randomUUID(),
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
  showToast("Saved");
  render();
}

function editCard(id) {
  const c = cards.find(c=>c.id===id);
  editingId = id;

  const options = Array.from(retailerSelect.options).map(o => o.value);

  if (options.includes(c.retailer)) {
    retailerSelect.value = c.retailer;
    customRetailer.classList.add("hidden");
  } else {
    retailerSelect.value = "Other…";
    customRetailer.value = c.retailer;
    customRetailer.classList.remove("hidden");
  }

  cardNumber.value = c.cardNumber;
  code.value = c.code;
  discount.value = c.percentDiscount;
  balance.value = c.balance;

  document.getElementById("modal").classList.add("show");
}

function deleteCard(id) {
  cards = cards.filter(c=>c.id!==id);
  save();
  render();
}

/* COPY */
function copyCardNumber(number) {
  navigator.clipboard.writeText(number);
  showToast("Copied card number");
}

function copyCode(codeValue) {
  navigator.clipboard.writeText(codeValue);
  showToast("Copied code");
}

/* EXPORT */
function exportData() {
  const dataStr = JSON.stringify(cards, null, 2);
  const blob = new Blob([dataStr], { type: "text/plain" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "gift-cards-backup.txt";
  a.click();

  URL.revokeObjectURL(url);
  showToast("Exported cards");
}

/* DOM READY */
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

  const importInput = document.getElementById("importFile");
  if (importInput) {
    importInput.addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = function(event) {
        try {
          const imported = JSON.parse(event.target.result);
          if (!Array.isArray(imported)) throw new Error();

          cards = imported;
          save();
          render();

          showToast("Imported cards");
        } catch {
          alert("Import failed");
        }
      };

      reader.readAsText(file);
    });
  }

});

/* OCR PARSER */
function extractFromText(text) {
  const cleaned = text.replace(/\n/g, " ");
  const lower = cleaned.toLowerCase();

  // LEGO
  if (lower.includes("lego")) {
    retailerSelect.value = "LEGO";

    const match = cleaned.match(/(\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{3})/);
    if (match) cardNumber.value = match[0].replace(/\s/g, "");

    const pin = cleaned.match(/pin[:\s]*([0-9]{4,8})/i);
    if (pin) code.value = pin[1];

    const bal = cleaned.match(/\$?\d+\.\d{2}/);
    if (bal) balance.value = bal[0].replace("$","");

    return;
  }

  // GIFTCARDS.COM (FIXED)
  if (lower.includes("giftcards.com")) {
    retailerSelect.value = "Giftcards.com";

    const match = cleaned.match(/(\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{3})/);
    if (match) {
      cardNumber.value = match[0].replace(/\s/g, "");
    }

    let pinMatch = cleaned.match(/pin[:\s]*([0-9]{4,8})/i);

    if (!pinMatch) {
      pinMatch = cleaned.match(/p.?n[:\s]*([0-9]{4,8})/i);
    }

    if (!pinMatch) {
      const possiblePins = cleaned.match(/\b\d{4}\b/g);
      if (possiblePins) {
        const filtered = possiblePins.filter(p => !cardNumber.value.includes(p));
        if (filtered.length > 0) {
          code.value = filtered[0];
        }
      }
    } else {
      code.value = pinMatch[1];
    }

    const bal = cleaned.match(/\$?\d+\.\d{2}/);
    if (bal) balance.value = bal[0].replace("$","");

    return;
  }

  // TARGET
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

  // KOHLS
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

  // GENERIC
  const numbers = cleaned.match(/\d{8,}/g);
  if (numbers) cardNumber.value = numbers.sort((a,b)=>b.length-a.length)[0];

  const bal = cleaned.match(/\$?\d+\.\d{2}/);
  if (bal) balance.value = bal[0].replace("$","");
}

render();