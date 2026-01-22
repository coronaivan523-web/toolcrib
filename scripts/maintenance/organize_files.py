
import os
import shutil

TARGET_DIR = "scripts/maintenance"
KEYWORDS = [
    'fix', 'debug', 'test', 'v2', 'temp', 'check', 'inspect', 'apply', 'repro', 'verify', 
    'list', 'run', 'patch', 'update', 'placeholder', 'clean', 'diagnose', 'dump', 'find', 
    'force', 'inject', 'audit', 'create_', 'add_', 'alter_'
]
EXTENSIONS = ['.py', '.sql']
EXCLUDES = ['main.py', '.env', 'requirements.txt', 'pyproject.toml', 'organize_files.py', 'security.py']
EXCLUDE_DIRS = ['app', 'venv', 'frontend', '.git', '.gemini', 'scripts', 'supabase', 'tests', '_backups']

def organize():
    if not os.path.exists(TARGET_DIR):
        os.makedirs(TARGET_DIR)
        print(f"Created directory: {TARGET_DIR}")

    files = os.listdir('.')
    count = 0
    
    for f in files:
        # Skip directories
        if os.path.isdir(f):
            continue
            
        # Skip explicitly excluded files
        if f in EXCLUDES:
            continue
            
        # Check extension
        _, ext = os.path.splitext(f)
        if ext.lower() not in EXTENSIONS:
            continue
            
        # Check keywords
        is_match = False
        for kw in KEYWORDS:
            if kw in f.lower():
                is_match = True
                break
        
        # Also move .sql files that look like migrations/patches even if not keyword matched if they are loose in root?
        # User said: "scripts sueltos (.py y .sql) que parezcan pruebas temporales... busca palabras clave"
        # I will stick to keywords to be safe, but add common SQL prefixes to keywords.
        
        if is_match:
            src = f
            dst = os.path.join(TARGET_DIR, f)
            try:
                shutil.move(src, dst)
                print(f"Moved: {src} -> {dst}")
                count += 1
            except Exception as e:
                print(f"Error moving {src}: {e}")

    print(f"Cleanup complete. Moved {count} files.")

if __name__ == "__main__":
    organize()
