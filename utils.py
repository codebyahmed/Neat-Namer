import os
import time
import shutil
import zipfile
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

SAFE = [
    {
        "category": "HARM_CATEGORY_DANGEROUS",
        "threshold": "BLOCK_NONE",
    },
    {
        "category": "HARM_CATEGORY_HARASSMENT",
        "threshold": "BLOCK_NONE",
    },
    {
        "category": "HARM_CATEGORY_HATE_SPEECH",
        "threshold": "BLOCK_NONE",
    },
    {
        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "threshold": "BLOCK_NONE",
    },
    {
        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
        "threshold": "BLOCK_NONE",
    },
]

def configure_gemini_api(api_key):
    """Configure the Gemini API with the provided API key."""
    genai.configure(api_key=api_key)

def verify_gemini_api_key(api_key):
    """Verify if the given API key is valid for the Gemini API."""
    try:
        genai.configure(api_key=api_key)
        models = genai.list_models()
        for _ in models:
            break
            
        return True, "API key verified successfully"
    except Exception:
        return False, "Invalid API key. Please check and try again."

def generate_new_name_from_text(file_name: str, custom_instructions: str = "") -> str:
    """Generates a new name for a file using Gemini text processing."""
    
    example = """Example 1: Original name: 'profile' -> New name: 'Profile'
                 Example 2: Original name: 'hello_world_' -> New name: 'Hello World'
                 Example 3: Original name: 'my-document_2024' -> New name: 'My Document 2024'"""
   
    default_instructions = """
        1) Remove unnecessary underscores, dashes, and special characters.
        2) Capitalize the first letter of each word.
        3) Ensure the name is grammatically correct and readable.
        4) Do not add or remove meaningful words—just clean the formatting.
    """
    
    instructions = custom_instructions if custom_instructions.strip() else default_instructions
    
    prompt = f""" You are provided with an original file name: {file_name}. Your task is to clean and format it properly while preserving its meaning.

    Instructions:
        {instructions}

    Use these examples for reference:
        {example} 

    Output:
        Your output should just be the new name.
    """

    max_retries = 3
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            model = genai.GenerativeModel("gemini-2.0-flash")        
            
            response = model.generate_content(
                prompt,
                safety_settings=SAFE
            )
            new_name = response.text.strip()
            return new_name
        except Exception as e:
            retry_count += 1
            print(f"Error generating new name (attempt {retry_count}/{max_retries}): {e}")
            if retry_count < max_retries:
                sleep_time = 2 * retry_count  # Exponential backoff
                print(f"Retrying in {sleep_time} seconds...")
                time.sleep(sleep_time)
            else:
                print("Max retries reached, using same name")
                return file_name
    
    return file_name


def generate_new_name_from_image(file_path: str, file_name: str, custom_instructions: str = "") -> str:
    """Generates a new name for an image file using Gemini vision capabilities."""
    max_retries = 3
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            myfile = genai.upload_file(file_path)
            example = """Example 1: Original name: 'pikaso_texttoimage_Big-Parade-Float-With-Thanksgiving-Feasts-And-Perf' -> New name: 'Big Parade Float With Thanksgiving Feasts'
                         Example 2: Original name: 'pikaso_edit_A-Cartoon-Dragon-Playing-The-Piano-In-A-Beautiful-' -> New name: 'Cartoon Dragon Playing Piano Beautifully'"""
            
            default_instructions = """
                1) Make sure to look at the image and understand what it is about.
                2) Make sure to look at the old name and understand what the image is about.
                3) The new name should be descriptive and should explain the image well.
                4) It should be in title case.
                5) It should not have any dashes or underscores or special characters, and should be in title case and have alphabetical characters only.
                6) It should be grammatically correct.
                7) It should not be the same as the old name.
            """
            
            instructions = custom_instructions if custom_instructions.strip() else default_instructions
            
            prompt = f"""
            You are provided with an image and its old name. Your task is to generate a new name for the image.
        
            Old Name: {file_name}
            
            Instructions:
                {instructions}
        
            Use these examples for reference:
                {example} 
        
            Output:
                Your output should just be the new name. Ensure that you do not return the old name as the new name.
            """
            
            model = genai.GenerativeModel("gemini-2.0-flash")
            result = model.generate_content(
                [myfile, "\n\n", prompt],
                safety_settings=SAFE
            )
            
            new_name = result.text
            return new_name
        
        except Exception as e:
            retry_count += 1
            print(f"Error generating name from image (attempt {retry_count}/{max_retries}): {e}")
            if retry_count < max_retries:
                sleep_time = 2 * retry_count  # Exponential backoff
                print(f"Retrying in {sleep_time} seconds...")
                time.sleep(sleep_time)
            else:
                print("Max retries reached, using same name")
                return file_name
    
    return file_name

def zip_up(renamed_files: list, zip_path: str) -> str:
    """Creates a zip file containing all renamed files."""
    if not os.path.isdir(zip_path):
        raise ValueError(f"The provided zip_path must be a directory. Received: {zip_path}")
    
    zip_file_name = "renamed_images.zip"
    zip_file_path = os.path.join(zip_path, zip_file_name)
    if os.path.exists(zip_file_path):
        os.remove(zip_file_path)

    with zipfile.ZipFile(zip_file_path, 'w') as zipf:
        added_files = set()  # Track filenames already in the zip
        
        for file in renamed_files:
            base_name = os.path.basename(file)
            
            duplicate_count = 1
            new_name = base_name
            
            while new_name in added_files:
                file_name, file_extension = os.path.splitext(base_name)
                new_name = f"{file_name}_{duplicate_count}{file_extension}"
                duplicate_count += 1

            zipf.write(file, new_name)
            added_files.add(new_name)
    
    return zip_file_path


def clear_directory(directory):
    if os.path.exists(directory):
        shutil.rmtree(directory)
    os.makedirs(directory, exist_ok=True)