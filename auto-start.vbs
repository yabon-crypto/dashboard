Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell -NoProfile -ExecutionPolicy Bypass -File ""C:\Users\user\Documents\Default Project\auto-start.ps1""", 0, False
