@echo off
REM HUONG-DAN-SU-DUNG.bat - Hướng dẫn sử dụng MindScan AI (có tương tác)
title MindScan AI - Huong dan su dung
color 0A
chcp 65001 >nul 2>&1

:menu
cls
echo.
echo ========================================================
echo              MINDSCAN AI - HƯỚNG DẪN SỬ DỤNG
echo ========================================================
echo.
echo 1. Chạy ứng dụng cục bộ (npm run dev)
echo 2. Chạy full (dev + Cloudflare Tunnel)
echo 3. Hướng dẫn cài Ollama (AI giải đề)
echo 4. Thoát
echo.
echo ========================================================
set /p choice="Nhập số lựa chọn (1-4): "

if "%choice%"=="1" goto run_dev
if "%choice%"=="2" goto run_full
if "%choice%"=="3" goto ollama_guide
if "%choice%"=="4" goto exit

echo Lựa chọn không hợp lệ! Nhấn phím bất kỳ để thử lại...
pause >nul
goto menu


:run_dev
echo.
echo Đang chạy "npm run dev" và mở trình duyệt...

start cmd.exe /k "cd /d %~dp0 && npm run dev"

timeout /t 5 >nul
start http://localhost:5173

goto menu


:run_full
echo.
echo Đang chạy full: npm run dev + Cloudflare Tunnel...

REM 1. Chạy server
start cmd.exe /k "cd /d %~dp0 && npm run dev"

REM 2. Đợi server khởi động
timeout /t 5 >nul

REM 3. Mở trình duyệt local
start http://localhost:5173

REM 4. Chạy tunnel
start cmd.exe /k "cd /d %~dp0 && npx cloudflared tunnel --url http://localhost:5173"

goto menu


:ollama_guide
cls
echo.
echo ========================================================
echo                    HƯỚNG DẪN CÀI OLLAMA
echo ========================================================
echo.
echo 1. Truy cập trang chính thức: https://ollama.com
echo 2. Tải và cài đặt Ollama cho Windows (file .exe)
echo 3. Sau khi cài xong, mở Terminal và chạy lệnh:
echo    ollama serve
echo 4. Tải mô hình AI (khuyến nghị):
echo    ollama pull llama3.2
echo.
echo Sau khi cài Ollama, quay lại MindScan AI và sử dụng tính năng AI.
echo.
pause
goto menu


:exit
echo.
echo Cảm ơn bạn đã sử dụng MindScan AI!
pause >nul
exit