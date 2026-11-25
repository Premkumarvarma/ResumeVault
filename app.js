
const DB_NAME = "ResumeVaultDB";
const STORE = "candidates";
let db;

const $ = (id) => document.getElementById(id);

// Open IndexedDB
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE)) {
        const store = database.createObjectStore(STORE, {
          keyPath: "id",
          autoIncrement: true
        });

        store.createIndex("name", "name", { unique: false });
        store.createIndex("domain", "domain", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Database transaction
function transaction(mode = "readonly") {
  return db.transaction(STORE, mode).objectStore(STORE);
}

// Get all candidates
function getAll() {
  return new Promise((resolve, reject) => {
    const req = transaction().getAll();

    req.onsuccess = () => {
      resolve(req.result.sort((a, b) => b.createdAt - a.createdAt));
    };

    req.onerror = () => reject(req.error);
  });
}

// Save candidate
function save(candidate) {
  return new Promise((resolve, reject) => {
    const req = transaction("readwrite").add(candidate);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Delete candidate
function remove(id) {
  return new Promise((resolve, reject) => {
    const req = transaction("readwrite").delete(Number(id));

    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
}

// Format date
function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

// Prevent HTML injection
function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

// Render candidate list
async function render() {
  const all = await getAll();

  const term = $("searchInput").value.trim().toLowerCase();
  const selectedDomain = $("domainFilter").value;

  // Search by name, domain, experience and location
  const filtered = all.filter(c => {
    const matchesSearch =
      !term ||
      (c.name || "").toLowerCase().includes(term) ||
      (c.domain || "").toLowerCase().includes(term) ||
      (c.experience || "").toLowerCase().includes(term) ||
      (c.location || "").toLowerCase().includes(term);

    const matchesDomain =
      !selectedDomain || c.domain === selectedDomain;

    return matchesSearch && matchesDomain;
  });

  // Dashboard statistics
  $("totalCount").textContent = all.length;

  $("domainCount").textContent =
    new Set(all.map(c => c.domain)).size;

  $("recentCount").textContent =
    all.filter(c => Date.now() - c.createdAt < 7 * 24 * 60 * 60 * 1000).length;

  $("resultCount").textContent =
    `${filtered.length} record${filtered.length === 1 ? "" : "s"}`;

  $("footerText").textContent =
    `Showing ${filtered.length} of ${all.length} candidates`;

  // Domain filter
  const current = $("domainFilter").value;

  const domains = [...new Set(all.map(c => c.domain))].sort();

  $("domainFilter").innerHTML =
    '<option value="">All domains</option>' +
    domains.map(d =>
      `<option value="${safeText(d)}">${safeText(d)}</option>`
    ).join("");

  $("domainFilter").value =
    domains.includes(current) ? current : "";

  // Candidate table with Experience and Location
  $("candidateRows").innerHTML = filtered.map(c => `
    <tr>
      <td>${safeText(c.name)}</td>

      <td>
        <span class="domain-tag">${safeText(c.domain)}</span>
      </td>

      <td>${safeText(c.experience || "Not specified")}</td>

      <td>${safeText(c.location || "Not specified")}</td>

      <td>
        <span class="file-name" title="${safeText(c.fileName)}">
          ${safeText(c.fileName)}
        </span>
      </td>

      <td>${formatDate(c.createdAt)}</td>

      <td>
        <div class="action-group">
          <button class="action-btn"
            data-action="view"
            data-id="${c.id}">
            View
          </button>

          <button class="action-btn"
            data-action="download"
            data-id="${c.id}">
            ↓
          </button>

          <button class="action-btn delete"
            data-action="delete"
            data-id="${c.id}">
            Delete
          </button>
        </div>
      </td>
    </tr>
  `).join("");

  $("emptyState").style.display =
    filtered.length ? "none" : "block";

  $("candidateRows").parentElement.style.display =
    filtered.length ? "table" : "none";
}

// Download resume
function downloadFile(candidate) {
  const url = URL.createObjectURL(candidate.file);

  const a = document.createElement("a");
  a.href = url;
  a.download = candidate.fileName;

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Preview resume
async function showPreview(candidate) {
  $("previewTitle").textContent =
    `${candidate.name} — ${candidate.fileName}`;

  const content = $("previewContent");
  content.innerHTML = "";

  $("previewModal").classList.add("open");
  $("previewModal").setAttribute("aria-hidden", "false");

  const type = candidate.file.type;

  if (
    type === "application/pdf" ||
    candidate.fileName.toLowerCase().endsWith(".pdf")
  ) {
    const url = URL.createObjectURL(candidate.file);

    const iframe = document.createElement("iframe");
    iframe.src = url;

    iframe.onload = () => {
      content.dataset.url = url;
    };

    content.appendChild(iframe);

  } else {
    const note = document.createElement("div");

    note.className = "preview-note";

    note.innerHTML =
      "Browser preview is available for PDF resumes. " +
      "For this Word document, use <strong>Download</strong> " +
      "to open it in Microsoft Word or another compatible app.";

    content.appendChild(note);
  }
}

// Close preview
function closePreview() {
  const url = $("previewContent").dataset.url;

  if (url) {
    URL.revokeObjectURL(url);
  }

  $("previewContent").dataset.url = "";
  $("previewContent").innerHTML = "";

  $("previewModal").classList.remove("open");
  $("previewModal").setAttribute("aria-hidden", "true");
}

// Add candidate form
$("candidateForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = $("personName").value.trim();
  const domain = $("domain").value.trim();
  const experience = $("experience").value.trim();
  const location = $("location").value.trim();
  const file = $("resumeFile").files[0];

  if (!name || !domain || !experience || !location || !file) {
    $("formMessage").textContent =
      "Please complete all fields and upload a resume.";
    return;
  }

  // Validate file type
  const allowed = /\.(pdf|doc|docx)$/i.test(file.name);

  if (!allowed) {
    $("formMessage").textContent =
      "Please upload a PDF, DOC or DOCX file.";
    return;
  }

  // Maximum file size: 15 MB
  if (file.size > 15 * 1024 * 1024) {
    $("formMessage").textContent =
      "File is too large. Maximum size is 15 MB.";
    return;
  }

  try {
    await save({
      name,
      domain,
      experience,
      location,
      fileName: file.name,
      file,
      createdAt: Date.now()
    });

    $("candidateForm").reset();

    $("fileLabel").textContent =
      "Choose a resume to upload";

    $("formMessage").textContent =
      "Candidate saved successfully.";

    await render();

  } catch (error) {
    $("formMessage").textContent =
      "Could not save candidate. Please try again.";

    console.error(error);
  }
});

// Resume file selection
$("resumeFile").addEventListener("change", () => {
  $("fileLabel").textContent =
    $("resumeFile").files[0]?.name ||
    "Choose a resume to upload";
});

// Search and domain filter
$("searchInput").addEventListener("input", render);
$("domainFilter").addEventListener("change", render);

// Candidate actions
$("candidateRows").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const candidate = (await getAll()).find(
    c => c.id === Number(button.dataset.id)
  );

  if (!candidate) return;

  if (button.dataset.action === "view") {
    await showPreview(candidate);
  }

  if (button.dataset.action === "download") {
    downloadFile(candidate);
  }

  if (
    button.dataset.action === "delete" &&
    confirm(`Delete ${candidate.name} and their resume?`)
  ) {
    await remove(candidate.id);
    await render();
  }
});

// Close preview events
$("closePreview").addEventListener("click", closePreview);

$("previewModal").addEventListener("click", event => {
  if (event.target === $("previewModal")) {
    closePreview();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closePreview();
  }
});

// Export candidate list to CSV
$("exportBtn").addEventListener("click", async () => {
  const all = await getAll();

  const rows = [
    [
      "Person name",
      "Domain",
      "Experience",
      "Location",
      "Resume file",
      "Date added"
    ],

    ...all.map(c => [
      c.name,
      c.domain,
      c.experience || "Not specified",
      c.location || "Not specified",
      c.fileName,
      formatDate(c.createdAt)
    ])
  ];

  const csv = rows.map(row =>
    row.map(value =>
      `"${String(value ?? "").replace(/"/g, '""')}"`
    ).join(",")
  ).join("\r\n");

  const blob = new Blob(
    ["\uFEFF", csv],
    { type: "text/csv;charset=utf-8" }
  );

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "resume-candidates.csv";

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// Initialize application
(async function init() {
  try {
    db = await openDatabase();
    await render();

  } catch (error) {
    alert(
      "Your browser could not open local storage. " +
      "Please use a recent version of Chrome, Edge or Firefox."
    );

    console.error(error);
  }
})();
