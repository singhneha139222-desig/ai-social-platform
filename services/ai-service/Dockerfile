FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5001

# Download models at build time to avoid runtime delays
RUN python -c "from transformers import AutoTokenizer, AutoModelForSequenceClassification; \
    AutoTokenizer.from_pretrained('unitary/toxic-bert', cache_dir='./models_cache'); \
    AutoModelForSequenceClassification.from_pretrained('unitary/toxic-bert', cache_dir='./models_cache'); \
    AutoTokenizer.from_pretrained('lxyuan/distilbert-base-multilingual-cased-sentiments-student', cache_dir='./models_cache'); \
    AutoModelForSequenceClassification.from_pretrained('lxyuan/distilbert-base-multilingual-cased-sentiments-student', cache_dir='./models_cache')"

CMD ["python", "run.py"]
