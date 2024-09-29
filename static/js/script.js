document.addEventListener('DOMContentLoaded', () => {
    const homePage = document.getElementById('homePage');
    const fileInput = document.getElementById('fileInput');
    const addFilesBtn = document.getElementById('addFilesBtn');

    addFilesBtn.addEventListener('click', () => {
        fileInput.click();  // Trigger the file input click
    });

    fileInput.addEventListener('change', async (event) => {
        const selectedFiles = Array.from(event.target.files); // Get selected files
    });
});
