# Neat-Namer

![Neat Namer](static/img/home-image.png)

A smart file renaming tool that uses AI to transform messy and inconsistent filenames into clean, organized, and meaningful names. Neat-Namer helps you maintain a tidy file system with minimal effort.

## Features

- **AI-Powered Renaming**: Uses Google's Gemini AI to intelligently rename files
- **Dual Mode Processing**:
  - **Text Mode**: Clean up text-based filenames by removing special characters, normalizing case, and improving readability
  - **Image Mode**: Generate descriptive names for images by analyzing their content
- **Batch Processing**: Rename multiple files simultaneously  
- **Custom Instructions**: Provide specific guidelines for how you want your files renamed
- **Preview Before Saving**: Review the proposed names before finalizing changes
- **Export Options**: Save renamed files as a convenient zip package

## Preinstalled Binaries

For quick and easy setup, download the preinstalled binaries directly from the GitHub repository:

1. Visit the [Releases](https://github.com/codebyahmed/Neat-Namer/releases) page
2. Download the appropriate version for your operating system:
   - Windows: `neatnamer-windows.exe`
   - Linux: `neatnamer-linux`
3. Run the application directly - no installation required

## Installation from Source

### Prerequisites

- Python 3.8 or higher
- Google Gemini API key ([Get it here](https://makersuite.google.com/app/apikey))

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/Neat-Namer.git
   cd Neat-Namer
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the application:
   ```bash
   python app.py
   ```

## Usage

1. **Launch the application**
   - The application will open in a desktop window

2. **Verify your API key**
   - Enter your Google Gemini API key in the provided field
   - Click "Verify" to validate and save your key

3. **Add files**
   - Click "Add files..." to select files for renaming
   - Optionally provide custom instructions for how you want your files renamed

4. **Select renaming mode**
   - Check "Image Mode" for image-specific naming (analyzes image content)
   - Keep unchecked for standard text-based renaming

5. **Process files**
   - Click "Rename" to begin the AI-powered renaming process
   - The progress bar will show completion status

6. **Review and save**
   - Review the old and new filenames in the table
   - Click "Save" to download a zip file with all renamed files

## Custom Instructions

You can provide custom instructions to guide the renaming process. Examples:

- "Remove product codes but keep dates"
- "Format all names in Title Case"
- "Include the primary color of each image in the filename"
- "Use technical terminology for scientific documents"

---

**Note:** This tool requires internet access to connect with the Gemini API for intelligent renaming capabilities.