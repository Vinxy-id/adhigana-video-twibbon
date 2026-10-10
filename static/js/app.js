/**
 * Video Twibbon Engine - Adhigana Informatika 2026
 * Interactive Canvas, Real-time WebGL/2D Compositor, Gestures & Fast Export
 */

document.addEventListener("DOMContentLoaded", () => {
  const config = window.APP_CONFIG || {};

  // Elements
  const previewContainer = document.getElementById("previewContainer");
  const compositeCanvas = document.getElementById("compositeCanvas");
  const emptyPlaceholder = document.getElementById("emptyPlaceholder");
  const dragHintBadge = document.getElementById("dragHintBadge");
  const canvasLoader = document.getElementById("canvasLoader");
  const canvasLoaderText = document.getElementById("canvasLoaderText");
  const templateVideo = document.getElementById("templateVideo");

  // Playback Elements
  const btnPlayPause = document.getElementById("btnPlayPause");
  const playIcon = document.getElementById("playIcon");
  const timelineSlider = document.getElementById("timelineSlider");
  const currentTimeLabel = document.getElementById("currentTime");
  const durationTimeLabel = document.getElementById("durationTime");
  const btnMuteToggle = document.getElementById("btnMuteToggle");
  const muteIcon = document.getElementById("muteIcon");
  const jumpChips = document.querySelectorAll(".jump-chip");

  // Input & Sliders
  const fileInput = document.getElementById("fileInput");
  const cameraInput = document.getElementById("cameraInput");
  const btnBrowseFile = document.getElementById("btnBrowseFile");
  const btnCameraFile = document.getElementById("btnCameraFile");
  const sliderZoom = document.getElementById("sliderZoom");
  const zoomValueText = document.getElementById("zoomValueText");
  const sliderRotate = document.getElementById("sliderRotate");
  const rotateValueText = document.getElementById("rotateValueText");
  const btnCenterPhoto = document.getElementById("btnCenterPhoto");
  const btnRotate90 = document.getElementById("btnRotate90");
  const btnFitCircle = document.getElementById("btnFitCircle");
  const btnResetTransform = document.getElementById("btnResetTransform");

  // Camera Modal Elements
  const cameraModal = document.getElementById("cameraModal");
  const cameraStream = document.getElementById("cameraStream");
  const cameraLoading = document.getElementById("cameraLoading");
  const btnCloseCameraModal = document.getElementById("btnCloseCameraModal");
  const btnSwitchCamera = document.getElementById("btnSwitchCamera");
  const btnCapturePhoto = document.getElementById("btnCapturePhoto");
  let activeMediaStream = null;
  let currentFacingMode = "user"; // 'user' (selfie/front) or 'environment' (back)

  // Export Buttons
  const btnDownloadVideo = document.getElementById("btnDownloadVideo");
  const btnDownloadPhoto = document.getElementById("btnDownloadPhoto");
  const btnCopyCaption = document.getElementById("btnCopyCaption");

  // Modals & Notifications
  const renderModal = document.getElementById("renderModal");
  const renderProgressBar = document.getElementById("renderProgressBar");
  const renderStatusText = document.getElementById("renderStatusText");
  const shareModal = document.getElementById("shareModal");
  const btnShareModal = document.getElementById("btnShareModal");
  const btnCloseShareModal = document.getElementById("btnCloseShareModal");
  const btnCopyNetworkUrl = document.getElementById("btnCopyNetworkUrl");
  const networkUrlText = document.getElementById("networkUrlText");
  const settingsModal = document.getElementById("settingsModal");
  const btnSettingsModal = document.getElementById("btnSettingsModal");
  const btnCloseSettingsModal = document.getElementById("btnCloseSettingsModal");
  const btnCancelSettings = document.getElementById("btnCancelSettings");
  const btnSaveSettings = document.getElementById("btnSaveSettings");
  const toastNotification = document.getElementById("toastNotification");
  const toastMessage = document.getElementById("toastMessage");

  // Preloaded Static Frame (only used for static photo export)
  const staticFrameImg = new Image();
  staticFrameImg.src = config.staticFrameUrl;

  // Twibbon Geometry Parameters
  const CIRCLE_X = config.circleCenterX || 536;
  const CIRCLE_Y = config.circleCenterY || 543;
  const CIRCLE_RADIUS = config.circleRadius || 330;

  // Photo State
  let userImg = null;
  let photoState = {
    x: 0, // offset from CIRCLE_X
    y: 0, // offset from CIRCLE_Y
    scale: 1.0,
    baseScale: 1.0,
    rotation: 0, // degrees
  };

  // Drag & Touch Gesture State
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialPhotoX = 0;
  let initialPhotoY = 0;
  let initialPinchDist = 0;
  let initialPinchScale = 1.0;

  // Offscreen Photo Canvas (1080x1080)
  const photoCanvas = document.createElement("canvas");
  photoCanvas.width = 1080;
  photoCanvas.height = 1080;
  const photoCtx = photoCanvas.getContext("2d");

  // Offscreen Video Canvas for 2D Fallback
  const videoOffscreen = document.createElement("canvas");
  videoOffscreen.width = 1080;
  videoOffscreen.height = 1080;
  const videoOffCtx = videoOffscreen.getContext("2d");

  // WebGL & 2D Contexts
  let gl = null;
  let ctx = null;
  let shaderProgram = null;
  let videoTexture = null;
  let photoTexture = null;
  let useWebGL = false;

  function initWebGL() {
    try {
      const opts = { preserveDrawingBuffer: true, alpha: false, antialias: true };
      gl = compositeCanvas.getContext("webgl", opts) ||
           compositeCanvas.getContext("experimental-webgl", opts);

      if (!gl) {
        console.warn("WebGL not supported, falling back to Canvas 2D");
        return false;
      }

      const vsSource = `
        attribute vec2 a_position;
        varying vec2 v_uv;
        void main() {
          v_uv = (a_position + 1.0) * 0.5;
          v_uv.y = 1.0 - v_uv.y; // Flip Y for video coordinates
          gl_Position = vec4(a_position, 0.0, 1.0);
        }
      `;

      const fsSource = `
        precision mediump float;
        uniform sampler2D u_video;
        uniform sampler2D u_photo;
        uniform vec2 u_center;
        uniform float u_radius;
        uniform float u_time;
        varying vec2 v_uv;

        void main() {
          vec4 vid = texture2D(u_video, v_uv);
          vec4 pic = texture2D(u_photo, v_uv);

          float d = distance(v_uv, u_center);
          float brightness = max(vid.r, max(vid.g, vid.b));

          // Twibbon photo ONLY appears when time >= 9.5s and inside the center circle
          float keyAlpha = 0.0;
          if (u_time >= 9.5 && d <= u_radius) {
            keyAlpha = 1.0 - smoothstep(0.04, 0.12, brightness);
          }

          // Composite moving video and user photo
          gl_FragColor = mix(vid, pic, keyAlpha);
        }
      `;

      function compileShader(source, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.error("Shader compile error:", gl.getShaderInfoLog(shader));
          gl.deleteShader(shader);
          return null;
        }
        return shader;
      }

      const vs = compileShader(vsSource, gl.VERTEX_SHADER);
      const fs = compileShader(fsSource, gl.FRAGMENT_SHADER);
      if (!vs || !fs) return false;

      shaderProgram = gl.createProgram();
      gl.attachShader(shaderProgram, vs);
      gl.attachShader(shaderProgram, fs);
      gl.linkProgram(shaderProgram);

      if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error("Program link error:", gl.getProgramInfoLog(shaderProgram));
        return false;
      }

      // Quad buffer
      const positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1
      ]), gl.STATIC_DRAW);

      const aPosition = gl.getAttribLocation(shaderProgram, "a_position");
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

      // Create textures
      videoTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, videoTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      photoTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, photoTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      return true;
    } catch (e) {
      console.warn("WebGL initialization failed, using 2D canvas fallback:", e);
      return false;
    }
  }

  // Initialize WebGL FIRST (so getContext('2d') is NOT called on compositeCanvas unless WebGL fails)
  useWebGL = initWebGL();
  if (!useWebGL) {
    ctx = compositeCanvas.getContext("2d");
  }

  // Draw Transformed Photo to Offscreen Canvas
  function updatePhotoCanvas() {
    photoCtx.fillStyle = "#000000";
    photoCtx.fillRect(0, 0, 1080, 1080);

    if (userImg) {
      photoCtx.save();
      // Center of circle frame
      photoCtx.translate(CIRCLE_X + photoState.x, CIRCLE_Y + photoState.y);
      photoCtx.rotate((photoState.rotation * Math.PI) / 180);
      photoCtx.scale(photoState.scale, photoState.scale);

      const w = userImg.width;
      const h = userImg.height;
      photoCtx.drawImage(userImg, -w / 2, -h / 2, w, h);
      photoCtx.restore();
    }

    if (useWebGL && gl && photoTexture) {
      gl.bindTexture(gl.TEXTURE_2D, photoTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, photoCanvas);
    }
  }

  // Render Live Moving Composite
  function renderComposite() {
    if (templateVideo.readyState < 2) {
      return;
    }

    const curTime = templateVideo.currentTime || 0;

    if (useWebGL && gl) {
      renderWebGL(curTime);
    } else {
      render2DFallback(curTime);
    }
  }

  function renderWebGL(curTime) {
    gl.viewport(0, 0, 1080, 1080);
    gl.useProgram(shaderProgram);

    // Update live video frame to video texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, videoTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, templateVideo);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, "u_video"), 0);

    // Photo texture
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, photoTexture);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, "u_photo"), 1);

    // Uniforms
    gl.uniform2f(gl.getUniformLocation(shaderProgram, "u_center"), CIRCLE_X / 1080.0, CIRCLE_Y / 1080.0);
    gl.uniform1f(gl.getUniformLocation(shaderProgram, "u_radius"), CIRCLE_RADIUS / 1080.0);
    gl.uniform1f(gl.getUniformLocation(shaderProgram, "u_time"), curTime);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  // Fallback 2D Compositor (Always keeps video moving!)
  function render2DFallback(curTime) {
    if (!ctx) return;
    ctx.clearRect(0, 0, 1080, 1080);

    if (curTime < 9.5) {
      // Intro animation: draw moving video directly
      ctx.drawImage(templateVideo, 0, 0, 1080, 1080);
    } else {
      // Twibbon phase: photo underneath, video with circle punched out on top
      ctx.drawImage(photoCanvas, 0, 0, 1080, 1080);

      videoOffCtx.clearRect(0, 0, 1080, 1080);
      videoOffCtx.drawImage(templateVideo, 0, 0, 1080, 1080);

      videoOffCtx.save();
      videoOffCtx.globalCompositeOperation = "destination-out";
      videoOffCtx.beginPath();
      videoOffCtx.arc(CIRCLE_X, CIRCLE_Y, CIRCLE_RADIUS - 3, 0, Math.PI * 2);
      videoOffCtx.fill();
      videoOffCtx.restore();

      ctx.drawImage(videoOffscreen, 0, 0, 1080, 1080);
    }
  }

  // Continuous Animation Loop for Video Playback
  let isPlaying = false;
  function videoLoop() {
    if (!templateVideo.paused && !templateVideo.ended) {
      timelineSlider.value = templateVideo.currentTime;
      updateTimeLabel(templateVideo.currentTime);
      renderComposite();
      requestAnimationFrame(videoLoop);
    } else {
      isPlaying = false;
      playIcon.className = "fa-solid fa-play text-sm ml-0.5";
    }
  }

  function updateTimeLabel(time) {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    currentTimeLabel.textContent = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  // File Upload Handlers
  function handleImageFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      showToast("Harap pilih file gambar (JPG, PNG, WebP)!", "error");
      return;
    }

    showLoader("Memuat foto...");
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        userImg = img;
        emptyPlaceholder.classList.add("hidden");
        dragHintBadge.classList.remove("hidden");

        // Calculate initial auto-fit scale for circular frame
        const circleDiameter = CIRCLE_RADIUS * 2;
        const minDim = Math.min(img.width, img.height);
        const fitScale = (circleDiameter / minDim) * 1.05; // slightly larger than circle
        photoState.baseScale = fitScale;
        photoState.scale = fitScale;
        photoState.x = 0;
        photoState.y = 0;
        photoState.rotation = 0;

        sliderZoom.value = 1.0;
        zoomValueText.textContent = "100%";
        sliderRotate.value = 0;
        rotateValueText.textContent = "0°";

        updatePhotoCanvas();
        renderComposite();
        hideLoader();
        showToast("Foto berhasil dimuat! Geser untuk menyesuaikan.");
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  btnBrowseFile.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  });

  if (cameraInput) {
    cameraInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handleImageFile(e.target.files[0]);
      }
    });
  }

  // --- LIVE WEBCAM / SMARTPHONE CAMERA ---
  async function openLiveCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (cameraInput) {
        cameraInput.click();
      } else {
        fileInput.setAttribute("capture", "user");
        fileInput.click();
      }
      return;
    }

    cameraModal.classList.remove("hidden");
    cameraLoading.classList.remove("hidden");

    try {
      await startCameraStream(currentFacingMode);

      if (navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = devices.filter((d) => d.kind === "videoinput");
          if (videoInputs.length > 1) {
            btnSwitchCamera.classList.remove("hidden");
          } else {
            btnSwitchCamera.classList.add("hidden");
          }
        } catch (_) {}
      }
    } catch (err) {
      console.warn("getUserMedia failed:", err);
      stopCameraStream();
      cameraModal.classList.add("hidden");
      if (cameraInput) {
        showToast("Membuka kamera sistem...", "info");
        cameraInput.click();
      } else {
        showToast("Gagal mengakses kamera: " + err.message, "error");
      }
    }
  }

  async function startCameraStream(facingMode) {
    stopCameraStream();

    const constraints = {
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 1280 }
      },
      audio: false
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    activeMediaStream = stream;
    cameraStream.srcObject = stream;

    if (facingMode === "user") {
      cameraStream.classList.add("-scale-x-100");
    } else {
      cameraStream.classList.remove("-scale-x-100");
    }

    return new Promise((resolve) => {
      cameraStream.onloadedmetadata = () => {
        cameraStream.play().then(() => {
          cameraLoading.classList.add("hidden");
          resolve();
        }).catch(() => {
          cameraLoading.classList.add("hidden");
          resolve();
        });
      };
    });
  }

  function stopCameraStream() {
    if (activeMediaStream) {
      activeMediaStream.getTracks().forEach((track) => track.stop());
      activeMediaStream = null;
    }
    if (cameraStream) {
      cameraStream.srcObject = null;
    }
  }

  function closeCameraModal() {
    stopCameraStream();
    cameraModal.classList.add("hidden");
  }

  function capturePhotoFromCamera() {
    if (!cameraStream || !cameraStream.videoWidth) {
      showToast("Kamera belum siap, tunggu sebentar...", "error");
      return;
    }

    const vw = cameraStream.videoWidth;
    const vh = cameraStream.videoHeight;
    const cropSize = Math.min(vw, vh);
    const cropX = (vw - cropSize) / 2;
    const cropY = (vh - cropSize) / 2;

    const snapCanvas = document.createElement("canvas");
    snapCanvas.width = 1080;
    snapCanvas.height = 1080;
    const snapCtx = snapCanvas.getContext("2d");

    if (currentFacingMode === "user") {
      snapCtx.translate(1080, 0);
      snapCtx.scale(-1, 1);
    }

    snapCtx.drawImage(
      cameraStream,
      cropX, cropY, cropSize, cropSize,
      0, 0, 1080, 1080
    );

    snapCanvas.toBlob((blob) => {
      if (blob) {
        closeCameraModal();
        handleImageFile(blob);
        showToast("Foto selfie berhasil diambil!");
      }
    }, "image/jpeg", 0.95);
  }

  btnCameraFile.addEventListener("click", openLiveCamera);
  btnCloseCameraModal.addEventListener("click", closeCameraModal);
  btnCapturePhoto.addEventListener("click", capturePhotoFromCamera);

  btnSwitchCamera.addEventListener("click", async () => {
    currentFacingMode = currentFacingMode === "user" ? "environment" : "user";
    cameraLoading.classList.remove("hidden");
    try {
      await startCameraStream(currentFacingMode);
    } catch (err) {
      console.error(err);
      showToast("Gagal mengganti kamera: " + err.message, "error");
    }
  });

  cameraModal.addEventListener("click", (e) => {
    if (e.target === cameraModal) {
      closeCameraModal();
    }
  });

  // Drag & Drop File onto Container
  previewContainer.addEventListener("dragover", (e) => {
    e.preventDefault();
    previewContainer.classList.add("ring-2", "ring-red-500");
  });

  previewContainer.addEventListener("dragleave", () => {
    previewContainer.classList.remove("ring-2", "ring-red-500");
  });

  previewContainer.addEventListener("drop", (e) => {
    e.preventDefault();
    previewContainer.classList.remove("ring-2", "ring-red-500");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  });

  // Interactive Pan / Touch Gestures on Canvas
  previewContainer.addEventListener("mousedown", (e) => {
    if (!userImg) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    initialPhotoX = photoState.x;
    initialPhotoY = photoState.y;
    previewContainer.style.cursor = "grabbing";
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging || !userImg) return;
    const rect = compositeCanvas.getBoundingClientRect();
    const scaleFactor = 1080 / rect.width;
    const dx = (e.clientX - dragStartX) * scaleFactor;
    const dy = (e.clientY - dragStartY) * scaleFactor;
    photoState.x = initialPhotoX + dx;
    photoState.y = initialPhotoY + dy;
    updatePhotoCanvas();
    renderComposite();
  });

  window.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      previewContainer.style.cursor = "grab";
    }
  });

  // Touch Events for Mobile (Pan & Pinch-to-Zoom)
  previewContainer.addEventListener("touchstart", (e) => {
    if (!userImg) return;
    if (e.touches.length === 1) {
      isDragging = true;
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;
      initialPhotoX = photoState.x;
      initialPhotoY = photoState.y;
    } else if (e.touches.length === 2) {
      isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialPinchDist = Math.hypot(dx, dy);
      initialPinchScale = photoState.scale;
    }
  }, { passive: false });

  previewContainer.addEventListener("touchmove", (e) => {
    if (!userImg) return;
    e.preventDefault(); // Prevent page scroll while editing
    const rect = compositeCanvas.getBoundingClientRect();
    const scaleFactor = 1080 / rect.width;

    if (e.touches.length === 1 && isDragging) {
      const dx = (e.touches[0].clientX - dragStartX) * scaleFactor;
      const dy = (e.touches[0].clientY - dragStartY) * scaleFactor;
      photoState.x = initialPhotoX + dx;
      photoState.y = initialPhotoY + dy;
      updatePhotoCanvas();
      renderComposite();
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      if (initialPinchDist > 0) {
        const pinchRatio = currentDist / initialPinchDist;
        photoState.scale = Math.max(0.1, Math.min(5.0, initialPinchScale * pinchRatio));
        const sliderVal = (photoState.scale / photoState.baseScale).toFixed(2);
        sliderZoom.value = sliderVal;
        zoomValueText.textContent = `${Math.round(sliderVal * 100)}%`;
        updatePhotoCanvas();
        renderComposite();
      }
    }
  }, { passive: false });

  previewContainer.addEventListener("touchend", () => {
    isDragging = false;
  });

  // Mouse Wheel Zoom
  previewContainer.addEventListener("wheel", (e) => {
    if (!userImg) return;
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? -0.05 : 0.05;
    let currentRel = parseFloat(sliderZoom.value);
    currentRel = Math.max(0.2, Math.min(3.0, currentRel + zoomDelta));
    sliderZoom.value = currentRel.toFixed(2);
    zoomValueText.textContent = `${Math.round(currentRel * 100)}%`;
    photoState.scale = photoState.baseScale * currentRel;
    updatePhotoCanvas();
    renderComposite();
  }, { passive: false });

  // Slider Events
  sliderZoom.addEventListener("input", (e) => {
    const val = parseFloat(e.target.value);
    zoomValueText.textContent = `${Math.round(val * 100)}%`;
    photoState.scale = photoState.baseScale * val;
    updatePhotoCanvas();
    renderComposite();
  });

  sliderRotate.addEventListener("input", (e) => {
    const val = parseInt(e.target.value, 10);
    rotateValueText.textContent = `${val}°`;
    photoState.rotation = val;
    updatePhotoCanvas();
    renderComposite();
  });

  // Quick Action Buttons
  btnCenterPhoto.addEventListener("click", () => {
    photoState.x = 0;
    photoState.y = 0;
    updatePhotoCanvas();
    renderComposite();
    showToast("Posisi foto dipusatkan.");
  });

  btnRotate90.addEventListener("click", () => {
    let rot = (photoState.rotation + 90) % 360;
    if (rot > 180) rot -= 360;
    photoState.rotation = rot;
    sliderRotate.value = rot;
    rotateValueText.textContent = `${rot}°`;
    updatePhotoCanvas();
    renderComposite();
  });

  btnFitCircle.addEventListener("click", () => {
    if (!userImg) return;
    photoState.x = 0;
    photoState.y = 0;
    photoState.scale = photoState.baseScale;
    sliderZoom.value = 1.0;
    zoomValueText.textContent = "100%";
    updatePhotoCanvas();
    renderComposite();
    showToast("Foto disesuaikan dengan bingkai lingkaran.");
  });

  btnResetTransform.addEventListener("click", () => {
    if (!userImg) return;
    photoState.x = 0;
    photoState.y = 0;
    photoState.scale = photoState.baseScale;
    photoState.rotation = 0;
    sliderZoom.value = 1.0;
    zoomValueText.textContent = "100%";
    sliderRotate.value = 0;
    rotateValueText.textContent = "0°";
    updatePhotoCanvas();
    renderComposite();
    showToast("Transformasi di-reset ke awal.");
  });


  // Video Playback Controls
  btnPlayPause.addEventListener("click", () => {
    if (templateVideo.paused) {
      templateVideo.play();
      isPlaying = true;
      playIcon.className = "fa-solid fa-pause text-sm";
      requestAnimationFrame(videoLoop);
    } else {
      templateVideo.pause();
      isPlaying = false;
      playIcon.className = "fa-solid fa-play text-sm ml-0.5";
    }
  });

  btnMuteToggle.addEventListener("click", () => {
    templateVideo.muted = !templateVideo.muted;
    muteIcon.className = templateVideo.muted ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high text-red-400";
  });

  timelineSlider.addEventListener("input", (e) => {
    const t = parseFloat(e.target.value);
    templateVideo.currentTime = t;
    updateTimeLabel(t);
    renderComposite();
  });

  jumpChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const t = parseFloat(chip.dataset.time);
      templateVideo.currentTime = t;
      timelineSlider.value = t;
      updateTimeLabel(t);
      renderComposite();
    });
  });

  // Template Video Load & Metadata
  templateVideo.addEventListener("loadedmetadata", () => {
    timelineSlider.max = templateVideo.duration;
    const m = Math.floor(templateVideo.duration / 60);
    const s = Math.floor(templateVideo.duration % 60);
    durationTimeLabel.textContent = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    templateVideo.currentTime = 11.0; // Default to main twibbon frame
    timelineSlider.value = 11.0;
    updateTimeLabel(11.0);
  });

  templateVideo.addEventListener("seeked", () => {
    renderComposite();
  });

  // IN-BROWSER CLIENT-SIDE VIDEO RECORDING (Zero Server / Vercel / GitHub Pages / Offline)
  async function recordVideoClientSide() {
    renderProgressBar.style.width = "5%";
    renderStatusText.textContent = "Menyiapkan perekaman video di browser...";

    // 1. Capture stream from compositeCanvas at 30 fps
    const canvasStream = compositeCanvas.captureStream(30);
    const combinedStream = new MediaStream();
    canvasStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));

    // 2. Attach audio from templateVideo via Web Audio API
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const audioCtx = new AudioContextClass();
        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
        }
        if (!templateVideo._audioSource) {
          templateVideo._audioSource = audioCtx.createMediaElementSource(templateVideo);
        }
        const audioDest = audioCtx.createMediaStreamDestination();
        templateVideo._audioSource.connect(audioDest);
        const audioTrack = audioDest.stream.getAudioTracks()[0];
        if (audioTrack) {
          combinedStream.addTrack(audioTrack);
        }
      }
    } catch (err) {
      console.warn("AudioContext setup:", err);
    }

    // 3. Select supported MIME type
    const mimeTypes = [
      'video/mp4;codecs=avc1,mp4a.40.2',
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=h264,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm'
    ];
    let selectedMime = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';

    let recorder;
    try {
      recorder = selectedMime
        ? new MediaRecorder(combinedStream, { mimeType: selectedMime, videoBitsPerSecond: 6000000 })
        : new MediaRecorder(combinedStream);
    } catch (e) {
      recorder = new MediaRecorder(combinedStream);
    }

    const recordedChunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    templateVideo.currentTime = 0;
    templateVideo.muted = false; // Need sound on for audio destination
    await new Promise(res => {
      const onSeeked = () => {
        templateVideo.removeEventListener("seeked", onSeeked);
        res();
      };
      templateVideo.addEventListener("seeked", onSeeked);
      setTimeout(res, 400);
    });

    recorder.start(100);

    const duration = templateVideo.duration || 17.9;
    let recordingActive = true;

    return new Promise((resolve, reject) => {
      function renderRecordingFrame() {
        if (!recordingActive) return;
        renderComposite();

        const cur = templateVideo.currentTime;
        const pct = Math.min(95, Math.floor(10 + (cur / duration) * 85));
        renderProgressBar.style.width = `${pct}%`;
        renderStatusText.textContent = `Merekam video di browsermu (${Math.floor(cur)}s / ${Math.floor(duration)}s)...`;

        if (cur >= duration - 0.2 || templateVideo.ended) {
          finishRecording();
        } else {
          requestAnimationFrame(renderRecordingFrame);
        }
      }

      function finishRecording() {
        if (!recordingActive) return;
        recordingActive = false;
        templateVideo.pause();
        templateVideo.muted = true;

        renderProgressBar.style.width = "98%";
        renderStatusText.textContent = "Menyimpan video...";

        recorder.onstop = () => {
          try {
            const finalMime = recorder.mimeType || selectedMime || 'video/mp4';
            const isMp4 = finalMime.toLowerCase().includes('mp4');
            const ext = isMp4 ? 'mp4' : 'webm';
            const videoBlob = new Blob(recordedChunks, { type: finalMime });

            const downloadUrl = URL.createObjectURL(videoBlob);
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = `Video_Twibbon_${(config.campaign_title || "Adhigana").replace(/\s+/g, "_")}.${ext}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);

            renderProgressBar.style.width = "100%";
            renderStatusText.textContent = "Selesai! Mengunduh video...";

            setTimeout(() => {
              renderModal.classList.add("hidden");
              triggerCelebration();
              showToast("Video Twibbon berhasil didownload!");
              resolve();
            }, 800);
          } catch (err) {
            reject(err);
          }
        };

        recorder.stop();
      }

      templateVideo.play().then(() => {
        requestAnimationFrame(renderRecordingFrame);
      }).catch(err => {
        recordingActive = false;
        recorder.stop();
        reject(err);
      });
    });
  }

  // DOWNLOAD VIDEO (MP4) - HYBRID AUTO-SWITCH: SERVER FFMPEG OR CLIENT-SIDE RECORDER
  btnDownloadVideo.addEventListener("click", async () => {
    if (!userImg) {
      showToast("Harap pilih foto terlebih dahulu sebelum mendownload video!", "error");
      fileInput.click();
      return;
    }

    // Pause video preview
    if (!templateVideo.paused) {
      templateVideo.pause();
      isPlaying = false;
      playIcon.className = "fa-solid fa-play text-sm ml-0.5";
    }

    renderModal.classList.remove("hidden");

    // Detect if running on static host (Vercel, GitHub Pages, HF Spaces Static, or local file://)
    const isStaticHost = window.location.hostname.includes("github.io") || 
                         window.location.hostname.includes("vercel.app") || 
                         window.location.hostname.includes("hf.space") || 
                         window.location.protocol === "file:";

    if (isStaticHost) {
      try {
        await recordVideoClientSide();
      } catch (err) {
        renderModal.classList.add("hidden");
        console.error(err);
        showToast(`Gagal: ${err.message}`, "error");
      }
      return;
    }

    // Otherwise, try server FFmpeg first (e.g. running Python app.py)
    renderProgressBar.style.width = "15%";
    renderStatusText.textContent = "Menyiapkan foto resolusi tinggi...";

    updatePhotoCanvas();
    const photoBlob = await new Promise((resolve) => photoCanvas.toBlob(resolve, "image/png"));

    const formData = new FormData();
    formData.append("photo", photoBlob, "user_photo.png");

    renderProgressBar.style.width = "40%";
    renderStatusText.textContent = "Menggabungkan video dengan server FFmpeg 1080p...";

    let p = 40;
    const progressInterval = setInterval(() => {
      if (p < 88) {
        p += 5;
        renderProgressBar.style.width = `${p}%`;
      }
    }, 400);

    try {
      const response = await fetch("/api/render-video", {
        method: "POST",
        body: formData
      });

      clearInterval(progressInterval);

      if (response.status === 404) {
        // If server endpoint does not exist, seamlessly fallback to client-side recording!
        console.log("Endpoint /api/render-video tidak ada, beralih ke in-browser recorder...");
        await recordVideoClientSide();
        return;
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || "Gagal me-render video di server");
      }

      renderProgressBar.style.width = "100%";
      renderStatusText.textContent = "Selesai! Mengunduh video...";

      const videoBlob = await response.blob();
      const downloadUrl = URL.createObjectURL(videoBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `Video_Twibbon_${(config.campaign_title || "Adhigana").replace(/\s+/g, "_")}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      setTimeout(() => {
        renderModal.classList.add("hidden");
        triggerCelebration();
        showToast("Video Twibbon berhasil didownload!");
      }, 700);

    } catch (err) {
      clearInterval(progressInterval);
      console.warn("Backend render error, mencoba fallback in-browser recorder:", err);
      // Fallback to client-side recorder on error
      try {
        await recordVideoClientSide();
      } catch (clientErr) {
        renderModal.classList.add("hidden");
        console.error(clientErr);
        showToast(`Gagal: ${err.message}`, "error");
      }
    }
  });

  // DOWNLOAD FOTO STATIS (PNG) - EKSPOR INSTAN DI BROWSER TANPA SERVER
  if (btnDownloadPhoto) {
    btnDownloadPhoto.addEventListener("click", () => {
      if (!userImg) {
        showToast("Harap pilih foto terlebih dahulu!", "error");
        fileInput.click();
        return;
      }

      showLoader("Menyiapkan foto resolusi tinggi...");

      setTimeout(() => {
        try {
          const exportCanvas = document.createElement("canvas");
          exportCanvas.width = 1080;
          exportCanvas.height = 1080;
          const eCtx = exportCanvas.getContext("2d");

          // 1. Gambar foto pengguna dengan transformasi saat ini
          updatePhotoCanvas();

          // Simpan state & buat masking lingkaran agar foto pas di lubang twibbon
          eCtx.save();
          eCtx.beginPath();
          eCtx.arc(CIRCLE_X, CIRCLE_Y, CIRCLE_RADIUS, 0, Math.PI * 2);
          eCtx.closePath();
          eCtx.clip();

          // Gambar foto dari photoCanvas
          eCtx.drawImage(photoCanvas, 0, 0, 1080, 1080);
          eCtx.restore();

          // 2. Gambar frame gambar statis di atas foto
          if (staticFrameImg && staticFrameImg.complete && staticFrameImg.naturalWidth > 0) {
            eCtx.drawImage(staticFrameImg, 0, 0, 1080, 1080);
          }

          // 3. Simpan ke format PNG
          exportCanvas.toBlob((blob) => {
            hideLoader();
            if (!blob) {
              showToast("Gagal memproses gambar.", "error");
              return;
            }
            const dlUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = dlUrl;
            a.download = `Twibbon_Foto_${(config.campaign_title || "Adhigana").replace(/\s+/g, "_")}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(dlUrl);

            triggerCelebration();
            showToast("Foto Twibbon berhasil didownload!");
          }, "image/png");

        } catch (err) {
          hideLoader();
          console.error(err);
          showToast("Gagal mendownload foto: " + err.message, "error");
        }
      }, 100);
    });
  }

  // COPY CAPTION
  btnCopyCaption.addEventListener("click", () => {
    const caption = config.captionTemplate || "Saya siap mengikuti Adhigana Informatika 2026!";
    navigator.clipboard.writeText(caption).then(() => {
      if (caption.includes("[Isi Nama Kamu]")) {
        showToast("Caption tersalin! Ingat ganti [Isi Nama Kamu] dengan namamu ya!", "info");
      } else {
        showToast("Caption tersalin! Tinggal paste di Instagram / TikTok / WA.");
      }
    }).catch(() => {
      showToast("Gagal menyalin otomatis, silakan copy manual.", "error");
    });
  });

  // SHARE / QR MODAL
  let qrcodeInstance = null;
  const getShareUrl = () => {
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return window.location.origin;
    }
    return config.networkUrl || window.location.origin;
  };

  btnShareModal.addEventListener("click", () => {
    shareModal.classList.remove("hidden");
    const container = document.getElementById("qrcodeContainer");
    const shareUrl = getShareUrl();
    if (networkUrlText) {
      networkUrlText.textContent = shareUrl;
    }
    if (container && window.QRCode) {
      container.innerHTML = "";
      qrcodeInstance = new QRCode(container, {
        text: shareUrl,
        width: 160,
        height: 160,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    }
  });

  btnCloseShareModal.addEventListener("click", () => shareModal.classList.add("hidden"));
  btnCopyNetworkUrl.addEventListener("click", () => {
    navigator.clipboard.writeText(getShareUrl()).then(() => {
      showToast("Link berhasil disalin!");
    });
  });

  // SETTINGS MODAL (Admin Only)
  if (btnSettingsModal) {
    btnSettingsModal.addEventListener("click", () => settingsModal.classList.remove("hidden"));
  }
  btnCloseSettingsModal.addEventListener("click", () => settingsModal.classList.add("hidden"));
  btnCancelSettings.addEventListener("click", () => settingsModal.classList.add("hidden"));

  btnSaveSettings.addEventListener("click", async () => {
    const adminPin = (document.getElementById("cfgAdminPin")?.value || "").trim();
    if (!adminPin) {
      showToast("Harap masukkan PIN Admin!", "error");
      document.getElementById("cfgAdminPin")?.focus();
      return;
    }

    const newTitle = document.getElementById("cfgTitle").value;
    const newSubtitle = document.getElementById("cfgSubtitle").value;
    const newCaption = document.getElementById("cfgCaption").value;
    const newTwibbonizeUrl = document.getElementById("cfgTwibbonizeUrl")?.value || "";
    const newVideoFile = document.getElementById("cfgNewVideo").files[0];

    showLoader("Menyimpan pengaturan...");

    try {
      if (newVideoFile) {
        const vfd = new FormData();
        vfd.append("video", newVideoFile);
        vfd.append("admin_pin", adminPin);
        const upRes = await fetch("/api/upload-template", { 
          method: "POST",
          headers: { "X-Admin-Pin": adminPin },
          body: vfd 
        });
        if (!upRes.ok) {
          const upErr = await upRes.json();
          throw new Error(upErr.message || "Gagal mengunggah template video");
        }
      }

      const cfgRes = await fetch("/api/config", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Admin-Pin": adminPin
        },
        body: JSON.stringify({
          admin_pin: adminPin,
          campaign_title: newTitle,
          campaign_subtitle: newSubtitle,
          caption_template: newCaption,
          twibbonize_url: newTwibbonizeUrl
        })
      });

      if (!cfgRes.ok) {
        const cfgErr = await cfgRes.json();
        throw new Error(cfgErr.message || "PIN Admin salah atau akses ditolak");
      }

      hideLoader();
      settingsModal.classList.add("hidden");
      showToast("Pengaturan berhasil disimpan! Halaman akan dimuat ulang.");
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      hideLoader();
      showToast(`Gagal: ${err.message}`, "error");
    }
  });

  // UI Feedback: Toast & Loader
  let toastTimeout = null;
  function showToast(msg, type = "success") {
    clearTimeout(toastTimeout);
    toastMessage.textContent = msg;
    const toastIcon = document.getElementById("toastIcon");
    if (type === "error") {
      toastIcon.className = "fa-solid fa-circle-exclamation text-red-400 text-sm";
    } else {
      toastIcon.className = "fa-solid fa-circle-check text-green-400 text-sm";
    }
    toastNotification.classList.remove("translate-y-20", "opacity-0");
    toastTimeout = setTimeout(() => {
      toastNotification.classList.add("translate-y-20", "opacity-0");
    }, 3500);
  }

  function showLoader(text = "Memproses...") {
    canvasLoaderText.textContent = text;
    canvasLoader.classList.remove("hidden");
  }

  function hideLoader() {
    canvasLoader.classList.add("hidden");
  }

  function triggerCelebration() {
    if (window.confetti) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });
    }
  }

  // Initial draw
  updatePhotoCanvas();
  renderComposite();
});
