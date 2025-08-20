import sys, os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
import lofi_gpu_hq  # noqa: E402


def test_through_composed_forms():
    form = lofi_gpu_hq.FORM_TEMPLATES["ThroughABCDEF"]
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
    odd = lofi_gpu_hq.FORM_TEMPLATES["ThroughOddABCDEF"]
    assert [s["bars"] for s in odd] == [4, 7, 5, 7, 5, 7, 5, 4]
