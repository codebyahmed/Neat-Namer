document.addEventListener('DOMContentLoaded', () => {
    const homePage = document.getElementById('homePage');
    const fileInputAtHome = document.getElementById('fileInputAtHome');
    const addFilesBtn = document.getElementById('addFilesBtn');

    const tablePage = document.getElementById('tablePage');
    const fileInputAtTable = document.getElementById('fileInputAtTable');
    const addMoreFilesBtn = document.getElementById('addMoreFilesBtn');
    const clearFilesBtn = document.getElementById('clearFilesBtn');
    const renameFilesBtn = document.getElementById('renameFilesBtn');
    const saveFilesBtn = document.getElementById('saveFilesBtn');
    const filesTableBody = document.getElementById('filesTableBody');

    const oldNameHeader = document.getElementById('oldNameHeader');
    const newNameHeader = document.getElementById('newNameHeader');

    // Add new elements for progress indicators
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container mt-3 mb-3';
    progressContainer.style.display = 'none';
    progressContainer.innerHTML = `
        <div class="d-flex align-items-center">
            <div class="spinner-border spinner-border-sm me-2" role="status"></div>
            <span id="progressText">Processing...</span>
        </div>
        <div class="progress mt-2" style="height: 10px;">
            <div id="progressBar" class="progress-bar" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
        </div>
    `;
    tablePage.insertBefore(progressContainer, document.querySelector('.table-container'));
    
    const progressText = document.getElementById('progressText');
    const progressBar = document.getElementById('progressBar');

    addFilesBtn.addEventListener('click', () => {
        fileInputAtHome.click();
    });

    fileInputAtHome.addEventListener('change', async (event) => {
        const selectedFiles = Array.from(event.target.files);

        if (selectedFiles.length > 0) {
            homePage.style.display = 'none';
            tablePage.style.display = 'block';
            
            // Show loading indicator
            progressContainer.style.display = 'block';
            progressText.textContent = 'Adding files...';
            progressBar.style.width = '0%';
            
            const formData = new FormData();
            selectedFiles.forEach(file => {
                formData.append('files', file);
            });

            try {
                const response = await fetch('/add_files', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error('Error adding files');
                }
                
                const result = await response.json();
                
                // Clear existing table rows
                while (filesTableBody.firstChild) {
                    filesTableBody.removeChild(filesTableBody.firstChild);
                }
                
                // Add rows for each file
                result.files.forEach((file, index) => {
                    const row = filesTableBody.insertRow();
                    row.insertCell(0).textContent = index + 1;
                    row.insertCell(1).textContent = file;
                });
            } catch (error) {
                console.error('Error adding files:', error);
                alert('Failed to add files. Please try again.');
            } finally {
                // Hide loading indicator
                progressContainer.style.display = 'none';
            }
        }
    });

    addMoreFilesBtn.addEventListener('click', () => {
        fileInputAtTable.click();
    });

    fileInputAtTable.addEventListener('change', async (event) => {
        const selectedFiles = Array.from(event.target.files);

        if (selectedFiles.length > 0) {
            // Show loading indicator
            progressContainer.style.display = 'block';
            progressText.textContent = 'Adding files...';
            progressBar.style.width = '0%';
            
            const formData = new FormData();
            selectedFiles.forEach(file => {
                formData.append('files', file);
            });

            try {
                const response = await fetch('/add_files', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    throw new Error('Error adding files');
                }
                
                const result = await response.json();
                
                // Clear existing table rows
                while (filesTableBody.firstChild) {
                    filesTableBody.removeChild(filesTableBody.firstChild);
                }
                
                // Add rows for each file
                result.files.forEach((file, index) => {
                    const row = filesTableBody.insertRow();
                    row.insertCell(0).textContent = index + 1;
                    row.insertCell(1).textContent = file;
                });
            } catch (error) {
                console.error('Error adding files:', error);
                alert('Failed to add files. Please try again.');
            } finally {
                // Hide loading indicator
                progressContainer.style.display = 'none';
                // Reset the file input so the same files can be selected again if needed
                fileInputAtTable.value = '';
            }
        }
    });

    clearFilesBtn.addEventListener('click', async () => {
        // If renaming is in progress, show confirmation dialog
        if (progressContainer.style.display === 'block' && progressText.textContent.includes('Renaming')) {
            if (!confirm('Renaming is in progress. Are you sure you want to stop and clear all files?')) {
                return; // User cancelled the operation
            }
            
            // Update progress text to show stopping status
            progressText.textContent = 'Stopping and clearing files...';
        }
        
        const response = await fetch('/clear_selected_files', {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            alert(`Error: ${errorData.error || 'Failed to clear files'}`);
            return;
        }
        
        // Update UI
        homePage.style.display = 'block';
        tablePage.style.display = 'none';
        newNameHeader.style.display = 'none';
        progressContainer.style.display = 'none';

        addMoreFilesBtn.classList.remove('disabled');
        addMoreFilesBtn.disabled = false;
        renameFilesBtn.classList.remove('disabled');
        renameFilesBtn.disabled = false;
        saveFilesBtn.classList.add('disabled');
        saveFilesBtn.disabled = true;

        // Clear the table
        while (filesTableBody.firstChild) {
            filesTableBody.removeChild(filesTableBody.firstChild);
        }

        // Reset file inputs
        fileInputAtHome.value = '';
        fileInputAtTable.value = '';
    });

    renameFilesBtn.addEventListener('click', async () => {
        // Show renaming progress indicator
        progressContainer.style.display = 'block';
        progressText.textContent = 'Renaming files...';
        progressBar.style.width = '0%';
        
        addMoreFilesBtn.classList.add('disabled');
        addMoreFilesBtn.disabled = true;
        renameFilesBtn.classList.add('disabled');
        renameFilesBtn.disabled = true;
        
        try {
            // Start the rename process
            const startResponse = await fetch('/start_rename', {
                method: 'POST'
            });
            if (!startResponse.ok) {
                throw new Error('Failed to start renaming process');
            }
            
            // Poll for progress
            const pollProgress = async () => {
                const progressResponse = await fetch('/rename_progress');
                const progressData = await progressResponse.json();
                
                if (progressData.completed || progressData.stopped) {
                    // Renaming completed or stopped
                    progressContainer.style.display = 'none';
                    
                    if (progressData.completed) {
                        // Update the table with new names
                        for (let i = 0; i < progressData.files.length; i++) {
                            const row = filesTableBody.children[i];
                            if (row.cells.length < 3) {
                                row.insertCell(2).textContent = progressData.files[i];
                            } else {
                                row.cells[2].textContent = progressData.files[i];
                            }
                        }
                        
                        newNameHeader.style.display = 'block';
                        saveFilesBtn.classList.remove('disabled');
                        saveFilesBtn.disabled = false;
                    } else {
                        // Process was stopped by user
                        addMoreFilesBtn.classList.remove('disabled');
                        addMoreFilesBtn.disabled = false;
                        renameFilesBtn.classList.remove('disabled');
                        renameFilesBtn.disabled = false;
                    }
                    return;
                }
                
                // Update progress display
                const percentage = progressData.current / progressData.total * 100;
                progressText.textContent = `Renaming files... ${progressData.current} of ${progressData.total}`;
                progressBar.style.width = `${percentage}%`;
                progressBar.setAttribute('aria-valuenow', percentage);
                
                // Continue polling
                setTimeout(pollProgress, 500);
            };
            
            pollProgress();
        } catch (error) {
            console.error('Error during renaming:', error);
            progressContainer.style.display = 'none';
            alert('An error occurred during the renaming process.');
            
            addMoreFilesBtn.classList.remove('disabled');
            addMoreFilesBtn.disabled = false;
            renameFilesBtn.classList.remove('disabled');
            renameFilesBtn.disabled = false;
        }
    });

    saveFilesBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/create_zip', {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            // Get the blob from the response
            const blob = await response.blob();
            
            // Create a URL for the blob
            const downloadUrl = window.URL.createObjectURL(blob);
            
            // Create a temporary anchor element
            const downloadLink = document.createElement('a');
            downloadLink.href = downloadUrl;
            downloadLink.download = 'renamed_files.zip';
            
            // Append to the document, click it, and remove it
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            // Clean up the URL object
            window.URL.revokeObjectURL(downloadUrl);
            
        } catch (error) {
            console.error('Error downloading files:', error);
        }
    });
});
