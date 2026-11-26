"""Executable rework specification. No game imports, memory access, or asset writes.

Times are monotonic seconds supplied by the caller. Blood and noncritical SPECIAL
bite damage are inputs, not values this model knows how to read from the game.
"""

from __future__ import annotations

import argparse
import json
import math
from dataclasses import asdict, dataclass
from enum import IntEnum


class Rarity(IntEnum):
    COMMON = 0
    RARE = 1
    EPIC = 2
    LEGENDARY = 3


BLOOD_SPEED = (0.10, 0.15, 0.20, 0.25)


def number(value: float, label: str, *, positive: bool = False) -> float:
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise ValueError(f"{label} must be a finite number")
    if not math.isfinite(value) or value < 0 or (positive and value == 0):
        raise ValueError(f"{label} must be finite and {'positive' if positive else 'nonnegative'}")
    return float(value)


@dataclass(frozen=True)
class Rules:
    # Intentionally no defaults for values still requiring asset inspection/balance.
    seduction_cooldown: float
    onslaught_window: float | None
    onslaught_percent: tuple[float, float, float, float]

    def __post_init__(self):
        number(self.seduction_cooldown, "seduction cooldown", positive=True)
        if self.onslaught_window is not None:
            number(self.onslaught_window, "Onslaught window", positive=True)
        if len(self.onslaught_percent) != 4:
            raise ValueError("Onslaught needs four percentages in Common-to-Legendary order")
        for value in self.onslaught_percent:
            number(value, "Onslaught percentage", positive=True)


@dataclass(frozen=True)
class Talents:
    seductive_provocation: bool = False
    blood_reserve: Rarity | None = None
    onslaught: Rarity | None = None

    def __post_init__(self):
        for rarity in (self.blood_reserve, self.onslaught):
            if rarity is not None and not isinstance(rarity, Rarity):
                raise ValueError("talent rarity must be a Rarity or None (unowned)")


@dataclass(frozen=True)
class Dash:
    token: int
    empowered: bool
    damage: float | None
    damage_category: str | None


@dataclass(frozen=True)
class Seduction:
    time: float
    position: tuple[float, float, float]
    facing: float


class ReworkModel:
    """Intended behavior only; event names here are NOT verified engine events.

    Assumptions: SPECIAL activation arms; starting a dash consumes readiness even
    if canceled; repeat SPECIAL refreshes one charge; a completed dash evaluates
    current ownership/cooldown. Death/transition clears readiness and active dash,
    but preserves cooldown. A new run resets talents and cooldown too.
    """

    def __init__(self, rules: Rules, talents: Talents = Talents()):
        self.rules = rules
        self.talents = talents
        self.alive = True
        self._time = 0.0
        self._armed_until: float | None = None
        self._seduction_ready_at = 0.0
        self._next_token = 0
        self._dash: Dash | None = None

    def _advance(self, now: float) -> None:
        now = number(now, "time")
        if now < self._time:
            raise ValueError("event time must not go backwards")
        self._time = now

    def set_talents(self, talents: Talents) -> None:
        self.talents = talents
        if talents.onslaught is None:
            self._armed_until = None

    def attack_speed_bonus(self, blood: float | None, maximum: float | None) -> float:
        """Added speed fraction; zero for unowned, dead, or unavailable readings.

        This grants NO capacity bonus. `maximum` is supplied by the game after
        removing vanilla Blood Reserve's capacity contribution.
        """
        if not self.alive or self.talents.blood_reserve is None:
            return 0.0
        if blood is None or maximum is None:
            return 0.0
        blood = number(blood, "blood")
        maximum = number(maximum, "maximum blood", positive=True)
        if blood > maximum:
            raise ValueError("blood cannot exceed effective maximum")
        return BLOOD_SPEED[self.talents.blood_reserve] if blood > maximum / 2 else 0.0

    def special(self, now: float) -> None:
        self._advance(now)
        if self.alive and self.talents.onslaught is not None:
            window = self.rules.onslaught_window
            self._armed_until = math.inf if window is None else now + window

    def attack(self, now: float) -> None:
        """An ordinary attack neither triggers nor consumes Onslaught."""
        self._advance(now)

    def dash_start(self, now: float, *, special_bite_damage: float | None = None) -> Dash:
        self._advance(now)
        if not self.alive or self._dash is not None:
            raise ValueError("cannot start a dash while dead or already dashing")
        empowered = (self.talents.onslaught is not None and self._armed_until is not None
                     and now < self._armed_until)
        damage = None
        if empowered:
            basis = number(special_bite_damage, "noncritical SPECIAL bite damage")
            damage = basis * self.rules.onslaught_percent[self.talents.onslaught] / 100
            number(damage, "Onslaught damage")
        # Validate before consuming so a bad input cannot eat the pending rush.
        self._armed_until = None
        self._next_token += 1
        self._dash = Dash(self._next_token, empowered, damage, "special" if empowered else None)
        return self._dash

    def dash_end(self, token: int, now: float, *,
                 position: tuple[float, float, float], facing: float) -> Seduction | None:
        self._advance(now)
        if self._dash is None or self._dash.token != token:
            return None  # canceled, duplicate, or stale completion
        if len(position) != 3 or not all(math.isfinite(n) for n in (*position, facing)):
            raise ValueError("endpoint and facing must be finite")
        self._dash = None
        if (not self.alive or not self.talents.seductive_provocation
                or now < self._seduction_ready_at):
            return None
        self._seduction_ready_at = now + self.rules.seduction_cooldown
        return Seduction(now, position, facing)

    def cancel_dash(self, token: int, now: float) -> None:
        self._advance(now)
        if self._dash is not None and self._dash.token == token:
            self._dash = None

    def transition(self, now: float) -> None:
        """Proposed chapter/reset handling, not an observed engine rule."""
        self._advance(now)
        self._armed_until = None
        self._dash = None

    def die(self, now: float) -> None:
        self.transition(now)
        self.alive = False

    def revive(self, now: float) -> None:
        self._advance(now)
        self.alive = True

    def new_run(self) -> None:
        self.talents = Talents()
        self.alive = True
        self._time = 0.0
        self._armed_until = None
        self._seduction_ready_at = 0.0
        self._dash = None
        # Keep tokens unique so late callbacks cannot complete a new run's dash.


def demo(rules: Rules) -> dict:
    model = ReworkModel(rules, Talents(True, Rarity.COMMON, Rarity.COMMON))
    thresholds = {str(b): model.attack_speed_bonus(b, 100) for b in (49, 50, 51)}
    model.special(0)
    model.attack(0)
    dash = model.dash_start(0, special_bite_damage=100)
    end = model.dash_end(dash.token, 0.5, position=(3, 0, 5), facing=1.0)
    dash2 = model.dash_start(0.5)
    blocked = model.dash_end(dash2.token, 0.5, position=(4, 0, 5), facing=1.0)
    return {
        "status": "offline design demonstration; not game validation",
        "inputs": asdict(rules),
        "blood_speed_bonus_at_100_capacity": thresholds,
        "special_then_attack_then_dash": asdict(dash),
        "seduction_at_endpoint": asdict(end) if end else None,
        "second_dash": asdict(dash2),
        "second_seduction_during_cooldown": blocked,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seduction-cooldown", type=float, required=True)
    parser.add_argument("--onslaught-window", type=float, required=True,
                        help="seconds; illustrative until inspected in game assets")
    parser.add_argument("--onslaught-percent", type=float, nargs=4, required=True,
                        metavar=("COMMON", "RARE", "EPIC", "LEGENDARY"))
    args = parser.parse_args()
    try:
        rules = Rules(args.seduction_cooldown, args.onslaught_window,
                      tuple(args.onslaught_percent))
        print(json.dumps(demo(rules), indent=2, allow_nan=False))
    except ValueError as exc:
        parser.error(str(exc))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
