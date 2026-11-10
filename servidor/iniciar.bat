@echo off
chcp 65001 >nul
title Point do RD - Servidor de Pedidos
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo.
    echo  Node.js nao encontrado neste computador.
    echo  Baixe em https://nodejs.org e instale antes de continuar.
    echo.
    pause
    exit /b 1
)

echo.
echo  Iniciando o servidor do Point do RD...
echo  Para parar, feche esta janela ou pressione Ctrl+C.
echo.

node server.js

echo.
echo  O servidor foi encerrado.
pause
