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
  loadPdfsFromFolder();
});

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

    // Save folder reference to localStorage for persistence
    try {
      const permission = await dirHandle.requestPermission({ mode: "read" });
      if (permission !== "granted") {
        alert("Permission denied to access the folder");
        return;
      }
    } catch (err) {
      console.log("Permission request not supported, proceeding anyway");
    }

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
