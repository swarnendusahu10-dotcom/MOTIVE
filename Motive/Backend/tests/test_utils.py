"""
tests/test_utils.py
────────────────────
Regression test for agents/utils.py's content_to_text(). This is the
helper that fixes the "garbled agent bubble" bug: Gemini sometimes
returns `.content` as a list of content-block dicts instead of a plain
string, and every place that touches `.content` directly needs to route
through this function instead. No network/credentials needed — pure
function, safe to run in CI.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agents.utils import content_to_text


def test_plain_string_passthrough():
    assert content_to_text("hello") == "hello"


def test_none_returns_empty_string():
    assert content_to_text(None) == ""


def test_list_of_dict_blocks():
    content = [{"type": "text", "text": "hello "}, {"type": "text", "text": "world"}]
    assert content_to_text(content) == "hello world"


def test_list_of_plain_strings():
    content = ["hello ", "world"]
    assert content_to_text(content) == "hello world"


def test_mixed_list_ignores_blocks_without_text():
    content = [{"type": "text", "text": "hello"}, {"type": "image_url", "image_url": "..."}]
    assert content_to_text(content) == "hello"


def test_non_string_non_list_falls_back_to_str():
    assert content_to_text(42) == "42"
