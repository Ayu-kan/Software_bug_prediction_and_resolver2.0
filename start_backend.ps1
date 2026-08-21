$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path $ScriptDir
.venv\Scripts\Activate.ps1
uvicorn backend.main:app --reload --port 8000
