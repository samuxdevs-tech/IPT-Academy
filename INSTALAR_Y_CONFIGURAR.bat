@echo off
chcp 65001 >nul
title Instalador y Transferencia Automatica - DataGan Course
echo ============================================================================
echo   INICIANDO TRANSFERENCIA E INSTALACION AUTOMATICA - DATAGAN COURSE
echo ============================================================================
echo.
node "%~dp0setup-transfer.js"
pause
