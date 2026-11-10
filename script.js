
// ==========================================
// COFIND - UPNM LOST & FOUND
// COMPLETE JAVASCRIPT
// ==========================================

const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "cofind_reports_v4";
const QR_KEY = "cofind_qr_profile_v1";

let reports = loadReports();
let currentTab = "active";

// ==========================================
// STORAGE
// ==========================================

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

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
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
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
}

function generateId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8);
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

function showMessage(id, message, error = false) {
  const element = $(id);
  if (!element) return;

  element.textContent = message;
  element.style.color = error ? "#c62828" : "#16804c";

  setTimeout(() => {
    element.textContent = "";
  }, 5000);
}

// ==========================================
// PAGE NAVIGATION
// ==========================================

function showPage(pageName) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  const selectedPage = $(pageName);

  if (!selectedPage) return;

  selectedPage.classList.add("active");

  document.querySelectorAll(".nav-link").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageName
    );
  });

  $("mainNav")?.classList.remove("open");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (pageName === "browse") renderBrowse();
  if (pageName === "myreports") renderMyReports();
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.addEventListener("click", event => {
    event.preventDefault();
    showPage(button.dataset.page);
  });
});

// ==========================================
// MOBILE MENU
// ==========================================

$("menuToggle")?.addEventListener("click", () => {
  $("mainNav")?.classList.toggle("open");
});

// ==========================================
// BROWSE ITEMS
// ==========================================

function renderBrowse() {
  const grid = $("listingGrid");
  if (!grid) return;

  const keyword = ($("searchInput")?.value || "")
    .toLowerCase().trim();

  const category = $("categoryFilter")?.value || "";
  const status = $("statusFilter")?.value || "";

  const filtered = reports.filter(item => {
    if (item.status !== "active") return false;

    const matchesKeyword =
      !keyword ||
      [
        item.name,
        item.category,
        item.location,
        item.description
      ].some(value =>
        String(value || "").toLowerCase().includes(keyword)
      );

    const matchesCategory =
      !category || item.category === category;

    const matchesStatus =
      !status || item.type === status;

    return matchesKeyword &&
      matchesCategory &&
      matchesStatus;
  });

  grid.innerHTML = "";

  $("emptyBrowse").hidden = filtered.length > 0;

  filtered.forEach(item => {
    grid.insertAdjacentHTML(
      "beforeend",
      createBrowseCard(item)
    );
  });
}

function createBrowseCard(item) {
  const image = item.photo
    ? `<img src="${item.photo}" alt="Item photo" class="card-photo">`
    : "";

  const typeLabel =
    item.type === "lost" ? "Lost Item" : "Found Item";

  return `
    <article class="listing-card">

      ${image}

      <div class="card-content">

        <span class="status ${item.type}">
          ${typeLabel}
        </span>

        <h3>${escapeHTML(item.name)}</h3>

        <p><strong>Category:</strong>
          ${escapeHTML(item.category)}
        </p>

        <p><strong>Location:</strong>
          ${escapeHTML(item.location)}
        </p>

        <p><strong>Date:</strong>
          ${formatDate(item.date)}
        </p>

        <div class="card-actions">

          <button class="small-btn"
            data-action="view"
            data-id="${item.id}">
            View Details
          </button>

          <a class="small-btn whatsapp"
            href="${whatsappLink(
              item.phone,
              `Hi, saya ingin bertanya tentang laporan ${item.name}.`
            )}"
            target="_blank"
            rel="noopener">
            WhatsApp Owner
          </a>

        </div>
      </div>
    </article>
  `;
}

$("searchInput")?.addEventListener("input", renderBrowse);
$("categoryFilter")?.addEventListener("change", renderBrowse);
$("statusFilter")?.addEventListener("change", renderBrowse);

// ==========================================
// POST A REPORT
// ==========================================

$("reportForm")?.addEventListener("submit", async event => {
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
    showMessage(
      "reportMessage",
      "Please enter a valid WhatsApp number.",
      true
    );
    return;
  }

  let photo = "";

  if (photoFile) {
    if (!photoFile.type.startsWith("image/")) {
      showMessage(
        "reportMessage",
        "Please upload an image file.",
        true
      );
      return;
    }

    if (photoFile.size > 700 * 1024) {
      showMessage(
        "reportMessage",
        "Image size must not exceed 700 KB.",
        true
      );
      return;
    }

    try {
      photo = await readImage(photoFile);
    } catch {
      showMessage(
        "reportMessage",
        "Unable to read image. Please try again.",
        true
      );
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

  try {
    saveReports();
  } catch {
    reports.shift();

    showMessage(
      "reportMessage",
      "Storage is full. Please use a smaller image.",
      true
    );

    return;
  }

  $("reportForm").reset();

  $("myPhone").value = phone;

  currentTab = "active";
  updateTabs();

  renderBrowse();
  renderMyReports();

  showMessage(
    "reportMessage",
    "Your report has been published successfully!"
  );

  showPage("browse");
});

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

// ==========================================
// MY REPORTS
// ==========================================

$("findReportsBtn")?.addEventListener(
  "click",
  renderMyReports
);

$("myPhone")?.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    renderMyReports();
  }
});

function renderMyReports() {
  const grid = $("myReportsGrid");
  if (!grid) return;

  const phone = normalizePhone($("myPhone").value);

  if (!phone) {
    grid.innerHTML = "";

    $("emptyMine").textContent =
      "Enter your WhatsApp number to view your reports.";

    $("emptyMine").hidden = false;
    return;
  }

  const mine = reports.filter(item =>
    normalizePhone(item.phone) === phone &&
    item.status === currentTab
  );

  grid.innerHTML = "";

  if (mine.length === 0) {
    $("emptyMine").textContent =
      currentTab === "active"
        ? "No active reports found."
        : "No resolved reports found.";

    $("emptyMine").hidden = false;
    return;
  }

  $("emptyMine").hidden = true;

  mine.forEach(item => {
    grid.insertAdjacentHTML(
      "beforeend",
      createMyReportCard(item)
    );
  });
}

function createMyReportCard(item) {
  const image = item.photo
    ? `<img src="${item.photo}" alt="Item photo" class="card-photo">`
    : "";

  const label =
    item.status === "resolved"
      ? "Resolved"
      : item.type === "lost"
        ? "Lost Item"
        : "Found Item";

  return `
    <article class="listing-card">

      ${image}

      <div class="card-content">

        <span class="status ${
          item.status === "resolved"
            ? "resolved"
            : item.type
        }">
          ${label}
        </span>

        <h3>${escapeHTML(item.name)}</h3>

        <p><strong>Location:</strong>
          ${escapeHTML(item.location)}
        </p>

        <p><strong>Date:</strong>
          ${formatDate(item.date)}
        </p>

        <div class="card-actions">

          <button class="small-btn"
            data-action="view"
            data-id="${item.id}">
            View Details
          </button>

          ${
            item.status === "active"
              ? `
                <button class="small-btn resolve"
                  data-action="resolve"
                  data-id="${item.id}">
                  Mark as Resolved
                </button>
              `
              : ""
          }

          <button class="small-btn delete"
            data-action="delete"
            data-id="${item.id}">
            Delete
          </button>

        </div>
      </div>
    </article>
  `;
}

// ==========================================
// MY REPORTS TABS
// ==========================================

document.querySelectorAll("[data-tab]").forEach(button => {
  button.addEventListener("click", () => {
    currentTab = button.dataset.tab;

    updateTabs();
    renderMyReports();
  });
});

function updateTabs() {
  document.querySelectorAll("[data-tab]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.tab === currentTab
    );
  });
}

// ==========================================
// REPORT ACTIONS
// ==========================================

document.addEventListener("click", event => {
  const button = event.target.closest("[data-action]");

  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === "view") showDetails(id);
  if (action === "resolve") resolveReport(id);
  if (action === "delete") deleteReport(id);
});

function resolveReport(id) {
  const item = reports.find(report => report.id === id);

  if (!item) return;

  const phone = normalizePhone($("myPhone").value);

  if (phone !== normalizePhone(item.phone)) {
    alert(
      "Please enter the WhatsApp number used when creating this report."
    );
    return;
  }

  if (!confirm("Mark this report as resolved?")) return;

  item.status = "resolved";
  item.resolvedAt = new Date().toISOString();

  saveReports();

  renderBrowse();
  renderMyReports();
}

function deleteReport(id) {
  const item = reports.find(report => report.id === id);

  if (!item) return;

  const phone = normalizePhone($("myPhone").value);

  if (phone !== normalizePhone(item.phone)) {
    alert(
      "Please enter the WhatsApp number used when creating this report."
    );
    return;
  }

  if (!confirm("Delete this report permanently?")) return;

  reports = reports.filter(report => report.id !== id);

  saveReports();

  renderBrowse();
  renderMyReports();
}

// ==========================================
// ITEM DETAILS
// ==========================================

function showDetails(id) {
  const item = reports.find(report => report.id === id);

  if (!item) return;

  const image = item.photo
    ? `<img src="${item.photo}" class="modal-photo" alt="Item photo">`
    : "";

  $("modalContent").innerHTML = `
    ${image}

    <h2>${escapeHTML(item.name)}</h2>

    <p><strong>Report Type:</strong>
      ${item.type === "lost" ? "Lost Item" : "Found Item"}
    </p>

    <p><strong>Category:</strong>
      ${escapeHTML(item.category)}
    </p>

    <p><strong>Location:</strong>
      ${escapeHTML(item.location)}
    </p>

    <p><strong>Date:</strong>
      ${formatDate(item.date)}
    </p>

    <p><strong>Reported by:</strong>
      ${escapeHTML(item.reporter)}
    </p>

    <p><strong>Description:</strong>
      ${escapeHTML(item.description)}
    </p>

    <p><strong>Status:</strong>
      ${item.status === "resolved" ? "Resolved" : "Active"}
    </p>

    ${
      item.status === "active"
        ? `
          <a class="small-btn whatsapp"
            href="${whatsappLink(
              item.phone,
              `Hi, saya ingin bertanya tentang laporan ${item.name}.`
            )}"
            target="_blank"
            rel="noopener">
            Contact via WhatsApp
          </a>
        `
        : ""
    }
  `;

  $("itemModal").hidden = false;
}

// ==========================================
// MODAL CLOSE
// ==========================================

$("closeModal")?.addEventListener("click", () => {
  $("itemModal").hidden = true;
});

$("itemModal")?.addEventListener("click", event => {
  if (event.target === $("itemModal")) {
    $("itemModal").hidden = true;
  }
});

// ==========================================
// SMART QR - PAYMENT DEMO FIRST
// ==========================================

$("buyQrBtn")?.addEventListener("click", openQrForm);

function openQrForm() {

  $("modalContent").innerHTML = `

    <div class="payment-box">

      <p class="eyebrow">COFIND SMART QR</p>

      <h2>QR Payment</h2>

      <p>
        Scan the QR code below to proceed
        with your Smart QR registration.
      </p>

      <div class="payment-amount">
        RM5.00
      </div>

      <div id="paymentQr" class="payment-qr"></div>

      <p class="demo-note">
        DEMO PAYMENT ONLY<br>
        This QR code does not process real payments.
      </p>

      <button class="btn primary full-width"
        id="paidBtn">
        I've Paid
      </button>

    </div>
  `;

  $("itemModal").hidden = false;

  if (typeof QRCode !== "undefined") {

    new QRCode($("paymentQr"), {
      text: "COFIND DEMO PAYMENT RM5 - NO REAL TRANSACTION",
      width: 180,
      height: 180
    });

  } else {

    $("paymentQr").textContent =
      "QR service unavailable. Check your internet connection.";

  }

  $("paidBtn").addEventListener("click", () => {

    openQrRegistrationForm();

  });
}

// ==========================================
// SMART QR - REGISTRATION FORM
// ==========================================

function openQrRegistrationForm() {

  let profile = {};

  try {
    profile = JSON.parse(
      localStorage.getItem(QR_KEY)
    ) || {};
  } catch {
    profile = {};
  }

  $("modalContent").innerHTML = `

    <h2>Smart QR Registration</h2>

    <p>
      Payment demo completed.
      Enter your details to generate your personal QR.
    </p>

    <form id="qrForm">

      <label for="qrName">Your Name</label>

      <input
        id="qrName"
        value="${escapeHTML(profile.name || "")}"
        required
      >

      <label for="qrPhone">WhatsApp Number</label>

      <input
        id="qrPhone"
        type="tel"
        placeholder="0123456789"
        value="${escapeHTML(profile.phone || "")}"
        required
      >

      <label for="qrNote">Short Message</label>

      <textarea id="qrNote" rows="3">${escapeHTML(
        profile.note || "Please contact me if you have found my item."
      )}</textarea>

      <button class="btn primary full-width" type="submit">
        Generate My QR
      </button>

    </form>

    <div id="qrResult" class="qr-output"></div>

  `;

  $("qrForm").addEventListener("submit", event => {

    event.preventDefault();

    const name = $("qrName").value.trim();
    const phone = normalizePhone($("qrPhone").value);
    const note = $("qrNote").value.trim();

    if (!validPhone(phone)) {
      alert("Please enter a valid WhatsApp number.");
      return;
    }

    const newProfile = {
      name,
      phone,
      note
    };

    localStorage.setItem(
      QR_KEY,
      JSON.stringify(newProfile)
    );

    generateQr(newProfile);

  });
}

// ==========================================
// SMART QR - GENERATE PERSONAL QR
// ==========================================

function generateQr(profile) {

  const result = $("qrResult");

  if (typeof QRCode === "undefined") {
    result.textContent =
      "QR service unavailable. Please check your internet connection.";
    return;
  }

  const encoded = btoa(
    unescape(
      encodeURIComponent(JSON.stringify(profile))
    )
  );

  const ownerUrl =
    `${location.origin}${location.pathname}?owner=${encodeURIComponent(encoded)}`;

  result.innerHTML = `

    <h3>Your Personal QR Code</h3>

    <div id="qrCanvas"></div>

    <p>
      Scan this QR code to open your contact page.
    </p>

    <button type="button"
      class="small-btn"
      id="downloadQr">
      Download QR
    </button>

    <button type="button"
      class="small-btn"
      id="copyQr">
      Copy Link
    </button>

    <p>
      <small>
        Publish the website before scanning from another device.
      </small>
    </p>

  `;

  new QRCode($("qrCanvas"), {
    text: ownerUrl,
    width: 200,
    height: 200
  });

  $("downloadQr").addEventListener("click", () => {

    const canvas = $("qrCanvas").querySelector("canvas");

    if (!canvas) {
      alert("QR image is not ready yet.");
      return;
    }

    const link = document.createElement("a");

    link.href = canvas.toDataURL("image/png");
    link.download = "cofind-personal-qr.png";

    link.click();

  });

  $("copyQr").addEventListener("click", async () => {

    try {

      await navigator.clipboard.writeText(ownerUrl);

      alert("QR link copied!");

    } catch {

      prompt("Copy your QR link:", ownerUrl);

    }

  });

}

// ==========================================
// SMART QR - OWNER CONTACT PAGE
// ==========================================

function loadOwnerPage() {

  const params = new URLSearchParams(location.search);
  const ownerData = params.get("owner");

  if (!ownerData) return;

  let owner;

  try {

    owner = JSON.parse(
      decodeURIComponent(
        escape(atob(ownerData))
      )
    );

  } catch {

    $("header").hidden = true;
    document.querySelector("main").hidden = true;
    document.querySelector(".footer").hidden = true;

    $("ownerPage").hidden = false;
    $("ownerIntro").textContent = "Invalid QR contact link.";

    return;

  }

  $("header").hidden = true;
  document.querySelector("main").hidden = true;
  document.querySelector(".footer").hidden = true;

  $("ownerPage").hidden = false;

  $("ownerIntro").innerHTML = `

    <h2>${escapeHTML(owner.name || "CoFind User")}</h2>

    <p>
      ${escapeHTML(
        owner.note || "Please contact me if you have found my item."
      )}
    </p>

  `;

  $("ownerContactForm").addEventListener("submit", event => {

    event.preventDefault();

    const finderName = $("finderName").value.trim();
    const finderPhone = normalizePhone($("finderPhone").value);
    const finderMessage = $("finderMessage").value.trim();

    if (!validPhone(finderPhone)) {

      showMessage(
        "ownerMessage",
        "Please enter a valid WhatsApp number.",
        true
      );

      return;

    }

    const message =
      `Hello ${owner.name || ""}, my name is ${finderName}. ` +
      `My WhatsApp number is ${finderPhone}. ${finderMessage}`;

    window.open(
      whatsappLink(owner.phone, message),
      "_blank"
    );

  });

}

// ==========================================
// INITIALIZE WEBSITE
// ==========================================

loadOwnerPage();

renderBrowse();

renderMyReports();

updateTabs();

