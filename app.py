import os
import threading
import time
import shelve
from flask import Flask, jsonify, render_template, request, send_file
from flaskwebgui import FlaskUI
from utils import (
    generate_new_name_from_image,
    generate_new_name_from_text,
    zip_up,
    clear_directory,
    verify_gemini_api_key,
    configure_gemini_api,
)
import appdirs 

app = Flask(__name__)

# Configuration
TEMP_FILES_DIR = "tmp"

# User data directory for persistent storage
USER_DATA_DIR = appdirs.user_data_dir("neatnamer", "AhmedIqbal")
os.makedirs(USER_DATA_DIR, exist_ok=True)
API_KEY_DB = os.path.join(USER_DATA_DIR, "neatnamer_key")

app.config.update(
    TEMP_FILES_DIR=TEMP_FILES_DIR,
    API_KEY_DB=API_KEY_DB,
)


# State management
class RenameState:
    def __init__(self):
        self.selected_files = []
        self.renamed_files = []
        self.mode = "text"  # Default mode
        self.in_progress = False
        self.current = 0
        self.total = 0
        self.completed = False
        self.stop_requested = False
        self.api_key = None
        self.custom_instructions = ""  # Store custom renaming instructions

    def reset_progress(self):
        self.in_progress = False
        self.current = 0
        self.total = 0
        self.completed = False
        self.stop_requested = False

    def request_stop(self):
        self.stop_requested = True

    def clear(self):
        self.selected_files = []
        self.renamed_files = []
        self.completed = False
        # Keep custom instructions until explicitly changed

    def set_api_key(self, key):
        self.api_key = key
        
    def set_custom_instructions(self, instructions):
        self.custom_instructions = instructions


# Initialize state
state = RenameState()

# Load API key from shelve on startup
def load_api_key():
    try:
        with shelve.open(app.config["API_KEY_DB"]) as db:
            if "gemini_api_key" in db:
                api_key = db["gemini_api_key"]
                state.set_api_key(api_key)
                configure_gemini_api(api_key)
                return api_key
    except Exception as e:
        print(f"Error loading API key: {e}")
    return None


@app.route("/")
def index():
    temp_dir = os.path.join(app.root_path, app.config["TEMP_FILES_DIR"])
    #print temp directory for debugging
    print(f"Temporary files directory: {temp_dir}")
    clear_directory(temp_dir)
    return render_template("index.html")


@app.route("/add_files", methods=["POST"])
def add_files():
    files = request.files.getlist("files")
    temp_dir = os.path.join(app.root_path, app.config["TEMP_FILES_DIR"])

    try:
        os.makedirs(temp_dir, exist_ok=True)

        for file in files:
            filename = file.filename
            state.selected_files.append(filename)
            file_path = os.path.join(temp_dir, filename)
            file.save(file_path)

        return jsonify({"files": state.selected_files})
    except Exception as e:
        print(f"Error in add_files: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/start_rename", methods=["POST"])
def start_rename():
    if state.in_progress:
        return jsonify({"error": "Renaming already in progress"}), 400

    # Check if API key is valid before proceeding
    if not state.api_key:
        return jsonify({"error": "No valid API key. Please verify your API key first."}), 400
    
    # Get custom instructions if provided
    data = request.json or {}
    custom_instructions = data.get("custom_instructions", "")
    state.set_custom_instructions(custom_instructions)

    state.reset_progress()
    state.in_progress = True
    state.total = len(state.selected_files)

    # Start renaming process in a separate thread
    threading.Thread(target=process_rename_files).start()

    return jsonify({"status": "started"})


def process_rename_files():
    temp_dir = os.path.join(app.root_path, app.config["TEMP_FILES_DIR"])
    state.renamed_files = []
    temp_files = []  # Store renamed files temporarily during process

    try:
        for file in state.selected_files:
            # Check if stop was requested
            if state.stop_requested:
                break

            file_path = os.path.join(temp_dir, file)
            file_extension = file.split(".")[-1]
            file_name = file.split(".")[0]

            # Generate new name based on mode and include custom instructions
            if state.mode == "image":
                new_name = generate_new_name_from_image(
                    file_path, 
                    file_name, 
                    custom_instructions=state.custom_instructions
                )
            else:  # Default to text mode
                new_name = generate_new_name_from_text(
                    file_name,
                    custom_instructions=state.custom_instructions
                )

            # Clean the new name
            new_name = clean_filename(new_name)
            new_name = f"{new_name}.{file_extension}"

            # Handle duplicate filenames
            new_name = handle_duplicate_filename(new_name, state.renamed_files)

            print(f"Old name: {file}, New name: {new_name}")
            new_file_path = os.path.join(temp_dir, new_name)
            os.rename(file_path, new_file_path)
            state.renamed_files.append(new_name)
            temp_files.append(new_name)

            # Update progress
            state.current += 1

    except Exception as e:
        print(f"Error during renaming: {e}")
    finally:
        state.completed = not state.stop_requested
        state.in_progress = False
        state.stop_requested = False

        # If stopped, clear the renamed files list
        if not state.completed:
            state.renamed_files = []


def clean_filename(name):
    """Clean up the filename by removing unwanted characters"""
    name = name.strip()
    name = name.replace("\n", "")
    name = name.replace("\r", "")
    return name


def handle_duplicate_filename(filename, existing_files):
    """Handle duplicate filenames by adding a number suffix"""
    if filename not in existing_files:
        return filename

    name_parts = filename.rsplit(".", 1)
    base_name = name_parts[0]
    extension = name_parts[1] if len(name_parts) > 1 else ""

    counter = 1
    new_filename = filename

    while new_filename in existing_files:
        new_filename = f"{base_name}_{counter}.{extension}"
        counter += 1

    return new_filename


@app.route("/rename_progress", methods=["GET"])
def rename_progress():
    return jsonify(
        {
            "in_progress": state.in_progress,
            "current": state.current,
            "total": state.total,
            "completed": state.completed,
            "files": state.renamed_files,
            "stopped": state.stop_requested,
        }
    )


@app.route("/get_selected_files", methods=["GET"])
def get_selected_files():
    return jsonify(state.selected_files)


@app.route("/get_renamed_files", methods=["GET"])
def get_renamed_files():
    return jsonify(state.renamed_files)


@app.route("/clear_selected_files", methods=["DELETE"])
def clear_selected_files():
    if state.in_progress:
        # Set the stop flag and wait
        state.request_stop()

        # Wait for the renaming process to notice the stop request
        max_wait = 5  # seconds to wait for renaming to stop
        wait_interval = 0.2
        total_waited = 0

        while state.in_progress and total_waited < max_wait:
            time.sleep(wait_interval)
            total_waited += wait_interval

        # If it's still running after waiting, inform the user
        if state.in_progress:
            return jsonify({"error": "Could not stop renaming process in time"}), 400

    # If we get here, either renaming wasn't in progress or it was successfully stopped
    temp_dir = os.path.join(app.root_path, app.config["TEMP_FILES_DIR"])
    for file in os.listdir(temp_dir):
        file_path = os.path.join(temp_dir, file)
        try:
            os.remove(file_path)
        except Exception as e:
            print(f"Error removing file {file}: {e}")

    state.clear()
    return jsonify({"status": "cleared"})


@app.route("/create_zip", methods=["POST"])
def create_zip():
    if not state.renamed_files:
        return jsonify({"message": "No files to zip"}), 400

    temp_dir = os.path.join(app.root_path, app.config["TEMP_FILES_DIR"])
    renamed_file_paths = [os.path.join(temp_dir, file) for file in state.renamed_files]

    zip_file_path = zip_up(renamed_file_paths, temp_dir)

    return send_file(
        zip_file_path,
        as_attachment=True,
        download_name="renamed_files.zip",
        mimetype="application/zip",
    )


@app.route("/set_mode", methods=["POST"])
def set_mode():
    data = request.json
    if "mode" in data and data["mode"] in ["image", "text"]:
        state.mode = data["mode"]
        return jsonify({"status": "success", "mode": state.mode})
    return jsonify({"error": "Invalid mode"}), 400


@app.route("/verify_api_key", methods=["POST"])
def verify_api_key():
    data = request.json
    if "api_key" not in data or not data["api_key"]:
        return jsonify({"valid": False, "message": "No API key provided"}), 400
    
    api_key = data["api_key"]
    
    # Verify the API key
    is_valid, message = verify_gemini_api_key(api_key)
    
    if is_valid:
        # Store the key and update the application state
        try:
            with shelve.open(app.config["API_KEY_DB"]) as db:
                db["gemini_api_key"] = api_key
            
            state.set_api_key(api_key)
            configure_gemini_api(api_key)
            return jsonify({"valid": True, "message": "API key verified successfully!"})
        except Exception as e:
            return jsonify({"valid": False, "message": f"Error storing API key: {str(e)}"}), 500
    else:
        return jsonify({"valid": False, "message": message})


@app.route("/get_api_key", methods=["GET"])
def get_api_key():
    # Only returns whether a key exists, not the actual key
    api_key = state.api_key
    return jsonify({"has_key": api_key is not None})


if __name__ == "__main__":
    # Load API key on startup
    load_api_key()
    
    # Use FlaskUI for desktop application
    FlaskUI(app=app, server="flask", width=800, height=600).run()
