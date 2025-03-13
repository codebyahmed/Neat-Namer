document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const elements = {
        homePage: document.getElementById('homePage'),
        tablePage: document.getElementById('tablePage'),
        fileInputs: {
            home: document.getElementById('fileInputAtHome'),
            table: document.getElementById('fileInputAtTable')
        },
        buttons: {
            addFiles: document.getElementById('addFilesBtn'),
            addMoreFiles: document.getElementById('addMoreFilesBtn'),
            clearFiles: document.getElementById('clearFilesBtn'),
            renameFiles: document.getElementById('renameFilesBtn'),
            saveFiles: document.getElementById('saveFilesBtn')
        },
        filesTableBody: document.getElementById('filesTableBody'),
        oldNameHeader: document.getElementById('oldNameHeader'),
        newNameHeader: document.getElementById('newNameHeader'),
        imageMode: document.getElementById('imageMode') // Add reference to checkbox
    };
    
    // Create progress elements
    const progressElements = createProgressElements();
    
    // Initialize event listeners
    initializeEventListeners();
    
    function createProgressElements() {
        const container = document.createElement('div');
        container.className = 'progress-container mt-3 mb-3';
        container.style.display = 'none';
        container.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="spinner-border spinner-border-sm me-2" role="status"></div>
                <span id="progressText">Processing...</span>
            </div>
            <div class="progress mt-2" style="height: 10px;">
                <div id="progressBar" class="progress-bar" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
        `;
        elements.tablePage.insertBefore(container, document.querySelector('.table-container'));
        
        return {
            container,
            text: document.getElementById('progressText'),
            bar: document.getElementById('progressBar')
        };
    }
    
    function initializeEventListeners() {
        elements.buttons.addFiles.addEventListener('click', () => elements.fileInputs.home.click());
        elements.fileInputs.home.addEventListener('change', event => handleFileSelection(event, true));
        
        elements.buttons.addMoreFiles.addEventListener('click', () => elements.fileInputs.table.click());
        elements.fileInputs.table.addEventListener('change', event => handleFileSelection(event, false));
        
        elements.buttons.clearFiles.addEventListener('click', clearFiles);
        elements.buttons.renameFiles.addEventListener('click', renameFiles);
        elements.buttons.saveFiles.addEventListener('click', saveFilesAsZip);
    }
    
    async function handleFileSelection(event, switchToTableView) {
        const selectedFiles = Array.from(event.target.files);
        if (selectedFiles.length === 0) return;
        
        if (switchToTableView) {
            elements.homePage.style.display = 'none';
            elements.tablePage.style.display = 'block';
        }
        
        showProgress('Adding files...', 0);
        
        const formData = new FormData();
        selectedFiles.forEach(file => formData.append('files', file));
        
        try {
            const response = await fetch('/add_files', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) throw new Error('Error adding files');
            
            const result = await response.json();
            updateFilesTable(result.files);
        } catch (error) {
            console.error('Error adding files:', error);
            alert('Failed to add files. Please try again.');
        } finally {
            hideProgress();
            event.target.value = '';
        }
    }
    
    function updateFilesTable(files) {
        while (elements.filesTableBody.firstChild) {
            elements.filesTableBody.removeChild(elements.filesTableBody.firstChild);
        }
        
        files.forEach((file, index) => {
            const row = elements.filesTableBody.insertRow();
            row.insertCell(0).textContent = index + 1;
            row.insertCell(1).textContent = file;
        });
    }
    
    async function clearFiles() {
        if (progressElements.container.style.display === 'block' && 
            progressElements.text.textContent.includes('Renaming')) {
            if (!confirm('Renaming is in progress. Are you sure you want to stop and clear all files?')) {
                return;
            }
            
            progressElements.text.textContent = 'Stopping and clearing files...';
        }
        
        const response = await fetch('/clear_selected_files', {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            alert(`Error: ${errorData.error || 'Failed to clear files'}`);
            return;
        }
        
        resetUIToInitialState();
    }
    
    function resetUIToInitialState() {
        elements.homePage.style.display = 'block';
        elements.tablePage.style.display = 'none';
        elements.newNameHeader.style.display = 'none';
        progressElements.container.style.display = 'none';
        
        enableButtons(true);
        
        while (elements.filesTableBody.firstChild) {
            elements.filesTableBody.removeChild(elements.filesTableBody.firstChild);
        }
        
        elements.fileInputs.home.value = '';
        elements.fileInputs.table.value = '';
    }
    
    function enableButtons(enabled) {
        elements.buttons.addMoreFiles.classList.toggle('disabled', !enabled);
        elements.buttons.addMoreFiles.disabled = !enabled;
        elements.buttons.renameFiles.classList.toggle('disabled', !enabled);
        elements.buttons.renameFiles.disabled = !enabled;
        elements.buttons.saveFiles.classList.toggle('disabled', !enabled === false);
        elements.buttons.saveFiles.disabled = !enabled === false;
    }
    
    async function renameFiles() {
        showProgress('Renaming files...', 0);
        enableButtons(false);
        
        try {
            const mode = elements.imageMode.checked ? 'image' : 'text';
            const modeResponse = await fetch('/set_mode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ mode })
            });
            
            if (!modeResponse.ok) throw new Error('Failed to set mode');
            
            const startResponse = await fetch('/start_rename', { method: 'POST' });
            if (!startResponse.ok) throw new Error('Failed to start renaming process');
            
            pollRenameProgress();
        } catch (error) {
            console.error('Error during renaming:', error);
            hideProgress();
            alert('An error occurred during the renaming process.');
            enableButtons(true);
        }
    }
    
    async function pollRenameProgress() {
        try {
            const progressResponse = await fetch('/rename_progress');
            const data = await progressResponse.json();
            
            if (data.completed || data.stopped) {
                hideProgress();
                
                if (data.completed) {
                    updateTableWithNewNames(data.files);
                    elements.newNameHeader.style.display = 'block';
                    elements.buttons.saveFiles.classList.remove('disabled');
                    elements.buttons.saveFiles.disabled = false;
                } else {
                    enableButtons(true);
                }
                return;
            }
            
            const percentage = data.current / data.total * 100;
            progressElements.text.textContent = 
                `Renaming files... ${data.current} of ${data.total}`;
            progressElements.bar.style.width = `${percentage}%`;
            progressElements.bar.setAttribute('aria-valuenow', percentage);
            
            setTimeout(pollRenameProgress, 500);
        } catch (error) {
            console.error('Error polling progress:', error);
            hideProgress();
            alert('Failed to get renaming progress.');
            enableButtons(true);
        }
    }
    
    function updateTableWithNewNames(newNames) {
        for (let i = 0; i < newNames.length; i++) {
            const row = elements.filesTableBody.children[i];
            if (row.cells.length < 3) {
                row.insertCell(2).textContent = newNames[i];
            } else {
                row.cells[2].textContent = newNames[i];
            }
        }
    }
    
    async function saveFilesAsZip() {
        try {
            const response = await fetch('/create_zip', { method: 'POST' });
            
            if (!response.ok) throw new Error('Network response was not ok');
            
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            
            const downloadLink = document.createElement('a');
            downloadLink.href = downloadUrl;
            downloadLink.download = 'renamed_files.zip';
            
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Error downloading files:', error);
            alert('Failed to download renamed files.');
        }
    }
    
    function showProgress(text, percentage = 0) {
        progressElements.container.style.display = 'block';
        progressElements.text.textContent = text;
        progressElements.bar.style.width = `${percentage}%`;
        progressElements.bar.setAttribute('aria-valuenow', percentage);
    }
    
    function hideProgress() {
        progressElements.container.style.display = 'none';
    }
});