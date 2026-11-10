const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "cofind_reports_v3";
const QR_KEY = "cofind_qr_profile_v1";

let reports = loadReports();
let currentTab = "active";
let currentOwner = null;

function loadReports() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveReports() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function normalizePhone(phone) {
  let number = String(phone || "").replace(/\D/g, "");

  if (number.startsWith("0")) {
    number = "6" + number;
  }

  return number;
}

function validPhone(phone) {
  return /^\d{10,15}$/.test(normalizePhone(phone));
}

function whatsappLink(phone, message = "") {
  const number = normalizePhone(phone);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatDate(date) {
  if (!date) return "-";

  const parsed = new Date(date + "T00:00:00");

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

// MOBILE MENU
$("menuToggle")?.addEventListener("click", () => {
  $("mainNav")?.classList.toggle("active");
});

document.querySelectorAll("#mainNav a").forEach((link) => {
  link.addEventListener("click", () => {
    $("mainNav")?.classList.remove("active");
  });
});

// BROWSE REPORTS
function renderBrowse() {
  const grid = $("listingGrid");
  if (!grid) return;

  const keyword = ($("searchInput")?.value || "").toLowerCase().trim();
  const category = $("categoryFilter")?.value || "";
  const status = $("statusFilter")?.value || "";

  const filtered = reports.filter((item) => {
    if (item.status !== "active") return false;

    const matchesKeyword =
      !keyword ||
      [item.name, item.category, item.location, item.description]
        .some((value) => String(value || "").toLowerCase().includes(keyword));

    const matchesCategory =
      !category || item.category === category;

    const matchesStatus =
      !status || item.type === status;

    return matchesKeyword && matchesCategory && matchesStatus;
  });

  grid.innerHTML = "";

  if (filtered.length === 0) {
    $("emptyBrowse")?.removeAttribute("hidden");
  } else {
    $("emptyBrowse")?.setAttribute("hidden", "");
  }

  filtered.forEach((item) => {
    grid.insertAdjacentHTML("beforeend", createBrowseCard(item));
  });
}

function createBrowseCard(item) {
  const image = item.photo
    ? `<img src="${item.photo}" alt="Item photo" class="card-photo">`
    : "";

  const typeLabel = item.type === "lost" ? "Lost Item" : "Found Item";

  return `
    <article class="listing-card">
      ${image}
      <div class="card-content">
        <span class="status ${item.type}">
          ${typeLabel}
        </span>

        <h3>${escapeHTML(item.name)}</h3>

        <p><strong>Category:</strong> ${escapeHTML(item.category)}</p>
        <p><strong>Location:</strong> ${escapeHTML(item.location)}</p>
        <p><strong>Date:</strong> ${formatDate(item.date)}</p>

        <div class="card-actions">
          <button class="small-btn" data-action="view" data-id="${item.id}">
            View Details
          </button>

          <a class="small-btn whatsapp"
             href="${whatsappLink(item.phone, `Hi, saya berminat untuk bertanya tentang laporan ${item.name}.`)}"
             target="_blank" rel="noopener">
            WhatsApp Owner
          </a>
        </div>
      </div>
    </article>
  `;
}

// REPORT FORM
$("reportForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const type = $("reportType").value;
  const name = $("itemName").value.trim();
  const category = $("itemCategory").value;
  const location = $("itemLocation").value.trim();
  const date = $("itemDate").value;
  const reporter = $("reporterName").value.trim();
  const phone = normalizePhone($("reporterPhone").value);
  const description = $("itemDescription").value.trim();
  const photoFile = $("itemPhoto").files[0];

  if (!validPhone(phone)) {
    showMessage("reportMessage", "Sila masukkan nombor WhatsApp yang sah.", true);
    return;
  }

  let photo = "";

  if (photoFile) {
    if (!photoFile.type.startsWith("image/")) {
      showMessage("reportMessage", "Fail yang dimuat naik mestilah gambar.", true);
      return;
    }

    if (photoFile.size > 700 * 1024) {
      showMessage("reportMessage", "Saiz gambar mestilah tidak melebihi 700 KB.", true);
      return;
    }

    try {
      photo = await readImage(photoFile);
    } catch {
      showMessage("reportMessage", "Gambar tidak dapat dibaca. Cuba sekali lagi.", true);
      return;
    }
  }

  const newReport = {
    id: generateId(),
    type,
    name,
    category,
    location,
    date,
    reporter,
    phone,
    description,
    photo,
    status: "active",
    createdAt: new Date().toISOString()
  };

  reports.unshift(newReport);
  saveReports();

  $("reportForm").reset();

  if ($("myPhone")) {
    $("myPhone").value = phone;
  }

  currentTab = "active";
  updateTabs();
  renderBrowse();
  renderMyReports();

  showMessage("reportMessage", "Your report has been published successfully!");

  $("browse")?.scrollIntoView({ behavior: "smooth" });
});

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

function showMessage(id, message, error = false) {
  const element = $(id);
  if (!element) return;

  element.textContent = message;
  element.style.color = error ? "#c62828" : "#16803c";

  setTimeout(() => {
    element.textContent = "";
  }, 5000);
}

// MY REPORTS
$("findReportsBtn")?.addEventListener("click", renderMyReports);

$("myPhone")?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    renderMyReports();
  }
});

function renderMyReports() {
  const grid = $("myReportsGrid");
  if (!grid) return;

  const phone = normalizePhone($("myPhone")?.value || "");

  if (!phone) {
    grid.innerHTML = "";
    $("emptyMine").textContent = "Enter your WhatsApp number to find your reports.";
    $("emptyMine").removeAttribute("hidden");
    return;
  }

  const mine = reports.filter((item) => normalizePhone(item.phone) === phone);

  const filtered = mine.filter((item) => item.status === currentTab);

  grid.innerHTML = "";

  if (filtered.length === 0) {
    $("emptyMine").textContent =
      currentTab === "active"
        ? "No active reports found."
        : "No resolved reports found.";

    $("emptyMine").removeAttribute("hidden");
    return;
  }

  $("emptyMine").setAttribute("hidden", "");

  filtered.forEach((item) => {
    grid.insertAdjacentHTML("beforeend", createMyReportCard(item));
  });
}

function createMyReportCard(item) {
  const image = item.photo
    ? `<img src="${item.photo}" alt="Item photo" class="card-photo">`
    : "";

  const statusLabel = item.status === "resolved"
    ? "Resolved"
    : item.type === "lost" ? "Lost Item" : "Found Item";

  return `
    <article class="listing-card">
      ${image}

      <div class="card-content">
        <span class="status ${item.status === "resolved" ? "resolved" : item.type}">
          ${statusLabel}
        </span>

        <h3>${escapeHTML(item.name)}</h3>
        <p><strong>Location:</strong> ${escapeHTML(item.location)}</p>
        <p><strong>Date:</strong> ${formatDate(item.date)}</p>

        <div class="card-actions">
          <button class="small-btn" data-action="view" data-id="${item.id}">
            View Details
          </button>

          ${
            item.status === "active"
              ? `<button class="small-btn resolve" data-action="resolve" data-id="${item.id}">Mark as Resolved</button>`
              : ""
          }

          <button class="small-btn delete" data-action="delete" data-id="${item.id}">
            Delete
          </button>
        </div>
      </div>
    </article>
  `;
}

// TABS
document.querySelectorAll("[data-tab]").forEach((button) => {
  button.addEventListener("click", () => {
    currentTab = button.dataset.tab;
    updateTabs();
    renderMyReports();
  });
});

function updateTabs() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === currentTab);
  });
}

// ACTIONS: VIEW, RESOLVE, DELETE
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === "view") {
    showDetails(id);
  }

  if (action === "resolve") {
    resolveReport(id);
  }

  if (action === "delete") {
    deleteReport(id);
  }
});

function resolveReport(id) {
  const item = reports.find((report) => report.id === id);
  if (!item) return;

  const phone = normalizePhone($("myPhone")?.value || "");

  if (phone !== normalizePhone(item.phone)) {
    alert("Please enter the WhatsApp number used when creating this report.");
    return;
  }

  if (!confirm("Are you sure you want to mark this report as resolved?")) {
    return;
  }

  item.status = "resolved";
  item.resolvedAt = new Date().toISOString();

  saveReports();
  renderBrowse();
  renderMyReports();
}

function deleteReport(id) {
  const item = reports.find((report) => report.id === id);
  if (!item) return;

  const phone = normalizePhone($("myPhone")?.value || "");

  if (phone !== normalizePhone(item.phone)) {
    alert("Please enter the WhatsApp number used when creating this report.");
    return;
  }

  if (!confirm("Are you sure you want to delete this report permanently?")) {
    return;
  }

  reports = reports.filter((report) => report.id !== id);

  saveReports();
  renderBrowse();
  renderMyReports();
}

// DETAILS MODAL
function showDetails(id) {
  const item = reports.find((report) => report.id === id);
  if (!item) return;

  const modal = $("itemModal");
  const content = $("modalContent");

  if (!modal || !content) return;

  const image = item.photo
    ? `<img src="${item.photo}" alt="Item photo" class="modal-photo">`
    : "";

  content.innerHTML = `
    ${image}
    <h2>${escapeHTML(item.name)}</h2>

    <p><strong>Report Type:</strong> ${item.type === "lost" ? "Lost Item" : "Found Item"}</p>
    <p><strong>Category:</strong> ${escapeHTML(item.category)}</p>
    <p><strong>Location:</strong> ${escapeHTML(item.location)}</p>
    <p><strong>Date:</strong> ${formatDate(item.date)}</p>
    <p><strong>Reported by:</strong> ${escapeHTML(item.reporter)}</p>
    <p><strong>Description:</strong> ${escapeHTML(item.description)}</p>
    <p><strong>Status:</strong> ${item.status === "resolved" ? "Resolved" : "Active"}</p>

    ${
      item.status === "active"
        ? `<a class="small-btn whatsapp" href="${whatsappLink(item.phone, `Hi, saya ingin bertanya tentang laporan ${item.name}.`)}" target="_blank" rel="noopener">Contact via WhatsApp</a>`
        : ""
    }
  `;

  modal.removeAttribute("hidden");
}

$("closeModal")?.addEventListener("click", () => {
  $("itemModal")?.setAttribute("hidden", "");
});

$("itemModal")?.addEventListener("click", (event) => {
  if (event.target === $("itemModal")) {
    $("itemModal").setAttribute("hidden", "");
  }
});

// SEARCH AND FILTER
$("searchInput")?.addEventListener("input", renderBrowse);
$("categoryFilter")?.addEventListener("change", renderBrowse);
$("statusFilter")?.addEventListener("change", renderBrowse);

// SMART QR
$("buyQrBtn")?.addEventListener("click", openQrForm);

function openQrForm() {
  const modal = $("itemModal");
  const content = $("modalContent");

  if (!modal || !content) return;

  let profile = {};

  try {
    profile = JSON.parse(localStorage.getItem(QR_KEY)) || {};
  } catch {
    profile = {};
  }

  content.innerHTML = `
    <h2>Smart QR – Demo</h2>
    <p>Create your personal QR contact page. This is a demonstration feature with a sample price of RM5. No actual payment will be made.</p>

    <form id="qrForm">
      <label for="qrName">Your Name</label>
      <input id="qrName" type="text" value="${escapeHTML(profile.name || "")}" required>

      <label for="qrPhone">WhatsApp Number</label>
      <input id="qrPhone" type="tel" value="${escapeHTML(profile.phone || "")}" placeholder="0123456789" required>

      <label for="qrNote">Short Message</label>
      <textarea id="qrNote" rows="3">${escapeHTML(profile.note || "Please contact me if you have found my item.")}</textarea>

      <p><strong>Demo Price: RM5</strong></p>
      <button type="submit" class="small-btn">Generate My QR</button>
    </form>

    <div id="qrResult" class="qr-output"></div>
  `;

  modal.removeAttribute("hidden");

  $("qrForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = $("qrName").value.trim();
    const phone = normalizePhone($("qrPhone").value);
    const note = $("qrNote").value.trim();

    if (!validPhone(phone)) {
      alert("Please enter a valid WhatsApp number.");
      return;
    }

    const newProfile = { name, phone, note };

    localStorage.setItem(QR_KEY, JSON.stringify(newProfile));

    generateQr(newProfile);
  });
}

function generateQr(profile) {
  const result = $("qrResult");
  if (!result) return;

  if (typeof QRCode === "undefined") {
    result.textContent = "QR service is unavailable. Please check your internet connection.";
    return;
  }

  const ownerData = btoa(unescape(encodeURIComponent(JSON.stringify(profile))));
  const ownerUrl = `${location.origin}${location.pathname}?owner=${encodeURIComponent(ownerData)}`;

  result.innerHTML = `
    <h3>Your Personal QR Code</h3>
    <div id="qrCanvas"></div>
    <p>Scan this QR code to open your contact page.</p>
    <button type="button" class="small-btn" id="downloadQr">Download QR</button>
    <button type="button" class="small-btn" id="copyQr">Copy Link</button>
    <p><small>Note: Publish the website before scanning the QR code on another device.</small></p>
  `;

  new QRCode($("qrCanvas"), {
    text: ownerUrl,
    width: 200,
    height: 200
  });

  $("downloadQr")?.addEventListener("click", () => {
    const canvas = $("qrCanvas")?.querySelector("canvas");
    const image = $("qrCanvas")?.querySelector("img");

    const dataUrl = canvas
      ? canvas.toDataURL("image/png")
      : image?.src;

    if (!dataUrl) {
      alert("QR image is not ready yet.");
      return;
    }

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "cofind-personal-qr.png";
    link.click();
  });

  $("copyQr")?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(ownerUrl);
      alert("QR link copied!");
    } catch {
      prompt("Copy your QR link:", ownerUrl);
    }
  });
}

// QR OWNER CONTACT PAGE
function loadOwnerPage() {
  const params = new URLSearchParams(location.search);
  const ownerData = params.get("owner");

  if (!ownerData) return;

  try {
    currentOwner = JSON.parse(decodeURIComponent(escape(atob(ownerData))));
  } catch {
    return;
  }

  $("header")?.setAttribute("hidden", "");
  $("mainContent")?.setAttribute("hidden", "");
  $("ownerPage")?.removeAttribute("hidden");

  if ($("ownerIntro")) {
    $("ownerIntro").innerHTML = `
      <h2>${escapeHTML(currentOwner.name || "CoFind User")}</h2>
      <p>${escapeHTML(currentOwner.note || "Please contact me if you have found my item.")}</p>
    `;
  }

  $("ownerContactForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const finderName = $("finderName").value.trim();
    const finderPhone = normalizePhone($("finderPhone").value);
    const finderMessage = $("finderMessage").value.trim();

    if (!validPhone(finderPhone)) {
      showMessage("ownerMessage", "Please enter a valid WhatsApp number.", true);
      return;
    }

    const message =
      `Hello ${currentOwner.name || ""}, my name is ${finderName}. ` +
      `My WhatsApp number is ${finderPhone}. ${finderMessage}`;

    window.open(whatsappLink(currentOwner.phone, message), "_blank");
  });
}

// INITIAL LOAD
renderBrowse();
renderMyReports();
loadOwnerPage();