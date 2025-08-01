@echo off
echo Starting ParseFlow Development Server...
echo.

REM Set the PATH to include Node.js
set PATH=c:\nodejs;%PATH%

REM Change to the project directory
cd /d "c:\Users\dale9\Downloads\ParseFlow-20250726T215241Z-1-001\ParseFlow"

REM Start the development server
echo Running: npm run dev
npm run dev

pause