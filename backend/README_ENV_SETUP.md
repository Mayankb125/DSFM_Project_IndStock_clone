Environment setup for the backend

This guide explains how to create a virtual environment, install Python dependencies, and set environment variables for the backend service.

Prerequisites
- Python 3.8+ installed and available on PATH.
- PowerShell (Windows).

Steps (recommended)
1. Open PowerShell and change into the backend folder:

   cd path\to\DSFM_Project_IndStock_clone\backend

2. Run the setup script (recommended):

   # run in current PowerShell session with temporary bypass of execution policy
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; .\setup_env.ps1

   This will:
   - create a `.venv` virtual environment in the `backend` folder
   - activate the venv for the current session
   - upgrade pip and install packages from `requirements.txt`

3. Create your `.env` file from the example and fill secrets:

   Copy `.env.example` to `.env` and populate values for `SECRET_KEY`, API keys, etc.

   cp .env.example .env  # or use the File Explorer to copy

4. Activate the venv in new shells (when needed):

   .\.venv\Scripts\Activate.ps1

5. Run the app (example):

   # with Flask development server
   python -m flask run --port=${env:PORT}

Notes
- If PowerShell blocks the script (execution policy), the command above uses -Scope Process so you don't change system state.
- If `python` is not available or points to the wrong interpreter, run the appropriate Python executable (e.g. `py -3` or full path) when calling the script.
- Do NOT check in `.env` with real secrets. Keep `.env` local or use a secrets manager for production.

Troubleshooting
- "python: command not found" — ensure Python is installed and added to PATH, or use the `py -3 -m venv .venv` form.
- Permission errors when activating: adjust ExecutionPolicy only for the session (we use Bypass above).

If you want me to create the venv on your machine and install packages now, tell me and I'll run the commands in a PowerShell terminal for you.