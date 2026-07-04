@echo off
title NASTube Install
cd /d "%~dp0"

echo.
echo  ==============================
echo    NASTube - Installation
echo  ==============================
echo.

REM --- Vérifier Python ---
where python >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERREUR] Python n'est pas installe.
    echo Telecharge-le sur https://www.python.org/downloads/
    echo Coche "Add Python to PATH" lors de l'installation.
    pause
    exit /b 1
)

REM --- Créer le venv si besoin ---
if not exist ".venv" (
    echo [1/3] Creation de l'environnement virtuel...
    python -m venv .venv
    if errorlevel 1 ( echo [ERREUR] Echec creation venv & pause & exit /b 1 )
)

REM --- Installer les dépendances ---
echo [2/3] Installation des dependances...
.venv\Scripts\python.exe -m pip install -q -r backend\requirements.txt
if errorlevel 1 ( echo [ERREUR] Echec installation dependances & pause & exit /b 1 )

REM --- Lancer le serveur ---
echo [3/3] Demarrage du serveur...
echo.
start http://localhost:8765
.venv\Scripts\python.exe backend\app.py

pause
