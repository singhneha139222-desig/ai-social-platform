"""
AI Service Tests.
Tests the toxicity and sentiment model endpoints.
Run with: python -m pytest tests/ -v
"""
import json
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app import create_app
from app.models.toxicity import toxicity_detector
from app.models.sentiment import sentiment_analyzer


@pytest.fixture(scope='session')
def load_models():
    """Load models once for all tests."""
    if not toxicity_detector.is_loaded:
        toxicity_detector.load()
    if not sentiment_analyzer.is_loaded:
        sentiment_analyzer.load()


@pytest.fixture
def client(load_models):
    """Create Flask test client."""
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


class TestHealthEndpoint:
    def test_health_check(self, client):
        response = client.get('/health')
        data = json.loads(response.data)
        assert response.status_code == 200
        assert data['status'] == 'healthy'
        assert data['models']['toxicity']['status'] == 'loaded'
        assert data['models']['sentiment']['status'] == 'loaded'


class TestToxicityEndpoint:
    def test_safe_content(self, client):
        response = client.post(
            '/api/v1/moderation/toxicity',
            json={'text': 'I love this community! Everyone is so supportive.'},
            content_type='application/json'
        )
        data = json.loads(response.data)
        assert response.status_code == 200
        assert data['decision'] == 'publish'
        assert data['toxicity_score'] < 0.70
        assert 'categories' in data
        assert 'toxic' in data['categories']
        assert 'insult' in data['categories']
        assert data['model'] == 'unitary/toxic-bert'

    def test_toxic_content(self, client):
        response = client.post(
            '/api/v1/moderation/toxicity',
            json={'text': 'You are all worthless, disgusting losers and I hope terrible things happen to all of you.'},
            content_type='application/json'
        )
        data = json.loads(response.data)
        assert response.status_code == 200
        assert data['decision'] == 'reject'
        assert data['toxicity_score'] > 0.90

    def test_empty_text(self, client):
        response = client.post(
            '/api/v1/moderation/toxicity',
            json={'text': ''},
            content_type='application/json'
        )
        data = json.loads(response.data)
        assert response.status_code == 200
        assert data['decision'] == 'publish'
        assert data['toxicity_score'] == 0.0

    def test_missing_body(self, client):
        """Flask returns 415 when no Content-Type is set on POST without body."""
        response = client.post('/api/v1/moderation/toxicity')
        assert response.status_code in (400, 415)

    def test_all_six_categories_returned(self, client):
        response = client.post(
            '/api/v1/moderation/toxicity',
            json={'text': 'Test content for analysis'},
            content_type='application/json'
        )
        data = json.loads(response.data)
        expected_categories = ['toxic', 'severe_toxic', 'obscene', 'threat', 'insult', 'identity_hate']
        for cat in expected_categories:
            assert cat in data['categories'], f"Missing category: {cat}"


class TestSentimentEndpoint:
    def test_positive_sentiment(self, client):
        """Test that clearly positive text returns positive label."""
        response = client.post(
            '/api/v1/sentiment',
            json={'text': 'I am so happy and grateful today, everything is amazing and beautiful!'},
            content_type='application/json'
        )
        data = json.loads(response.data)
        assert response.status_code == 200
        # The model should return all three classes with valid probabilities
        assert 'all_scores' in data
        assert 'positive' in data['all_scores']
        assert 'neutral' in data['all_scores']
        assert 'negative' in data['all_scores']
        # Positive should have highest score for clearly positive text
        assert data['all_scores']['positive'] > data['all_scores']['negative']

    def test_negative_sentiment(self, client):
        response = client.post(
            '/api/v1/sentiment',
            json={'text': 'This is terrible and I am very disappointed and sad about this situation.'},
            content_type='application/json'
        )
        data = json.loads(response.data)
        assert response.status_code == 200
        assert data['label'] == 'negative'
        assert data['score'] > 0.5

    def test_three_class_model(self, client):
        """Verify the model natively supports 3 classes (not binary with threshold)."""
        response = client.post(
            '/api/v1/sentiment',
            json={'text': 'The weather is cloudy today.'},
            content_type='application/json'
        )
        data = json.loads(response.data)
        assert response.status_code == 200
        # All three classes should have probability >= 0
        assert data['all_scores']['positive'] >= 0
        assert data['all_scores']['neutral'] >= 0
        assert data['all_scores']['negative'] >= 0
        # Sum should be approximately 1 (softmax)
        total = sum(data['all_scores'].values())
        assert abs(total - 1.0) < 0.01, f"Probabilities don't sum to 1: {total}"

    def test_model_name(self, client):
        """Verify the model in use is the 3-class model, NOT the SST-2 binary model."""
        response = client.post(
            '/api/v1/sentiment',
            json={'text': 'test'},
            content_type='application/json'
        )
        data = json.loads(response.data)
        assert 'distilbert' in data['model'].lower() or 'sentiment' in data['model'].lower()
        assert 'sst-2' not in data['model'].lower(), "Must NOT use SST-2 binary model"

    def test_empty_text(self, client):
        response = client.post(
            '/api/v1/sentiment',
            json={'text': ''},
            content_type='application/json'
        )
        data = json.loads(response.data)
        assert response.status_code == 200
        assert data['label'] == 'neutral'

    def test_missing_body(self, client):
        """Flask returns 415 when no Content-Type is set on POST without body."""
        response = client.post('/api/v1/sentiment')
        assert response.status_code in (400, 415)
