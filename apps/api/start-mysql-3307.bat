@echo off
mkdir "D:\mysql-8.0.45-winx64\data3307" 2>nul
"D:\mysql-8.0.45-winx64\bin\mysqld.exe" --defaults-file="D:\mysql-8.0.45-winx64\my.ini" --port=3307 --datadir="D:\mysql-8.0.45-winx64\data3307" --skip-grant-tables --bind-address=127.0.0.1
