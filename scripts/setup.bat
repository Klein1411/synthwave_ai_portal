@echo off
echo Setting up Synthwave AI Portal environment...

:: Create virtual environment if it doesn't exist
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
) else (
    echo Virtual environment already exists.
)

:: Activate and install requirements
echo Installing requirements...
call venv\Scripts\activate.bat
pip install -r requirements.txt

echo.
echo Setup complete! To run the application:
echo 1. Run: venv\Scripts\activate
echo 2. Run: uvicorn app.main:app --reload
pause
