"""Acceptance scenarios for the offline design; these do not validate the engine."""

import math

import pytest

from tools.carmilla_rework.model import Rarity, ReworkModel, Rules, Talents


@pytest.fixture
def model():
    # Explicit test inputs, not adopted game balance.
    return ReworkModel(Rules(6, 4, (100, 125, 150, 175)),
                       Talents(True, Rarity.COMMON, Rarity.COMMON))


def end(model, dash, time=0.5):
    return model.dash_end(dash.token, time, position=(5, 0, -2), facing=1.5)


@pytest.mark.parametrize("rarity,bonus", [(Rarity.COMMON, .1), (Rarity.RARE, .15),
                                        (Rarity.EPIC, .2), (Rarity.LEGENDARY, .25)])
def test_blood_threshold_uses_effective_capacity_and_current_rarity(model, rarity, bonus):
    model.set_talents(Talents(blood_reserve=rarity))
    # Capacity is 160 from other effects; 51 blood must NOT qualify.
    assert model.attack_speed_bonus(51, 160) == 0
    assert model.attack_speed_bonus(80, 160) == 0
    assert model.attack_speed_bonus(80.01, 160) == bonus
    assert model.attack_speed_bonus(80.01, 200) == 0  # effective maximum changed


def test_blood_crossings_do_not_stack_and_unownership_removes_bonus(model):
    assert [model.attack_speed_bonus(b, 100) for b in (51, 51, 50, 60, 49, 100)] == [
        .1, .1, 0, .1, 0, .1]
    model.set_talents(Talents())
    assert model.attack_speed_bonus(100, 100) == 0


def test_unavailable_blood_readings_do_not_grant_bonus(model):
    assert model.attack_speed_bonus(None, 100) == 0
    assert model.attack_speed_bonus(100, None) == 0
    with pytest.raises(ValueError):
        model.attack_speed_bonus(100, 0)
    with pytest.raises(ValueError):
        model.attack_speed_bonus(math.nan, 100)


def test_seduction_occurs_once_at_endpoint_and_uses_existing_cooldown(model):
    dash = model.dash_start(0)
    event = end(model, dash)
    assert event.position == (5, 0, -2) and event.facing == 1.5
    assert end(model, dash) is None  # duplicate exit callback
    assert end(model, model.dash_start(1), 1.5) is None
    assert end(model, model.dash_start(6), 6.49) is None
    # Blocked dashes did not refresh the original cooldown at t=.5.
    assert end(model, model.dash_start(6.49), 6.5) is not None


def test_cancel_does_not_proc_and_stale_completion_cannot_finish_next_dash(model):
    canceled = model.dash_start(0)
    model.cancel_dash(canceled.token, .1)
    current = model.dash_start(.2)
    assert end(model, canceled, .3) is None
    assert end(model, current, .4) is not None


def test_special_arms_dash_and_attack_neither_triggers_nor_consumes(model):
    model.special(0)
    assert model.attack(1) is None
    dash = model.dash_start(2, special_bite_damage=240)
    assert dash.empowered and dash.damage == 240 and dash.damage_category == "special"
    assert end(model, dash, 2.5) is not None  # both talents compose
    ordinary = model.dash_start(3)
    assert not ordinary.empowered and ordinary.damage is None


def test_special_refreshes_one_charge_and_expiry_is_enforced(model):
    model.special(0)
    model.special(3)
    dash = model.dash_start(6, special_bite_damage=100)
    assert dash.empowered
    model.cancel_dash(dash.token, 6.1)
    assert not model.dash_start(6.2).empowered  # refresh wasn't a second charge
    model.transition(7)
    model.special(8)
    assert not model.dash_start(12).empowered  # exact expiry


@pytest.mark.parametrize("rarity,damage", [(Rarity.COMMON, 200), (Rarity.RARE, 250),
                                         (Rarity.EPIC, 300), (Rarity.LEGENDARY, 350)])
def test_onslaught_percentage_applies_once_to_supplied_special_basis(model, rarity, damage):
    model.set_talents(Talents(onslaught=rarity))
    model.special(0)
    assert model.dash_start(1, special_bite_damage=200).damage == damage


def test_ownership_loss_invalidates_armed_rush(model):
    model.special(0)
    model.set_talents(Talents())
    model.set_talents(Talents(onslaught=Rarity.LEGENDARY))
    assert not model.dash_start(1).empowered


def test_failed_input_does_not_consume_rush(model):
    model.special(0)
    with pytest.raises(ValueError, match="bite damage"):
        model.dash_start(1)
    assert model.dash_start(1, special_bite_damage=100).empowered


def test_death_clears_transients_and_speed_but_does_not_reset_cooldown(model):
    assert end(model, model.dash_start(0)) is not None
    model.special(1)
    dash = model.dash_start(1, special_bite_damage=100)
    model.die(1.1)
    assert end(model, dash, 1.2) is None
    assert model.attack_speed_bonus(100, 100) == 0
    model.revive(2)
    dash = model.dash_start(2)
    assert not dash.empowered
    assert end(model, dash, 2.5) is None
    assert end(model, model.dash_start(6), 6.5) is not None


def test_new_run_cannot_accept_an_old_dash_completion(model):
    old = model.dash_start(0)
    model.new_run()
    assert model.talents == Talents()
    model.set_talents(Talents(seductive_provocation=True))
    new = model.dash_start(0)
    assert new.token != old.token
    assert end(model, old, .1) is None
    assert end(model, new, .2) is not None


def test_unowned_talents_leave_normal_dash(model):
    model.set_talents(Talents())
    model.special(0)
    dash = model.dash_start(1)
    assert not dash.empowered
    assert end(model, dash, 1.5) is None


def test_bad_time_or_overlapping_dash_is_rejected(model):
    model.dash_start(2)
    with pytest.raises(ValueError, match="backwards"):
        model.attack(1)
    with pytest.raises(ValueError, match="already dashing"):
        model.dash_start(3)


def test_balance_inputs_are_explicit_and_finite():
    with pytest.raises(ValueError):
        Rules(0, 4, (100, 125, 150, 175))
    with pytest.raises(ValueError):
        Rules(6, math.inf, (100, 125, 150, 175))
    with pytest.raises(ValueError):
        Rules(6, 4, (100, math.nan, 150, 175))
