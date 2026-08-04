@echo off
title Compilando, Publicando e Instalando en Tablet

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
echo [4/5] Compilando APK release firmado y publicandolo al backend...
echo       (al terminar sube solo la version para el proximo build)
cd android
call gradlew.bat assembleRelease
if %errorlevel% neq 0 (
    echo Error al compilar el APK release. Abortando.
    pause
    exit /b %errorlevel%
)

echo.
echo [5/5] Instalando en la Tablet e iniciando la aplicacion...
REM -r reinstala conservando los datos. Si falla por firma distinta, hay que
REM desinstalar la version anterior de la tablet una unica vez:
REM     adb uninstall com.fisholg.desviaciones
call adb install -r "app\build\outputs\apk\release\app-release.apk"
if %errorlevel% neq 0 (
    echo.
    echo No se pudo instalar en la tablet.
    echo Si el error menciona la firma, ejecuta:  adb uninstall com.fisholg.desviaciones
    pause
    exit /b %errorlevel%
)

call adb shell am start -n com.fisholg.desviaciones/com.fisholg.desviaciones.MainActivity

echo.
echo =======================================================
echo PROCESO COMPLETADO! Aplicacion abierta en la tablet.
echo =======================================================
echo.
pause
