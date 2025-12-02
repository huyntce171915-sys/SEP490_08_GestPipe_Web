#!/usr/bin/env python3
"""
Script to check if user data exists in Google Drive UploadGesture folder
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from google_drive_oauth_service import GoogleDriveOAuthService

def check_user_drive_data(user_id):
    """
    Check if user data exists in UploadGesture folder on Google Drive

    Args:
        user_id (str): User ID to check for
    """
    try:
        # Initialize Google Drive service
        drive_service = GoogleDriveOAuthService()

        # Search for UploadGesture folder
        print("Searching for UploadGesture folder...")
        upload_folders = drive_service.search_files("name='UploadGesture' and mimeType='application/vnd.google-apps.folder'")

        if not upload_folders:
            print("[ERROR] UploadGesture folder not found!")
            return False

        upload_folder = upload_folders[0]
        upload_folder_id = upload_folder['id']
        print(f"[SUCCESS] Found UploadGesture folder: {upload_folder['name']} (ID: {upload_folder_id})")

        # Search for files with user ID in the UploadGesture folder
        print(f"Searching for files containing user_{user_id} in UploadGesture folder...")
        user_files_query = f"name contains 'user_{user_id}' and '{upload_folder_id}' in parents and trashed=false"
        user_files = drive_service.search_files(user_files_query)

        if user_files:
            print(f"[SUCCESS] Found {len(user_files)} file(s) for user {user_id}:")
            for file in user_files:
                print(f"  - {file['name']} (ID: {file['id']}, Size: {file.get('size', 'N/A')}, Modified: {file['modifiedTime']})")
            return True
        else:
            print(f"[INFO] No files found for user {user_id} in UploadGesture folder")
            return False

    except Exception as e:
        print(f"[ERROR] Failed to check user data: {e}")
        return False

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python check_drive_data.py <user_id>")
        sys.exit(1)
    
    user_id = sys.argv[1]
    print(f"Checking Google Drive data for user: {user_id}")
    has_data = check_user_drive_data(user_id)
    print(f"\nResult: User has data on Google Drive: {has_data}")
    sys.exit(0 if has_data else 1)