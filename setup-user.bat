@echo off
REM setup-user.bat - Cài đặt MindScan AI cho người dùng Windows

title MindScan AI - Thiet lap
color 0A
chcp 65001 >nul 2>&1

echo.
echo ========================================================
echo              MINDSCAN AI - THIẾT LẬP TỰ ĐỘNG          
echo ========================================================
echo.
echo Chào mừng bạn! Script này sẽ giúp cài đặt MindScan AI.
echo Nhấn phím bất kỳ để bắt đầu...
pause >nul

echo.
echo [1/4] Đang kiểm tra Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [Chưa có Node.js] Đang tự động cài đặt Node.js LTS...
    powershell -Command "if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { Write-Host 'Vui lòng cài Winget trước từ: https://aka.ms/getwinget' -ForegroundColor Yellow; pause; exit }"
    
    winget install -e --id OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
    echo.
    echo ✅ Node.js đã cài đặt. Hãy KHỞI ĐỘNG LẠI Terminal rồi chạy lại file này.
    pause
    exit /b
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo ✅ Node.js %NODE_VER% đã sẵn sàng.

echo.
echo [2/4] Đang cập nhật npm...
call npm install -g npm@latest >nul 2>&1
echo ✅ npm đã cập nhật.

echo.
echo [3/4] Đang cài đặt / cập nhật thư viện...
if not exist node_modules (
    npm ci --silent
) else (
    npm install --silent
)
echo ✅ Thư viện đã sẵn sàng!

echo.
echo ========================================================
echo                    THIẾT LẬP HOÀN TẤT!                  
echo ========================================================
echo.
echo Để xem hướng dẫn sử dụng chi tiết, hãy mở file:
echo                HUONG-DAN-SU-DUNG.txt
echo.
echo Nhấn phím bất kỳ để thoát...
pause >nul