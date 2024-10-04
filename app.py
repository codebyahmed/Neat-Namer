import os
from flask import Flask, jsonify, render_template, request, send_file
from utils import generate_new_name_from_image, generate_new_name_from_text, zip_up, clear_directory

app = Flask(__name__)


TEMP_FILES_DIR = 'tmp'
selected_files = []
renamed_files = []
mode = "text"

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/rename_files', methods=['PUT'])
def rename_files():
    global selected_files

    for file in selected_files:
        file_path = os.path.join(TEMP_FILES_DIR, file)
        file_extension = file.split('.')[-1]
        file_name = file.split('.')[0]
        
        if (mode == "text"):
            new_name = generate_new_name_from_text(file_name)
        
        elif (mode == "image"):
            renamed_file_paths = os.path.join(file_path, file_path)
            new_name = generate_new_name_from_image(renamed_file_paths)
            
        new_name = f"{new_name}.{file_extension}"
        print(f"Old name: {file}, New name: {new_name}")
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


@app.route('/create_zip', methods=['POST'])
def create_zip():
    global renamed_files

    if not renamed_files:
        return jsonify({"Message" : "No files to zip"}), 400

    renamed_file_paths = [os.path.join(TEMP_FILES_DIR, file) for file in renamed_files]
    
    zip_file_path = zip_up(renamed_file_paths, TEMP_FILES_DIR)

    return send_file(
        zip_file_path,
        as_attachment=True,
        download_name='renamed_files.zip',
        mimetype='application/zip'
    )


if __name__ == '__main__':
    TEMP_FILES_DIR = os.path.join(app.root_path, TEMP_FILES_DIR)
    clear_directory(TEMP_FILES_DIR)
    app.run(debug=True)