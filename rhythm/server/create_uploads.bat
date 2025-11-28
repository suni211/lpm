@echo off
echo Creating upload directories...

if not exist "uploads" mkdir uploads
if not exist "uploads\audio" mkdir uploads\audio
if not exist "uploads\covers" mkdir uploads\covers
if not exist "uploads\bga" mkdir uploads\bga

echo.
echo ✅ Upload directories created:
echo    - uploads\audio
echo    - uploads\covers
echo    - uploads\bga
echo.
pause
