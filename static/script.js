const INTERNET_SPEEDS = [
  { speed: "30",  traffic: "Не ограничен", rent: "2500", connection_fee: "10000" },
  { speed: "50",  traffic: "Не ограничен", rent: "3200", connection_fee: "8000" },
  { speed: "100", traffic: "Не ограничен", rent: "4500", connection_fee: "5000" },
];

const ADDITIONAL_SERVICES = [
  { name: "Аренда роутера Archer C5", rent: "170" },
  { name: "Статический IP", rent: "300" },
  { name: "Обслуживание сети", rent: "500" },
];

const DEVICE_MODELS = [
  { name: "Archer C5", price: 5000 },
  { name: "MikroTik hAP ac2", price: 7500 },
  { name: "TP-Link Deco X20", price: 9800 },
];


function addInternet() {
  const tbody = document.getElementById("internetBody");
  const row = document.createElement("tr");

  row.innerHTML = `
    <td><textarea class="address" placeholder="Адрес подключения"></textarea></td>
    <td>
      <select class="speed" onchange="updateInternetRow(this)">
        <option value="">Выберите</option>
        ${INTERNET_SPEEDS.map(
          (s, i) => `<option value="${i}">${s.speed}</option>`
        ).join("")}
      </select>
    </td>
    <td class="traffic-cell"></td>
    <td class="rent-cell"></td>
    <td class="fee-cell"></td>
    <td><button type="button" onclick="this.closest('tr').remove()">✖</button></td>
  `;
  tbody.appendChild(row);
}

function updateInternetRow(selectEl) {
  const idx = selectEl.value;
  const row = selectEl.closest("tr");
  if (idx === "") return;
  const t = INTERNET_SPEEDS[idx];
  row.querySelector(".traffic-cell").textContent = t.traffic;
  row.querySelector(".rent-cell").textContent = t.rent;
  row.querySelector(".fee-cell").textContent = t.connection_fee;
}

function addAdditional() {
  const tbody = document.getElementById("addBody");
  const row = document.createElement("tr");

  row.innerHTML = `
    <td>
      <select class="service" onchange="updateAdditionalRow(this)">
        <option value="">Выберите услугу</option>
        ${ADDITIONAL_SERVICES.map(
          (s, i) => `<option value="${i}">${s.name}</option>`
        ).join("")}
      </select>
    </td>
    <td class="rent-cell"></td>
    <td><textarea class="comment" placeholder="Комментарий (адрес, примечание и т.д.)"></textarea></td>
    <td><button type="button" onclick="this.closest('tr').remove()">✖</button></td>
  `;
  tbody.appendChild(row);
}

function updateAdditionalRow(selectEl) {
  const idx = selectEl.value;
  const row = selectEl.closest("tr");
  if (idx === "") return;
  const s = ADDITIONAL_SERVICES[idx];
  row.querySelector(".rent-cell").textContent = s.rent;
}

function addDevice() {
  const tbody = document.getElementById("deviceBody");
  const row = document.createElement("tr");

  row.innerHTML = `
    <td>
      <select class="device" onchange="updateDeviceRow(this)">
        <option value="">Выберите устройство</option>
        ${DEVICE_MODELS.map(
          (d, i) => `<option value="${i}">${d.name}</option>`
        ).join("")}
      </select>
    </td>
    <td class="price-cell"></td>
    <td><input type="number" min="1" value="1" class="amount" onchange="recalcDeviceTotal(this)"></td>
    <td><textarea class="address" placeholder="Адрес установки"></textarea></td>
    <td class="total-cell"></td>
    <td><button type="button" onclick="this.closest('tr').remove()">✖</button></td>
  `;
  tbody.appendChild(row);
}

function updateDeviceRow(selectEl) {
  const idx = selectEl.value;
  const row = selectEl.closest("tr");
  if (idx === "") return;
  const d = DEVICE_MODELS[idx];
  row.querySelector(".price-cell").textContent = d.price;
  const amount = Number(row.querySelector(".amount").value) || 0;
  row.querySelector(".total-cell").textContent = d.price * amount;
}

function recalcDeviceTotal(amountInput) {
  const row = amountInput.closest("tr");
  const idx = row.querySelector(".device").value;
  if (idx === "") return;
  const d = DEVICE_MODELS[idx];
  const amount = Number(amountInput.value) || 0;
  row.querySelector(".total-cell").textContent = d.price * amount;
}

// отправка
document.getElementById("contractForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const context = Object.fromEntries(fd.entries());

  context.internet_services = [...document.querySelectorAll("#internetBody tr")].map(row => {
    const idx = row.querySelector(".speed").value;
    if (idx === "") return null;
    const t = INTERNET_SPEEDS[idx];
    return {
      address: row.querySelector(".address").value,
      traffic: t.traffic,
      speed: t.speed,
      rent: t.rent,
      connection_fee: t.connection_fee,
    };
  }).filter(Boolean);

    context.additional_services = [...document.querySelectorAll("#addBody tr")].map(row => {
    const idx = row.querySelector(".service").value;
    if (idx === "") return null;
    const s = ADDITIONAL_SERVICES[idx];
    return {
        name: s.name,
        rent: s.rent,
        comment: row.querySelector(".comment").value
    };
    }).filter(Boolean);

    context.device_services = [...document.querySelectorAll("#deviceBody tr")].map(row => {
    const idx = row.querySelector(".device").value;
    if (idx === "") return null;
    const d = DEVICE_MODELS[idx];
    const amount = Number(row.querySelector(".amount").value) || 0;
    return {
        name: d.name,
        price: d.price,
        amount: String(amount),
        address: row.querySelector(".address").value,
        total_price: String(d.price * amount)
    };
    }).filter(Boolean);

  const resp = await fetch("/generate_agreement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(context),
  });

  if (!resp.ok) {
    alert("Ошибка генерации");
    return;
  }

  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "agreement.docx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  document.getElementById("popupOverlay").classList.remove("hidden");
});

function closePopup(event) {
  // если кликнули на сам фон или на кнопку — закрыть
  if (!event || event.target.id === "popupOverlay" || event.target.classList.contains("popup-close")) {
    document.getElementById("popupOverlay").classList.add("hidden");
  }
}