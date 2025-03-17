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

// Download Elements
const finalPhoto = document.getElementById('final-photo');
const qrCanvas = document.getElementById('qr-code');

// App State
let currentStage = 'start';
let countdown = null;
let photosTaken = 0;
let photos = [];
let selectedPhotoIndex = 0;
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
  // Set the current year in the footer
  document.getElementById('current-year').textContent = new Date().getFullYear();
  
  // Setup event listeners
  setupEventListeners();
  
  // Initialize fabric.js canvas for sticker functionality
  initFabric();
  
  // Create zoom modal
  createZoomModal();
  
  // Check for mobile
  window.addEventListener('resize', () => {
    isMobile = window.innerWidth < 768;
    togglePreviewSection();
  });
}

// Setup event listeners
function setupEventListeners() {
  // Start button
  startButton.addEventListener('click', () => {
    showScreen('preview');
    startCamera();
  });
  
  // Capture button
  captureButton.addEventListener('click', startCapture);
  
  // Retake button
  retakeButton.addEventListener('click', () => {
    showScreen('preview');
    resetPhotos();
    startCamera();
  });
  
  // Preview button
  previewButton.addEventListener('click', () => {
    generatePhotostrip();
    showToast('Preview updated!');
  });
  
  // Continue button
  continueButton.addEventListener('click', () => {
    generateFinalPhotostrip();
    showScreen('download');
    generateQRCode();
  });
  
  // Download button
  downloadButton.addEventListener('click', downloadImage);
  
  // Restart button
  restartButton.addEventListener('click', resetApp);
  
  // Enable date toggle
  enableDateToggle.addEventListener('change', (e) => {
    editorState.showDate = e.target.checked;
    updatePhotostrip();
  });
  
  // Enable watermark toggle
  const enableWatermarkToggle = document.getElementById('enable-watermark');
  enableWatermarkToggle.addEventListener('change', (e) => {
    editorState.showWatermark = e.target.checked;
    updatePhotostrip();
  });
  
  // Setup color option selection
  setupColorOptions();
  
  // Setup filter option selection
  setupFilterOptions();
  
  // Setup sticker selection
  setupStickerOptions();
}

// Show a specific screen
function showScreen(screenName) {
  // Hide all screens
  startScreen.classList.remove('active');
  previewScreen.classList.remove('active');
  editScreen.classList.remove('active');
  downloadScreen.classList.remove('active');
  
  // Show the requested screen
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
    const constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user"
      },
      audio: false
    };
    
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
  // Reset counter and photos array
  photosTaken = 0;
  photos = [];
  
  // Clear preview photos
  if (previewPhotos) {
    previewPhotos.innerHTML = '';
  }
  
  // Show photo counter
  photoCounter.textContent = `${photosTaken}/3 Photos`;
  photoCounter.classList.remove('hidden');
  
  // Hide capture button during the process
  captureButton.classList.add('hidden');
  
  // Start the first countdown
  startCountdown();
}

// Start the countdown
function startCountdown() {
  // Clear any existing interval
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  
  // Set initial countdown
  countdown = 3;
  countdownDisplay.textContent = countdown;
  countdownDisplay.classList.remove('hidden');
  
  // Start interval
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
  // Flash effect
  flashOverlay.classList.add('active');
  setTimeout(() => {
    flashOverlay.classList.remove('active');
  }, 300);
  
  // Capture frame
  const context = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Get image data
  const imgData = canvas.toDataURL('image/png');
  photos.push(imgData);
  
  // Add to preview section if not mobile
  if (!isMobile && previewPhotos) {
    addPhotoToPreview(imgData, photosTaken + 1);
  }
  
  // Increment counter
  photosTaken++;
  photoCounter.textContent = `${photosTaken}/3 Photos`;
  
  if (photosTaken >= 3) {
    // Move to edit after 3 photos
    setTimeout(() => {
      stopCamera();
      showScreen('edit');
      createPhotostrip();
      
      // Show capture button again for the next session
      captureButton.classList.remove('hidden');
    }, 1000);
  } else {
    // Next photo after a short delay
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
  
  // Add click event for zoom view
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
  
  // Close modal when clicking outside the image
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

// Initialize fabric.js canvas for interactive elements
function initFabric() {
  // This function will be populated when implementing the sticker functionality
}

// Create the photostrip from captured photos
function createPhotostrip() {
  // Clear the container
  photostripContainer.innerHTML = '';
  
  // Create elements for each photo
  photos.forEach((photo, index) => {
    const photoElement = document.createElement('div');
    photoElement.className = 'photostrip-photo';
    
    const img = document.createElement('img');
    img.src = photo;
    img.alt = `Photo ${index + 1}`;
    
    photoElement.appendChild(img);
    photostripContainer.appendChild(photoElement);
  });
  
  // Add date element if enabled
  if (editorState.showDate) {
    addDateToPhotostrip();
  }
  
  // Add watermark if enabled
  if (editorState.showWatermark) {
    addWatermarkToPhotostrip();
  }
  
  // Apply initial styles
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
  // Update photostrip background color
  photostripContainer.style.backgroundColor = getColorValue(editorState.photostripColor);
  
  // Update filter for each photo
  const photoElements = photostripContainer.querySelectorAll('.photostrip-photo img');
  photoElements.forEach(img => {
    // Remove all filter classes
    img.className = '';
    
    // Add selected filter class if not 'none'
    if (editorState.filter !== 'none') {
      img.classList.add(`filter-${editorState.filter}`);
    }
  });
  
  // Handle date display
  const dateElement = photostripContainer.querySelector('.photostrip-date');
  if (editorState.showDate) {
    if (!dateElement) {
      addDateToPhotostrip();
    }
  } else if (dateElement) {
    photostripContainer.removeChild(dateElement);
  }
  
  // Handle watermark display
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
  // Photostrip color options
  const photostripColorOptions = document.querySelectorAll('.photostrip-options .color-option');
  photostripColorOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Remove selected class from all options
      photostripColorOptions.forEach(opt => opt.classList.remove('selected'));
      
      // Add selected class to clicked option
      option.classList.add('selected');
      
      // Update editor state
      editorState.photostripColor = option.dataset.color;
      
      // Update photostrip
      updatePhotostrip();
    });
  });
}

// Setup filter options
function setupFilterOptions() {
  const filterOptions = document.querySelectorAll('.filter-option');
  filterOptions.forEach(option => {
    option.addEventListener('click', () => {
      // Remove selected class from all options
      filterOptions.forEach(opt => opt.classList.remove('selected'));
      
      // Add selected class to clicked option
      option.classList.add('selected');
      
      // Update editor state
      editorState.filter = option.dataset.filter;
      
      // Update photostrip
      updatePhotostrip();
    });
  });
}

// Setup sticker options
function setupStickerOptions() {
  const stickerOptions = document.querySelectorAll('.sticker:not(.add-sticker)');
  stickerOptions.forEach(sticker => {
    sticker.addEventListener('click', () => {
      // Get the sticker image
      const stickerImg = sticker.querySelector('img');
      if (stickerImg) {
        addStickerToPhotostrip(stickerImg.src);
      }
    });
  });
  
  // Add sticker button
  const addStickerButton = document.querySelector('.add-sticker');
  if (addStickerButton) {
    addStickerButton.addEventListener('click', () => {
      // This would normally open a file picker to upload custom stickers
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
  
  // Make sticker draggable
  makeStickerDraggable(stickerElement);
  
  // Add to stickers array
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
    // Get the current mouse position
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    // Set the active sticker
    activeStickerElement = element;
    
    // Add highlight to active sticker
    element.style.outline = '2px solid ' + getColorValue(editorState.photostripColor);
    
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }
  
  function elementDrag(e) {
    e.preventDefault();
    // Calculate the new position
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    // Set the element's new position
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
  }
  
  function closeDragElement() {
    // Stop moving when mouse button is released
    document.onmouseup = null;
    document.onmousemove = null;
    
    // Remove highlight from active sticker
    if (activeStickerElement) {
      activeStickerElement.style.outline = 'none';
      activeStickerElement = null;
    }
  }
}

// Generate the final photostrip image
function generatePhotostrip() {
  // Create a clean version for preview updates
  updatePhotostrip();
  showToast('Photostrip updated!');
}

// Generate the final photostrip for download
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
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  
  // Add to the document
  document.body.appendChild(toast);
  
  // Animate in
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Remove after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

// Create toast CSS
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  .toast {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background-color: #4CAF50;
    color: white;
    border-radius: 4px;
    z-index: 1000;
    opacity: 0;
    transform: translateX(20px);
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .toast.error {
    background-color: #f44336;
  }
  
  .toast.info {
    background-color: #2196F3;
  }
  
  .toast.show {
    opacity: 1;
    transform: translateX(0);
  }
`;

document.head.appendChild(toastStyle);

// Initialize the app
window.addEventListener('DOMContentLoaded', init);
