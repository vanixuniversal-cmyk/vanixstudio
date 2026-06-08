/* ==========================================================================
   VANIX STUDIO DEVELOPER PORTAL LOGIC (js/developer.js)
   High-performance file analysis, thumbnail extraction, and upload pipeline simulation.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // ════════ DOM ELEMENTS ════════
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const selectFilesBtn = document.getElementById('selectFilesBtn');
    const assetsGrid = document.getElementById('assetsGrid');
    const searchInput = document.getElementById('searchInput');
    const filterTabs = document.querySelectorAll('.filter-tab');
    
    // Sidebar stats
    const totalFilesVal = document.getElementById('totalFilesVal');
    const queueSizeVal = document.getElementById('queueSizeVal');
    const avgSpeedVal = document.getElementById('avgSpeedVal');
    const storageFill = document.getElementById('storageFill');
    const storageText = document.getElementById('storageText');
    
    // Upload settings
    const optOptimize = document.getElementById('optOptimize');
    const optAutostart = document.getElementById('optAutostart');
    const optHash = document.getElementById('optHash');
    const clearQueueBtn = document.getElementById('clearQueueBtn');
    
    // Modals
    const previewModal = document.getElementById('previewModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');
    
    // Toast Container (created dynamically if not present)
    let toastContainer = document.getElementById('toast');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast';
        toastContainer.id = 'toast';
        document.body.appendChild(toastContainer);
    }

    // ════════ DATA STATE ════════
    let uploadedFiles = [];
    let uploadQueue = [];
    const MAX_STORAGE_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB
    let currentUsedBytes = 1.25 * 1024 * 1024 * 1024; // Initial 1.25 GB mock data

    // Initialize display values
    updateStorageMeter();

    // ════════ EVENT LISTENERS ════════
    
    // Click dropzone to select files
    selectFilesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });
    
    dropzone.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        fileInput.value = ''; // Reset input
    });

    // Drag-and-drop event handlers
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('drag-over');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    });

    // Target Page Selection Change Listener
    const targetPageSelect = document.getElementById('targetPage');
    const targetPageName = document.getElementById('targetPageName');
    const targetPagePath = document.getElementById('targetPagePath');
    const dropzoneTargetBadge = document.getElementById('dropzoneTargetBadge');

    if (targetPageSelect) {
        targetPageSelect.addEventListener('change', () => {
            const selectedVal = targetPageSelect.value;
            const selectedText = targetPageSelect.options[targetPageSelect.selectedIndex].text;
            
            // Extract title without emoji
            const cleanText = selectedText.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').trim();
            
            if (targetPageName) targetPageName.textContent = cleanText;
            if (targetPagePath) targetPagePath.textContent = selectedVal;
            if (dropzoneTargetBadge) {
                dropzoneTargetBadge.innerHTML = `Deploying to: <strong>${selectedVal}</strong>`;
            }
            showToast(`Target deployment page set to: ${selectedVal}`, 'info');
        });
    }

    // Asset Type Sidebar Buttons Sync
    const typeBtns = document.querySelectorAll('.asset-type-btn');
    typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            typeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const type = btn.getAttribute('data-type');
            // Sync with toolbar filters
            const matchingTab = Array.from(filterTabs).find(t => t.getAttribute('data-category') === type);
            if (matchingTab) {
                filterTabs.forEach(t => t.classList.remove('active'));
                matchingTab.classList.add('active');
            }
            renderGrid();
        });
    });

    // Toolbar Filter Selection (also syncs back to sidebar)
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const cat = tab.getAttribute('data-category');
            // Sync with sidebar type buttons
            const matchingBtn = Array.from(typeBtns).find(b => b.getAttribute('data-type') === cat);
            if (matchingBtn) {
                typeBtns.forEach(b => b.classList.remove('active'));
                matchingBtn.classList.add('active');
            }
            renderGrid();
        });
    });

    // Live Search
    searchInput.addEventListener('input', () => {
        renderGrid();
    });

    // Clear queue button
    clearQueueBtn.addEventListener('click', () => {
        if (uploadedFiles.length === 0) {
            showToast('No files in queue to clear.', 'info');
            return;
        }
        uploadedFiles.forEach(fileObj => {
            if (fileObj.previewUrl && fileObj.previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(fileObj.previewUrl);
            }
            if (fileObj.thumbnailUrl && fileObj.thumbnailUrl.startsWith('blob:')) {
                URL.revokeObjectURL(fileObj.thumbnailUrl);
            }
        });
        uploadedFiles = [];
        renderGrid();
        updateGlobalStats();
        updateStorageMeter();
        showToast('Developer upload queue cleared.', 'success');
    });

    // Close preview modal
    modalClose.addEventListener('click', closeModal);
    previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) closeModal();
    });
    
    // Escape key closes modal
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // Theme Change Reactivity
    document.addEventListener('vanix:theme-change', (e) => {
        showToast(`Accent theme synced: ${e.detail.theme.toUpperCase()}`, 'info');
    });

    // ════════ FILE CORE HANDLER ════════
    function handleFiles(files) {
        if (files.length === 0) return;
        
        showToast(`Analyzing ${files.length} file(s)...`, 'info');
        
        Array.from(files).forEach(file => {
            // Check storage bounds
            if (currentUsedBytes + file.size > MAX_STORAGE_BYTES) {
                showToast(`Storage limit reached! Cannot load ${file.name}.`, 'danger');
                return;
            }

            // Resolve current target page details
            const targetPageSelect = document.getElementById('targetPage');
            const targetPage = targetPageSelect ? targetPageSelect.value : 'films.html';
            const targetPageLabel = targetPageSelect ? targetPageSelect.options[targetPageSelect.selectedIndex].text.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').trim() : 'Films / AI Filmmaking';

            // Clean custom display name: name of the file without extension
            const lastDotIndex = file.name.lastIndexOf('.');
            const baseName = lastDotIndex !== -1 ? file.name.substring(0, lastDotIndex) : file.name;

            const fileId = 'asset-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            const fileCategory = classifyFile(file.type, file.name);
            const objectUrl = URL.createObjectURL(file);
            
            const newFile = {
                id: fileId,
                name: file.name,
                customName: baseName,
                targetPage: targetPage,
                targetPageLabel: targetPageLabel,
                size: file.size,
                type: file.type,
                category: fileCategory,
                previewUrl: objectUrl,
                thumbnailUrl: null,
                dimensions: '—',
                duration: '—',
                progress: 0,
                status: optAutostart.checked ? 'hashing' : 'queued',
                statusText: optAutostart.checked ? 'HASHING DATA' : 'QUEUED',
                speed: '0 MB/s',
                addedAt: new Date().toLocaleTimeString(),
                fileRef: file
            };

            uploadedFiles.unshift(newFile); // Add to the top
            renderGrid();
            updateGlobalStats();

            // Run async file analysis to extract dimensions/durations & thumbnails
            analyzeFile(newFile).then(() => {
                if (optAutostart.checked) {
                    simulateUpload(newFile);
                } else {
                    renderGrid();
                }
            });
        });
    }

    // Classify category for toolbar filters
    function classifyFile(mimeType, fileName) {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        
        // Secondary checks for extensions
        const ext = fileName.split('.').pop().toLowerCase();
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
        const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'm4v'];
        
        if (imageExts.includes(ext)) return 'image';
        if (videoExts.includes(ext)) return 'video';
        
        return 'other';
    }

    // ════════ FILE METADATA & THUMBNAIL ANALYZERS ════════
    function analyzeFile(fileObj) {
        return new Promise((resolve) => {
            const file = fileObj.fileRef;
            
            if (fileObj.category === 'image') {
                // Image dimension calculation
                const img = new Image();
                img.onload = function() {
                    fileObj.dimensions = `${this.naturalWidth} x ${this.naturalHeight}`;
                    fileObj.thumbnailUrl = fileObj.previewUrl;
                    resolve();
                };
                img.onerror = function() {
                    resolve(); // Resolve anyway on error
                };
                img.src = fileObj.previewUrl;
                
            } else if (fileObj.category === 'video') {
                // Video details and canvas thumbnail generator
                const video = document.createElement('video');
                video.preload = 'metadata';
                video.muted = true;
                video.playsInline = true;
                
                video.onloadedmetadata = function() {
                    fileObj.dimensions = `${video.videoWidth} x ${video.videoHeight}`;
                    
                    // Format duration
                    const secs = Math.round(video.duration);
                    const minutes = Math.floor(secs / 60);
                    const remainingSecs = secs % 60;
                    fileObj.duration = `${minutes}:${remainingSecs.toString().padStart(2, '0')}`;
                    
                    // Trigger canvas screenshot capture after video seeks
                    video.currentTime = Math.min(1.5, video.duration / 2); // Seek to 1.5s or midpoint
                };

                video.onseeked = function() {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = 160;
                        canvas.height = 90; // 16:9 ratio preview
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        
                        canvas.toBlob((blob) => {
                            if (blob) {
                                fileObj.thumbnailUrl = URL.createObjectURL(blob);
                            } else {
                                fileObj.thumbnailUrl = null;
                            }
                            resolve();
                        }, 'image/jpeg', 0.85);
                    } catch (e) {
                        console.error('Thumbnail extraction failed (CORS/Web Security):', e);
                        resolve();
                    }
                };

                video.onerror = function() {
                    resolve();
                };

                video.src = fileObj.previewUrl;
                
            } else {
                // Non-media file
                resolve();
            }
        });
    }

    // ════════ UPLOAD PIPELINE SIMULATOR ════════
    function simulateUpload(fileObj) {
        if (fileObj.progress >= 100) return;
        
        fileObj.status = 'uploading';
        
        let currentProgress = 0;
        const uploadSpeedBase = 5 + Math.random() * 25; // 5 - 30 MB/s speed
        fileObj.speed = `${uploadSpeedBase.toFixed(1)} MB/s`;

        const intervalTime = 120 + Math.random() * 150; // Random updates frequency
        
        const timer = setInterval(() => {
            if (fileObj.status === 'queued') {
                // Cancelled or cleared
                clearInterval(timer);
                return;
            }

            // Fluctuating speeds
            const speedFluctuation = (Math.random() - 0.5) * 4;
            const currentSpeed = Math.max(1.5, uploadSpeedBase + speedFluctuation);
            fileObj.speed = `${currentSpeed.toFixed(1)} MB/s`;

            // Progress increment rate
            const chunk = (currentSpeed * 1024 * 1024 * (intervalTime / 1000)); // bytes uploaded
            const progressDelta = (chunk / fileObj.size) * 100;
            currentProgress += Math.max(2, progressDelta); // upload at least 2% per tick

            if (currentProgress >= 100) {
                currentProgress = 100;
                fileObj.progress = 100;
                fileObj.speed = '0 MB/s';
                fileObj.status = 'processing';
                fileObj.statusText = 'PROCESSING';
                updateCardProgressUI(fileObj);
                
                // Add final processing delay for encryption checks
                setTimeout(() => {
                    fileObj.status = 'secure';
                    fileObj.statusText = 'SECURE';
                    
                    // Finalize storage update
                    currentUsedBytes += fileObj.size;
                    updateStorageMeter();
                    updateGlobalStats();
                    renderGrid();
                    
                    showToast(`Uploaded successfully: ${fileObj.name}`, 'success');
                    clearInterval(timer);
                }, 1000);
            } else {
                fileObj.progress = Math.round(currentProgress);
                
                // Multi-stage status descriptions
                if (fileObj.progress < 12 && optHash.checked) {
                    fileObj.statusText = `HASHING PROTOCOL [${fileObj.progress}%]`;
                } else if (fileObj.progress < 85) {
                    fileObj.statusText = `UPLOADING [${fileObj.progress}%]`;
                } else if (fileObj.progress < 95 && optOptimize.checked) {
                    fileObj.statusText = `OPTIMIZING ASSET [${fileObj.progress}%]`;
                } else {
                    fileObj.statusText = `ENCRYPTING LAYER [${fileObj.progress}%]`;
                }
                
                updateCardProgressUI(fileObj);
            }
        }, intervalTime);
    }

    function updateCardProgressUI(fileObj) {
        const card = document.getElementById(fileObj.id);
        if (!card) return;
        
        const progressFill = card.querySelector('.asset-progress-fill');
        const progressTextLabel = card.querySelector('.progress-text-label');
        const progressPercent = card.querySelector('.progress-percent');
        const speedVal = card.querySelector('.upload-speed');
        const statusInd = card.querySelector('.status-indicator');
        
        if (progressFill) progressFill.style.width = `${fileObj.progress}%`;
        if (progressTextLabel) progressTextLabel.textContent = fileObj.statusText;
        if (progressPercent) progressPercent.textContent = `${fileObj.progress}%`;
        if (speedVal) speedVal.textContent = fileObj.speed;
        
        // Class updates
        if (fileObj.status === 'secure' && statusInd) {
            statusInd.className = 'status-indicator secure';
            statusInd.innerHTML = '<span class="status-dot"></span> SECURE';
            card.classList.remove('uploading');
            
            // Enable action button interactivity (e.g. preview)
            const previewBtn = card.querySelector('.btn-preview');
            if (previewBtn) previewBtn.removeAttribute('disabled');
        }
    }

    // ════════ INTERACTIVE UI GRID RENDERING ════════
    function renderGrid() {
        const query = searchInput.value.toLowerCase().trim();
        const activeTab = document.querySelector('.filter-tab.active').getAttribute('data-category');
        
        // Filter elements
        const filtered = uploadedFiles.filter(item => {
            const matchesQuery = item.name.toLowerCase().includes(query);
            const matchesCategory = (activeTab === 'all' || item.category === activeTab);
            return matchesQuery && matchesCategory;
        });

        if (filtered.length === 0) {
            assetsGrid.innerHTML = `
                <div class="empty-queue">
                    <div class="empty-queue-icon">📁</div>
                    <p class="empty-queue-text">
                        ${query ? 'No matching assets found for search query.' : 'Developer asset queue is empty. Drag & drop files here to upload.'}
                    </p>
                </div>
            `;
            return;
        }

        assetsGrid.innerHTML = '';
        
        filtered.forEach(file => {
            const card = document.createElement('div');
            card.className = `asset-card ${file.status === 'uploading' || file.status === 'processing' ? 'uploading' : ''}`;
            card.id = file.id;

            // Thumbnail selector
            let thumbnailHTML = '';
            if (file.thumbnailUrl) {
                thumbnailHTML = `<img src="${file.thumbnailUrl}" alt="Thumbnail" class="asset-thumb">`;
            } else {
                let icon = '📄';
                if (file.category === 'video') icon = '🎬';
                if (file.category === 'image') icon = '🖼️';
                thumbnailHTML = `<span class="asset-icon-fallback">${icon}</span>`;
            }

            // Resolve file size formatting
            const sizeFormatted = formatBytes(file.size);
            
            // Format badges
            const badgeClass = file.category === 'video' ? 'badge-video' : (file.category === 'image' ? 'badge-image' : 'badge-other');
            const metaBadgeText = file.category.toUpperCase();

            // Progress bar and actions state
            const isFinished = file.status === 'secure' || file.status === 'queued' && file.progress >= 100;
            const speedHTML = file.status === 'uploading' ? `<span class="asset-meta-item">Speed: <strong class="upload-speed">${file.speed}</strong></span>` : '';
            
            // Action button states
            const previewDisabled = file.status !== 'secure' && file.progress < 100 ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : '';

            card.innerHTML = `
                <div class="asset-thumb-wrap" onclick="${file.status === 'secure' ? `window.openPreview('${file.id}')` : ''}">
                    ${thumbnailHTML}
                    ${file.category === 'video' && file.status === 'secure' ? `
                        <div class="asset-thumb-overlay">
                            <span class="play-badge">▶</span>
                        </div>
                    ` : ''}
                </div>
                <div class="asset-details">
                    <div class="asset-name-row">
                        <span class="asset-badge ${badgeClass}">${metaBadgeText}</span>
                        <span class="asset-name" title="${file.customName || file.name}">${file.customName || file.name}</span>
                    </div>
                    <div class="asset-meta-row">
                        <span class="asset-meta-item">Size: <strong>${sizeFormatted}</strong></span>
                        ${file.dimensions !== '—' ? `<span class="asset-meta-item">Res: <strong>${file.dimensions}</strong></span>` : ''}
                        ${file.duration !== '—' ? `<span class="asset-meta-item">Duration: <strong>${file.duration}</strong></span>` : ''}
                        <span class="asset-meta-item">Target Page: <strong style="color:var(--primary); text-shadow:0 0 4px var(--primary-glow);">${file.targetPageLabel}</strong></span>
                        ${speedHTML}
                    </div>
                    
                    <div class="asset-rename-container">
                        <span class="asset-rename-label">Rename Asset (Display Title)</span>
                        <input type="text" class="asset-rename-input" value="${file.customName || ''}" placeholder="Name your asset (e.g. acy)..." oninput="window.renameAsset('${file.id}', this.value)">
                    </div>

                    <div class="asset-progress-container">
                        <div class="asset-progress-text">
                            <span class="progress-text-label">${file.statusText}</span>
                            <span class="progress-percent">${file.progress}%</span>
                        </div>
                        <div class="asset-progress-bar">
                            <div class="asset-progress-fill" style="width: ${file.progress}%"></div>
                        </div>
                    </div>
                </div>
                <div class="asset-actions">
                    <div class="status-indicator ${file.status}">
                        <span class="status-dot"></span> 
                        ${file.status.toUpperCase()}
                    </div>
                    <button class="btn-action btn-preview" title="Preview Asset" ${previewDisabled} onclick="window.openPreview('${file.id}')">👁</button>
                    <button class="btn-action" title="Copy Mock URL" onclick="window.copyMockUrl('${file.id}')">🔗</button>
                    <button class="btn-action btn-delete" title="Delete Asset" onclick="window.deleteAsset('${file.id}')">🗑</button>
                </div>
            `;
            
            assetsGrid.appendChild(card);
        });
    }

    // ════════ GLOBAL STATS & STORAGE CALCULATOR ════════
    function updateGlobalStats() {
        totalFilesVal.textContent = uploadedFiles.length;
        
        const activeUploadsCount = uploadedFiles.filter(f => f.status === 'uploading' || f.status === 'processing').length;
        queueSizeVal.textContent = activeUploadsCount;
        
        if (activeUploadsCount > 0) {
            // Compute average speed of all uploading assets
            const uploadingFiles = uploadedFiles.filter(f => f.status === 'uploading');
            if (uploadingFiles.length > 0) {
                const totalSpeed = uploadingFiles.reduce((acc, curr) => acc + parseFloat(curr.speed), 0);
                avgSpeedVal.textContent = `${(totalSpeed / uploadingFiles.length).toFixed(1)} MB/s`;
            } else {
                avgSpeedVal.textContent = '0.0 MB/s';
            }
        } else {
            avgSpeedVal.textContent = '—';
        }
    }

    function updateStorageMeter() {
        const percentage = (currentUsedBytes / MAX_STORAGE_BYTES) * 100;
        storageFill.style.width = `${percentage.toFixed(1)}%`;
        
        const usedFormatted = formatBytes(currentUsedBytes);
        const capacityFormatted = formatBytes(MAX_STORAGE_BYTES);
        storageText.innerHTML = `Disk: <strong>${usedFormatted}</strong> / ${capacityFormatted} (${percentage.toFixed(1)}%)`;
    }

    // Helper: Byte size formatter
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // ════════ EXPOSED GLOBAL WINDOW METHODS FOR DYNAMIC HTML BINDING ════════
    
    // Rename single asset in state
    window.renameAsset = function(fileId, newName) {
        const file = uploadedFiles.find(f => f.id === fileId);
        if (file) {
            file.customName = newName.trim();
            // Update display name dynamically to keep focus on input
            const card = document.getElementById(fileId);
            if (card) {
                const nameSpan = card.querySelector('.asset-name');
                if (nameSpan) {
                    nameSpan.textContent = file.customName || file.name;
                    nameSpan.title = file.customName || file.name;
                }
            }
        }
    };

    // Copy fake URL to clipboard
    window.copyMockUrl = function(fileId) {
        const file = uploadedFiles.find(f => f.id === fileId);
        if (!file) return;
        
        const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
        const displayName = file.customName ? (file.customName + ext) : file.name;
        const fakeUrl = `https://cdn.vanixstudio.com/assets/${file.targetPage}/${file.id}/${encodeURIComponent(displayName)}`;
        
        navigator.clipboard.writeText(fakeUrl).then(() => {
            showToast(`CDN URL copied! Published to ${file.targetPage}`, 'success');
        }).catch(() => {
            // Fallback copy
            const el = document.createElement('textarea');
            el.value = fakeUrl;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            showToast(`CDN URL copied! Published to ${file.targetPage}`, 'success');
        });
    };

    // Delete single asset row
    window.deleteAsset = function(fileId) {
        const index = uploadedFiles.findIndex(f => f.id === fileId);
        if (index === -1) return;
        
        const file = uploadedFiles[index];
        
        // Revoke URL objects to prevent memory leaks
        if (file.previewUrl && file.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(file.previewUrl);
        }
        if (file.thumbnailUrl && file.thumbnailUrl.startsWith('blob:')) {
            URL.revokeObjectURL(file.thumbnailUrl);
        }

        // Substract from capacity if it was fully uploaded
        if (file.status === 'secure') {
            currentUsedBytes = Math.max(1.25 * 1024 * 1024 * 1024, currentUsedBytes - file.size);
        }

        uploadedFiles.splice(index, 1);
        renderGrid();
        updateGlobalStats();
        updateStorageMeter();
        showToast('Asset deleted from developer portal.', 'info');
    };

    // Open high fidelity previews
    window.openPreview = function(fileId) {
        const file = uploadedFiles.find(f => f.id === fileId);
        if (!file) return;

        modalTitle.textContent = `PREVIEW // ${(file.customName || file.name).toUpperCase()}`;
        modalBody.innerHTML = ''; // Clear body

        if (file.category === 'image') {
            const img = document.createElement('img');
            img.className = 'modal-img-preview';
            img.src = file.previewUrl;
            img.alt = file.name;
            modalBody.appendChild(img);
        } else if (file.category === 'video') {
            const video = document.createElement('video');
            video.className = 'modal-video-preview';
            video.src = file.previewUrl;
            video.autoplay = true;
            video.controls = true;
            modalBody.appendChild(video);
        } else {
            // Fallback raw detail sheet
            const byteSheet = document.createElement('div');
            byteSheet.style.color = '#67c23a';
            byteSheet.style.fontFamily = 'monospace';
            byteSheet.style.fontSize = '12px';
            byteSheet.style.textAlign = 'left';
            byteSheet.style.width = '100%';
            byteSheet.style.padding = '10px';
            
            // Format nice raw hex metadata grid
            byteSheet.innerHTML = `
                <div style="border-bottom:1px solid rgba(103,194,58,0.3); padding-bottom:10px; margin-bottom:10px; color:#fff;">
                    <strong>METADATA FILE SCANNER</strong> - SECURE CHECKSUM LOADED
                </div>
                <div style="margin-bottom:6px;">FILE_UUID: ${file.id}</div>
                <div style="margin-bottom:6px;">FILE_NAME: ${file.name}</div>
                <div style="margin-bottom:6px;">MIME_TYPE: ${file.type || 'unknown/binary'}</div>
                <div style="margin-bottom:6px;">FILE_SIZE: ${file.size} bytes (${formatBytes(file.size)})</div>
                <div style="margin-bottom:14px;">DATE_HASH: ${file.addedAt} // SECURE SYNCED</div>
                <div style="color:var(--text-muted); font-size:11px;">
                    * Hex/Byte dump omitted for performance. File verified against VANIX threat intelligence databases. SHA-256 HASH matches cloud registry *
                </div>
            `;
            modalBody.appendChild(byteSheet);
        }

        // Open footer details
        const footer = document.querySelector('.modal-footer');
        if (footer) {
            footer.innerHTML = `
                <div class="metadata-grid">
                    <div class="meta-entry">
                        <span class="meta-entry-label">MIME TYPE</span>
                        <span class="meta-entry-val">${file.type || 'application/octet-stream'}</span>
                    </div>
                    <div class="meta-entry">
                        <span class="meta-entry-label">DIMENSIONS</span>
                        <span class="meta-entry-val">${file.dimensions}</span>
                    </div>
                    <div class="meta-entry">
                        <span class="meta-entry-label">DURATION</span>
                        <span class="meta-entry-val">${file.duration}</span>
                    </div>
                    <div class="meta-entry">
                        <span class="meta-entry-label">UUID HASH</span>
                        <span class="meta-entry-val" style="font-size:10px;">${file.id}</span>
                    </div>
                </div>
            `;
        }

        previewModal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Stop scrolling
    };

    function closeModal() {
        // Pause and clear modal video if exists
        const videoElement = modalBody.querySelector('video');
        if (videoElement) {
            videoElement.pause();
            videoElement.src = '';
            videoElement.load();
        }
        
        previewModal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }

    // ════════ TOAST ALERTS SYSTEM ════════
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast-item toast-${type}`;
        
        // Icon matching alert types
        let icon = 'ℹ️';
        if (type === 'success') icon = '🟢';
        if (type === 'danger') icon = '🔴';
        
        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        `;
        
        // Styling dynamic toast elements inline to avoid breaking main CSS structures
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.gap = '10px';
        toast.style.background = 'rgba(10, 10, 10, 0.9)';
        toast.style.border = '1px solid';
        toast.style.borderColor = type === 'success' ? '#67c23a' : (type === 'danger' ? '#f56c6c' : 'var(--primary)');
        toast.style.boxShadow = `0 4px 15px rgba(0, 0, 0, 0.4), 0 0 10px ${type === 'success' ? 'rgba(103,194,90,0.2)' : (type === 'danger' ? 'rgba(245,108,108,0.2)' : 'var(--primary-glow)')}`;
        toast.style.padding = '12px 20px';
        toast.style.borderRadius = '6px';
        toast.style.color = '#fff';
        toast.style.fontFamily = 'var(--font-body)';
        toast.style.fontSize = '12px';
        toast.style.fontWeight = '500';
        toast.style.minWidth = '250px';
        toast.style.maxWidth = '350px';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        
        // Add to main global toast container
        if (toastContainer) {
            toastContainer.appendChild(toast);
            
            // Adjust toast container styles if not set in main CSS
            toastContainer.style.position = 'fixed';
            toastContainer.style.bottom = '90px';
            toastContainer.style.right = '28px';
            toastContainer.style.display = 'flex';
            toastContainer.style.flexDirection = 'column';
            toastContainer.style.gap = '10px';
            toastContainer.style.zIndex = '10006';
            
            // Animate transition
            setTimeout(() => {
                toast.style.opacity = '1';
                toast.style.transform = 'translateY(0)';
            }, 50);

            // Remove automatically
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(-20px)';
                setTimeout(() => {
                    if (toastContainer.contains(toast)) {
                        toastContainer.removeChild(toast);
                    }
                }, 400);
            }, 4000);
        }
    }
});
