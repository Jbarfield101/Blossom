import sys, os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from lofi.renderer import FORM_TEMPLATES  # noqa: E402


def test_through_composed_forms():
    form = FORM_TEMPLATES["ThroughABCDEF"]
    assert [s["name"] for s in form] == [
        "Intro",
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "Outro",
    ]
    odd = FORM_TEMPLATES["ThroughOddABCDEF"]
    assert [s["bars"] for s in odd] == [4, 7, 5, 7, 5, 7, 5, 4]
