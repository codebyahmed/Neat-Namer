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
            saveFiles: document.getElementById('saveFilesBtn'),
            verifyApiKey: document.getElementById('button-addon2') // Verify API key button
        },
        filesTableBody: document.getElementById('filesTableBody'),
        oldNameHeader: document.getElementById('oldNameHeader'),
        newNameHeader: document.getElementById('newNameHeader'),
        imageMode: document.getElementById('imageMode'),
        togglePassword: document.getElementById('togglePassword'),
        apiKeyInput: document.getElementById('apiKeyInput'),
        apiKeyFeedback: document.getElementById('apiKeyFeedback'),
        getApiKeyLink: document.getElementById('getApiKeyLink') // Add this line
    };
    
    // Create progress elements
    const progressElements = createProgressElements();
    
    // Initialize event listeners
    initializeEventListeners();
    
    // Check if API key exists on load
    checkApiKeyExists();
    
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
        
        if (elements.togglePassword) {
            elements.togglePassword.addEventListener('click', togglePasswordVisibility);
        }
        
        // Add verify API key event listener
        if (elements.buttons.verifyApiKey) {
            elements.buttons.verifyApiKey.addEventListener('click', verifyApiKey);
        }
    }
    
    async function checkApiKeyExists() {
        try {
            const response = await fetch('/get_api_key');
            const data = await response.json();
            
            if (data.has_key) {
                // Show a placeholder in the input field
                elements.apiKeyInput.placeholder = "API key is saved";
                
                // Add a visual indicator that the key is verified
                if (elements.apiKeyFeedback) {
                    elements.apiKeyFeedback.innerHTML = '<span class="text-success">API key verified</span>';
                } else {
                    // Create the feedback element if it doesn't exist
                    createApiKeyFeedbackElement('API key verified', true);
                }
                
                // Hide the "Get Your Gemini API Key" link
                if (elements.getApiKeyLink) {
                    elements.getApiKeyLink.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error checking API key:', error);
        }
    }
    
    function createApiKeyFeedbackElement(message, isSuccess) {
        if (elements.apiKeyFeedback) {
            // Update existing element
            elements.apiKeyFeedback.innerHTML = `<span class="text-${isSuccess ? 'success' : 'danger'}">${message}</span>`;
            return;
        }
        
        // Create a new element after the input group
        const feedbackElement = document.createElement('div');
        feedbackElement.id = 'apiKeyFeedback';
        feedbackElement.className = 'text-center mt-2';
        feedbackElement.innerHTML = `<span class="text-${isSuccess ? 'success' : 'danger'}">${message}</span>`;
        
        const inputGroup = elements.apiKeyInput.closest('.input-group');
        inputGroup.after(feedbackElement);
        
        // Update the elements object
        elements.apiKeyFeedback = feedbackElement;
    }
    
    async function verifyApiKey() {
        const apiKey = elements.apiKeyInput.value.trim();
        
        if (!apiKey) {
            createApiKeyFeedbackElement('Please enter an API key', false);
            return;
        }
        
        // Show loading state
        elements.buttons.verifyApiKey.disabled = true;
        elements.buttons.verifyApiKey.innerHTML = `
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Verifying...
        `;
        
        try {
            const response = await fetch('/verify_api_key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ api_key: apiKey })
            });
            
            const result = await response.json();
            
            if (result.valid) {
                createApiKeyFeedbackElement(result.message, true);
                // Optionally clear the input field or replace with placeholder
                elements.apiKeyInput.value = '';
                elements.apiKeyInput.placeholder = 'API key is saved';
                
                // Hide the "Get Your Gemini API Key" link
                if (elements.getApiKeyLink) {
                    elements.getApiKeyLink.style.display = 'none';
                }
            } else {
                createApiKeyFeedbackElement(result.message, false);
                
                // Make sure the link is visible if verification failed
                if (elements.getApiKeyLink) {
                    elements.getApiKeyLink.style.display = 'inline-block';
                }
            }
        } catch (error) {
            console.error('Error verifying API key:', error);
            createApiKeyFeedbackElement('Error verifying API key', false);
        } finally {
            // Reset button state
            elements.buttons.verifyApiKey.disabled = false;
            elements.buttons.verifyApiKey.textContent = 'Verify';
        }
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
        // First check if we have a valid API key
        try {
            const response = await fetch('/get_api_key');
            const data = await response.json();
            
            if (!data.has_key) {
                alert('Please verify your Gemini API key before renaming files.');
                return;
            }
            
            // Continue with existing rename logic
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
                
                if (startResponse.ok) {
                    pollRenameProgress();
                } else {
                    const errorData = await startResponse.json();
                    alert(errorData.error || 'Failed to start renaming process');
                    hideProgress();
                    enableButtons(true);
                }
            } catch (error) {
                console.error('Error during renaming:', error);
                hideProgress();
                alert('An error occurred during the renaming process.');
                enableButtons(true);
            }
        } catch (error) {
            console.error('Error checking API key:', error);
            alert('Error checking API key status.');
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
    
    function togglePasswordVisibility() {
        const apiKeyInput = elements.apiKeyInput;
        const eyeIcon = this.querySelector('svg');
        
        if (!apiKeyInput || !eyeIcon) return;
        
        // Toggle the input type
        if (apiKeyInput.type === 'password') {
            apiKeyInput.type = 'text';
            // Change to eye-slash icon
            eyeIcon.innerHTML = `
                <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
                <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
            `;
        } else {
            apiKeyInput.type = 'password';
            // Change back to eye icon
            eyeIcon.innerHTML = `
                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
            `;
        }
    }
});