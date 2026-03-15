@echo off
echo =========================================
echo  Novamarkt - Projekt-Setup
echo =========================================
echo.

echo [1/5] NPM Pakete installieren...
call npm install
if %errorlevel% neq 0 (
  echo FEHLER: npm install fehlgeschlagen!
  pause
  exit /b %errorlevel%
)
echo OK.
echo.

echo [2/5] Docker Datenbank starten...
docker-compose up -d db
if %errorlevel% neq 0 (
  echo FEHLER: Docker nicht erreichbar. Laeuft Docker Desktop?
  pause
  exit /b %errorlevel%
)
echo OK.
echo.

echo [3/5] Warte 5s auf Datenbank...
timeout /t 5 /nobreak >nul
echo OK.
echo.

echo [4/5] Prisma Client generieren...
call npx prisma generate
if %errorlevel% neq 0 (
  echo FEHLER: Prisma Generate fehlgeschlagen!
  pause
  exit /b %errorlevel%
)
echo OK.
echo.

echo [5/5] Datenbank-Schema pushen...
call npx prisma db push
if %errorlevel% neq 0 (
  echo FEHLER: Prisma DB Push fehlgeschlagen. Laeuft PostgreSQL auf Port 5432?
  pause
  exit /b %errorlevel%
)
echo OK.
echo.

echo =========================================
echo  SETUP FERTIG!
echo  Starte den Server mit: npm run dev
echo =========================================
pause
