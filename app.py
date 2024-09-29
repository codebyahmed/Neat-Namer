import os
from flask import Flask, render_template, request
from openai import OpenAI

app = Flask(__name__)
openai = OpenAI()

TEMP_FILES_DIR = 'tmp'
selected_files = []
renamed_files = []


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/rename_files', methods=['POST'])
def rename_files():
    global selected_files

    for file in selected_files:
        file_path = os.path.join(TEMP_FILES_DIR, file)
        new_name = generate_new_name(file)
        new_file_path = os.path.join(TEMP_FILES_DIR, new_name)
        os.rename(file_path, new_file_path)
        renamed_files.append(new_name)

    return f"Files renamed: {', '.join(renamed_files)}"


@app.route('/add_files', methods=['POST'])
def add_files():
    files = request.files.getlist('files')
    global selected_files
    new_files = []

    for file in files:
        filename = file.filename
        selected_files.append(filename)
        new_files.append(filename)
        file_path = os.path.join(TEMP_FILES_DIR, filename)
        file.save(file_path)
    
    return f"Files added: {', '.join(new_files)}"


@app.route('/get_selected_files', methods=['GET'])
def get_selected_files():
    global selected_files
    return selected_files


@app.route('/get_renamed_files', methods=['GET'])
def get_renamed_files():
    global renamed_files
    return renamed_files


@app.route('/clear_selected_files', methods=['DELETE'])
def clear_selected_files():
    global selected_files, renamed_files

    for file in os.listdir(TEMP_FILES_DIR):
        file_path = os.path.join(TEMP_FILES_DIR, file)
        os.remove(file_path)

    selected_files = []
    renamed_files = []

    return 'Selected files cleared'


def generate_new_name(original_name: str) -> str:
    """Generates a new name for a given file name using OpenAI.

    Args:
        original_name (str): The old name of the file.

    Returns:
        str: The new name of the file.
    """
    return f"renamed_{original_name}"


if __name__ == '__main__':
    TEMP_FILES_DIR = os.path.join(app.root_path, TEMP_FILES_DIR)
    os.makedirs(TEMP_FILES_DIR, exist_ok=True)
    app.run(debug=True)