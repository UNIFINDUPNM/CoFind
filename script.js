
const REPORT_KEY = "cofind_reports_paid_v1";
const OWNER_KEY = "cofind_owner_paid_v1";
const PAID_KEY = "cofind_qr_paid_v1";

const $ = id => document.getElementById(id);

const reports = () =>
  JSON.parse(localStorage.getItem(REPORT_KEY) || "[]");

const saveReports = data =>
  localStorage.setItem(REPORT_KEY, JSON.stringify(data));

let kind = "Lost";
let scannedOwner = null;

const id = prefix =>
  prefix + Date.now().toString(36).toUpperCase();

const esc = value =>
  String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));


/* PAGE NAVIGATION */

function page(name) {

  document.querySelectorAll(".page").forEach(section => {
    section.classList.remove("active");
  });

  $(name).classList.add("active");

  $("nav").classList.remove("open");

  if (name === "home") home();
  if (name === "browse") browse();
  if (name === "smartqr") qrState();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

document.querySelectorAll("[data-page]").forEach(button => {

  button.addEventListener("click", event => {

    event.preventDefault();

    page(button.dataset.page);

  });

});

$("menuBtn").onclick = () =>
  $("nav").classList.toggle("open");


/* HOME PAGE */

function home() {

  let data = reports();

  $("total").textContent = data.length;

  $("lost").textContent =
    data.filter(item => item.status === "Lost").length;

  $("found").textContent =
    data.filter(item => item.status === "Found").length;

  $("returned").textContent =
    data.filter(item => item.status === "Returned").length;

  cards(
    "homeListings",
    data.slice().reverse().slice(0, 3)
  );

}


/* DISPLAY ITEM CARDS */

function cards(target, items) {

  let container = $(target);

  if (!items.length) {

    container.innerHTML = `
      <div class="empty">
        No reports yet.
        Be the first to post a report.
      </div>
    `;

    return;
  }

  container.innerHTML = items.map(item => `

    <article class="card" data-id="${esc(item.id)}">

      ${
        item.photo
        ? `<img src="${item.photo}" alt="">`
        : `<div class="placeholder">📦</div>`
      }

      <div class="cardinfo">

        <span class="tag ${esc(item.status)}">
          ${esc(item.status)}
        </span>

        <h3>${esc(item.name)}</h3>

        <p>📍 ${esc(item.location)}</p>

        <p>
          ${esc(item.category)}
          ·
          ${esc(item.date)}
        </p>

      </div>

    </article>

  `).join("");

  container.querySelectorAll("[data-id]").forEach(card => {

    card.onclick = () => detail(card.dataset.id);

  });

}


/* BROWSE AND FILTER */

function browse() {

  let term = $("search").value.toLowerCase();

  let status = $("status").value;

  let category = $("category").value;

  let filtered = reports().filter(item => {

    let matchSearch =
      item.name.toLowerCase().includes(term) ||
      item.location.toLowerCase().includes(term);

    let matchStatus =
      status === "all" || item.status === status;

    let matchCategory =
      category === "all" || item.category === category;

    return matchSearch && matchStatus && matchCategory;

  });

  cards("allListings", filtered.reverse());

}

$("search").oninput = browse;
$("status").onchange = browse;
$("category").onchange = browse;


/* ITEM DETAILS */

function detail(key) {

  let item = reports().find(x => x.id === key);

  if (!item) return;

  $("modalBody").innerHTML = `

    <h2>${esc(item.name)}</h2>

    <p><b>Status:</b> ${esc(item.status)}</p>

    <p><b>Category:</b> ${esc(item.category)}</p>

    <p><b>Location:</b> ${esc(item.location)}</p>

    <p><b>Date:</b> ${esc(item.date)}</p>

    <p>${esc(item.description)}</p>

    <p>
      <b>Posted by:</b>
      ${esc(item.reporterName)}
    </p>

    <p>
      <b>Contact:</b>
      <a href="mailto:${encodeURIComponent(item.email)}">
        ${esc(item.email)}
      </a>
    </p>

  `;

  $("modal").classList.add("show");

}

$("close").onclick = () =>
  $("modal").classList.remove("show");

$("modal").onclick = event => {

  if (event.target === $("modal")) {
    $("modal").classList.remove("show");
  }

};


/* REPORT LOST OR FOUND */

$("lostTab").onclick = () => setKind("Lost");

$("foundTab").onclick = () => setKind("Found");

function setKind(value) {

  kind = value;

  $("lostTab").classList.toggle("active", value === "Lost");

  $("foundTab").classList.toggle("active", value === "Found");

}


function readFile(file) {

  return new Promise((resolve, reject) => {

    let reader = new FileReader();

    reader.onload = () => resolve(reader.result);

    reader.onerror = reject;

    reader.readAsDataURL(file);

  });

}


$("reportForm").onsubmit = async event => {

  event.preventDefault();

  let file = $("itemPhoto").files[0];

  let photo = "";

  if (file) {

    if (file.size > 700 * 1024) {

      alert("Please use an image smaller than 700KB.");

      return;

    }

    photo = await readFile(file);

  }

  let item = {

    id: id("CF"),

    status: kind,

    name: $("itemName").value.trim(),

    category: $("itemCategory").value,

    location: $("itemLocation").value.trim(),

    date: $("itemDate").value,

    description: $("itemDescription").value.trim(),

    photo: photo,

    reporterName: $("reporterName").value.trim(),

    email: $("reporterEmail").value.trim()

  };

  let data = reports();

  data.push(item);

  saveReports(data);

  alert("Your free report has been published.");

  event.target.reset();

  page("home");

};


/* MY REPORTS */

$("loadMine").onclick = () => {

  let email = $("myEmail").value.trim().toLowerCase();

  if (!email) {

    alert("Enter the email used in your report.");

    return;

  }

  let mine = reports().filter(item =>
    item.email.toLowerCase() === email
  );

  cards("myListings", mine.reverse());

};


/* SMART QR PURCHASE - DEMO ONLY */

$("buy").onclick = () => {

  let confirmPurchase = confirm(
    "Simulate a one-time RM5.00 purchase? No real payment will be taken."
  );

  if (!confirmPurchase) return;

  localStorage.setItem(
    PAID_KEY,
    JSON.stringify({
      paid: true,
      amount: 5
    })
  );

  $("ownerSetup").classList.remove("hidden");

  $("qrResult").classList.add("hidden");

  $("ownerSetup").scrollIntoView({
    behavior: "smooth"
  });

  alert(
    "Demo purchase successful. Complete your profile to create your QR."
  );

};


/* CHECK PURCHASE STATUS */

function qrState() {

  let paid = JSON.parse(
    localStorage.getItem(PAID_KEY) || "null"
  );

  let owner = JSON.parse(
    localStorage.getItem(OWNER_KEY) || "null"
  );

  $("ownerSetup").classList.toggle(
    "hidden",
    !paid?.paid || !!owner
  );

  $("qrResult").classList.toggle(
    "hidden",
    !paid?.paid || !owner
  );

  if (paid?.paid && owner) {
    makeQR(owner);
  }

}


/* REGISTER OWNER PROFILE */

$("ownerForm").onsubmit = event => {

  event.preventDefault();

  let paid = JSON.parse(
    localStorage.getItem(PAID_KEY) || "null"
  );

  if (!paid?.paid) {

    alert("Purchase Smart QR first.");

    return;

  }

  let owner = {

    id: id("OWNER"),

    name: $("ownerName").value.trim(),

    email: $("ownerEmail").value.trim(),

    message: $("ownerMessage").value.trim()

  };

  localStorage.setItem(
    OWNER_KEY,
    JSON.stringify(owner)
  );

  qrState();

};


/* GENERATE QR LINK */

function qrLink(owner) {

  let url = new URL(window.location.href);

  url.search = "";

  url.hash = "";

  url.searchParams.set(
    "owner",
    btoa(
      unescape(
        encodeURIComponent(
          JSON.stringify(owner)
        )
      )
    )
  );

  return url.href;

}


/* CREATE QR CODE */

function makeQR(owner) {

  if (typeof QRCode === "undefined") {

    alert("QR generator did not load. Check your internet connection.");

    return;

  }

  $("qrcode").innerHTML = "";

  new QRCode($("qrcode"), {

    text: qrLink(owner),

    width: 190,

    height: 190,

    colorDark: "#101d3a",

    colorLight: "#ffffff",

    correctLevel: QRCode.CorrectLevel.H

  });

  $("qrName").textContent = owner.name;

  $("qrId").textContent =
    "PERSONAL QR ID: " + owner.id;

}


/* DOWNLOAD QR */

$("download").onclick = () => {

  let canvas = $("qrcode").querySelector("canvas");

  let image = $("qrcode").querySelector("img");

  let source = canvas
    ? canvas.toDataURL("image/png")
    : image?.src;

  if (!source) {

    alert("QR is not ready.");

    return;

  }

  let link = document.createElement("a");

  link.href = source;

  link.download = "CoFind-Smart-QR.png";

  link.click();

};


/* COPY QR LINK */

$("copy").onclick = async () => {

  let owner = JSON.parse(
    localStorage.getItem(OWNER_KEY) || "null"
  );

  if (!owner) return;

  let link = qrLink(owner);

  try {

    await navigator.clipboard.writeText(link);

    alert("QR link copied.");

  } catch {

    prompt("Copy this link:", link);

  }

};


/* OPEN OWNER PAGE WHEN QR IS SCANNED */

function openOwner(encoded) {

  try {

    scannedOwner = JSON.parse(
      decodeURIComponent(
        escape(
          atob(encoded)
        )
      )
    );

    $("publicName").textContent = scannedOwner.name;

    $("publicMessage").textContent =
      scannedOwner.message ||
      "If you found an item belonging to this person, please contact them using the form below.";

    page("ownerPage");

  } catch {

    alert("Invalid Smart QR link.");

    page("home");

  }

}


/* CONTACT OWNER */

$("finderForm").onsubmit = event => {

  event.preventDefault();

  if (!scannedOwner?.email) {

    alert("Owner contact is unavailable.");

    return;

  }

  let subject = encodeURIComponent(
    "CoFind: I found your belongings"
  );

  let body = encodeURIComponent(`

Hello ${scannedOwner.name},

${$("finderText").value}

From: ${$("finderName").value}

Reply email: ${$("finderEmail").value}

Sent through CoFind Smart QR.

  `);

  location.href =
    `mailto:${encodeURIComponent(scannedOwner.email)}?subject=${subject}&body=${body}`;

};


/* INITIALIZE WEBSITE */

function init() {

  let params = new URLSearchParams(window.location.search);

  let owner = params.get("owner");

  if (owner) {

    openOwner(owner);

  } else {

    home();

    page("home");

  }

}

init();
