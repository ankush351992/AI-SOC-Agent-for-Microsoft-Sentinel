import os
import zipfile

def create_master_backup():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    zip_filename = os.path.join(base_dir, "sentinel-soc-agent-COMPLETE-BACKUP.zip")
    exclude_dirs = {"venv", "node_modules", "__pycache__", ".pytest_cache", "dist", ".git", ".idea", ".vscode"}
    exclude_files = {"grype.exe", "sentinel-soc-agent-COMPLETE-BACKUP.zip", "sentinel-soc-agent-macbook.zip"}
    
    count = 0
    with zipfile.ZipFile(zip_filename, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(base_dir):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for file in files:
                if file in exclude_files or file.endswith(".log") or file.endswith(".pyc"):
                    continue
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, base_dir)
                zipf.write(file_path, arcname)
                count += 1
                
    size_mb = os.path.getsize(zip_filename) / (1024 * 1024)
    print(f"Master Backup Created: {zip_filename}")
    print(f"Total Files Archived: {count} | Archive Size: {size_mb:.2f} MB")

if __name__ == "__main__":
    create_master_backup()
