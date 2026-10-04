// State Management
let s3Data = JSON.parse(localStorage.getItem('aws_s3_simulator_data')) || { buckets: [] };
let currentBucket = null;

// DOM Elements
const bucketList = document.getElementById('bucket-list');
const createBucketBtn = document.getElementById('create-bucket-btn');
const noBucketSelected = document.getElementById('no-bucket-selected');
const bucketView = document.getElementById('bucket-view');
const currentBucketName = document.getElementById('current-bucket-name');
const objectsList = document.getElementById('objects-list');
const emptyBucketState = document.getElementById('empty-bucket-state');
const fileUpload = document.getElementById('file-upload');
const deleteBucketBtn = document.getElementById('delete-bucket-btn');

// Theme Elements
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = themeToggle.querySelector('i');

// Enhancement DOM Elements
const previewModal = document.getElementById('preview-modal');
const closeModal = document.querySelector('.close-modal');
const previewFilename = document.getElementById('preview-filename');
const previewBody = document.getElementById('preview-body');
const modalBackdrop = document.querySelector('.modal-backdrop');

// Initialize
function init() {
    initTheme();
    renderBuckets();
}

// Theme Toggle Logic
function initTheme() {
    const currentTheme = localStorage.getItem('aws_theme') || 'light';
    if (currentTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
    }
}

themeToggle.addEventListener('click', () => {
    let theme = document.documentElement.getAttribute('data-theme');
    if (theme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('aws_theme', 'light');
        themeIcon.classList.replace('fa-sun', 'fa-moon');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('aws_theme', 'dark');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
    }
});

// Custom Toast Notification System
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = type === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span class="toast-msg">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Save to LocalStorage
function saveData() {
    try {
        localStorage.setItem('aws_s3_simulator_data', JSON.stringify(s3Data));
    } catch (e) {
        showToast("Storage limit exceeded! Please delete some files.", "error");
    }
}

// Render Sidebar Buckets
function renderBuckets() {
    bucketList.innerHTML = '';
    s3Data.buckets.forEach(bucket => {
        const li = document.createElement('li');
        li.className = `bucket-item ${currentBucket === bucket.name ? 'active' : ''}`;
        li.innerHTML = `<i class="fa-solid fa-bucket"></i> ${bucket.name}`;
        li.onclick = () => selectBucket(bucket.name);
        bucketList.appendChild(li);
    });
}

// Select a Bucket
function selectBucket(bucketName) {
    currentBucket = bucketName;
    renderBuckets(); 
    
    noBucketSelected.classList.add('hidden');
    bucketView.classList.remove('hidden');
    currentBucketName.textContent = bucketName;
    
    renderObjects();
}

// Create Bucket
createBucketBtn.addEventListener('click', () => {
    const bucketName = prompt('Enter unique bucket name:');
    if (!bucketName || bucketName.trim() === '') return;
    
    const formattedName = bucketName.trim().toLowerCase().replace(/\s+/g, '-');
    
    if (s3Data.buckets.some(b => b.name === formattedName)) {
        showToast('Bucket name already exists!', 'error');
        return;
    }
    
    s3Data.buckets.push({ name: formattedName, objects: [] });
    saveData();
    renderBuckets();
    selectBucket(formattedName);
    showToast(`Bucket '${formattedName}' created successfully.`);
});

// Delete Bucket
deleteBucketBtn.addEventListener('click', () => {
    if (!currentBucket) return;
    
    if (confirm(`Delete bucket "${currentBucket}"? All files will be permanently lost.`)) {
        s3Data.buckets = s3Data.buckets.filter(b => b.name !== currentBucket);
        showToast(`Bucket '${currentBucket}' deleted.`);
        currentBucket = null;
        saveData();
        renderBuckets();
        
        noBucketSelected.classList.remove('hidden');
        bucketView.classList.add('hidden');
    }
});

// Render Objects in Table
function renderObjects() {
    if (!currentBucket) return;
    
    const bucket = s3Data.buckets.find(b => b.name === currentBucket);
    objectsList.innerHTML = '';
    
    if (!bucket.objects || bucket.objects.length === 0) {
        emptyBucketState.classList.remove('hidden');
        objectsList.parentElement.classList.add('hidden');
        return;
    }
    
    emptyBucketState.classList.add('hidden');
    objectsList.parentElement.classList.remove('hidden');
    
    bucket.objects.forEach((obj, index) => {
        const tr = document.createElement('tr');
        
        const sizeKB = (obj.size / 1024).toFixed(2);
        const sizeStr = sizeKB > 1024 ? (sizeKB / 1024).toFixed(2) + ' MB' : sizeKB + ' KB';
        
        let icon = 'fa-file';
        let color = 'var(--aws-muted)';
        if (obj.type.startsWith('image/')) { icon = 'fa-image'; color = '#00a1c9'; }
        else if (obj.type.startsWith('text/') || obj.name.endsWith('.md')) { icon = 'fa-file-lines'; color = '#22c55e'; }
        else if (obj.type.startsWith('video/')) { icon = 'fa-video'; color = '#eab308'; }
        
        tr.innerHTML = `
            <td>
                <i class="fa-solid ${icon}" style="color: ${color}; margin-right: 12px; font-size: 16px;"></i>
                <span class="clickable-file" onclick="openPreview(${index})" title="Click to trigger Quick Previewer">
                    ${obj.name}
                </span>
            </td>
            <td><span class="file-type-badge">${obj.type || 'Unknown'}</span></td>
            <td>${sizeStr}</td>
            <td>
                <button class="icon-btn delete" onclick="deleteObject(${index})" title="Delete Object">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </td>
        `;
        objectsList.appendChild(tr);
    });
}

// Upload File
fileUpload.addEventListener('change', (e) => {
    if (!currentBucket || !e.target.files.length) return;
    
    const file = e.target.files[0];
    
    if(file.size > 2 * 1024 * 1024) {
        showToast('File too large for simulation. Please use files under 2MB.', 'error');
        fileUpload.value = '';
        return;
    }

    const reader = new FileReader();
    
    reader.onload = function(event) {
        const base64Data = event.target.result;
        const bucket = s3Data.buckets.find(b => b.name === currentBucket);
        
        if (bucket.objects.some(o => o.name === file.name)) {
            showToast('A file with this name already exists.', 'error');
            fileUpload.value = '';
            return;
        }
        
        bucket.objects.push({
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64Data 
        });
        
        saveData();
        renderObjects();
        showToast('File uploaded successfully!');
        fileUpload.value = ''; 
    };
    
    reader.onerror = function() { showToast("Error reading file", "error"); };
    reader.readAsDataURL(file); 
});

// Delete Object
window.deleteObject = function(index) {
    if (!currentBucket) return;
    if (confirm("Delete this object permanently?")) {
        const bucket = s3Data.buckets.find(b => b.name === currentBucket);
        bucket.objects.splice(index, 1);
        saveData();
        renderObjects();
        showToast('Object deleted.');
    }
}

// ==========================================
// ENHANCEMENT: Quick File Previewer
// ==========================================

window.openPreview = function(index) {
    if (!currentBucket) return;
    const bucket = s3Data.buckets.find(b => b.name === currentBucket);
    const obj = bucket.objects[index];
    
    previewFilename.textContent = obj.name;
    previewBody.innerHTML = ''; 
    
    if (obj.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = obj.data;
        img.className = 'scale-in';
        previewBody.appendChild(img);
    } else if (obj.type.startsWith('text/') || obj.name.endsWith('.json') || obj.name.endsWith('.md')) {
        try {
            const base64Content = obj.data.split(',')[1]; 
            const textContent = atob(base64Content);
            const pre = document.createElement('pre');
            pre.className = 'preview-text-content scale-in';
            pre.textContent = textContent;
            previewBody.appendChild(pre);
        } catch(e) {
            previewBody.innerHTML = `<div class="unsupported-preview"><i class="fa-solid fa-triangle-exclamation fa-2x"></i><p>Could not parse text file.</p></div>`;
        }
    } else {
        previewBody.innerHTML = `
            <div class="unsupported-preview scale-in">
                <i class="fa-solid fa-file-circle-xmark fa-3x" style="color:var(--danger)"></i>
                <p>Quick Preview not available for ${obj.type || 'this file type'}.</p>
                <p style="font-size:13px; color:var(--aws-muted);">Supported types: Images, Text files.</p>
            </div>
        `;
    }
    
    previewModal.classList.remove('hidden');
}

// Close Modal logic
const hideModal = () => previewModal.classList.add('hidden');
closeModal.addEventListener('click', hideModal);
modalBackdrop.addEventListener('click', hideModal);

// Run app
init();
