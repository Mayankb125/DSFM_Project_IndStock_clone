# Create a Python virtual environment for the backend and install requirements
# Usage (PowerShell):
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; .\setup_env.ps1

# Location: run this from the `backend` folder

param(
    [string]$venvName = ".venv",
    [string]$requirements = "requirements.txt"
)

Write-Host "Creating virtual environment '$venvName'..."
python -m venv $venvName

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to create virtual environment. Ensure 'python' is on PATH and points to a valid Python installation."
    exit 1
}

# Activate the venv in PowerShell
$activatePath = Join-Path -Path $venvName -ChildPath "Scripts\Activate.ps1"
if (Test-Path $activatePath) {
    Write-Host "Activating virtual environment..."
    & $activatePath
} else {
    Write-Warning "Activation script not found at $activatePath. You can activate manually: $venvName\Scripts\Activate.ps1"
}

Write-Host "Upgrading pip..."
python -m pip install --upgrade pip

if (Test-Path $requirements) {
    Write-Host "Installing requirements from $requirements..."
    python -m pip install -r $requirements
} else {
    Write-Warning "Requirements file '$requirements' not found. Skipping package install."
}

Write-Host "Environment setup complete. To activate the venv in a new shell: .\$venvName\Scripts\Activate.ps1"
Write-Host "Copy ' .env.example' -> '.env' and fill in any secret/API values before running the app."

# End of script
