FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends git chromium \
    && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY . .
RUN uv sync --frozen --no-dev
ENV PATH="/app/.venv/bin:$PATH" \
    ARTRAT_BROWSER_EXECUTABLE=/usr/bin/chromium \
    ANONYMIZED_TELEMETRY=false \
    BROWSER_USE_CLOUD_SYNC=false
RUN useradd --create-home browser
USER browser
EXPOSE 8090
CMD ["artrat-browser"]
