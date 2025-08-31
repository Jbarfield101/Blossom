import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))
import kill_tracker  # noqa: E402


def test_record_and_tally():
    tracker = kill_tracker.KillTracker()
    lines = [
        "Alice kills Bob",
        "Bob kills Alice",
        "Alice kills Goblin",
        "Goblin kills Bob",
        "Alice kills Bob",
    ]
    for line in lines:
        assert tracker.record(line)

    assert tracker.get_kills("Alice") == 3
    assert tracker.get_kills("Bob") == 1
    assert tracker.get_deaths("Bob") == 3
    assert tracker.get_deaths("Alice") == 1
    assert tracker.get_deaths("Goblin") == 1

    display = tracker.display()
    assert "Alice: 3 kills, 1 deaths" in display


def test_non_combat_line():
    tracker = kill_tracker.KillTracker()
    assert not tracker.record("Alice attacks Bob")
    assert tracker.tally() == {}
