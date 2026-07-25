@echo off
title Compilando e Instalando en Tablet

echo =======================================================
echo COMPILANDO E INSTALANDO EN TABLET LENOVO
echo =======================================================
echo.

echo [1/5] Compilando Frontend Vite...
cd /d "%~dp0frontend"
call npm run build
if %errorlevel% neq 0 (
    echo Error en compilacion Frontend. Abortando.
    pause
    exit /b %errorlevel%
)

echo.
echo [2/5] Sincronizando activos web con Capacitor...
call npx cap sync android
if %errorlevel% neq 0 (
    echo Error en Capacitor sync. Abortando.
    pause
    exit /b %errorlevel%
)

echo.
echo [3/5] Configurando puente USB ADB (Puerto 3002)...
call adb reverse tcp:3002 tcp:3002

echo.
echo [4/5] Compilando e Instalando APK en Tablet...
cd android
call gradlew.bat installDebug
if %errorlevel% neq 0 (
    echo Error al compilar o instalar en la tablet. Abortando.
    pause
    exit /b %errorlevel%
)

echo.
echo [5/5] Iniciando aplicacion en la pantalla de la Tablet...
call adb shell am start -n com.fisholg.desviaciones/com.fisholg.desviaciones.MainActivity

echo.
echo =======================================================
echo PROCESO COMPLETADO! Aplicacion abierta en la tablet.
echo =======================================================
echo.
pause
