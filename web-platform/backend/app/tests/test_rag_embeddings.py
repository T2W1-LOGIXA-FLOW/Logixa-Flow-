from __future__ import annotations

from unittest.mock import Mock

import requests

from app.rag import embeddings


def test_embeddings_use_local_hash_without_openrouter_key(monkeypatch, caplog) -> None:
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("ADMIN_OPENROUTER_API_KEY", raising=False)
    monkeypatch.delenv("USER_OPENROUTER_API_KEY", raising=False)
    monkeypatch.setenv("GEMINI_API_KEY", "legacy-gemini-key")
    monkeypatch.setattr(embeddings.requests, "post", Mock(side_effect=AssertionError("must not call external API")))

    vector, model = embeddings.embed_text("private supply chain text")

    assert model == "hash:fallback"
    assert len(vector) == embeddings.EMBEDDING_DIMENSIONS
    assert "reason=missing_openrouter_key" in caplog.text


def test_embeddings_call_only_free_openrouter_embedding_model(monkeypatch) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-openrouter-key")
    values = [0.0] * embeddings.EMBEDDING_DIMENSIONS
    response = Mock()
    response.raise_for_status.return_value = None
    response.json.return_value = {"data": [{"embedding": values}]}
    post = Mock(return_value=response)
    monkeypatch.setattr(embeddings.requests, "post", post)

    vector, model = embeddings.embed_text("short text")

    assert model == "liquid/lfm-2.5-embedding-350m:free"
    assert len(vector) == embeddings.EMBEDDING_DIMENSIONS
    assert post.call_args.args[0] == "https://openrouter.ai/api/v1/embeddings"
    assert post.call_args.kwargs["json"]["model"] == "liquid/lfm-2.5-embedding-350m:free"
    assert post.call_args.kwargs["json"]["dimensions"] == embeddings.EMBEDDING_DIMENSIONS


def test_embeddings_fall_back_locally_if_free_model_returns_wrong_dimension(monkeypatch, caplog) -> None:
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-openrouter-key")
    response = Mock()
    response.raise_for_status.return_value = None
    response.json.return_value = {"data": [{"embedding": [0.1] * 1024}]}
    monkeypatch.setattr(embeddings.requests, "post", Mock(return_value=response))

    vector, model = embeddings.embed_text("text")

    assert model == "hash:fallback"
    assert len(vector) == embeddings.EMBEDDING_DIMENSIONS
    assert f"reason=dimension_mismatch:expected={embeddings.EMBEDDING_DIMENSIONS}:actual=1024" in caplog.text


def test_voyage_v2_embedding_uses_tested_512_dimension_model(monkeypatch) -> None:
    monkeypatch.setenv("VOYAGE_EMBEDDING_MIN_INTERVAL_SECONDS", "0")
    monkeypatch.setenv("VOYAGE_API_KEY", "test-voyage-key")
    values = [0.25] * 512
    response = Mock()
    response.status_code = 200
    response.headers = {}
    response.raise_for_status.return_value = None
    response.json.return_value = {"data": [{"embedding": values}]}
    post = Mock(return_value=response)
    monkeypatch.setattr(embeddings.requests, "post", post)

    vector, model = embeddings.embed_text_v2("supply chain context")

    assert len(vector) == 512
    assert model == "voyage-3-lite"
    assert post.call_args.args[0] == "https://api.voyageai.com/v1/embeddings"
    assert post.call_args.kwargs["json"]["output_dimension"] == 512


def test_voyage_v2_embedding_fails_closed_without_key(monkeypatch) -> None:
    monkeypatch.delenv("VOYAGE_API_KEY", raising=False)
    monkeypatch.delenv("COHERE_API_KEY", raising=False)
    monkeypatch.setattr(embeddings.requests, "post", Mock(side_effect=AssertionError("must not call external API")))

    try:
        embeddings.embed_text_v2("supply chain context")
    except RuntimeError as exc:
        assert "Semantic embedding unavailable" in str(exc)
    else:
        raise AssertionError("version 2 must not silently fall back to hash embeddings")


def test_voyage_v2_retries_rate_limit_using_retry_after(monkeypatch) -> None:
    monkeypatch.setenv("VOYAGE_EMBEDDING_MIN_INTERVAL_SECONDS", "0")
    monkeypatch.setenv("VOYAGE_API_KEY", "test-voyage-key")
    monkeypatch.setenv("VOYAGE_EMBEDDING_MAX_ATTEMPTS", "3")
    throttled = Mock()
    throttled.status_code = 429
    throttled.headers = {"Retry-After": "0"}
    throttled.raise_for_status.side_effect = requests.HTTPError("429")
    success = Mock()
    success.status_code = 200
    success.headers = {}
    success.raise_for_status.return_value = None
    success.json.return_value = {"data": [{"embedding": [0.25] * 512}]}
    post = Mock(side_effect=[throttled, throttled, success])
    monkeypatch.setattr(embeddings.requests, "post", post)
    sleep = Mock()
    monkeypatch.setattr(embeddings.time, "sleep", sleep)

    vector, model = embeddings.embed_text_v2("retry rate-limited request")

    assert len(vector) == 512
    assert model == "voyage-3-lite"
    assert post.call_count == 3
    assert [call.args[0] for call in sleep.call_args_list] == [1.0, 2.0]


def test_voyage_v2_does_not_retry_permanent_bad_request(monkeypatch) -> None:
    monkeypatch.setenv("VOYAGE_EMBEDDING_MIN_INTERVAL_SECONDS", "0")
    monkeypatch.setenv("VOYAGE_API_KEY", "test-voyage-key")
    monkeypatch.delenv("COHERE_API_KEY", raising=False)
    response = Mock()
    response.status_code = 400
    response.headers = {}
    response.raise_for_status.side_effect = requests.HTTPError("400")
    post = Mock(return_value=response)
    monkeypatch.setattr(embeddings.requests, "post", post)

    try:
        embeddings.embed_text_v2("invalid request")
    except requests.HTTPError:
        pass
    else:
        raise AssertionError("non-retryable provider errors must fail closed")

    assert post.call_count == 1
