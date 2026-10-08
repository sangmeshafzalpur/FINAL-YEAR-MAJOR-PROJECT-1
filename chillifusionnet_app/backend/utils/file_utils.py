import os
import shutil
import uuid
import pathlib
from fastapi import UploadFile
from typing import Optional
from ..config.settings import settings

def save_upload_file(upload_file: UploadFile, destination: pathlib.Path) -> Optional[pathlib.Path]:
    """
    Saves an uploaded file to the specified destination.
    Returns the Path to the saved file or None if it fails.
    """
    try:
        with open(destination, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
        return destination
    except Exception as e:
        print(f"Error saving file: {e}")
        return None

def generate_unique_filename(original_filename: str) -> str:
    """
    Generates a unique filename using UUID, preserving the original extension.
    """
    ext = os.path.splitext(original_filename)[1]
    return f"{uuid.uuid4().hex}{ext}"

def clear_directory(directory: pathlib.Path):
    """
    Clears all files in a given directory. Useful for cleaning up temp uploads.
    """
    if directory.exists() and directory.is_dir():
        for item in directory.iterdir():
            if item.is_file():
                try:
                    item.unlink()
                except Exception as e:
                    print(f"Failed to delete {item}: {e}")
