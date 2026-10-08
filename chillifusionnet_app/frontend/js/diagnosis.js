/**
 * diagnosis.js
 * Comprehensive Single and Multi-Image Diagnosis Controller for ChilliFusionNet
 * Supports: Drag & Drop, Multi-Selection, Client/Backend Validation,
 * Live Progress Indicators, Explainable AI (Grad-CAM), Filtering, Sorting, and PDF Reports.
 */

document.addEventListener('DOMContentLoaded', async () => {
    // UI Elements - Upload & Inputs
    const uploadZone = document.getElementById('upload-zone');
    const fileInputGallery = document.getElementById('file-input-gallery');
    const fileInputCamera = document.getElementById('file-input-camera');
    const uploadPrompt = document.getElementById('upload-prompt');
    const singlePreviewContainer = document.getElementById('image-preview-container');
    const singleImagePreview = document.getElementById('image-preview');
    const batchPreviewContainer = document.getElementById('batch-preview-container');
    const previewCardsGrid = document.getElementById('preview-cards-grid');
    const previewCountEl = document.getElementById('preview-count');
    const uploadErrorMsg = document.getElementById('upload-error-msg');

    // Action Buttons
    const btnRemove = document.getElementById('btn-remove');
    const btnChange = document.getElementById('btn-change');
    const btnReset = document.getElementById('btn-reset');
    const btnClearAll = document.getElementById('btn-clear-all');
    const btnDiagnose = document.getElementById('btn-diagnose');
    const btnDiagnoseLabel = document.getElementById('btn-diagnose-label');
    const btnZoomPreview = document.getElementById('btn-zoom-preview');

    // Progress Box Elements
    const progressBox = document.getElementById('diagnosis-progress-box');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressPctText = document.getElementById('progress-pct-text');
    const progressStatusTitle = document.getElementById('progress-status-title');
    const progressStepText = document.getElementById('progress-step-text');
    const progressCurrentFilename = document.getElementById('progress-current-filename');

    // Result States
    const stateEmpty = document.getElementById('results-empty');
    const stateLoading = document.getElementById('results-loading');
    const stateSingleData = document.getElementById('results-data');
    const stateBatchData = document.getElementById('batch-results-data');
    const stateError = document.getElementById('results-error');

    // Batch UI Elements
    const batchCardsGrid = document.getElementById('batch-cards-grid');
    const batchSortSelect = document.getElementById('batch-sort-select');
    const batchFailedAlert = document.getElementById('batch-failed-alert');
    const failedAlertList = document.getElementById('failed-alert-list');
    const batchDistributionList = document.getElementById('batch-distribution-list');

    // Modals
    const imageModal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');
    const modalCaption = document.getElementById('modal-caption');
    const modalClose = document.getElementById('modal-close');

    const detailModal = document.getElementById('leaf-detail-modal');
    const btnCloseDetailModal = document.getElementById('btn-close-detail-modal');

    // Application State
    let selectedFiles = []; // Array of File objects
    let previewDataUrls = new Map(); // file.name -> dataUrl
    let maxBatchSize = 20;
    let allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];
    let currentBatchResponse = null;
    let activeFilter = 'all';
    let activeSort = 'upload';
    let progressTimer = null;

    // Load dynamic config from backend
    try {
        const config = await window.ApiService.getConfig();
        if (config && config.max_batch_size) {
            maxBatchSize = config.max_batch_size;
        }
        if (config && config.allowed_extensions) {
            allowedExtensions = config.allowed_extensions;
        }
    } catch (e) {
        console.warn("Using default upload config:", e);
    }

    // ==========================================================
    // DRAG AND DROP HANDLERS
    // ==========================================================
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => {
            uploadZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, () => {
            uploadZone.classList.remove('dragover');
        }, false);
    });

    uploadZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length > 0) {
            handleIncomingFiles(Array.from(dt.files));
        }
    }, false);

    // Gallery File Input change
    if (fileInputGallery) {
        fileInputGallery.addEventListener('change', function () {
            if (this.files && this.files.length > 0) {
                handleIncomingFiles(Array.from(this.files));
            }
            this.value = ''; // Reset input to allow re-selecting same files
        });
    }

    // Camera File Input change
    if (fileInputCamera) {
        fileInputCamera.addEventListener('change', function () {
            if (this.files && this.files.length > 0) {
                handleIncomingFiles(Array.from(this.files));
            }
            this.value = '';
        });
    }

    // ==========================================================
    // WEBCAM LOGIC
    // ==========================================================
    let cameraStream = null;
    const cameraContainer = document.getElementById('camera-container');
    const cameraVideo = document.getElementById('camera-video');
    const btnCapture = document.getElementById('btn-capture');
    const btnCloseCamera = document.getElementById('btn-close-camera');
    const uploadOptions = document.querySelector('.upload-options');

    window.openWebcam = function () {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                cameraStream = stream;
                cameraVideo.srcObject = stream;
                cameraContainer.classList.remove('hidden');
                if (uploadOptions) uploadOptions.classList.add('hidden');
            })
            .catch(err => {
                console.error("Camera access denied or unavailable", err);
                showUploadError("Unable to access the camera. Please check device permissions.");
            });
    };

    function closeWebcam() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
        if (cameraContainer) cameraContainer.classList.add('hidden');
        if (uploadOptions) uploadOptions.classList.remove('hidden');
    }

    if (btnCloseCamera) btnCloseCamera.addEventListener('click', closeWebcam);

    if (btnCapture) {
        btnCapture.addEventListener('click', () => {
            if (!cameraStream) return;
            const canvas = document.createElement('canvas');
            canvas.width = cameraVideo.videoWidth || 640;
            canvas.height = cameraVideo.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
                const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
                const file = new File([blob], `chilli_capture_${timestamp}.jpg`, { type: "image/jpeg" });
                closeWebcam();
                handleIncomingFiles([file]);
            }, 'image/jpeg', 0.95);
        });
    }

    // ==========================================================
    // FILE VALIDATION & INGESTION
    // ==========================================================
    async function handleIncomingFiles(newFiles) {
        hideUploadError();

        if (!newFiles || newFiles.length === 0) return;

        // 1. Check Batch Size Limit
        const potentialTotal = selectedFiles.length + newFiles.length;
        if (potentialTotal > maxBatchSize) {
            showUploadError(`Maximum ${maxBatchSize} images can be tested at once. You selected ${potentialTotal} images.`);
            // Slice files up to max limit
            const allowedCount = Math.max(0, maxBatchSize - selectedFiles.length);
            if (allowedCount === 0) return;
            newFiles = newFiles.slice(0, allowedCount);
        }

        const validNewFiles = [];

        // 2. Validate individual files
        for (const file of newFiles) {
            const ext = '.' + file.name.split('.').pop().toLowerCase();
            if (!allowedExtensions.includes(ext)) {
                showUploadError(`"${file.name}" could not be processed because the file extension is not supported. Allowed: JPG, PNG, WEBP.`);
                continue;
            }

            if (file.size > 10 * 1024 * 1024) {
                showUploadError(`"${file.name}" exceeds the maximum 10MB size limit.`);
                continue;
            }

            if (file.size === 0) {
                showUploadError(`"${file.name}" is an empty file.`);
                continue;
            }

            // Verify readable image format via Image decode
            try {
                const dataUrl = await readFileAsDataURL(file);
                await validateImageReadability(dataUrl);
                previewDataUrls.set(file.name, dataUrl);
                validNewFiles.push(file);
            } catch (err) {
                showUploadError(`"${file.name}" could not be processed because the image is invalid or corrupted.`);
            }
        }

        if (validNewFiles.length === 0) return;

        // Deduplicate and append
        for (const vf of validNewFiles) {
            // Remove existing duplicate with same name/size if any
            selectedFiles = selectedFiles.filter(f => !(f.name === vf.name && f.size === vf.size));
            selectedFiles.push(vf);
        }

        updateUploadUI();
    }

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }

    function validateImageReadability(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => reject(new Error('Corrupt image'));
            img.src = dataUrl;
        });
    }

    function showUploadError(msg) {
        if (uploadErrorMsg) {
            uploadErrorMsg.textContent = msg;
            uploadErrorMsg.classList.remove('hidden');
        }
    }

    function hideUploadError() {
        if (uploadErrorMsg) {
            uploadErrorMsg.textContent = '';
            uploadErrorMsg.classList.add('hidden');
        }
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // ==========================================================
    // UPLOAD UI STATE MANAGEMENT
    // ==========================================================
    function updateUploadUI() {
        const count = selectedFiles.length;

        if (count === 0) {
            // Idle State
            uploadPrompt.classList.remove('hidden');
            singlePreviewContainer.classList.add('hidden');
            batchPreviewContainer.classList.add('hidden');

            btnReset.disabled = true;
            btnDiagnose.disabled = true;
            if (btnChange) btnChange.classList.add('hidden');
            btnDiagnoseLabel.textContent = 'Diagnose Leaf';

            showResultState('empty');
            return;
        }

        // Active State
        btnReset.disabled = false;
        btnDiagnose.disabled = false;
        if (btnChange) btnChange.classList.remove('hidden');

        if (count === 1) {
            // Single Image Mode
            const file = selectedFiles[0];
            const dataUrl = previewDataUrls.get(file.name) || '';

            singleImagePreview.src = dataUrl;
            singlePreviewContainer.classList.remove('hidden');
            batchPreviewContainer.classList.add('hidden');
            uploadPrompt.classList.add('hidden');

            btnDiagnoseLabel.textContent = 'Diagnose Leaf';
        } else {
            // Multi-Image (Batch) Mode
            singlePreviewContainer.classList.add('hidden');
            uploadPrompt.classList.add('hidden');
            batchPreviewContainer.classList.remove('hidden');

            previewCountEl.textContent = count;
            btnDiagnoseLabel.textContent = `Analyze ${count} Images`;

            renderPreviewCards();
        }
    }

    function renderPreviewCards() {
        previewCardsGrid.innerHTML = '';

        selectedFiles.forEach((file, index) => {
            const dataUrl = previewDataUrls.get(file.name) || '';
            const card = document.createElement('div');
            card.className = 'preview-card';

            card.innerHTML = `
                <span class="preview-card-index">#${index + 1}</span>
                <button type="button" class="preview-card-remove" title="Remove image" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
                <div class="preview-thumb-wrapper" data-thumb="${file.name}">
                    <img src="${dataUrl}" alt="${file.name}">
                </div>
                <div class="preview-card-details">
                    <div class="preview-card-filename" title="${file.name}">${file.name}</div>
                    <div class="preview-card-size">${formatFileSize(file.size)}</div>
                </div>
            `;

            // Remove button event
            card.querySelector('.preview-card-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                removeFileAtIndex(index);
            });

            // Zoom on thumbnail click
            card.querySelector('.preview-thumb-wrapper').addEventListener('click', () => {
                openImageModal(dataUrl, `Image #${index + 1}: ${file.name}`);
            });

            previewCardsGrid.appendChild(card);
        });
    }

    function removeFileAtIndex(index) {
        if (index >= 0 && index < selectedFiles.length) {
            const removed = selectedFiles.splice(index, 1)[0];
            if (removed) previewDataUrls.delete(removed.name);
            updateUploadUI();
        }
    }

    function clearAllFiles() {
        selectedFiles = [];
        previewDataUrls.clear();
        currentBatchResponse = null;
        hideUploadError();
        if (fileInputGallery) fileInputGallery.value = '';
        if (fileInputCamera) fileInputCamera.value = '';
        updateUploadUI();
    }

    // Remove buttons bindings
    if (btnRemove) btnRemove.addEventListener('click', clearAllFiles);
    if (btnReset) btnReset.addEventListener('click', clearAllFiles);
    if (btnClearAll) btnClearAll.addEventListener('click', clearAllFiles);
    if (btnChange) {
        btnChange.addEventListener('click', () => {
            if (fileInputGallery) fileInputGallery.click();
        });
    }

    // ==========================================================
    // DIAGNOSIS INFERENCE & PROGRESS ORCHESTRATION
    // ==========================================================
    btnDiagnose.addEventListener('click', async () => {
        if (selectedFiles.length === 0) return;

        // 1. Lock UI
        btnDiagnose.disabled = true;
        btnReset.disabled = true;
        hideUploadError();

        const count = selectedFiles.length;

        // 2. Start Progress Display
        startProgressSequence(count);
        showResultState('loading');

        try {
            // Call API
            const response = await window.ApiService.diagnoseBatch(selectedFiles);

            // Complete progress to 100%
            finishProgressSequence();

            currentBatchResponse = response;

            if (count === 1 && response.successful === 1) {
                // Render Single Result View
                renderSingleResult(response);
                showResultState('single');
            } else {
                // Render Batch Results View
                renderBatchResults(response);
                showResultState('batch');
            }

        } catch (error) {
            console.error("Diagnosis request failed:", error);
            stopProgressSequence();

            const errorMsgEl = document.getElementById('error-message');
            const errorSubEl = document.getElementById('error-subtext');
            if (errorMsgEl) errorMsgEl.textContent = "Unable to process the selected images.";
            if (errorSubEl) errorSubEl.textContent = error.message || "Please check backend connection and image formats.";

            showResultState('error');
        } finally {
            btnDiagnose.disabled = false;
            btnReset.disabled = false;
        }
    });

    function startProgressSequence(total) {
        if (!progressBox) return;
        progressBox.classList.remove('hidden');
        progressBarFill.style.width = '10%';
        progressPctText.textContent = '10%';
        progressStatusTitle.textContent = `Analyzing ${total} chilli leaf ${total > 1 ? 'images' : 'image'}...`;
        progressStepText.textContent = `Image 1 of ${total}`;
        progressCurrentFilename.textContent = selectedFiles[0]?.name || 'Pre-processing...';

        let currentStep = 0;
        const totalSteps = Math.max(3, total);
        clearInterval(progressTimer);

        progressTimer = setInterval(() => {
            currentStep++;
            const pct = Math.min(88, Math.round((currentStep / totalSteps) * 85));
            progressBarFill.style.width = `${pct}%`;
            progressPctText.textContent = `${pct}%`;

            const imgIdx = Math.min(total - 1, Math.floor((pct / 90) * total));
            progressStepText.textContent = `Image ${imgIdx + 1} of ${total}`;
            if (selectedFiles[imgIdx]) {
                progressCurrentFilename.textContent = selectedFiles[imgIdx].name;
            }
        }, 600);
    }

    function finishProgressSequence() {
        clearInterval(progressTimer);
        if (!progressBox) return;
        progressBarFill.style.width = '100%';
        progressPctText.textContent = '100%';
        progressStatusTitle.textContent = 'Diagnosis completed successfully.';
        progressStepText.textContent = `Complete (${selectedFiles.length} of ${selectedFiles.length})`;
        progressCurrentFilename.textContent = 'Rendering visualizations...';

        setTimeout(() => {
            progressBox.classList.add('hidden');
        }, 1200);
    }

    function stopProgressSequence() {
        clearInterval(progressTimer);
        if (progressBox) progressBox.classList.add('hidden');
    }

    function showResultState(state) {
        stateEmpty.classList.add('hidden');
        stateLoading.classList.add('hidden');
        stateSingleData.classList.add('hidden');
        stateBatchData.classList.add('hidden');
        stateError.classList.add('hidden');

        if (state === 'empty') stateEmpty.classList.remove('hidden');
        if (state === 'loading') stateLoading.classList.remove('hidden');
        if (state === 'single') stateSingleData.classList.remove('hidden');
        if (state === 'batch') stateBatchData.classList.remove('hidden');
        if (state === 'error') stateError.classList.remove('hidden');
    }

    // ==========================================================
    // SINGLE RESULT RENDERING
    // ==========================================================
    function renderSingleResult(data) {
        const item = data.results && data.results.length > 0 ? data.results[0] : null;
        if (!item) return;

        const predClassEl = document.getElementById('pred-class');
        const predConfText = document.getElementById('pred-confidence-text');
        const predConfBar = document.getElementById('pred-confidence-bar');

        predClassEl.textContent = item.prediction;

        // Class styling
        const predLower = item.predicted_class.toLowerCase();
        let colorClass = 'pred-healthy';
        if (predLower.includes('cercospora')) colorClass = 'pred-cercospora';
        if (predLower.includes('mites') || predLower.includes('trips')) colorClass = 'pred-mites';
        if (predLower.includes('nutritional')) colorClass = 'pred-nutritional';
        if (predLower.includes('powdery')) colorClass = 'pred-powdery';
        predClassEl.className = 'pred-class-large ' + colorClass;

        // Confidence
        const confPercent = item.confidence.toFixed(2);
        predConfText.textContent = `${confPercent}%`;
        predConfBar.style.width = '0%';
        setTimeout(() => {
            predConfBar.style.width = `${confPercent}%`;
        }, 150);

        // Probabilities Breakdown
        const probsList = document.getElementById('probs-list');
        probsList.innerHTML = '';
        const sortedProbs = Object.entries(item.probabilities).sort((a, b) => b[1] - a[1]);

        sortedProbs.forEach(([clsName, prob], idx) => {
            const p = (prob * 100).toFixed(2);
            const isTop = idx === 0;
            const row = document.createElement('div');
            row.className = 'prob-row ' + (isTop ? 'highlight' : '');
            row.innerHTML = `
                <div class="prob-label-container">
                    <span class="prob-name">${clsName}</span>
                    <span class="prob-val">${p}%</span>
                </div>
                <div class="prob-bar-container">
                    <div class="prob-bar" style="width: 0%"></div>
                </div>
            `;
            probsList.appendChild(row);
            setTimeout(() => {
                row.querySelector('.prob-bar').style.width = `${p}%`;
            }, 150 + idx * 80);
        });

        // Populate Single Printable Report
        populateSingleReport(item);

        // Explainable AI (Grad-CAM)
        populateSingleXAI(item);

        // Action bindings
        const btnAnalyzeAnother = document.getElementById('btn-analyze-another');
        if (btnAnalyzeAnother) btnAnalyzeAnother.onclick = clearAllFiles;

        const btnSaveReport = document.getElementById('btn-save-report');
        if (btnSaveReport) {
            btnSaveReport.onclick = async () => {
                await saveSingleDiagnosisReport(item);
            };
        }
    }

    function populateSingleReport(item) {
        const reportConfText = document.getElementById('report-conf-text');
        const reportCategory = document.getElementById('report-category');
        const reportPredName = document.getElementById('report-pred-name');
        const reportDate = document.getElementById('report-date');
        const reportObservation = document.getElementById('report-observation');
        const reportRecommendation = document.getElementById('report-recommendation');
        const reportProbsList = document.getElementById('report-probs-list');
        const reportId = document.getElementById('report-id');

        if (reportConfText) reportConfText.textContent = `${item.confidence.toFixed(2)}%`;
        if (reportPredName) reportPredName.textContent = item.prediction;
        if (reportCategory) reportCategory.textContent = item.category.toUpperCase();
        if (reportObservation) reportObservation.textContent = item.description;
        if (reportRecommendation) reportRecommendation.textContent = item.recommendation;

        const now = new Date();
        if (reportDate) reportDate.textContent = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();

        if (reportId) {
            const hex = Math.floor(Math.random() * 16777215).toString(16).toUpperCase().padStart(6, '0');
            reportId.textContent = `CFN-${hex}`;
        }

        if (reportProbsList) {
            reportProbsList.innerHTML = '';
            Object.entries(item.probabilities)
                .sort((a, b) => b[1] - a[1])
                .forEach(([clsName, prob]) => {
                    reportProbsList.innerHTML += `
                        <div class="report-prob-row">
                            <span class="report-prob-label">${clsName}</span>
                            <span class="report-prob-value">${(prob * 100).toFixed(1)}%</span>
                        </div>
                    `;
                });
        }

        // Evidence Images in Report
        const repImgOrig = document.getElementById('report-img-original');
        const repImgGrad = document.getElementById('report-img-gradcam');
        const repImgOver = document.getElementById('report-img-overlay');
        const repNoXai = document.getElementById('report-no-xai');
        const evidenceGrid = document.querySelector('.evidence-grid');

        const previewSrc = item.thumbnail_base64 || singleImagePreview.src;

        if (item.gradcam && item.gradcam.success) {
            if (repImgOrig) repImgOrig.src = previewSrc;
            if (repImgGrad) repImgGrad.src = item.gradcam.gradcam_base64 || item.gradcam.overlay_base64;
            if (repImgOver) repImgOver.src = item.gradcam.overlay_base64;
            if (repNoXai) repNoXai.classList.add('hidden');
            if (evidenceGrid) evidenceGrid.classList.remove('hidden');
        } else {
            if (evidenceGrid) evidenceGrid.classList.add('hidden');
            if (repNoXai) repNoXai.classList.remove('hidden');
        }

        // Download Report button
        const btnDownloadReport = document.getElementById('btn-download-report');
        if (btnDownloadReport) {
            btnDownloadReport.onclick = () => {
                const report = document.getElementById('printable-report');
                const originalParent = report.parentNode;
                const originalDisplays = [];

                document.body.appendChild(report);
                Array.from(document.body.children).forEach(child => {
                    originalDisplays.push({ el: child, display: child.style.display });
                    if (child.id !== 'printable-report') child.style.display = 'none';
                });

                report.style.display = 'block';
                window.print();

                setTimeout(() => {
                    originalParent.appendChild(report);
                    report.style.display = 'none';
                    originalDisplays.forEach(item => {
                        item.el.style.display = item.display;
                    });
                }, 1000);
            };
        }
    }

    function populateSingleXAI(item) {
        const xaiSection = document.getElementById('xai-section');
        const btnCloseXai = document.getElementById('btn-close-xai');
        const xaiGrid = document.getElementById('xai-grid');
        const xaiError = document.getElementById('xai-error');

        const imgOriginal = document.getElementById('xai-original-img');
        const imgGradcam = document.getElementById('xai-gradcam-img');
        const imgHeatmap = document.getElementById('xai-heatmap-img');
        const imgOverlay = document.getElementById('xai-overlay-img');
        const imgCompareOriginal = document.getElementById('xai-compare-original');

        const previewSrc = item.thumbnail_base64 || singleImagePreview.src;

        if (item.gradcam && item.gradcam.success) {
            if (imgOriginal) imgOriginal.src = previewSrc;
            if (imgGradcam) imgGradcam.src = item.gradcam.gradcam_base64 || item.gradcam.overlay_base64;
            if (imgHeatmap) imgHeatmap.src = item.gradcam.heatmap_base64;
            if (imgOverlay) imgOverlay.src = item.gradcam.overlay_base64;
            if (imgCompareOriginal) imgCompareOriginal.src = previewSrc;

            if (xaiSection) xaiSection.classList.remove('hidden');
            if (xaiGrid) xaiGrid.classList.remove('hidden');
            if (xaiError) xaiError.classList.add('hidden');
        } else {
            if (imgOriginal) imgOriginal.src = previewSrc;
            if (xaiSection) xaiSection.classList.remove('hidden');
            if (xaiGrid) xaiGrid.classList.add('hidden');
            if (xaiError) xaiError.classList.remove('hidden');
        }

        if (btnCloseXai && xaiSection) {
            btnCloseXai.onclick = () => xaiSection.classList.add('hidden');
        }

        setupXAIElements();
    }

    // ==========================================================
    // BATCH RESULTS RENDERING
    // ==========================================================
    function renderBatchResults(data) {
        // 1. Populate Metrics in Summary Card
        document.getElementById('bm-total').textContent = data.total_images;
        document.getElementById('bm-successful').textContent = data.successful;
        document.getElementById('bm-failed').textContent = data.failed;
        document.getElementById('bm-healthy').textContent = data.summary.healthy;
        document.getElementById('bm-diseased').textContent = data.summary.diseased;
        document.getElementById('bm-avg-conf').textContent = `${data.summary.average_confidence}%`;
        document.getElementById('bm-most-detected').textContent = data.summary.most_detected_disease;

        // Failed alert box
        if (data.failed > 0 && data.failed_images && data.failed_images.length > 0) {
            failedAlertList.innerHTML = '';
            data.failed_images.forEach(f => {
                const li = document.createElement('li');
                li.textContent = `${f.filename}: ${f.error}`;
                failedAlertList.appendChild(li);
            });
            batchFailedAlert.classList.remove('hidden');
        } else {
            batchFailedAlert.classList.add('hidden');
        }

        // 2. Disease Distribution Breakdown
        renderBatchDistribution(data.summary.distribution, data.successful);

        // 3. Filter Counts
        updateFilterCounts(data.results || []);

        // 4. Render Batch Cards Grid
        renderFilteredBatchCards();

        // 5. Setup Action Buttons
        const btnDownloadBatch = document.getElementById('btn-download-batch-report');
        if (btnDownloadBatch) {
            btnDownloadBatch.onclick = () => downloadBatchReport(data);
        }

        const btnSaveBatch = document.getElementById('btn-save-batch-report');
        if (btnSaveBatch) {
            btnSaveBatch.onclick = async () => saveBatchDiagnosisReport(data);
        }

        const btnTestMore = document.getElementById('btn-batch-test-more');
        if (btnTestMore) btnTestMore.onclick = clearAllFiles;

        const btnClear = document.getElementById('btn-batch-clear');
        if (btnClear) btnClear.onclick = clearAllFiles;
    }

    function renderBatchDistribution(dist, totalSuccess) {
        batchDistributionList.innerHTML = '';
        if (!dist) return;

        const niceNames = {
            'healthy': 'Healthy',
            'cercospora': 'Cercospora Leaf Spot',
            'mites_and_trips': 'Mites & Thrips',
            'nutritional': 'Nutritional Def.',
            'powdery mildew': 'Powdery Mildew'
        };

        const classFills = {
            'healthy': 'dist-fill-healthy',
            'cercospora': 'dist-fill-cercospora',
            'mites_and_trips': 'dist-fill-mites',
            'nutritional': 'dist-fill-nutritional',
            'powdery mildew': 'dist-fill-powdery'
        };

        Object.entries(dist).forEach(([clsKey, count]) => {
            const displayName = niceNames[clsKey] || clsKey;
            const fillClass = classFills[clsKey] || 'dist-fill-healthy';
            const pct = totalSuccess > 0 ? Math.round((count / totalSuccess) * 100) : 0;

            const item = document.createElement('div');
            item.className = 'dist-item';
            item.innerHTML = `
                <div class="dist-item-label">
                    <span>${displayName}</span>
                    <span><strong>${count}</strong> (${pct}%)</span>
                </div>
                <div class="dist-bar-track">
                    <div class="dist-bar-fill ${fillClass}" style="width: ${pct}%"></div>
                </div>
            `;
            batchDistributionList.appendChild(item);
        });
    }

    function updateFilterCounts(results) {
        const countAll = results.length;
        const countHealthy = results.filter(r => r.is_healthy).length;
        const countDiseased = results.filter(r => !r.is_healthy).length;
        const countCercospora = results.filter(r => r.predicted_class.includes('cercospora')).length;
        const countMites = results.filter(r => r.predicted_class.includes('mites') || r.predicted_class.includes('trips')).length;
        const countNutritional = results.filter(r => r.predicted_class.includes('nutritional')).length;
        const countPowdery = results.filter(r => r.predicted_class.includes('powdery')).length;

        document.getElementById('filter-count-all').textContent = countAll;
        document.getElementById('filter-count-healthy').textContent = countHealthy;
        document.getElementById('filter-count-diseased').textContent = countDiseased;
        document.getElementById('filter-count-cercospora').textContent = countCercospora;
        document.getElementById('filter-count-mites').textContent = countMites;
        document.getElementById('filter-count-nutritional').textContent = countNutritional;
        document.getElementById('filter-count-powdery').textContent = countPowdery;
    }

    // ==========================================================
    // FILTERING & SORTING BATCH CARDS
    // ==========================================================
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', function () {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            activeFilter = this.getAttribute('data-filter') || 'all';
            renderFilteredBatchCards();
        });
    });

    if (batchSortSelect) {
        batchSortSelect.addEventListener('change', function () {
            activeSort = this.value;
            renderFilteredBatchCards();
        });
    }

    function renderFilteredBatchCards() {
        if (!currentBatchResponse || !currentBatchResponse.results) return;

        let items = [...currentBatchResponse.results];

        // 1. Filter
        if (activeFilter === 'healthy') {
            items = items.filter(r => r.is_healthy);
        } else if (activeFilter === 'diseased') {
            items = items.filter(r => !r.is_healthy);
        } else if (activeFilter === 'cercospora') {
            items = items.filter(r => r.predicted_class.includes('cercospora'));
        } else if (activeFilter === 'mites') {
            items = items.filter(r => r.predicted_class.includes('mites') || r.predicted_class.includes('trips'));
        } else if (activeFilter === 'nutritional') {
            items = items.filter(r => r.predicted_class.includes('nutritional'));
        } else if (activeFilter === 'powdery') {
            items = items.filter(r => r.predicted_class.includes('powdery'));
        }

        // 2. Sort
        if (activeSort === 'confidence-high') {
            items.sort((a, b) => b.confidence - a.confidence);
        } else if (activeSort === 'confidence-low') {
            items.sort((a, b) => a.confidence - b.confidence);
        } else if (activeSort === 'name') {
            items.sort((a, b) => a.prediction.localeCompare(b.prediction));
        }

        // 3. Render Cards
        batchCardsGrid.innerHTML = '';

        if (items.length === 0) {
            batchCardsGrid.innerHTML = `
                <div class="text-center text-gray" style="grid-column: 1 / -1; padding: 3rem;">
                    <i class="fas fa-filter text-gray" style="font-size: 2.5rem; opacity: 0.3; margin-bottom: 1rem;"></i>
                    <p>No results match the selected filter.</p>
                </div>
            `;
            return;
        }

        items.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'batch-result-card fade-in-up';

            const statusClass = item.is_healthy ? 'healthy' : 'diseased';
            const statusLabel = item.status;
            const imgSrc = item.thumbnail_base64 || previewDataUrls.get(item.filename) || '';

            // Color class for disease
            const predLower = item.predicted_class.toLowerCase();
            let colorStyle = '#4caf50';
            if (predLower.includes('cercospora')) colorStyle = '#e91e63';
            if (predLower.includes('mites') || predLower.includes('trips')) colorStyle = '#ff9800';
            if (predLower.includes('nutritional')) colorStyle = '#ab47bc';
            if (predLower.includes('powdery')) colorStyle = '#26c6da';

            card.innerHTML = `
                <div class="card-top-media">
                    <img src="${imgSrc}" alt="${item.filename}">
                    <span class="card-leaf-badge">${item.id ? item.id.toUpperCase() : `LEAF #${index + 1}`}</span>
                    <span class="card-status-pill ${statusClass}">${statusLabel}</span>
                </div>
                <div class="card-content-body">
                    <h3 class="card-pred-title" style="color: ${colorStyle}">${item.prediction}</h3>
                    <div class="card-filename-text" title="${item.filename}"><i class="fas fa-file-image"></i> ${item.filename}</div>

                    <div class="card-conf-row">
                        <div class="card-conf-labels">
                            <span>Confidence</span>
                            <strong>${item.confidence.toFixed(2)}%</strong>
                        </div>
                        <div class="card-conf-track">
                            <div class="card-conf-fill" style="width: ${item.confidence}%; background: ${colorStyle}"></div>
                        </div>
                    </div>

                    <p class="card-desc-snippet">${item.description}</p>

                    <div class="card-bottom-actions">
                        <button type="button" class="btn btn-outline btn-card-action btn-view-detail" data-id="${item.id}">
                            <i class="fas fa-brain text-green"></i> View Details & Grad-CAM
                        </button>
                    </div>
                </div>
            `;

            // Thumbnail zoom
            card.querySelector('.card-top-media').addEventListener('click', () => {
                openImageModal(imgSrc, `${item.prediction} (${item.confidence.toFixed(2)}%) - ${item.filename}`);
            });

            // View Details modal
            card.querySelector('.btn-view-detail').addEventListener('click', (e) => {
                e.stopPropagation();
                openDetailModal(item);
            });

            batchCardsGrid.appendChild(card);
        });
    }

    // ==========================================================
    // DETAIL MODAL (LEAF INSPECTOR)
    // ==========================================================
    function openDetailModal(item) {
        if (!detailModal) return;

        document.getElementById('modal-detail-badge').textContent = (item.id || 'LEAF').toUpperCase();
        const titleEl = document.getElementById('modal-detail-title');
        titleEl.textContent = item.prediction;

        const predLower = item.predicted_class.toLowerCase();
        let colorStyle = '#4caf50';
        if (predLower.includes('cercospora')) colorStyle = '#e91e63';
        if (predLower.includes('mites') || predLower.includes('trips')) colorStyle = '#ff9800';
        if (predLower.includes('nutritional')) colorStyle = '#ab47bc';
        if (predLower.includes('powdery')) colorStyle = '#26c6da';
        titleEl.style.color = colorStyle;

        document.getElementById('modal-detail-filename').textContent = `${item.filename} • Confidence: ${item.confidence.toFixed(2)}%`;
        document.getElementById('modal-detail-obs').textContent = item.description;
        document.getElementById('modal-detail-rec').textContent = item.recommendation;

        const imgSrc = item.thumbnail_base64 || previewDataUrls.get(item.filename) || '';
        document.getElementById('modal-detail-orig').src = imgSrc;

        const overlayImg = document.getElementById('modal-detail-overlay');
        if (item.gradcam && item.gradcam.success) {
            overlayImg.src = item.gradcam.overlay_base64 || item.gradcam.gradcam_base64;
        } else {
            overlayImg.src = imgSrc;
        }

        // Probs
        const probsList = document.getElementById('modal-detail-probs');
        probsList.innerHTML = '';
        if (item.probabilities) {
            Object.entries(item.probabilities)
                .sort((a, b) => b[1] - a[1])
                .forEach(([clsName, prob], idx) => {
                    const p = (prob * 100).toFixed(2);
                    const isTop = idx === 0;
                    probsList.innerHTML += `
                        <div class="prob-row ${isTop ? 'highlight' : ''}">
                            <div class="prob-label-container">
                                <span class="prob-name">${clsName}</span>
                                <span class="prob-val">${p}%</span>
                            </div>
                            <div class="prob-bar-container">
                                <div class="prob-bar" style="width: ${p}%"></div>
                            </div>
                        </div>
                    `;
                });
        }

        detailModal.classList.remove('hidden');
    }

    if (btnCloseDetailModal) {
        btnCloseDetailModal.addEventListener('click', () => {
            detailModal.classList.add('hidden');
        });
    }

    if (detailModal) {
        detailModal.addEventListener('click', (e) => {
            if (e.target === detailModal) detailModal.classList.add('hidden');
        });
    }

    // ==========================================================
    // BATCH REPORT GENERATION & SAVING
    // ==========================================================
    function downloadBatchReport(data) {
        const report = document.getElementById('printable-batch-report');
        if (!report) return;

        const hex = Math.floor(Math.random() * 16777215).toString(16).toUpperCase().padStart(6, '0');
        document.getElementById('print-batch-id').textContent = `CFN-BATCH-${hex}`;

        const now = new Date();
        document.getElementById('print-batch-date').textContent = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
        document.getElementById('print-batch-total').textContent = data.total_images;

        document.getElementById('print-sum-total').textContent = data.total_images;
        document.getElementById('print-sum-healthy').textContent = data.summary.healthy;
        document.getElementById('print-sum-diseased').textContent = data.summary.diseased;
        document.getElementById('print-sum-avgconf').textContent = `${data.summary.average_confidence}%`;

        // Itemized Table
        const tableBody = document.getElementById('print-batch-table-body');
        tableBody.innerHTML = '';
        (data.results || []).forEach((item, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td><strong>${item.filename}</strong></td>
                <td>${item.prediction}</td>
                <td><span style="color: ${item.is_healthy ? '#2e7d32' : '#c62828'}; font-weight: bold;">${item.status}</span></td>
                <td>${item.confidence.toFixed(2)}%</td>
                <td>${item.recommendation}</td>
            `;
            tableBody.appendChild(tr);
        });

        // Print workflow
        const originalParent = report.parentNode;
        const originalDisplays = [];

        document.body.appendChild(report);
        Array.from(document.body.children).forEach(child => {
            originalDisplays.push({ el: child, display: child.style.display });
            if (child.id !== 'printable-batch-report') child.style.display = 'none';
        });

        report.style.display = 'block';
        window.print();

        setTimeout(() => {
            originalParent.appendChild(report);
            report.style.display = 'none';
            originalDisplays.forEach(item => {
                item.el.style.display = item.display;
            });
        }, 1000);
    }

    async function saveBatchDiagnosisReport(data) {
        const hex = Math.floor(Math.random() * 16777215).toString(16).toUpperCase().padStart(6, '0');
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        const reportData = {
            id: `BATCH-${hex}`,
            type: "batch",
            title: "Batch Diagnosis",
            date: dateStr,
            timestamp: now.toISOString(),
            total_images: data.total_images,
            summary_text: `${data.summary.healthy} Healthy / ${data.summary.diseased} Diseased`,
            healthy_count: data.summary.healthy,
            diseased_count: data.summary.diseased,
            most_detected: data.summary.most_detected_disease,
            avg_confidence: data.summary.average_confidence,
            distribution: data.summary.distribution,
            results: (data.results || []).map(r => ({
                filename: r.filename,
                prediction: r.prediction,
                confidence: r.confidence,
                status: r.status,
                recommendation: r.recommendation
            }))
        };

        try {
            await window.ApiService.saveReport(reportData);
            alert(`Batch diagnosis report successfully saved (ID: ${reportData.id})! You can review it on the Reports page.`);
        } catch (e) {
            console.error("Failed to save report:", e);
            alert("Could not save report to backend history: " + e.message);
        }
    }

    async function saveSingleDiagnosisReport(item) {
        const hex = Math.floor(Math.random() * 16777215).toString(16).toUpperCase().padStart(6, '0');
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        const reportData = {
            id: `SINGLE-${hex}`,
            type: "single",
            title: "Single Diagnosis",
            date: dateStr,
            timestamp: now.toISOString(),
            total_images: 1,
            summary_text: item.prediction,
            prediction: item.prediction,
            confidence: item.confidence,
            status: item.status,
            results: [{
                filename: item.filename,
                prediction: item.prediction,
                confidence: item.confidence,
                status: item.status,
                recommendation: item.recommendation
            }]
        };

        try {
            await window.ApiService.saveReport(reportData);
            alert(`Single diagnosis report successfully saved (ID: ${reportData.id})! You can review it on the Reports page.`);
        } catch (e) {
            console.error("Failed to save report:", e);
            alert("Could not save report to backend history: " + e.message);
        }
    }

    // ==========================================================
    // IMAGE ZOOM MODAL & XAI ELEMENTS
    // ==========================================================
    function openImageModal(src, caption) {
        if (!imageModal || !modalImg) return;
        modalImg.src = src;
        if (modalCaption) modalCaption.textContent = caption || '';
        imageModal.classList.remove('hidden');
    }

    if (btnZoomPreview) {
        btnZoomPreview.addEventListener('click', () => {
            if (singleImagePreview.src) {
                openImageModal(singleImagePreview.src, 'Original Chilli Leaf Upload');
            }
        });
    }

    if (modalClose) {
        modalClose.addEventListener('click', () => {
            if (imageModal) imageModal.classList.add('hidden');
        });
    }

    if (imageModal) {
        imageModal.addEventListener('click', (e) => {
            if (e.target === imageModal) imageModal.classList.add('hidden');
        });
    }

    function setupXAIElements() {
        const btnFullscreen = document.getElementById('btn-fullscreen-xai');
        const xaiSection = document.getElementById('xai-section');

        if (btnFullscreen && xaiSection) {
            btnFullscreen.onclick = () => {
                if (!document.fullscreenElement) {
                    xaiSection.requestFullscreen().catch(err => console.error(err));
                } else {
                    document.exitFullscreen();
                }
            };
        }

        document.querySelectorAll('.zoom-btn').forEach(btn => {
            btn.onclick = () => {
                const targetId = btn.getAttribute('data-target');
                const img = document.getElementById(targetId);
                const label = btn.closest('.xai-box-header')?.querySelector('.xai-label')?.textContent.trim() || 'Visual Evidence';
                if (img && img.src) openImageModal(img.src, label);
            };
        });

        // Compare Slider
        const btnCompare = document.getElementById('btn-compare');
        const sliderWrapper = document.getElementById('compare-slider-wrapper');
        const slider = document.getElementById('compare-slider');
        const compareImgWrapper = document.getElementById('compare-img-wrapper');
        const handle = document.getElementById('compare-handle');

        if (btnCompare && sliderWrapper) {
            btnCompare.onclick = () => {
                sliderWrapper.classList.toggle('hidden');
                btnCompare.classList.toggle('active');
                if (!sliderWrapper.classList.contains('hidden') && slider) {
                    slider.value = 50;
                    updateSlider(50);
                }
            };
        }

        if (slider && compareImgWrapper && handle) {
            slider.oninput = (e) => updateSlider(e.target.value);
            function updateSlider(val) {
                compareImgWrapper.style.width = `${val}%`;
                handle.style.left = `${val}%`;
            }
        }
    }
});
