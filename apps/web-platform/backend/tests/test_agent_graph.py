import json

from app.agent_graph import NODE_TASKS, _parse_json


def test_agent_graph_has_distinct_content_stages():
    assert [name for name, _ in NODE_TASKS] == [
        'researcher', 'analyst', 'writer', 'seo', 'fact_checker', 'quality_gate'
    ]
    assert [task for _, task in NODE_TASKS] == [
        'research', 'analysis', 'writing', 'seo', 'factcheck', 'quality'
    ]


def test_agent_graph_parses_structured_provider_output():
    payload = _parse_json('```json\n{"title":"Example","claims":["grounded"]}\n```')
    assert payload['title'] == 'Example'
    assert payload['claims'] == ['grounded']


def test_agent_graph_preserves_unstructured_provider_output():
    payload = _parse_json('provider text')
    assert payload == {'text': 'provider text'}
    json.dumps(payload)