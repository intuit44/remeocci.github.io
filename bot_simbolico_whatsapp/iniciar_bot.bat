@echo off
title Bot WhatsApp - Play Mall Park
cd /d "C:\ProyectosSimbolicos\bot_simbolico_whatsapp"

echo ========================================
echo   BOT WHATSAPP PLAY MALL PARK
echo   Iniciado: %date% %time%
echo ========================================

:loop
echo.
echo [%date% %time%] Iniciando bot...

node index.js

echo.
echo [%date% %time%] Bot se detuvo
echo [%date% %time%] Limpiando sesion para evitar errores...

REM Limpiar tokens si existen (para evitar sesiones corruptas)
if exist "tokens" (
    timeout /t 5 /nobreak
    rmdir /s /q "tokens" 2>nul
    echo [%date% %time%] Sesion limpiada
)

echo [%date% %time%] Reiniciando en 15 segundos...
echo Presiona Ctrl+C para cancelar
timeout /t 15 /nobreak

goto loop