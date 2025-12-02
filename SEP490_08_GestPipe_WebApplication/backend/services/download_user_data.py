#!/usr/bin/env python3
"""
Download user data from Google Drive UploadGesture folder
"""

import sys
import os
import argparse
# Import from current directory first
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from google_drive_oauth_service import GoogleDriveOAuthService

def download_folder_recursive(drive_service, folder_id, local_path):
    """
    Recursively download a folder and all its contents
    
    Args:
        drive_service: GoogleDriveOAuthService instance
        folder_id (str): ID of the folder to download
        local_path (str): Local path to save the folder
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Create local directory
        os.makedirs(local_path, exist_ok=True)
        
        # Get all items in the folder
        items = drive_service.search_files(f"'{folder_id}' in parents and trashed=false")
        
        for item in items:
            item_path = os.path.join(local_path, item['name'])
            
            if item['mimeType'] == 'application/vnd.google-apps.folder':
                # Recursively download subfolder
                success = download_folder_recursive(drive_service, item['id'], item_path)
                if not success:
                    return False
            else:
                # Download file - ensure parent directory exists
                os.makedirs(os.path.dirname(item_path), exist_ok=True)
                success = drive_service.download_file(item['id'], os.path.dirname(item_path), item['name'])
                if not success:
                    return False
        
        return True
    except Exception as e:
        print(f"[ERROR] Failed to download folder {folder_id}: {e}")
        return False

def download_user_data(user_id):
    """
    Download user data from Google Drive UploadGesture folder

    Args:
        user_id (str): User ID
    """
    try:
        drive_service = GoogleDriveOAuthService()

        # Find UploadGesture folder
        upload_folders = drive_service.search_files("name='UploadGesture' and mimeType='application/vnd.google-apps.folder' and trashed=false")
        if not upload_folders:
            print("[ERROR] UploadGesture folder not found!")
            return False
        upload_folder_id = upload_folders[0]['id']

        # Find user data file
        user_files = drive_service.search_files(f"name contains '{user_id}' and '{upload_folder_id}' in parents and trashed=false")
        if not user_files:
            print(f"[ERROR] No data files found for user {user_id}")
            return False

        # User directory
        user_dir = os.path.join("..", "..", "..", "hybrid_realtime_pipeline", "code", f"user_{user_id}")
        os.makedirs(user_dir, exist_ok=True)

        # Download all contents of user folder directly to user_dir
        folder_files = drive_service.search_files(f"'{upload_folder_id}' in parents and trashed=false")
        print(f"[DEBUG] Found {len(folder_files)} items in UploadGesture folder")
        
        for folder_file in folder_files:
            print(f"[DEBUG] Processing item: {folder_file['name']} (type: {folder_file['mimeType']})")
            if folder_file['name'].startswith(f'user_{user_id}'):
                if folder_file['mimeType'] == 'application/vnd.google-apps.folder':
                    # Download entire user folder contents directly to user_dir
                    user_folder_id = folder_file['id']
                    user_folder_files = drive_service.search_files(f"'{user_folder_id}' in parents and trashed=false")
                    
                    for item in user_folder_files:
                        if item['mimeType'] == 'application/vnd.google-apps.folder':
                            # Download subfolder
                            subfolder_path = os.path.join(user_dir, item['name'])
                            success = download_folder_recursive(drive_service, item['id'], subfolder_path)
                            if success:
                                print(f"[SUCCESS] Downloaded folder {item['name']}")
                            else:
                                print(f"[ERROR] Failed to download folder {item['name']}")
                                return False
                        else:
                            # Download file directly to user_dir
                            success = drive_service.download_file(item['id'], user_dir, item['name'])
                            if success:
                                print(f"[SUCCESS] Downloaded {item['name']}")
                            else:
                                print(f"[ERROR] Failed to download {item['name']}")
                                return False
                else:
                    # If user data is a file, download directly
                    success = drive_service.download_file(folder_file['id'], user_dir, folder_file['name'])
                    if success:
                        print(f"[SUCCESS] Downloaded {folder_file['name']}")
                    else:
                        print(f"[ERROR] Failed to download {folder_file['name']}")
                        return False

        print(f"[SUCCESS] Downloaded all data for user {user_id}")
        return True

    except Exception as e:
        print(f"[ERROR] Failed to download user data: {e}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Download user data from Google Drive')
    parser.add_argument('--user-id', required=True, help='User ID')
    args = parser.parse_args()

    success = download_user_data(args.user_id)
    sys.exit(0 if success else 1)