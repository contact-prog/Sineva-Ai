FROM python:3.12-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home assembler
WORKDIR /app
COPY worker.py ./worker.py
USER assembler
CMD ["python", "-u", "worker.py"]
