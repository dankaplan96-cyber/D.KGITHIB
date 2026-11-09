@echo off
chcp 65001 >nul
title Nurse Supervisor Server
rem pushd works also when the folder is on a network share (UNC path)
pushd "%~dp0"
where py >nul 2>nul && (py -3 server.py %* & goto :end)
where python >nul 2>nul && (python server.py %* & goto :end)
echo.
echo Python 3 is not installed. Download: https://www.python.org/downloads/
echo (check "Add python.exe to PATH" during install)
:end
popd
pause
