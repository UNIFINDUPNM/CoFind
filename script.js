
const $ = (id) => document.getElementById(id);

const REPORTS_KEY = "cofind_reports_paid_v1";
const OWNER_KEY = "cofind_owner_paid_v1";
const QR_KEY = "cofind_qr_paid_v1";

let reports = JSON.parse(localStorage.getItem(REPORTS_KEY) || "[]");

function saveReports() {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#039;"
  })[char]);
}

function formatDate(value) {
  if (!value) return "Date not stated";
  const date = new Date(value + "T00:00:00");
  return Number.isNaN(date.getTime())
    ? escapeHTML(value)
    : date.toLocaleDateString("en-MY", {
        day: "numeric", month: "short", year: "numeric"
      });
}

function makeId() {
  return "item-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function createItemCard(item, showDelete = false) {
  const statusClass = item.type === "Found" ? "found" : "";
  const image = item.photo
    ? `<img src="${item.photo}" alt="${escapeHTML(item.name)}">`
    : "";

  return `
    <article class="item-card">
      ${image}
      <div class="item-card-body">
        <div class="item-meta">
          <span class="status ${statusClass}">${escapeHTML(item.type)}</span>
          <span class="category-tag">${escapeHTML(item.category)}</span>
        </div>
        <h3>${escapeHTML(item.name)}</h3>
        <p>📍 ${escapeHTML(item.location)}</p>
        <p>📅 ${formatDate(item.date)}</p>
        <div class="card-actions">
          <button class="small-btn" type="button" data-view="${escapeHTML(item.id)}">View Details</button>
          ${showDelete ? `<button class="small-btn delete" type="button" data-delete="${escapeHTML(item.id)}">Delete</button>` : ""}
        </div>
      </div>
    </article>
  `;
}

function renderBrowse() {
  const keyword = $("searchInput").value.trim().toLowerCase();
  const category = $("categoryFilter").value;
  const status = $("statusFilter").value;

  const filtered = reports.filter(item => {
    const matchesKeyword =
      `${item.name} ${item.location} ${item.description}`.toLowerCase().includes(keyword);
    const matchesCategory = !category || item.category === category;
    const matchesStatus = !status || item.type === status;
    return matchesKeyword && matchesCategory && matchesStatus;
  });

  $("listingGrid").innerHTML = filtered.map(item => createItemCard(item)).join("");
  $("emptyBrowse").hidden = filtered.length > 0;
}

function renderMyReports() {
  const email = $("myEmail").value.trim().toLowerCase();

  if (!email) {
    $("myReportsGrid").innerHTML = "";
    $("emptyMine").textContent = "Enter your email to view your reports.";
    $("emptyMine").hidden = false;
    return;
  }

  const mine = reports.filter(item =>
    item.email.toLowerCase() === email
  );

  $("myReportsGrid").innerHTML = mine.map(item => createItemCard(item, true)).join("");
  $("emptyMine").textContent = mine.length
    ? ""
    : "No reports found for this email address.";
  $("emptyMine").hidden = mine.length > 0;
}

function showItemDetails(id) {
  const item = reports.find(report => report.id === id);
  if (!item) return;

  $("modalContent").innerHTML = `
    ${item.photo ? `<img src="${item.photo}" alt="${escapeHTML(item.name)}">` : ""}
    <span class="status ${item.type === "Found" ? "found" : ""}">${escapeHTML(item.type)}</span>
    <h2>${escapeHTML(item.name)}</h2>
    <p><strong>Category:</strong> ${escapeHTML(item.category)}</p>
    <p><strong>Location:</strong> ${escapeHTML(item.location)}</p>
    <p><strong>Date:</strong> ${formatDate(item.date)}</p>
    <p><strong>Description:</strong><br>${escapeHTML(item.description)}</p>
    <p><strong>Reported by:</strong> ${escapeHTML(item.reporter)}</p>
    <p><strong>Contact:</strong> <a href="mailto:${encodeURIComponent(item.email)}">${escapeHTML(item.email)}</a></p>
  `;

  $("itemModal").classList.add("show");
  $("itemModal").setAttribute("aria-hidden", "false");
}

function deleteItem(id) {
  const item = reports.find(report => report.id === id);
  if (!item) return;

  const confirmed = confirm(
    `Are you sure you want to delete "${item.name}"?\n\nThis action cannot be undone.`
  );

  if (!confirmed) return;

  reports = reports.filter(report => report.id !== id);
  saveReports();
  renderBrowse();
  renderMyReports();

  alert("Your report has been deleted successfully.");
}

function handleCardAction(event) {
  const viewButton = event.target.closest("[data-view]");
  const deleteButton = event.target.closest("[data-delete]");

  if (viewButton) showItemDetails(viewButton.dataset.view);
  if (deleteButton) deleteItem(deleteButton.dataset.delete);
}

async function readPhoto(file) {
  if (!file) return "";
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file.");
  }
  if (file.size > 700 * 1024) {
    throw new Error("Image size must be 700KB or less.");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });
}

// Submit a free community report
$("reportForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const button = event.submitter;
  button.disabled = true;
  button.textContent = "Publishing...";

  try {
    const photo = await readPhoto($("itemPhoto").files[0]);

    const item = {
      id: makeId(),
      type: $("reportType").value,
      name: $("itemName").value.trim(),
      category: $("itemCategory").value,
      location: $("itemLocation").value.trim(),
      date: $("itemDate").value,
      reporter: $("reporterName").value.trim(),
      email: $("reporterEmail").value.trim().toLowerCase(),
      description: $("itemDescription").value.trim(),
      photo,
      createdAt: new Date().toISOString()
    };

    reports.unshift(item);
    saveReports();

    $("reportForm").reset();
    $("reportMessage").textContent = "Your report has been published successfully!";
    renderBrowse();

    $("myEmail").value = item.email;
    renderMyReports();

    document.querySelector("#browse").scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    $("reportMessage").textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Publish Report";
  }
});

// Search and filter
["searchInput", "categoryFilter", "statusFilter"].forEach(id => {
  $(id).addEventListener("input", renderBrowse);
});

$("findReportsBtn").addEventListener("click", renderMyReports);
$("myEmail").addEventListener("keydown", event => {
  if (event.key === "Enter") renderMyReports();
});

// View and delete buttons
$("listingGrid").addEventListener("click", handleCardAction);
$("myReportsGrid").addEventListener("click", handleCardAction);

// Close item details modal
$("closeModal").addEventListener("click", () => {
  $("itemModal").classList.remove("show");
  $("itemModal").setAttribute("aria-hidden", "true");
});

$("itemModal").addEventListener("click", event => {
  if (event.target === $("itemModal")) {
    $("itemModal").classList.remove("show");
    $("itemModal").setAttribute("aria-hidden", "true");
  }
});

// Mobile navigation
$("menuToggle").addEventListener("click", () => {
  $("mainNav").classList.toggle("open");
});

$("mainNav").querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => $("mainNav").classList.remove("open"));
});

// Smart QR demo purchase
$("buyQrBtn").addEventListener("click", () => {
  const purchased = localStorage.getItem(QR_KEY) === "true";

  if (!purchased) {
    const confirmPurchase = confirm(
      "Get your personal Smart QR for the demo price of RM5?\n\nThis is a demo only. No real payment will be collected."
    );
    if (!confirmPurchase) return;

    localStorage.setItem(QR_KEY, "true");
  }

  showOwnerSetup();
});

function showOwnerSetup() {
  const owner = JSON.parse(localStorage.getItem(OWNER_KEY) || "null");

  $("modalContent").innerHTML = `
    <h2>Set Up Your Personal Smart QR</h2>
    <p>Enter your details to create your personal owner contact page.</p>
    <form id="ownerSetupForm">
      <label>Your Name
        <input id="ownerName" required maxlength="70" value="${escapeHTML(owner?.name || "")}">
      </label><br>
      <label>Your Email
        <input id="ownerEmail" type="email" required value="${escapeHTML(owner?.email || "")}">
      </label><br>
      <label>Short Message
        <textarea id="ownerNote" rows="3" placeholder="Example: Please contact me if you find my belongings.">${escapeHTML(owner?.note || "")}</textarea>
      </label><br>
      <button class="btn btn-red" type="submit">Generate My QR</button>
    </form>
    <div id="qrResult"></div>
  `;

  $("itemModal").classList.add("show");
  $("itemModal").setAttribute("aria-hidden", "false");

  $("ownerSetupForm").addEventListener("submit", event => {
    event.preventDefault();

    const profile = {
      name: $("ownerName").value.trim(),
      email: $("ownerEmail").value.trim(),
      note: $("ownerNote").value.trim()
    };

    localStorage.setItem(OWNER_KEY, JSON.stringify(profile));
    generateOwnerQR(profile);
  });
}

function generateOwnerQR(profile) {
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(profile))));
  const contactUrl = new URL(window.location.href);
  contactUrl.search = "";
  contactUrl.hash = "";
  contactUrl.searchParams.set("owner", encoded);

  const result = $("qrResult");
  result.innerHTML = `
    <h3>Your Smart QR is ready!</h3>
    <div id="qrCode" class="qr-output"></div>
    <p>Save this QR code and attach it to your belongings.</p>
    <button class="btn btn-navy" id="downloadQr" type="button">Download QR Code</button>
    <button class="small-btn" id="copyQrLink" type="button">Copy Contact Link</button>
  `;

  if (typeof QRCode === "undefined") {
    result.insertAdjacentHTML("beforeend",
      "<p>QR generator could not load. Please check your internet connection and try again.</p>");
    return;
  }

  new QRCode($("qrCode"), {
    text: contactUrl.href,
    width: 210,
    height: 210,
    correctLevel: QRCode.CorrectLevel.M
  });

  $("downloadQr").addEventListener("click", () => {
    const canvas = $("qrCode").querySelector("canvas");
    const image = $("qrCode").querySelector("img");
    const dataUrl = canvas
      ? canvas.toDataURL("image/png")
      : image?.src;

    if (!dataUrl) {
      alert("QR code is not ready yet. Please try again.");
      return;
    }

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "CoFind-SmartQR.png";
    link.click();
  });

  $("copyQrLink").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(contactUrl.href);
      alert("Contact link copied!");
    } catch {
      prompt("Copy this contact link:", contactUrl.href);
    }
  });
}

// Owner contact page opened when someone scans a Smart QR
function loadOwnerPage() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("owner");

  if (!encoded) return;

  try {
    const profile = JSON.parse(decodeURIComponent(escape(atob(encoded))));

    document.querySelector("main").hidden = true;
    document.querySelector(".header").hidden = true;
    document.querySelector(".footer").hidden = true;
    $("ownerPage").hidden = false;

    $("ownerIntro").textContent =
      `${profile.name} has a CoFind Smart QR. ${profile.note || "Please use this form to contact the owner."}`;

    $("ownerContactForm").addEventListener("submit", event => {
      event.preventDefault();

      const finderName = $("finderName").value.trim();
      const finderEmail = $("finderEmail").value.trim();
      const message = $("finderMessage").value.trim();

      const subject = encodeURIComponent("CoFind - Someone scanned your Smart QR");
      const body = encodeURIComponent(
        `Hello ${profile.name},\n\nSomeone has contacted you through your CoFind Smart QR.\n\nName: ${finderName}\nEmail: ${finderEmail}\nMessage: ${message}`
      );

      $("ownerMessage").textContent =
        "Your email app will open so you can send the message to the owner.";

      window.location.href =
        `mailto:${encodeURIComponent(profile.email)}?subject=${subject}&body=${body}`;
    });
  } catch {
    alert("This Smart QR contact link is invalid.");
  }
}

// Initial page setup
renderBrowse();
renderMyReports();
loadOwnerPage();
/
