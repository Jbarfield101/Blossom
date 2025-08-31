from __future__ import annotations

"""Track combat kills from log lines.

This module provides a :class:`KillTracker` that parses combat log lines of the
form ``"<attacker> kills <target>"`` and maintains running kill/death tallies
for each participant. The tracker exposes methods to query individual counts or
retrieve a snapshot of all tallies.
"""

from collections import defaultdict
import re
from typing import Dict, Tuple

_COMBAT_RE = re.compile(r"^(?P<attacker>.+?) kills (?P<target>.+)$")


class KillTracker:
    """Maintain kill/death counts for combatants."""

    def __init__(self) -> None:
        self.kills: dict[str, int] = defaultdict(int)
        self.deaths: dict[str, int] = defaultdict(int)

    def record(self, line: str) -> bool:
        """Parse ``line`` and update tallies.

        Returns ``True`` if the line matched the combat pattern, otherwise
        returns ``False`` and leaves tallies unchanged.
        """

        match = _COMBAT_RE.match(line.strip())
        if not match:
            return False
        attacker = match.group("attacker")
        target = match.group("target")
        self.kills[attacker] += 1
        self.deaths[target] += 1
        return True

    def get_kills(self, entity: str) -> int:
        """Return the number of kills recorded for ``entity``."""

        return self.kills.get(entity, 0)

    def get_deaths(self, entity: str) -> int:
        """Return the number of deaths recorded for ``entity``."""

        return self.deaths.get(entity, 0)

    def tally(self) -> Dict[str, Tuple[int, int]]:
        """Return a mapping of entity to ``(kills, deaths)``."""

        participants = set(self.kills) | set(self.deaths)
        return {
            entity: (self.get_kills(entity), self.get_deaths(entity))
            for entity in participants
        }

    def display(self) -> str:
        """Return a human-readable representation of all tallies."""

        lines = [
            f"{entity}: {kills} kills, {deaths} deaths"
            for entity, (kills, deaths) in sorted(self.tally().items())
        ]
        return "\n".join(lines)


__all__ = ["KillTracker"]
