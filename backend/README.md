# QuietNight API

FastAPI backend with Supabase. Dependencies are managed with [Poetry](https://python-poetry.org/).

## Setup

1. **Install Poetry** (if needed):

   ```bash
   curl -sSL https://install.python-poetry.org | python3 -
   ```

   Or with pip: `pip install poetry`

2. **Install dependencies** (from this directory):

   ```bash
   poetry install
   ```

   This creates/updates `poetry.lock` and installs the project and its dependencies into Poetry’s virtualenv.

3. **Run the API**:

   ```bash
   poetry run uvicorn app.main:app --reload
   ```

## Useful commands

- `poetry add <package>` — add a dependency
- `poetry run <command>` — run a command in the project’s virtualenv
- `poetry shell` — activate the virtualenv in your shell
