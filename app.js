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

/* OCR HANDLER */
document.getElementById("photoInput").addEventListener("change", async function(e) {
  const file = e.target.files[0];
  if (!file) return;

  showToast("Scanning...");

  try {
    const result = await Tesseract.recognize(file, 'eng');
    const text = result.data.text;

    extractFromText(text);

    showToast("Populated from image");
  } catch (err) {
    console.error(err);
    alert("Scan failed");
  }
});

/* OCR PARSER */
function extractFromText(text) {
  const cleaned = text.replace(/\n/g, " ");

  // -----------------------------
  // LEGO-SPECIFIC LOGIC
  // -----------------------------
  const lower = cleaned.toLowerCase();

  if (lower.includes("lego")) {
    retailerSelect.value = "LEGO";

    // --- CARD NUMBER (19 digits, allow spaces) ---
    const cardMatch = cleaned.match(/(\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{3})/);

    if (cardMatch) {
      cardNumber.value = cardMatch[0].replace(/\s/g, "");
    } else {
      // fallback: grab longest number string
      const numbers = cleaned.match(/\d+/g);
      if (numbers) {
        const longest = numbers.sort((a,b)=>b.length-a.length)[0];
        if (longest.length >= 16) {
          cardNumber.value = longest;
        }
      }
    }

    // --- PIN (look for PIN label) ---
    const pinMatch = cleaned.match(/pin[:\s]*([0-9]{4,8})/i);

    if (pinMatch) {
      code.value = pinMatch[1];
    } else {
      // fallback: any 4-digit number NOT part of card number
      const possiblePins = cleaned.match(/\b\d{4}\b/g);
      if (possiblePins) {
        const filtered = possiblePins.filter(p => !cardNumber.value.includes(p));
        if (filtered.length > 0) {
          code.value = filtered[0];
        }
      }
    }

    // --- BALANCE ---
    const balanceMatch = cleaned.match(/\$?\d+\.\d{2}/);
    if (balanceMatch) {
      balance.value = balanceMatch[0].replace("$","");
    }

    return; // 🔥 STOP here if LEGO matched
  }

  // -----------------------------
  // GENERIC FALLBACK (other cards)
  // -----------------------------

  const numbers = cleaned.match(/\d{8,}/g);
  if (numbers) {
    cardNumber.value = numbers.sort((a,b)=>b.length-a.length)[0];
  }

  const balanceMatch = cleaned.match(/\$?\d+\.\d{2}/);
  if (balanceMatch) {
    balance.value = balanceMatch[0].replace("$","");
  }
}

render();