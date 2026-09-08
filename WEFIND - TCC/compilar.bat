@echo off
chcp 65001 > nul
echo ============================================================
echo   Compilando TCC WeFIND em PDF...
echo ============================================================
echo.

pdflatex -interaction=nonstopmode -synctex=1 main.tex
if %errorlevel% neq 0 (
    echo.
    echo ❌ Erro durante a compilacao! Verifique o log em main.log
    pause
    exit /b %errorlevel%
)

echo.
echo Segunda passada para atualizar referencias e indices...
pdflatex -interaction=nonstopmode -synctex=1 main.tex

echo.
echo ============================================================
echo   PDF gerado com sucesso! Arquivo: main.pdf
echo ============================================================
pause
