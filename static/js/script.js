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


    addFilesBtn.addEventListener('click', () => {
        fileInputAtHome.click();
    });

    fileInputAtHome.addEventListener('change', async (event) => {
        const selectedFiles = Array.from(event.target.files);

        if (selectedFiles.length > 0) {
            homePage.style.display = 'none';
            tablePage.style.display = 'block';

            const formData = new FormData();
            selectedFiles.forEach(file => {
                formData.append('files', file);

                const row = filesTableBody.insertRow();
                row.insertCell(0).textContent = filesTableBody.children.length;
                row.insertCell(1).textContent = file.name;
            });

            const response = await fetch('/add_files', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                console.error('Error adding files');
                return;
            }
        }
    });

    addMoreFilesBtn.addEventListener('click', () => {
        fileInputAtTable.click();
    });

    fileInputAtTable.addEventListener('change', async (event) => {
        const selectedFiles = Array.from(event.target.files);

        if (selectedFiles.length > 0) {
            const formData = new FormData();
            selectedFiles.forEach(file => {
                formData.append('files', file);

                const row = filesTableBody.insertRow();
                row.insertCell(0).textContent = filesTableBody.children.length;
                row.insertCell(1).textContent = file.name;
            });

            const response = await fetch('/add_files', {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                console.error('Error adding files');
                return;
            }
        }
    });

    clearFilesBtn.addEventListener('click', async () => {
        homePage.style.display = 'block';
        tablePage.style.display = 'none';
        newNameHeader.style.display = 'none';

        addMoreFilesBtn.classList.remove('disabled');
        addMoreFilesBtn.disabled = false;
        renameFilesBtn.classList.remove('disabled');
        renameFilesBtn.disabled = false;
        saveFilesBtn.classList.add('disabled');

        const response = await fetch('/clear_selected_files', {
            method: 'DELETE'
        });
        if (!response.ok) {
            console.error('Error clearing files');
            return;
        }

        while (filesTableBody.firstChild) {
            filesTableBody.removeChild(filesTableBody.firstChild);
        }
    });

    renameFilesBtn.addEventListener('click', async () => {
        const response = await fetch('/rename_files', {
            method: 'PUT'
        });
        if (!response.ok) {
            console.error('Error renaming files');
            return;
        }

        // Get request to get the renamed files
        const responseGet = await fetch('/get_renamed_files');
        if (!responseGet.ok) {
            console.error('Error getting files');
            return;
        }

        const files = await responseGet.json();
        // Add a third column to the table called renamed files
        for (let i = 0; i < files.length; i++) {
            filesTableBody.children[i].insertCell(2).textContent = files[i];
        }

        saveFilesBtn.classList.remove('disabled');
        saveFilesBtn.disabled = false;
        addMoreFilesBtn.classList.add('disabled');
        renameFilesBtn.classList.add('disabled');
        newNameHeader.style.display = 'block';
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
