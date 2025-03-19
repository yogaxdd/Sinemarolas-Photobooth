// DOM Elements
const startScreen = document.getElementById('start-screen');
const previewScreen = document.getElementById('preview-screen');
const editScreen = document.getElementById('edit-screen');
const downloadScreen = document.getElementById('download-screen');

// Buttons
const startButton = document.getElementById('start-button');
const captureButton = document.getElementById('capture-button');
const retakeButton = document.getElementById('retake-button');
const previewButton = document.getElementById('preview-button');
const continueButton = document.getElementById('continue-button');
const downloadButton = document.getElementById('download-button');
const restartButton = document.getElementById('restart-button');
const printButton = document.getElementById('print-button');

// Camera Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const countdownDisplay = document.getElementById('countdown-display');
const flashOverlay = document.getElementById('flash-overlay');
const photoCounter = document.getElementById('photo-counter');
const previewSection = document.getElementById('preview-section');
const previewPhotos = document.getElementById('preview-photos');

// Editor Elements
const photostripContainer = document.getElementById('photostrip-container');
const enableDateToggle = document.getElementById('enable-date');

// Download Elements
const finalPhoto = document.getElementById('final-photo');

// Upload Elements
const uploadButton = document.getElementById('upload-button');
const uploadInput = document.getElementById('upload-input');

// App State
let currentStage = 'start';
let countdown = null;
let photosTaken = 0;
let photos = [];
let countdownInterval = null;
// Array stickers berisi objek { element, src, x, y, width, height }
let stickers = [];
let activeStickerElement = null;
let zoomModal = null;
let isMobile = window.innerWidth < 768;

// Editor State
let editorState = {
  photostripColor: 'black',
  filter: 'none',
  showDate: false,
  showWatermark: false,
  date: new Date()
};

// Initialize the app
function init() {
  document.getElementById('current-year').textContent = new Date().getFullYear();
  setupEventListeners();
  createZoomModal();
  window.addEventListener('resize', () => {
    isMobile = window.innerWidth < 768;
    togglePreviewSection();
  });
}

// Setup event listeners
function setupEventListeners() {
  startButton.addEventListener('click', () => {
    showScreen('preview');
    startCamera();
  });
  
  captureButton.addEventListener('click', startCapture);
  
  retakeButton.addEventListener('click', () => {
    showScreen('preview');
    resetPhotos();
    startCamera();
  });
  
  previewButton.addEventListener('click', () => {
    updatePhotostrip();
    showToast('Preview updated!');
  });
  
  continueButton.addEventListener('click', () => {
    generateFinalPhotostrip();
    showScreen('download');
  });
  
  downloadButton.addEventListener('click', downloadImage);
  restartButton.addEventListener('click', resetApp);
  printButton.addEventListener('click', () => window.print());
  
  enableDateToggle.addEventListener('change', (e) => {
    editorState.showDate = e.target.checked;
    updatePhotostrip();
  });
  const enableWatermarkToggle = document.getElementById('enable-watermark');
  enableWatermarkToggle.addEventListener('change', (e) => {
    editorState.showWatermark = e.target.checked;
    updatePhotostrip();
  });
  
  setupColorOptions();
  setupFilterOptions();
  setupStickerOptions();
  
  uploadButton.addEventListener('click', () => uploadInput.click());
  uploadInput.addEventListener('change', handleUpload);
}

// Show a specific screen
function showScreen(screenName) {
  startScreen.classList.remove('active');
  previewScreen.classList.remove('active');
  editScreen.classList.remove('active');
  downloadScreen.classList.remove('active');
  
  switch (screenName) {
    case 'start':
      startScreen.classList.add('active');
      break;
    case 'preview':
      previewScreen.classList.add('active');
      togglePreviewSection();
      break;
    case 'edit':
      editScreen.classList.add('active');
      if (photos.length === 3) {
        createPhotostrip();
      }
      break;
    case 'download':
      downloadScreen.classList.add('active');
      break;
  }
  currentStage = screenName;
}

// Toggle preview section based on device
function togglePreviewSection() {
  if (previewSection) {
    previewSection.style.display = isMobile ? 'none' : 'flex';
  }
}

// Start the camera
async function startCamera() {
  try {
    if (video.srcObject) {
      const tracks = video.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    
    const constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user"
      },
      audio: false
    };
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast("Your browser doesn't support camera access. Please use the upload option instead.", "error");
      return;
    }
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    if (video) {
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        video.play();
        showToast("Camera started successfully");
      };
    }
  } catch (error) {
    console.error("Error accessing camera:", error);
    showToast("Failed to access camera. Please ensure you've granted permission.", "error");
  }
}

// Stop the camera
function stopCamera() {
  if (video && video.srcObject) {
    const tracks = video.srcObject.getTracks();
    tracks.forEach(track => track.stop());
    video.srcObject = null;
  }
}

// Start capture process
function startCapture() {
  photosTaken = 0;
  photos = [];
  if (previewPhotos) previewPhotos.innerHTML = '';
  photoCounter.textContent = `${photosTaken}/3 Photos`;
  photoCounter.classList.remove('hidden');
  captureButton.classList.add('hidden');
  startCountdown();
}

// Start the countdown
function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  countdown = 3;
  countdownDisplay.textContent = countdown;
  countdownDisplay.classList.remove('hidden');
  countdownInterval = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      clearInterval(countdownInterval);
      countdownDisplay.classList.add('hidden');
      capturePhoto();
    } else {
      countdownDisplay.textContent = countdown;
    }
  }, 1000);
}

// Capture a photo
function capturePhoto() {
  flashOverlay.classList.add('active');
  setTimeout(() => flashOverlay.classList.remove('active'), 300);
  
  const context = canvas.getContext('2d');
  
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    showToast("Cannot capture photo. Please check your camera or use the upload option.", "error");
    captureButton.classList.remove('hidden');
    return;
  }
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  const imgData = canvas.toDataURL('image/png');
  photos.push(imgData);
  
  if (!isMobile && previewPhotos) {
    addPhotoToPreview(imgData, photos.length);
  }
  
  photosTaken = photos.length;
  photoCounter.textContent = `${photos.length}/3 Photos`;
  
  if (photos.length >= 3) {
    setTimeout(() => {
      stopCamera();
      showScreen('edit');
      createPhotostrip();
      captureButton.classList.remove('hidden');
    }, 1000);
  } else {
    setTimeout(() => startCountdown(), 1000);
  }
}

// Add photo to preview section
function addPhotoToPreview(imgSrc, photoNumber) {
  const photoItem = document.createElement('div');
  photoItem.className = 'preview-photo-item';
  
  const img = document.createElement('img');
  img.src = imgSrc;
  img.alt = `Photo ${photoNumber}`;
  
  const numberBadge = document.createElement('div');
  numberBadge.className = 'photo-number';
  numberBadge.textContent = photoNumber;
  
  photoItem.appendChild(img);
  photoItem.appendChild(numberBadge);
  
  photoItem.addEventListener('click', () => openZoomModal(imgSrc));
  
  previewPhotos.appendChild(photoItem);
}

// Create zoom modal
function createZoomModal() {
  zoomModal = document.createElement('div');
  zoomModal.className = 'zoom-modal';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'zoom-modal-content';
  
  const modalImg = document.createElement('img');
  modalImg.id = 'zoom-img';
  modalImg.alt = 'Zoomed photo';
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'zoom-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', closeZoomModal);
  
  modalContent.appendChild(modalImg);
  modalContent.appendChild(closeBtn);
  zoomModal.appendChild(modalContent);
  
  zoomModal.addEventListener('click', (e) => {
    if (e.target === zoomModal) closeZoomModal();
  });
  
  document.body.appendChild(zoomModal);
}

// Open zoom modal
function openZoomModal(imgSrc) {
  if (!zoomModal) return;
  const zoomImg = document.getElementById('zoom-img');
  if (zoomImg) zoomImg.src = imgSrc;
  zoomModal.classList.add('active');
}

// Close zoom modal
function closeZoomModal() {
  if (!zoomModal) return;
  zoomModal.classList.remove('active');
}

// Create the photostrip from captured photos
function createPhotostrip() {
  photostripContainer.innerHTML = '';
  
  photos.forEach((photo, index) => {
    const photoElement = document.createElement('div');
    photoElement.className = 'photostrip-photo';
    
    const img = document.createElement('img');
    img.src = photo;
    img.alt = `Photo ${index + 1}`;
    
    photoElement.appendChild(img);
    photostripContainer.appendChild(photoElement);
  });
  
  if (editorState.showDate) addDateToPhotostrip();
  if (editorState.showWatermark) addWatermarkToPhotostrip();
  
  updatePhotostrip();
}

// Add date to the photostrip
function addDateToPhotostrip() {
  const dateElement = document.createElement('div');
  dateElement.className = 'photostrip-date';
  
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  dateElement.textContent = editorState.date.toLocaleDateString(undefined, options);
  
  photostripContainer.appendChild(dateElement);
}

// Add watermark to the photostrip
function addWatermarkToPhotostrip() {
  const watermarkElement = document.createElement('div');
  watermarkElement.className = 'photostrip-watermark';
  watermarkElement.textContent = 'Sinemarolas Studio';
  
  photostripContainer.appendChild(watermarkElement);
}

// Update photostrip based on editor state
function updatePhotostrip() {
  photostripContainer.style.backgroundColor = getColorValue(editorState.photostripColor);
  
  const photoElements = photostripContainer.querySelectorAll('.photostrip-photo img');
  photoElements.forEach(img => {
    img.className = '';
    if (editorState.filter !== 'none') {
      img.classList.add(`filter-${editorState.filter}`);
    }
  });
  
  const dateElement = photostripContainer.querySelector('.photostrip-date');
  if (editorState.showDate) {
    if (!dateElement) addDateToPhotostrip();
  } else if (dateElement) {
    photostripContainer.removeChild(dateElement);
  }
  
  const watermarkElement = photostripContainer.querySelector('.photostrip-watermark');
  if (editorState.showWatermark) {
    if (!watermarkElement) addWatermarkToPhotostrip();
  } else if (watermarkElement) {
    photostripContainer.removeChild(watermarkElement);
  }
}

// Setup color option selection
function setupColorOptions() {
  const photostripColorOptions = document.querySelectorAll('.photostrip-options .color-option');
  photostripColorOptions.forEach(option => {
    if (!option.dataset.color) return;
    option.addEventListener('click', () => {
      photostripColorOptions.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
      editorState.photostripColor = option.dataset.color;
      updatePhotostrip();
    });
  });
}

// Setup filter options
function setupFilterOptions() {
  const filterOptions = document.querySelectorAll('.filter-option');
  filterOptions.forEach(option => {
    if (!option.dataset.filter) return;
    option.addEventListener('click', () => {
      filterOptions.forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
      editorState.filter = option.dataset.filter;
      updatePhotostrip();
    });
  });
}

// Setup sticker options
function setupStickerOptions() {
  const stickerOptions = document.querySelectorAll('.sticker:not(.add-sticker)');
  stickerOptions.forEach(sticker => {
    sticker.addEventListener('click', () => {
      const stickerImg = sticker.querySelector('img');
      if (stickerImg) addStickerToPhotostrip(stickerImg.src);
    });
  });
  
  const addStickerButton = document.querySelector('.add-sticker');
  if (addStickerButton) {
    addStickerButton.addEventListener('click', () => {
      showToast('Custom sticker upload would be implemented here', 'info');
    });
  }
}

// Add a sticker to the photostrip (simpan state koordinat & ukuran)
function addStickerToPhotostrip(stickerSrc) {
  const stickerElement = document.createElement('div');
  stickerElement.className = 'photostrip-sticker';
  stickerElement.style.position = 'absolute';
  stickerElement.style.width = '60px';
  stickerElement.style.height = '60px';
  stickerElement.style.top = '50px';
  stickerElement.style.left = '50px';
  stickerElement.style.zIndex = '10';
  stickerElement.style.cursor = 'move';
  
  const img = document.createElement('img');
  img.src = stickerSrc;
  img.draggable = false;
  
  stickerElement.appendChild(img);
  photostripContainer.appendChild(stickerElement);
  
  // Buat objek stickerData untuk disimpan
  const stickerData = {
    element: stickerElement,
    src: stickerSrc,
    // Simpan posisi dan ukuran sebagai number
    x: 50, // left
    y: 50, // top
    width: 60,
    height: 60
  };
  stickers.push(stickerData);
  
  // Buat draggable dan update stickerData saat di-drag
  makeStickerDraggable(stickerElement, stickerData);
  
  // Double-click untuk menghapus stiker
  stickerElement.addEventListener('dblclick', () => {
    photostripContainer.removeChild(stickerElement);
    stickers = stickers.filter(s => s !== stickerData);
    showToast("Sticker removed!");
  });
  
  // Gunakan wheel untuk resize dan update state
  stickerElement.addEventListener('wheel', (e) => {
    e.preventDefault();
    let newWidth = stickerData.width + (e.deltaY < 0 ? 5 : -5);
    let newHeight = stickerData.height + (e.deltaY < 0 ? 5 : -5);
    if (newWidth < 20) newWidth = 20;
    if (newHeight < 20) newHeight = 20;
    stickerElement.style.width = newWidth + "px";
    stickerElement.style.height = newHeight + "px";
    stickerData.width = newWidth;
    stickerData.height = newHeight;
  });
  
  showToast('Sticker added! Drag to position it.');
}

// Make a sticker element draggable dan update stickerData
function makeStickerDraggable(element, stickerData) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  element.onmousedown = dragMouseDown;
  
  function dragMouseDown(e) {
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    activeStickerElement = element;
    element.style.outline = '2px solid ' + getColorValue(editorState.photostripColor);
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }
  
  function elementDrag(e) {
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    let newLeft = element.offsetLeft - pos1;
    let newTop = element.offsetTop - pos2;
    element.style.left = newLeft + "px";
    element.style.top = newTop + "px";
    // Update state stickerData
    stickerData.x = newLeft;
    stickerData.y = newTop;
  }
  
  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    if (activeStickerElement) {
      activeStickerElement.style.outline = 'none';
      activeStickerElement = null;
    }
  }
}

// Generate the final photostrip image
function generateFinalPhotostrip() {
  const finalCanvas = document.createElement('canvas');
  const ctx = finalCanvas.getContext('2d');
  
  const containerWidth = photostripContainer.offsetWidth;
  const containerHeight = photostripContainer.offsetHeight;
  
  finalCanvas.width = containerWidth;
  finalCanvas.height = containerHeight;
  
  // Isi background
  ctx.fillStyle = getColorValue(editorState.photostripColor);
  ctx.fillRect(0, 0, containerWidth, containerHeight);
  
  // Kumpulkan foto, date, watermark
  const photoDivs = photostripContainer.querySelectorAll('.photostrip-photo img');
  const dateEl = photostripContainer.querySelector('.photostrip-date');
  const watermarkEl = photostripContainer.querySelector('.photostrip-watermark');
  
  const imagePromises = [];
  let currentY = 10;
  const gap = 10;
  
  photoDivs.forEach((imgTag) => {
    const p = new Promise((resolve) => {
      const loadedImg = new Image();
      loadedImg.crossOrigin = "anonymous";
      loadedImg.src = imgTag.src;
      loadedImg.onload = () => {
        const ratio = loadedImg.width / loadedImg.height;
        const desiredWidth = containerWidth - 20;
        const desiredHeight = desiredWidth / ratio;
        ctx.drawImage(loadedImg, 10, currentY, desiredWidth, desiredHeight);
        currentY += desiredHeight + gap;
        resolve();
      };
      loadedImg.onerror = () => resolve();
    });
    imagePromises.push(p);
  });
  
  Promise.all(imagePromises).then(() => {
    // Gambar date
    if (dateEl && editorState.showDate) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(10, currentY, containerWidth - 20, 40);
      ctx.font = '20px "Playfair Display", serif';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      const dateText = editorState.date.toLocaleDateString(undefined, options);
      ctx.fillText(dateText, containerWidth / 2, currentY + 20);
      currentY += 40 + gap;
    }
    
    // Gambar watermark
    if (watermarkEl && editorState.showWatermark) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(10, currentY, containerWidth - 20, 40);
      ctx.font = 'italic 18px "Playfair Display", serif';
      ctx.fillStyle = '#333333';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Sinemarolas Studio', containerWidth / 2, currentY + 20);
      currentY += 40 + gap;
    }
    
    // Gambar stiker berdasarkan data di state (stickers array)
    const stickerPromises = stickers.map((stickerData) => {
      return new Promise((resolve) => {
        const stickerImg = new Image();
        stickerImg.crossOrigin = "anonymous";
        stickerImg.src = stickerData.src;
        stickerImg.onload = () => {
          ctx.drawImage(stickerImg, stickerData.x, stickerData.y, stickerData.width, stickerData.height);
          resolve();
        };
        stickerImg.onerror = () => resolve();
      });
    });
    
    Promise.all(stickerPromises).then(() => {
      finalPhoto.src = finalCanvas.toDataURL('image/png');
    });
  });
}

// Download the final image
function downloadImage() {
  if (!finalPhoto.src || finalPhoto.src === '') {
    showToast("No image to download", "error");
    return;
  }
  const link = document.createElement('a');
  link.download = `sinemarolas-photostrip-${Date.now()}.png`;
  link.href = finalPhoto.src;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Photostrip downloaded successfully!");
}

// Reset the app
function resetApp() {
  showScreen('start');
  resetPhotos();
  stopCamera();
}

// Reset photos array and editor state
function resetPhotos() {
  photos = [];
  photosTaken = 0;
  stickers = [];
  
  editorState = {
    photostripColor: 'black',
    filter: 'none',
    showDate: false,
    showWatermark: false,
    date: new Date()
  };
  
  enableDateToggle.checked = false;
  const enableWatermarkToggle = document.getElementById('enable-watermark');
  if (enableWatermarkToggle) enableWatermarkToggle.checked = false;
  
  if (captureButton) captureButton.classList.remove('hidden');
  if (previewPhotos) previewPhotos.innerHTML = '';
  if (photostripContainer) photostripContainer.innerHTML = '';
  if (finalPhoto) finalPhoto.src = '';
}

// Get the CSS color value from color name
function getColorValue(colorName) {
  switch (colorName) {
    case 'black': return '#000000';
    case 'white': return '#FFFFFF';
    case 'cream': return '#FEF6E4';
    case 'lightblue': return '#D3E4FD';
    case 'lightgreen': return '#F2FCE2';
    case 'lightpink': return '#FFDEE2';
    case 'transparent': return 'transparent';
    default: return colorName;
  }
}

// Show a toast notification
function showToast(message, type = 'success') {
  console.log(`Toast (${type}): ${message}`);
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => document.body.removeChild(toast), 300);
  }, 3000);
}

// Handle file upload
function handleUpload(e) {
  const files = e.target.files;
  if (!files.length) return;
  
  for (let i = 0; i < files.length; i++) {
    if (photos.length >= 3) break; // max 3
    const file = files[i];
    if (!file.type.startsWith('image/')) continue;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === 'string') {
        photos.push(event.target.result);
        addPhotoToPreview(event.target.result, photos.length);
        photoCounter.textContent = `${photos.length}/3 Photos`;
        photoCounter.classList.remove('hidden');
        if (photos.length === 3) {
          setTimeout(() => showScreen('edit'), 1000);
        }
      }
    };
    reader.readAsDataURL(file);
  }
  e.target.value = "";
}

// Initialize the app when DOM is loaded
window.addEventListener('DOMContentLoaded', init);
