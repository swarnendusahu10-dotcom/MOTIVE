"""
tests/test_pattern_similarity.py
─────────────────────────────────
Regression test for the cosine-similarity helper behind Pattern Agent's
find_similar_cases tool (agents/tools_pattern.py). No Firestore/Gemini
credentials needed — config.py boots without them (see config.py's
_init_firebase, which warns and no-ops instead of raising when
FIREBASE_CREDENTIALS_* isn't set), and this test never calls get_db().
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from agents.tools_pattern import _cosine


def test_identical_vectors_are_maximally_similar():
    v = [1.0, 2.0, 3.0]
    assert abs(_cosine(v, v) - 1.0) < 1e-9


def test_orthogonal_vectors_have_zero_similarity():
    assert abs(_cosine([1.0, 0.0], [0.0, 1.0])) < 1e-9


def test_zero_vector_is_defined_as_zero_similarity():
    assert _cosine([0.0, 0.0], [1.0, 2.0]) == 0.0


def test_opposite_vectors_are_maximally_dissimilar():
    assert abs(_cosine([1.0, 0.0], [-1.0, 0.0]) - (-1.0)) < 1e-9
