def test_feedmanager_component_exists():
    from pathlib import Path
    path = Path(__file__).resolve().parents[3] / 'frontend' / 'src' / 'components' / 'FeedManager.tsx'
    path = path.resolve()
    assert path.exists(), f"FeedManager component not found at {path}"
