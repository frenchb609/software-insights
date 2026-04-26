// State management
const state = {
  pdfList: [], // Array of {name, file}
  currentPdf: null,
  currentPage: 1,
  totalPages: 1,
  zoom: 1,
  pdfDoc: null,
  folderDirHandle: null, // Store folder handle
};

// DOM Elements
const pdfListContainer = document.getElementById("pdfList");
const selectFolderBtn = document.getElementById("selectFolderBtn");
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const canvas = document.getElementById("pdfCanvas");
const ctx = canvas.getContext("2d");
const pdfControls = document.getElementById("pdfControls");
const noSelection = document.getElementById("noSelection");
const pageNumberInput = document.getElementById("pageNumber");
const totalPagesSpan = document.getElementById("totalPages");
const currentZoomSpan = document.getElementById("currentZoom");
const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const zoomInBtn = document.getElementById("zoomIn");
const zoomOutBtn = document.getElementById("zoomOut");
const zoomResetBtn = document.getElementById("zoomReset");

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  initializeApp();
});

async function initializeApp() {
  // First, try to load PDFs from the pdf folder (for GitHub Pages and web servers)
  const pdfsLoaded = await loadPdfsFromWebFolder();
  if (pdfsLoaded) {
    return;
  }

  // If web folder loading failed, try to restore folder handle from IndexedDB (local development)
  const savedHandle = await restoreFolderHandle();

  if (savedHandle) {
    state.folderDirHandle = savedHandle;
    try {
      // Request permission to access the folder
      const permission = await savedHandle.queryPermission({ mode: "read" });
      if (permission === "granted") {
        // Auto-load PDFs from the saved folder
        await loadPdfsFromFolder();
        return;
      } else {
        // Try to request permission again
        const newPermission = await savedHandle.requestPermission({
          mode: "read",
        });
        if (newPermission === "granted") {
          await loadPdfsFromFolder();
          return;
        }
      }
    } catch (err) {
      console.log("Could not access saved folder:", err);
    }
    // If we get here, clear the saved handle
    await clearFolderHandle();
    state.folderDirHandle = null;
  }

  // If no saved handle or it failed, show the prompt
  displayPdfList(); // Show initial message
}

function setupEventListeners() {
  selectFolderBtn.addEventListener("click", selectPdfFolder);
  uploadBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", handleFileSelection);
  prevPageBtn.addEventListener("click", previousPage);
  nextPageBtn.addEventListener("click", nextPage);
  pageNumberInput.addEventListener("keypress", handlePageInput);
  pageNumberInput.addEventListener("change", handlePageChange);
  zoomInBtn.addEventListener("click", () => changeZoom(1.2));
  zoomOutBtn.addEventListener("click", () => changeZoom(0.8));
  zoomResetBtn.addEventListener("click", resetZoom);
}

// IndexedDB helper functions
async function saveFolderHandle(handle) {
  try {
    const db = await openDatabase();
    const tx = db.transaction("folders", "readwrite");
    const store = tx.objectStore("folders");
    await store.put({ id: "pdfFolder", handle: handle });
    console.log("Folder handle saved");
  } catch (error) {
    console.error("Error saving folder handle:", error);
  }
}

async function restoreFolderHandle() {
  try {
    const db = await openDatabase();
    const tx = db.transaction("folders", "readonly");
    const store = tx.objectStore("folders");
    const result = await store.get("pdfFolder");
    return result ? result.handle : null;
  } catch (error) {
    console.error("Error restoring folder handle:", error);
    return null;
  }
}

async function clearFolderHandle() {
  try {
    const db = await openDatabase();
    const tx = db.transaction("folders", "readwrite");
    const store = tx.objectStore("folders");
    await store.delete("pdfFolder");
    console.log("Folder handle cleared");
  } catch (error) {
    console.error("Error clearing folder handle:", error);
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("PDFViewerDB", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("folders")) {
        db.createObjectStore("folders");
      }
    };
  });
}

// Load PDFs from web folder (GitHub Pages, web servers, etc.)
async function loadPdfsFromWebFolder() {
  try {
    // Try to fetch the PDF list from pdfs.json
    const response = await fetch("./pdf/pdfs.json");
    if (!response.ok) {
      console.log("pdfs.json not found, trying alternative methods...");
      // Try alternative: fetch from GitHub API if available
      const githubPdfs = await loadPdfsFromGitHub();
      if (githubPdfs && githubPdfs.length > 0) {
        state.pdfList = githubPdfs;
        displayPdfList();
        return true;
      }
      return false;
    }

    const pdfList = await response.json();

    // Fetch each PDF as a blob and add to the list
    for (const pdfName of pdfList) {
      try {
        const pdfResponse = await fetch(`./pdf/${pdfName}`);
        if (!pdfResponse.ok) {
          console.error(`Failed to fetch ${pdfName}`);
          continue;
        }

        const blob = await pdfResponse.blob();
        const file = new File([blob], pdfName, { type: "application/pdf" });

        state.pdfList.push({
          name: pdfName,
          file: file,
          fromFolder: true,
        });
      } catch (err) {
        console.error(`Error loading PDF ${pdfName}:`, err);
      }
    }

    // Sort by name
    state.pdfList.sort((a, b) => a.name.localeCompare(b.name));

    if (state.pdfList.length > 0) {
      displayPdfList();
      console.log(`Loaded ${state.pdfList.length} PDFs from web folder`);
      return true;
    }

    return false;
  } catch (error) {
    console.log("Could not load PDFs from web folder:", error.message);
    return false;
  }
}

// Try to load PDFs from GitHub API (for repositories)
async function loadPdfsFromGitHub() {
  try {
    // Get the GitHub repo info from the page URL or use a default
    const pathParts = window.location.pathname.split("/").filter((p) => p);

    // GitHub Pages structure: /username/repo-name/
    if (pathParts.length < 2) {
      return null; // Not a GitHub Pages site
    }

    const owner = pathParts[0];
    const repo = pathParts[1];

    // Use GitHub API to list files in pdf folder
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/pdf`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      console.log("GitHub API not available or repository not found");
      return null;
    }

    const contents = await response.json();
    const pdfNames = contents
      .filter(
        (item) =>
          item.type === "file" && item.name.toLowerCase().endsWith(".pdf"),
      )
      .map((item) => item.name)
      .sort();

    console.log(`Found ${pdfNames.length} PDFs via GitHub API`);
    return pdfNames;
  } catch (error) {
    console.log("GitHub API method failed:", error.message);
    return null;
  }
}

// Select PDF folder using File System Access API
async function selectPdfFolder() {
  try {
    // Check if browser supports File System Access API
    if (!window.showDirectoryPicker) {
      alert(
        "Your browser doesn't support folder selection. Please use Chrome, Edge, or a modern Chromium browser.",
      );
      return;
    }

    // Open folder picker
    const dirHandle = await window.showDirectoryPicker();
    state.folderDirHandle = dirHandle;

    // Request permission
    try {
      const permission = await dirHandle.requestPermission({ mode: "read" });
      if (permission !== "granted") {
        alert("Permission denied to access the folder");
        state.folderDirHandle = null;
        return;
      }
    } catch (err) {
      console.log("Permission request not supported, proceeding anyway");
    }

    // Save folder handle to IndexedDB for auto-load on next visit
    await saveFolderHandle(dirHandle);

    // Load PDFs from the selected folder
    await loadPdfsFromFolder();
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error("Error selecting folder:", error);
      alert(`Error selecting folder: ${error.message}`);
    }
  }
}

// Load PDFs from folder
async function loadPdfsFromFolder() {
  if (!state.folderDirHandle) return;

  try {
    // Clear existing PDFs from folder (keep uploaded ones)
    state.pdfList = state.pdfList.filter((item) => !item.fromFolder);

    // Iterate through files in the folder
    for await (const entry of state.folderDirHandle.values()) {
      if (entry.kind === "file" && entry.name.toLowerCase().endsWith(".pdf")) {
        try {
          const file = await entry.getFile();
          state.pdfList.push({
            name: file.name,
            file: file,
            fromFolder: true,
          });
        } catch (err) {
          console.error(`Error reading file ${entry.name}:`, err);
        }
      }
    }

    // Sort by name
    state.pdfList.sort((a, b) => a.name.localeCompare(b.name));

    displayPdfList();
  } catch (error) {
    console.error("Error loading PDFs from folder:", error);
    alert(`Error loading PDFs from folder: ${error.message}`);
  }
}

// Handle file selection from upload
function handleFileSelection(e) {
  const files = Array.from(e.target.files);

  if (files.length === 0) return;

  // Add new files to the list
  files.forEach((file) => {
    if (file.type === "application/pdf") {
      state.pdfList.push({
        name: file.name,
        file: file,
        fromFolder: false,
      });
    }
  });

  // Sort by name
  state.pdfList.sort((a, b) => a.name.localeCompare(b.name));

  displayPdfList();

  // Clear file input
  fileInput.value = "";
}

// Display PDF list
function displayPdfList() {
  if (state.pdfList.length === 0) {
    pdfListContainer.innerHTML =
      '<p class="no-pdfs">No PDFs loaded. Click "📂 PDF Folder" to select a folder or "➕ Add PDFs" to upload files.</p>';
    return;
  }

  pdfListContainer.innerHTML = "";

  state.pdfList.forEach((pdfItem, index) => {
    const item = document.createElement("div");
    item.className = "pdf-item";
    if (state.currentPdf === index) {
      item.classList.add("active");
    }

    const icon = pdfItem.fromFolder ? "📁" : "📤";
    item.innerHTML = `
            <span class="pdf-icon">${icon}</span>
            <span class="pdf-name">${pdfItem.name}</span>
        `;

    item.addEventListener("click", () => openPdf(index, item));
    pdfListContainer.appendChild(item);
  });
}

// Open and display PDF
async function openPdf(index, element) {
  try {
    // Update UI
    document
      .querySelectorAll(".pdf-item")
      .forEach((item) => item.classList.remove("active"));
    element.classList.add("active");

    const pdfItem = state.pdfList[index];
    state.currentPdf = index;
    state.currentPage = 1;
    state.zoom = 1;

    // Load PDF from File object
    const arrayBuffer = await pdfItem.file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    state.pdfDoc = pdf;
    state.totalPages = pdf.numPages;

    // Update UI
    updatePageDisplay();
    showControls();
    updateNavigationButtons();

    // Render first page
    await renderPage(state.currentPage);
  } catch (error) {
    console.error("Error opening PDF:", error);
    alert(`Error opening PDF: ${error.message}`);
  }
}

// Render a specific page
async function renderPage(pageNum) {
  try {
    if (!state.pdfDoc || pageNum < 1 || pageNum > state.totalPages) {
      return;
    }

    const page = await state.pdfDoc.getPage(pageNum);

    // Set scale based on zoom
    const scale = 1.5 * state.zoom;
    const viewport = page.getViewport({ scale });

    // Set canvas size
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render page
    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };

    await page.render(renderContext).promise;

    state.currentPage = pageNum;
    updatePageDisplay();
    updateNavigationButtons();
  } catch (error) {
    console.error("Error rendering page:", error);
  }
}

// Navigation
function previousPage() {
  if (state.currentPage > 1) {
    renderPage(state.currentPage - 1);
  }
}

function nextPage() {
  if (state.currentPage < state.totalPages) {
    renderPage(state.currentPage + 1);
  }
}

function handlePageInput(e) {
  if (e.key === "Enter") {
    handlePageChange();
  }
}

function handlePageChange() {
  const pageNum = parseInt(pageNumberInput.value, 10);
  if (pageNum >= 1 && pageNum <= state.totalPages) {
    renderPage(pageNum);
  } else {
    pageNumberInput.value = state.currentPage;
  }
}

// Zoom controls
function changeZoom(factor) {
  state.zoom *= factor;
  state.zoom = Math.max(0.5, Math.min(state.zoom, 3)); // Constrain between 50% and 300%
  renderPage(state.currentPage);
}

function resetZoom() {
  state.zoom = 1;
  renderPage(state.currentPage);
}

// Update UI elements
function updatePageDisplay() {
  pageNumberInput.value = state.currentPage;
  totalPagesSpan.textContent = ` / ${state.totalPages}`;
  currentZoomSpan.textContent = `${Math.round(state.zoom * 100)}%`;
}

function updateNavigationButtons() {
  prevPageBtn.disabled = state.currentPage <= 1;
  nextPageBtn.disabled = state.currentPage >= state.totalPages;
}

function showControls() {
  pdfControls.style.display = "flex";
  noSelection.style.display = "none";
  canvas.style.display = "block";
}

function hideControls() {
  pdfControls.style.display = "none";
  noSelection.style.display = "block";
  canvas.style.display = "none";
}
