@echo off
chcp 65001 > nul
echo ============================================================
echo   Limpando arquivos auxiliares e temporarios do LaTeX...
echo ============================================================
echo.

if exist "build" (
    rd /s /q build
    echo ✔ Pasta 'build' removida com sucesso.
)

del /q *.aux *.log *.out *.toc *.lof *.lot *.synctex.gz *.fls *.fdb_latexmk 2>nul
echo ✔ Arquivos temporarios da raiz removidos.

echo.
echo ============================================================
echo   Limpeza concluida com sucesso!
echo ============================================================
pause
