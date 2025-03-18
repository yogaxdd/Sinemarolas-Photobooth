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
const photostripCanvas = document.getElementById('photostrip-canvas');
const enableDateToggle = document.getElementById('enable-date');
const stickerTemplate = document.getElementById('sticker-template');

// Download / QR Elements
const finalPhoto = document.getElementById('final-photo');
const qrCodeContainer = document.getElementById('qr-code');

// Upload Elements
const uploadButton = document.getElementById('upload-button');
const uploadInput = document.getElementById('upload-input');

// App State
let currentStage = 'start';
let countdown = null;
let photosTaken = 0;
let photos = [];
let countdownInterval = null;
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
  console.log('Initializing app...');
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
  console.log('Setting up event listeners...');
  
  startButton.addEventListener('click', () => {
    console.log('Start button clicked');
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
    generateQRCode();
  });
  
  downloadButton.addEventListener('click', downloadImage);
  
  restartButton.addEventListener('click', resetApp);
  
  printButton.addEventListener('click', () => {
    window.print();
  });
  
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
  
  uploadButton.addEventListener('click', () => {
    uploadInput.click();
  });
  
  uploadInput.addEventListener('change', handleUpload);
}

// Show a specific screen
function showScreen(screenName) {
  console.log(`Showing ${screenName} screen`);
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
    console.log('Starting camera...');
    // Stop any existing stream
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
    
    // Check if getUserMedia is supported
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
    const stream = video.srcObject;
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
    video.srcObject = null;
  }
}

// Start capture process
function startCapture() {
  console.log('Starting capture process...');
  photosTaken = 0;
  photos = [];
  if (previewPhotos) {
    previewPhotos.innerHTML = '';
  }
  photoCounter.textContent = `${photosTaken}/3 Photos`;
  photoCounter.classList.remove('hidden');
  captureButton.classList.add('hidden');
  startCountdown();
}

// Start the countdown
function startCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
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
  console.log('Capturing photo...');
  flashOverlay.classList.add('active');
  setTimeout(() => {
    flashOverlay.classList.remove('active');
  }, 300);
  
  const context = canvas.getContext('2d');
  
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    console.error('Video dimensions are 0, cannot capture photo');
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
    setTimeout(() => {
      startCountdown();
    }, 1000);
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
  
  photoItem.addEventListener('click', () => {
    openZoomModal(imgSrc);
  });
  
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
    if (e.target === zoomModal) {
      closeZoomModal();
    }
  });
  
  document.body.appendChild(zoomModal);
}

// Open zoom modal
function openZoomModal(imgSrc) {
  if (!zoomModal) return;
  const zoomImg = document.getElementById('zoom-img');
  if (zoomImg) {
    zoomImg.src = imgSrc;
  }
  zoomModal.classList.add('active');
}

// Close zoom modal
function closeZoomModal() {
  if (!zoomModal) return;
  zoomModal.classList.remove('active');
}

// Create the photostrip from captured photos
function createPhotostrip() {
  console.log('Creating photostrip...');
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
  
  if (editorState.showDate) {
    addDateToPhotostrip();
  }
  
  if (editorState.showWatermark) {
    addWatermarkToPhotostrip();
  }
  
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
    if (!dateElement) {
      addDateToPhotostrip();
    }
  } else if (dateElement) {
    photostripContainer.removeChild(dateElement);
  }
  
  const watermarkElement = photostripContainer.querySelector('.photostrip-watermark');
  if (editorState.showWatermark) {
    if (!watermarkElement) {
      addWatermarkToPhotostrip();
    }
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

// Setup sticker options (hapus & resize)
function setupStickerOptions() {
  const stickerOptions = document.querySelectorAll('.sticker:not(.add-sticker)');
  stickerOptions.forEach(sticker => {
    if (!sticker.dataset.sticker) return;
    
    sticker.addEventListener('click', () => {
      const stickerImg = sticker.querySelector('img');
      if (stickerImg) {
        addStickerToPhotostrip(stickerImg.src);
      }
    });
  });
  
  const addStickerButton = document.querySelector('.add-sticker');
  if (addStickerButton) {
    addStickerButton.addEventListener('click', () => {
      showToast('Custom sticker upload would be implemented here', 'info');
    });
  }
}

// Add a sticker to the photostrip
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
  
  makeStickerDraggable(stickerElement);
  
  // Double-click untuk hapus
  stickerElement.addEventListener('dblclick', () => {
    photostripContainer.removeChild(stickerElement);
    stickers = stickers.filter(s => s.element !== stickerElement);
    showToast("Sticker removed!");
  });
  
  // Wheel untuk resize
  stickerElement.addEventListener('wheel', (e) => {
    e.preventDefault();
    let currentWidth = stickerElement.offsetWidth;
    let currentHeight = stickerElement.offsetHeight;
    let newWidth = currentWidth + (e.deltaY < 0 ? 5 : -5);
    let newHeight = currentHeight + (e.deltaY < 0 ? 5 : -5);
    if (newWidth < 20) newWidth = 20;
    if (newHeight < 20) newHeight = 20;
    stickerElement.style.width = newWidth + "px";
    stickerElement.style.height = newHeight + "px";
  });
  
  stickers.push({
    element: stickerElement,
    src: stickerSrc,
    position: { top: '50px', left: '50px' }
  });
  
  showToast('Sticker added! Drag to position it.');
}

// Make a sticker element draggable
function makeStickerDraggable(element) {
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
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
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
  // Create a new canvas to draw the photostrip
  const finalCanvas = document.createElement('canvas');
  const ctx = finalCanvas.getContext('2d');
  
  // Get dimensions from the photostrip container
  const containerWidth = photostripContainer.offsetWidth;
  const containerHeight = photostripContainer.offsetHeight;
  
  finalCanvas.width = containerWidth;
  finalCanvas.height = containerHeight;
  
  // Draw background
  ctx.fillStyle = getColorValue(editorState.photostripColor);
  ctx.fillRect(0, 0, containerWidth, containerHeight);
  
  // Draw each photo with proper spacing
  const photoElements = photostripContainer.querySelectorAll('.photostrip-photo');
  let currentY = 16; // Start with a small margin
  
  photoElements.forEach((photoElement, index) => {
    const img = photoElement.querySelector('img');
    const photoWidth = photoElement.offsetWidth - 2; // Account for borders
    const photoHeight = photoElement.offsetHeight - 2;
    
    // Create a temporary canvas to apply filters
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = photoWidth;
    tempCanvas.height = photoHeight;
    
    // Draw the image
    const imgElement = new Image();
    imgElement.src = photos[index];
    
    tempCtx.drawImage(imgElement, 0, 0, photoWidth, photoHeight);
    
    // Apply filter effect
    if (editorState.filter !== 'none') {
      applyCanvasFilter(tempCtx, tempCanvas.width, tempCanvas.height, editorState.filter);
    }
    
    // Draw the photo onto the final canvas
    ctx.drawImage(tempCanvas, 16, currentY, photoWidth, photoHeight);
    
    // Update Y position for next photo
    currentY += photoHeight + 8; // Add a small gap between photos
  });
  
  // Add date if enabled
  if (editorState.showDate) {
    const dateElement = photostripContainer.querySelector('.photostrip-date');
    if (dateElement) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(16, currentY, containerWidth - 32, 40);
      
      ctx.font = '20px "Playfair Display", serif';
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      const dateText = editorState.date.toLocaleDateString(undefined, options);
      
      ctx.fillText(dateText, containerWidth / 2, currentY + 20);
      
      currentY += 48; // Update Y position after date
    }
  }
  
  // Add watermark if enabled
  if (editorState.showWatermark) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(16, currentY, containerWidth - 32, 40);
    
    ctx.font = 'italic 18px "Playfair Display", serif';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.fillText('Sinemarolas Studio', containerWidth / 2, currentY + 20);
  }
  
  // Draw stickers
  stickers.forEach(sticker => {
    const img = new Image();
    img.src = sticker.src;
    
    const stickerElement = sticker.element;
    const x = parseInt(stickerElement.style.left);
    const y = parseInt(stickerElement.style.top);
    const width = stickerElement.offsetWidth;
    const height = stickerElement.offsetHeight;
    
    ctx.drawImage(img, x, y, width, height);
  });
  
  // Set the final photostrip image
  finalPhoto.src = finalCanvas.toDataURL('image/png');
}

// Apply filter to canvas context
function applyCanvasFilter(ctx, width, height, filterType) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  switch (filterType) {
    case 'black-and-white':
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg; // r
        data[i + 1] = avg; // g
        data[i + 2] = avg; // b
      }
      break;
    case 'sepia':
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
        data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
        data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
      }
      break;
    case 'warm':
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * 1.1); // Increase red
        data[i + 2] = Math.max(0, data[i + 2] * 0.9); // Decrease blue
      }
      break;
    case 'cold':
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, data[i] * 0.9); // Decrease red
        data[i + 2] = Math.min(255, data[i + 2] * 1.1); // Increase blue
      }
      break;
    case 'cool':
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const b = data[i + 2];
        data[i] = b; // Swap red and blue
        data[i + 2] = r;
      }
      break;
  }
  
  ctx.putImageData(imageData, 0, 0);
}

// Generate QR code for downloading
function generateQRCode() {
  // Generate QR code for the final image
  QRCode.toCanvas(qrCanvas, finalPhoto.src, {
    width: 200,
    margin: 1,
    color: {
      dark: '#1A1F2C',
      light: '#FFFFFF'
    }
  }, (error) => {
    if (error) {
      console.error("Error generating QR code:", error);
      showToast("Failed to generate QR code", "error");
    }
  });
}

// Download the final image
function downloadImage() {
  const downloadLink = document.createElement('a');
  downloadLink.href = finalPhoto.src;
  downloadLink.download = `sinemarolas-photostrip-${Date.now()}.png`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  
  showToast("Photostrip downloaded successfully!");
}

// Reset the app
function resetApp() {
  showScreen('start');
  resetPhotos();
}

// Reset photos array and editor state
function resetPhotos() {
  photos = [];
  photosTaken = 0;
  stickers = [];
  
  // Reset editor state
  editorState = {
    photostripColor: 'black',
    filter: 'none',
    showDate: false,
    showWatermark: false,
    date: new Date()
  };
  
  // Reset UI elements
  enableDateToggle.checked = false;
  const enableWatermarkToggle = document.getElementById('enable-watermark');
  if (enableWatermarkToggle) {
    enableWatermarkToggle.checked = false;
  }
  
  // Make sure capture button is visible
  if (captureButton) {
    captureButton.classList.remove('hidden');
  }
  
  // Clear preview photos
  if (previewPhotos) {
    previewPhotos.innerHTML = '';
  }
}


// Apply filter to canvas context
function applyCanvasFilter(ctx, x, y, width, height, filterType) {
  const imageData = ctx.getImageData(x, y, width, height);
  const data = imageData.data;
  
  switch (filterType) {
    case 'black-and-white':
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg;
        data[i + 1] = avg;
        data[i + 2] = avg;
      }
      break;
    case 'sepia':
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
        data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
        data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
      }
      break;
    case 'warm':
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] * 1.1);     // R
        data[i + 2] = Math.max(0, data[i + 2] * 0.9); // B
      }
      break;
    case 'cold':
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, data[i] * 0.9);       // R
        data[i + 2] = Math.min(255, data[i + 2] * 1.1); // B
      }
      break;
    case 'cool':
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const b = data[i + 2];
        data[i] = b;
        data[i + 2] = r;
      }
      break;
  }
  
  ctx.putImageData(imageData, x, y);
}

// Generate QR code that directly contains the image data (no server needed)
function generateQRCode(imageData = null) {
  console.log('Generating QR code...');
  qrCodeContainer.innerHTML = "";
  
  const dataToEncode = imageData || finalPhoto.src;
  
  // Create a QR code that directly contains the image data for scanning
  new QRCode(qrCodeContainer, {
    text: dataToEncode,
    width: 200,
    height: 200,
    colorDark: "#1A1F2C",
    colorLight: "#FFFFFF",
    correctLevel: QRCode.CorrectLevel.L  // Use lower error correction for more data capacity
  });
  
  showToast("QR code generated! Scan to download directly to your phone.");
}

// Download the final image
function downloadImage() {
  console.log('Downloading image...');
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
  if (enableWatermarkToggle) {
    enableWatermarkToggle.checked = false;
  }
  
  if (captureButton) {
    captureButton.classList.remove('hidden');
  }
  
  if (previewPhotos) {
    previewPhotos.innerHTML = '';
  }
  
  if (photostripContainer) {
    photostripContainer.innerHTML = '';
  }
  
  if (finalPhoto) {
    finalPhoto.src = '';
  }
  
  if (qrCodeContainer) {
    qrCodeContainer.innerHTML = '';
  }
}

// Get the CSS color value from color name
function getColorValue(colorName) {
  switch (colorName) {
    case 'black':
      return '#000000';
    case 'white':
      return '#FFFFFF';
    case 'cream':
      return '#FEF6E4';
    case 'lightblue':
      return '#D3E4FD';
    case 'lightgreen':
      return '#F2FCE2';
    case 'lightpink':
      return '#FFDEE2';
    case 'transparent':
      return 'transparent';
    default:
      return colorName;
  }
}

// Show a toast notification
function showToast(message, type = 'success') {
  console.log(`Toast (${type}): ${message}`);
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

// Handle file upload
function handleUpload(e) {
  console.log('Handling file upload...');
  const files = e.target.files;
  if (!files.length) return;
  
  for (let i = 0; i < files.length; i++) {
    if (photos.length >= 3) break; // max 3
    const file = files[i];
    if (!file.type.startsWith('image/')) continue;
    
    const reader = new FileReader();
    reader.onload = function(event) {
      if (event.target && typeof event.target.result === 'string') {
        photos.push(event.target.result);
        addPhotoToPreview(event.target.result, photos.length);
        photoCounter.textContent = `${photos.length}/3 Photos`;
        photoCounter.classList.remove('hidden');
        
        if (photos.length === 3) {
          setTimeout(() => {
            showScreen('edit');
          }, 1000);
        }
      }
    };
    reader.readAsDataURL(file);
  }
  // Empty the input value so same files can be selected again
  e.target.value = "";
}

// Initialize the app when DOM is loaded
window.addEventListener('DOMContentLoaded', init);
  