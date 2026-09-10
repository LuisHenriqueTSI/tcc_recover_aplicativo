@echo off
chcp 65001 > nul
echo ============================================================
echo   Compilando TCC WeFIND em PDF...
echo ============================================================
echo.

if not exist "build" mkdir build

echo [1/2] Primeira passada de compilacao...
pdflatex -interaction=nonstopmode -aux-directory=build -synctex=1 main.tex
if %errorlevel% neq 0 (
    echo.
    echo ❌ Erro durante a compilacao! Verifique o log em build\main.log
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] Segunda passada para atualizar referencias e indices...
pdflatex -interaction=nonstopmode -aux-directory=build -synctex=1 main.tex

echo.
echo ============================================================
echo   ✔ PDF gerado com sucesso! Arquivo: main.pdf
echo   📁 Arquivos auxiliares organizados na pasta: build\
echo ============================================================
pause
