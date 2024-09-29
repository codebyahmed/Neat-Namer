import os
from flask import Flask, render_template, request

app = Flask(__name__)

TEMP_FILES_DIR = '/tmp'
selected_files = []


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/rename', methods=['POST'])
def rename():
    files = request.files.getlist('files')
    pass


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


@app.route('/clear_selected_files', methods=['DELETE'])
def clear_selected_files():
    global selected_files

    for file in selected_files:
        file_path = os.path.join(TEMP_FILES_DIR, file)
        os.remove(file_path)

    selected_files = []
    return 'Selected files cleared'


if __name__ == '__main__':
    app.run(debug=True)