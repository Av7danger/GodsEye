# Check API dependencies
import sys

def check_dependencies():
    print("Checking API server dependencies...")
    missing = []
    
    packages = [
        'fastapi',
        'uvicorn',
        'nest_asyncio'
    ]
    
    for package in packages:
        try:
            __import__(package)
            print(f"✓ {package}")
        except ImportError:
            print(f"✗ {package} - Missing!")
            missing.append(package)
    
    if missing:
        print("\nMissing dependencies. Please install them with:")
        print(f"pip install {' '.join(missing)}")
        return False
    else:
        print("\nAll dependencies are installed!")
        return True

if __name__ == "__main__":
    check_dependencies()
