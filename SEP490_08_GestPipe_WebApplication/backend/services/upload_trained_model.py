#!/usr/bin/env python3
"""
Upload trained model results to CustomGesture folder and cleanup
"""

import sys
import os
import shutil
# Import from current directory first
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from google_drive_oauth_service import GoogleDriveOAuthService

def upload_folder_recursive(drive_service, local_path, drive_parent_id, max_retries=3):
    """
    Recursively upload a local folder to Google Drive with retry logic
    
    Args:
        drive_service: GoogleDriveOAuthService instance
        local_path (str): Local path to upload
        drive_parent_id (str): Parent folder ID in Google Drive
        max_retries (int): Maximum number of retries for failed operations
    
    Returns:
        bool: True if successful
    """
    for attempt in range(max_retries):
        try:
            folder_name = os.path.basename(local_path)
            
            # Create folder in Google Drive
            folder_metadata = drive_service.create_folder(folder_name, drive_parent_id)
            if not folder_metadata:
                print(f"[ERROR] Failed to create folder {folder_name}")
                if attempt < max_retries - 1:
                    print(f"[RETRY] Retrying folder creation (attempt {attempt + 2}/{max_retries})")
                    continue
                return False
            
            drive_folder_id = folder_metadata['id']
            print(f"[SUCCESS] Created folder {folder_name} (ID: {drive_folder_id})")
            
            # Upload files and subfolders
            for item in os.listdir(local_path):
                item_path = os.path.join(local_path, item)
                
                if os.path.isdir(item_path):
                    # Recurse for subfolders
                    if not upload_folder_recursive(drive_service, item_path, drive_folder_id, max_retries):
                        return False
                else:
                    # Upload file with retry
                    for file_attempt in range(max_retries):
                        try:
                            result = drive_service.upload_file(
                                file_path=item_path,
                                file_name=item,
                                folder_id=drive_folder_id
                            )
                            if not result:
                                if file_attempt < max_retries - 1:
                                    print(f"[RETRY] Retrying file upload {item} (attempt {file_attempt + 2}/{max_retries})")
                                    continue
                                print(f"[ERROR] Failed to upload file {item}")
                                return False
                            print(f"[SUCCESS] Uploaded file {item}")
                            break
                        except Exception as e:
                            if "SSL" in str(e) or "EOF" in str(e):
                                if file_attempt < max_retries - 1:
                                    print(f"[RETRY] SSL error uploading {item}, retrying (attempt {file_attempt + 2}/{max_retries})")
                                    continue
                            raise e
            
            return True
            
        except Exception as e:
            if ("SSL" in str(e) or "EOF" in str(e)) and attempt < max_retries - 1:
                print(f"[RETRY] SSL error in folder {local_path}, retrying (attempt {attempt + 2}/{max_retries})")
                continue
            print(f"[ERROR] Failed to upload folder {local_path}: {e}")
            return False
    
    return False

def cleanup_user_directory(user_id):
    """
    Cleanup user directory after upload
    
    Args:
        user_id (str): User ID
    """
    try:
        # Calculate correct path from project root
        current_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.dirname(current_dir)  # go up from services to backend
        project_root = os.path.dirname(backend_dir)  # go up from backend to project root
        user_dir = os.path.join(project_root, "hybrid_realtime_pipeline", "code", f"user_{user_id}")
        
        if os.path.exists(user_dir):
            shutil.rmtree(user_dir)
            print(f"[SUCCESS] Cleaned up entire local user directory: {user_dir}")
            return True
        else:
            print(f"[WARNING] User directory {user_dir} not found for cleanup")
            return False
    except Exception as e:
        print(f"[ERROR] Failed to cleanup local directory: {e}")
        return False

def upload_trained_model(user_id):
    """
    Upload trained model results to CustomGesture folder and cleanup local data

    Args:
        user_id (str): User ID
    """
    try:
        drive_service = GoogleDriveOAuthService()

        # Find CustomGesture folder
        custom_folders = drive_service.search_files("name='CustomGesture' and mimeType='application/vnd.google-apps.folder' and trashed=false")
        if not custom_folders:
            print("[ERROR] CustomGesture folder not found!")
            return False
        custom_folder_id = custom_folders[0]['id']

        # User directory
        user_dir = os.path.join("..", "..", "..", "hybrid_realtime_pipeline", "code", f"user_{user_id}")

        if not os.path.exists(user_dir):
            print(f"[ERROR] User directory {user_dir} not found!")
            return False

        # Cleanup before upload: remove training script, raw_data, and CSV files
        try:
            # Remove training script if exists
            train_script = os.path.join(user_dir, "train_motion_svm_all_models.py")
            if os.path.exists(train_script):
                os.remove(train_script)
                print("[CLEANUP] Removed training script")
            
            # Remove raw_data folder
            raw_data_dir = os.path.join(user_dir, "raw_data")
            if os.path.exists(raw_data_dir):
                shutil.rmtree(raw_data_dir)
                print("[CLEANUP] Removed raw_data folder")
            
            # Remove CSV files
            import glob
            csv_files = glob.glob(os.path.join(user_dir, "gesture_data_custom_*.csv"))
            for csv_file in csv_files:
                os.remove(csv_file)
                print(f"[CLEANUP] Removed {os.path.basename(csv_file)}")
                
        except Exception as e:
            print(f"[WARNING] Some cleanup failed: {e}")

        # Check if user folder already exists under CustomGesture, if yes, delete it
        user_folder_name = f"user_{user_id}"
        existing_folders = drive_service.search_files(f"name='{user_folder_name}' and '{custom_folder_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false")
        
        if existing_folders:
            # Delete existing folder
            existing_folder_id = existing_folders[0]['id']
            if drive_service.delete_file(existing_folder_id):
                print(f"[CLEANUP] Deleted existing user folder {user_folder_name}")
            else:
                print(f"[WARNING] Failed to delete existing user folder {user_folder_name}")

        # Create new user folder under CustomGesture
        user_folder_metadata = drive_service.create_folder(user_folder_name, custom_folder_id)
        if not user_folder_metadata:
            print(f"[ERROR] Failed to create user folder {user_folder_name}")
            return False
        user_folder_id = user_folder_metadata['id']
        print(f"[SUCCESS] Created user folder {user_folder_name} (ID: {user_folder_id})")

        # Upload only training_results and models folders
        training_results_dir = os.path.join(user_dir, "training_results")
        models_dir = os.path.join(user_dir, "models")
        
        success = True
        
        # Upload training_results folder
        if os.path.exists(training_results_dir):
            result = upload_folder_recursive(drive_service, training_results_dir, user_folder_id)
            if result:
                print(f"[SUCCESS] Uploaded training_results for user_{user_id}")
            else:
                print(f"[ERROR] Failed to upload training_results")
                success = False
        
        # Upload models folder  
        if os.path.exists(models_dir):
            result = upload_folder_recursive(drive_service, models_dir, user_folder_id)
            if result:
                print(f"[SUCCESS] Uploaded models for user_{user_id}")
            else:
                print(f"[ERROR] Failed to upload models")
                success = False

        if success:
            print(f"[SUCCESS] Uploaded trained model folders for user_{user_id} to CustomGesture")
            return True
        else:
            print(f"[ERROR] Failed to upload trained model folder for user_{user_id}")
            return False

    except Exception as e:
        print(f"[ERROR] Failed to upload trained model: {e}")
        return False

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Upload trained model to CustomGesture and cleanup')
    parser.add_argument('--user-id', required=True, help='User ID')
    args = parser.parse_args()

    success = upload_trained_model(args.user_id)
    sys.exit(0 if success else 1)