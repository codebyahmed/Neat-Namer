import os
import threading
import time
from flask import Flask, jsonify, render_template, request, send_file
from flaskwebgui import FlaskUI
from utils import generate_new_name_from_image, generate_new_name_from_text, zip_up, clear_directory

app = Flask(__name__)

TEMP_FILES_DIR = 'tmp'
selected_files = []
renamed_files = []
mode = "image"

# Progress tracking variables
rename_in_progress = False
rename_current = 0
rename_total = 0
rename_completed = False
rename_stop_requested = False  # New flag to signal stopping the renaming process

@app.route('/')
def index():
    global TEMP_FILES_DIR
    TEMP_FILES_DIR = os.path.join(app.root_path, TEMP_FILES_DIR)
    clear_directory(TEMP_FILES_DIR)
    return render_template('index.html')

@app.route('/add_files', methods=['POST'])
def add_files():
    files = request.files.getlist('files')
    global selected_files
    new_files = []

    # Ensure the directory exists and is ready to receive files
    try:
        os.makedirs(TEMP_FILES_DIR, exist_ok=True)
        
        for file in files:
            filename = file.filename
            selected_files.append(filename)
            new_files.append(filename)
            file_path = os.path.join(TEMP_FILES_DIR, filename)
            file.save(file_path)
        
        return jsonify({"files": selected_files})
    except Exception as e:
        print(f"Error in add_files: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/start_rename', methods=['POST'])
def start_rename():
    global rename_in_progress, rename_current, rename_total, rename_completed, selected_files, rename_stop_requested

    if rename_in_progress:
        return jsonify({"error": "Renaming already in progress"}), 400

    rename_in_progress = True
    rename_current = 0
    rename_total = len(selected_files)
    rename_completed = False
    rename_stop_requested = False  # Reset stop flag when starting new rename
    
    # Start renaming process in a separate thread
    threading.Thread(target=process_rename_files).start()
    
    return jsonify({"status": "started"})

def process_rename_files():
    global rename_in_progress, rename_current, rename_total, rename_completed, rename_stop_requested
    global selected_files, renamed_files
    
    renamed_files = []
    temp_files = []  # Store renamed files temporarily during process
    
    try:
        for file in selected_files:
            # Check if stop was requested
            if rename_stop_requested:
                # Clean up already renamed files
                for temp_file in temp_files:
                    try:
                        new_path = os.path.join(TEMP_FILES_DIR, temp_file)
                        original_path = os.path.join(TEMP_FILES_DIR, selected_files[temp_files.index(temp_file)])
                        if os.path.exists(new_path) and new_path != original_path:
                            os.rename(new_path, original_path)
                    except Exception as e:
                        print(f"Error reverting file {temp_file}: {e}")
                break
            
            file_path = os.path.join(TEMP_FILES_DIR, file)
            file_extension = file.split('.')[-1]
            file_name = file.split('.')[0]
            
            if mode == "text":
                new_name = generate_new_name_from_text(file_name)
                         
            elif mode == "image":
                new_name = generate_new_name_from_image(file_path, file_name)
    
            # Remove 'Spaces and Enter' from the end of new name if any
            new_name = new_name.strip()
            new_name = new_name.replace("\n", "")
            new_name = new_name.replace("\r", "")
    
            new_name = f"{new_name}.{file_extension}"
    
            # Handle duplicate filenames
            i = 1
            base_new_name = new_name.rsplit('.', 1)[0]
            while new_name in renamed_files:
                new_name = f"{base_new_name}_{i}.{file_extension}"
                i += 1
            
            print(f"Old name: {file}, New name: {new_name}")
            new_file_path = os.path.join(TEMP_FILES_DIR, new_name)
            os.rename(file_path, new_file_path)
            renamed_files.append(new_name)
            temp_files.append(new_name)
            
            # Update progress
            rename_current += 1
            
    except Exception as e:
        print(f"Error during renaming: {e}")
    finally:
        rename_completed = not rename_stop_requested
        rename_in_progress = False
        rename_stop_requested = False
        
        # If stopped, clear the renamed files list
        if not rename_completed:
            renamed_files = []

@app.route('/rename_progress', methods=['GET'])
def rename_progress():
    global rename_in_progress, rename_current, rename_total, rename_completed, renamed_files, rename_stop_requested
    
    return jsonify({
        "in_progress": rename_in_progress,
        "current": rename_current,
        "total": rename_total,
        "completed": rename_completed,
        "files": renamed_files,
        "stopped": rename_stop_requested
    })

# Keep other routes as they are, but remove the rename_files route since it's replaced by start_rename

@app.route('/get_selected_files', methods=['GET'])
def get_selected_files():
    global selected_files
    return jsonify(selected_files)

@app.route('/get_renamed_files', methods=['GET'])
def get_renamed_files():
    global renamed_files
    return jsonify(renamed_files)

@app.route('/clear_selected_files', methods=['DELETE'])
def clear_selected_files():
    global selected_files, renamed_files, rename_in_progress, rename_completed, rename_stop_requested

    if rename_in_progress:
        # Instead of returning error, set the stop flag and wait
        rename_stop_requested = True
        
        # Wait a bit for the renaming process to notice the stop request
        max_wait = 5  # seconds to wait for renaming to stop
        wait_interval = 0.2
        total_waited = 0
        
        while rename_in_progress and total_waited < max_wait:
            time.sleep(wait_interval)
            total_waited += wait_interval
        
        # If it's still running after waiting, inform the user
        if rename_in_progress:
            return jsonify({"error": "Could not stop renaming process in time"}), 400

    # If we get here, either renaming wasn't in progress or it was successfully stopped
    for file in os.listdir(TEMP_FILES_DIR):
        file_path = os.path.join(TEMP_FILES_DIR, file)
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Error removing file {file}: {e}")

    selected_files = []
    renamed_files = []
    rename_completed = False

    return jsonify({"status": "cleared"})

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
    #app.run(debug=True)
    FlaskUI(app=app, server="flask", width=800, height=600).run()
