FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir poetry && \
    poetry config virtualenvs.create false

COPY pyproject.toml poetry.lock ./
RUN poetry install --no-interaction --no-ansi --only main --no-root

COPY app ./app

EXPOSE ${PORT:-8000}

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
