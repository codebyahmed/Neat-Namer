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
});
