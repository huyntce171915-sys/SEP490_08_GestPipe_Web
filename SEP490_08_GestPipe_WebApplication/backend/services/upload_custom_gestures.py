#!/usr/bin/env python3
"""
Upload custom gestures to Google Drive
Creates AdminCustom folder and user subfolder, then uploads all gesture data files
"""

import os
import sys
import shutil
from pathlib import Path
import importlib.util

# Dynamically import google_drive_oauth_service
oauth_service_path = Path(__file__).parent / "google_drive_oauth_service.py"
spec = importlib.util.spec_from_file_location("google_drive_oauth_service", str(oauth_service_path))
google_drive_oauth_service = importlib.util.module_from_spec(spec)
spec.loader.exec_module(google_drive_oauth_service)
GoogleDriveOAuthService = google_drive_oauth_service.GoogleDriveOAuthService

def upload_custom_gestures(admin_id):
    """
    Upload custom gesture data to Google Drive

    Args:
        admin_id (str): Admin ID for user folder identification

    Returns:
        bool: True if successful, False otherwise
    """
    try:
        print(f"[UPLOAD] Starting upload for admin {admin_id}")

        # Initialize Google Drive service with credentials path
        credentials_path = Path(__file__).parent.parent.parent.parent / "credentials.json"
        token_path = Path(__file__).parent.parent.parent.parent / "token.json"
        drive_service = GoogleDriveOAuthService(credentials_file=str(credentials_path), token_file=str(token_path))

        # Define folder structure
        admin_custom_folder_name = "AdminCustom"
        user_folder_name = f"user_{admin_id}"

        # Local path to user data
        local_user_path = Path(__file__).parent.parent.parent.parent / "hybrid_realtime_pipeline" / "code" / user_folder_name

        if not local_user_path.exists():
            print(f"[UPLOAD] ERROR: Local user folder not found: {local_user_path}")
            return False

        print(f"[UPLOAD] Found local user folder: {local_user_path}")

        # Check if AdminCustom folder exists, create if not
        admin_custom_query = f"name='{admin_custom_folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        admin_custom_results = drive_service.service.files().list(
            q=admin_custom_query,
            fields="files(id, name)"
        ).execute()

        if admin_custom_results.get('files'):
            admin_custom_folder_id = admin_custom_results['files'][0]['id']
            print(f"[UPLOAD] Found existing AdminCustom folder: {admin_custom_folder_id}")
        else:
            # Create AdminCustom folder
            admin_custom_folder = drive_service.create_folder(admin_custom_folder_name)
            if not admin_custom_folder:
                print("[UPLOAD] ERROR: Failed to create AdminCustom folder")
                return False
            admin_custom_folder_id = admin_custom_folder['id']
            print(f"[UPLOAD] Created AdminCustom folder: {admin_custom_folder_id}")

        # Check if user folder exists in AdminCustom, create if not
        user_folder_query = f"name='{user_folder_name}' and '{admin_custom_folder_id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false"
        user_folder_results = drive_service.service.files().list(
            q=user_folder_query,
            fields="files(id, name)"
        ).execute()

        if user_folder_results.get('files'):
            user_folder_id = user_folder_results['files'][0]['id']
            print(f"[UPLOAD] Found existing user folder: {user_folder_id}")
        else:
            # Create user folder inside AdminCustom
            user_folder = drive_service.create_folder(user_folder_name, admin_custom_folder_id)
            if not user_folder:
                print("[UPLOAD] ERROR: Failed to create user folder")
                return False
            user_folder_id = user_folder['id']
            print(f"[UPLOAD] Created user folder: {user_folder_id}")

        # Get and print user folder link
        try:
            user_folder_metadata = drive_service.service.files().get(fileId=user_folder_id, fields='webViewLink').execute()
            folder_link = user_folder_metadata.get('webViewLink')
            print(f"[UPLOAD] User folder link: {folder_link}")
        except Exception as e:
            print(f"[UPLOAD] Could not get folder link: {e}")

        # Upload all files from local user folder
        uploaded_count = 0
        for file_path in local_user_path.rglob('*'):
            if file_path.is_file():
                try:
                    # Get relative path for folder structure preservation
                    relative_path = file_path.relative_to(local_user_path)
                    file_name = str(relative_path)

                    print(f"[UPLOAD] Uploading: {file_name}")

                    # Upload file
                    uploaded_file = drive_service.upload_file(
                        str(file_path),
                        file_name,
                        user_folder_id
                    )

                    if uploaded_file:
                        uploaded_count += 1
                        print(f"[UPLOAD] SUCCESS: Uploaded {file_name}")
                    else:
                        print(f"[UPLOAD] ERROR: Failed to upload {file_name}")

                except Exception as e:
                    print(f"[UPLOAD] ERROR uploading {file_path}: {e}")

        print(f"[UPLOAD] Successfully uploaded {uploaded_count} files")
        return True

    except Exception as e:
        print(f"[UPLOAD] ERROR: {e}")
        return False

def main():
    if len(sys.argv) != 2:
        print("Usage: python upload_custom_gestures.py <admin_id>")
        sys.exit(1)

    admin_id = sys.argv[1]

    if upload_custom_gestures(admin_id):
        print("[UPLOAD] SUCCESS")
        sys.exit(0)
    else:
        print("[UPLOAD] FAILED")
        sys.exit(1)

if __name__ == "__main__":
    main()