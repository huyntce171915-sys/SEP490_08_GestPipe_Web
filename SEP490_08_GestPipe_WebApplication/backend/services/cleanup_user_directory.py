#!/usr/bin/env python3
"""
Cleanup user directory after training pipeline completion
"""

import sys
import os
import shutil
import argparse

def cleanup_user_directory(user_id):
    """
    Cleanup user directory after upload
    
    Args:
        user_id (str): User ID
    """
    try:
        # Calculate path based on where the script is running from
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # If we're in user folder (copied there during pipeline), go up to code directory
        if os.path.basename(current_dir).startswith("user_"):
            code_dir = os.path.dirname(current_dir)
            user_dir = os.path.join(code_dir, f"user_{user_id}")
        else:
            # If running from services directory, go up to project root then to hybrid_realtime_pipeline
            # Current: services -> backend -> dashboard_web -> project_root -> hybrid_realtime_pipeline -> code
            backend_dir = os.path.dirname(current_dir)  # services -> backend
            dashboard_dir = os.path.dirname(backend_dir)  # backend -> dashboard_web
            project_root = os.path.dirname(dashboard_dir)  # dashboard_web -> project_root
            user_dir = os.path.join(project_root, "hybrid_realtime_pipeline", "code", f"user_{user_id}")
        
        print(f"[DEBUG] Cleanup script running from: {current_dir}")
        print(f"[DEBUG] Target user directory: {user_dir}")
        
        if os.path.exists(user_dir):
            shutil.rmtree(user_dir)
            print(f"[SUCCESS] Cleaned up entire local user directory: {user_dir}")
            return True
        else:
            print(f"[WARNING] User directory {user_dir} not found for cleanup")
            # List contents of code directory for debugging
            code_dir = os.path.dirname(user_dir)
            if os.path.exists(code_dir):
                print(f"[DEBUG] Contents of code directory: {os.listdir(code_dir)}")
            return False
    except Exception as e:
        print(f"[ERROR] Failed to cleanup local directory: {e}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Cleanup user directory after training pipeline')
    parser.add_argument('--user-id', required=True, help='User ID')
    args = parser.parse_args()

    success = cleanup_user_directory(args.user_id)
    sys.exit(0 if success else 1)