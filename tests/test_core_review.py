"""scripts/core_review.py: glob matching, diff size, owner approval."""
from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location("core_review", ROOT / "scripts" / "core_review.py")
cr = importlib.util.module_from_spec(_spec)
sys.modules["core_review"] = cr
_spec.loader.exec_module(cr)

HEAD = "a" * 40
OLD = "b" * 40


def rx(*pats):
    return cr.compile_patterns(list(pats))


# --- globs ---------------------------------------------------------------

@pytest.mark.parametrize("pat,path,hit", [
    ("src/loader/lib/**", "src/loader/lib/rsmm.lua", True),
    ("src/loader/lib/**", "src/loader/lib/sub/x.lua", True),
    ("src/loader/lib/**", "src/loader/libx/rsmm.lua", False),
    ("src/loader/lib/**", "other/src/loader/lib/rsmm.lua", False),
    ("data/symbols.json", "data/symbols.json", True),
    ("data/symbols.json", "x/data/symbols.json", False),
    ("*.lua", "a/b/c.lua", True),          # no slash: any depth
    ("*.lua", "c.luax", False),
    ("/*.lua", "a/c.lua", False),          # leading slash: root only
    ("/*.lua", "c.lua", True),
    ("src/*.py", "src/a.py", True),
    ("src/*.py", "src/sub/a.py", False),   # * stops at "/"
    ("src/**/a.py", "src/a.py", True),     # **/ matches no directory
    ("src/**/a.py", "src/x/y/a.py", True),
    ("docs/", "docs/a/b.md", True),        # trailing slash: directory
    ("docs/", "docs", False),
    ("src/loader", "src/loader/lib/a.lua", True),  # directory name covers contents
    ("a?c", "abc", True),
    ("a?c", "a/c", False),
])
def test_glob(pat, path, hit):
    assert cr.is_core(path, rx(pat)) is hit


def test_backslash_and_dot_slash_paths_normalised():
    assert cr.is_core(".\\src\\loader\\lib\\x.lua", rx("src/loader/lib/**"))


def test_parse_patterns_skips_comments_and_rejects_negation():
    assert cr.parse_patterns("# c\n\n a/b \n") == ["a/b"]
    with pytest.raises(ValueError):
        cr.parse_patterns("!a/b\n")


def test_parse_sections_tags():
    allp, strict, bypass = cr.parse_sections(
        "a/**\n[no exemption]\n# c\nb.json\n[bypass]\nc/**\n[no exemption, bypass]\nd\n")
    assert allp == ["a/**", "b.json", "c/**", "d"]
    assert strict == ["b.json", "d"] and bypass == ["c/**", "d"]


@pytest.mark.parametrize("header", ["[other]", "[bypass, other]", "[]", "[bypass"])
def test_parse_sections_rejects_unknown_header(header):
    with pytest.raises(ValueError):
        cr.parse_sections(f"{header}\na\n")


def test_shipped_core_paths_load_and_match():
    r = cr.load_core_regexes()
    assert cr.is_core("src/loader/lib/rsmm.lua", r)
    assert cr.is_core("src/loader/lua/rsmm/camera.lua", r)
    assert cr.is_core("src/loader/src/hooks.cpp", r)
    assert not cr.is_core("src/rsmm/cli/json_bridge.py", r)
    assert not cr.is_core("src/rsmm/cli/apply_mods.py", r)
    assert not cr.is_core("src/rsmm/engine/terrain.py", r)
    assert not cr.is_core("data/contracts/r_surface.txt", r)
    s = cr.load_strict_regexes()
    assert cr.is_core("data/symbols.json", s)
    assert cr.is_core("src/loader/src/hooks.cpp", s)
    assert not cr.is_core("src/loader/lib/rsmm.lua", s)
    b = cr.load_bypass_regexes()
    assert cr.is_core("data/symbols.json", b)
    assert cr.is_core("src/loader/include/hook_ui.h", b)
    assert cr.is_core("src/loader/lib/engine_gen.lua", b)
    assert not cr.is_core("src/loader/lib/rsmm.lua", b)
    assert not cr.is_core("src/loader/lua/rsmm/camera.lua", b)


# --- assess (required / bypassable) ---------------------------------------

_CORE = rx("sdk/**", "native/**", "sym.json")
_STRICT = rx("native/**", "sym.json")
_BYPASS = rx("native/**", "sym.json", "sdk/*_gen.lua")


@pytest.mark.parametrize("numstat,breaking,required,bypassable", [
    ([("README.md", 50)], [], False, False),
    ([("sdk/a.lua", 2)], [], False, False),                    # within the exemption
    ([("native/h.cpp", 1)], [], True, True),                   # native only
    ([("sym.json", 40), ("sdk/engine_gen.lua", 30)], [], True, True),  # a remap
    ([("native/h.cpp", 1), ("sdk/a.lua", 2)], [], True, True),  # SDK part is exempt alone
    ([("native/h.cpp", 1), ("sdk/a.lua", 3)], [], True, False),  # SDK part needs review
    ([("sdk/a.lua", 30)], [], True, False),                    # SDK Lua is never bypassed
    ([("native/h.cpp", 1)], ["r_surface: R.x removed"], True, False),  # contract break
    ([], ["r_surface: R.x removed"], True, False),
])
def test_assess(numstat, breaking, required, bypassable):
    reasons, bp = cr.assess(numstat, breaking, _CORE, _STRICT, _BYPASS)
    assert bool(reasons) is required and bp is bypassable


# --- diff size -----------------------------------------------------------

def test_numstat_counts_added_plus_removed_and_binary():
    raw = "1\t1\tsrc/a.py\0-\t-\timg.png\0\n10\t0\tb\0"
    assert cr.parse_numstat(raw) == [("src/a.py", 2), ("img.png", 3), ("b", 10)]


def test_core_changes_filters_by_pattern():
    ns = [("src/loader/lib/a.lua", 2), ("README.md", 50)]
    assert cr.core_changes(ns, rx("src/loader/lib/**")) == [("src/loader/lib/a.lua", 2)]


# --- owners --------------------------------------------------------------

def test_parse_owners_logins_only():
    text = "# top\n* @Ovilli @Skigim\n/a/ @Ovilli @org/team me@x.io # @ghost\n"
    assert cr.parse_owners(text) == ["Ovilli", "Skigim"]


def test_missing_codeowners_means_no_owners(tmp_path):
    assert cr.read_owners(tmp_path / "CODEOWNERS") == []


# --- approval ------------------------------------------------------------

_id = iter(range(1, 1000))


def rv(user, state, commit=HEAD):
    return {"id": next(_id), "user": {"login": user}, "state": state, "commit_id": commit}


OWNERS = ["Ovilli", "Skigim"]


def test_owner_approval_of_head_passes():
    assert cr.approving_owners([rv("Ovilli", "APPROVED")], OWNERS, "someone", HEAD) == ["ovilli"]


def test_login_case_insensitive():
    assert cr.approving_owners([rv("ovilli", "APPROVED")], OWNERS, "x", HEAD)


def test_stale_sha_approval_fails():
    assert cr.approving_owners([rv("Ovilli", "APPROVED", OLD)], OWNERS, "x", HEAD) == []


def test_author_self_approval_fails():
    assert cr.approving_owners([rv("Skigim", "APPROVED")], OWNERS, "Skigim", HEAD) == []


def test_non_owner_approval_fails():
    assert cr.approving_owners([rv("rando", "APPROVED")], OWNERS, "x", HEAD) == []


def test_changes_requested_after_approval_cancels():
    reviews = [rv("Ovilli", "APPROVED"), rv("Ovilli", "CHANGES_REQUESTED")]
    assert cr.approving_owners(reviews, OWNERS, "x", HEAD) == []


def test_dismissed_after_approval_cancels():
    reviews = [rv("Ovilli", "APPROVED"), rv("Ovilli", "DISMISSED")]
    assert cr.approving_owners(reviews, OWNERS, "x", HEAD) == []


def test_comment_after_approval_keeps_it():
    reviews = [rv("Ovilli", "APPROVED"), rv("Ovilli", "COMMENTED")]
    assert cr.approving_owners(reviews, OWNERS, "x", HEAD) == ["ovilli"]


def test_approval_after_changes_requested_counts():
    reviews = [rv("Ovilli", "CHANGES_REQUESTED"), rv("Ovilli", "APPROVED")]
    assert cr.approving_owners(reviews, OWNERS, "x", HEAD) == ["ovilli"]


def test_other_owners_changes_requested_does_not_cancel_approval():
    reviews = [rv("Ovilli", "APPROVED"), rv("Skigim", "CHANGES_REQUESTED")]
    assert cr.approving_owners(reviews, OWNERS, "x", HEAD) == ["ovilli"]


def test_no_owners_fails_closed():
    assert cr.approving_owners([rv("Ovilli", "APPROVED")], [], "x", HEAD) == []


def test_deleted_user_review_ignored():
    r = {"id": 1, "user": None, "state": "APPROVED", "commit_id": HEAD}
    assert cr.approving_owners([r], OWNERS, "x", HEAD) == []


def test_paginated_output_parses():
    raw = json.dumps([{"id": 1}]) + json.dumps([{"id": 2}]) + "\n"
    assert cr.load_paginated(raw) == [{"id": 1}, {"id": 2}]


def test_cmd_approved_missing_codeowners_fails_closed(monkeypatch, capsys):
    monkeypatch.setattr(cr, "CODEOWNERS", Path("does-not-exist"))
    monkeypatch.setattr(cr, "_run", lambda cmd: json.dumps([rv("Ovilli", "APPROVED")]))
    assert cr.cmd_approved("o/n", 1, HEAD, "author") == 1
    assert "no owners" in capsys.readouterr().out


# --- bypass label ----------------------------------------------------------

def ev(event, actor, label=cr.BYPASS_LABEL):
    return {"id": next(_id), "event": event, "actor": {"login": actor}, "label": {"name": label}}


def test_bypass_applier_latest_label_event_wins():
    assert cr.bypass_applier([]) is None
    assert cr.bypass_applier([ev("labeled", "Ovilli")]) == "Ovilli"
    assert cr.bypass_applier([ev("labeled", "Ovilli"), ev("unlabeled", "Ovilli")]) is None
    assert cr.bypass_applier([ev("labeled", "Ovilli"), ev("unlabeled", "x"),
                              ev("labeled", "x")]) == "x"
    assert cr.bypass_applier([ev("labeled", "Ovilli", "other"),
                              {"id": next(_id), "event": "assigned"}]) is None


def _fake_gh(reviews, events):
    def run(cmd):
        return json.dumps(events if cmd[-1].endswith("/events") else reviews)
    return run


@pytest.mark.parametrize("author,events,bypass,code", [
    ("Ovilli", [ev("labeled", "Ovilli")], True, 0),     # owner bypasses own PR
    ("ovilli", [ev("labeled", "Ovilli")], True, 0),     # login case
    ("Ovilli", [ev("labeled", "Ovilli")], False, 1),    # change not bypassable
    ("Ovilli", [ev("labeled", "Skigim")], True, 1),     # another owner's label
    ("someone", [ev("labeled", "someone")], True, 1),   # author is not an owner
    ("someone", [ev("labeled", "Ovilli")], True, 1),    # owner labels another's PR
    ("Ovilli", [ev("labeled", "Ovilli"), ev("unlabeled", "Ovilli")], True, 1),
])
def test_cmd_approved_bypass(monkeypatch, capsys, author, events, bypass, code):
    monkeypatch.setattr(cr, "read_owners", lambda: OWNERS)
    monkeypatch.setattr(cr, "_run", _fake_gh([], events))
    assert cr.cmd_approved("o/n", 1, HEAD, author, allow_bypass=bypass) == code
    if code == 0:
        assert "bypassed" in capsys.readouterr().out


# --- audit -----------------------------------------------------------------

def test_audit_assignees_exclude_author():
    assert cr.audit_assignees(OWNERS, "ovilli") == ["Skigim"]
    assert cr.audit_assignees(OWNERS, "someone") == OWNERS


def test_audit_issue_names_pr_and_reasons():
    reasons = ["paths with no line exemption changed:", "  data/symbols.json (4)"]
    title, body = cr.audit_issue(7, "Remap", "https://x/7", "Ovilli", HEAD, reasons)
    assert title == "Post-merge core review: #7"
    assert "@Ovilli" in body and HEAD[:12] in body and "data/symbols.json (4)" in body


def _audit_gh(calls, reviews, existing=""):
    pr = {"user": {"login": "Ovilli"}, "head": {"sha": HEAD}, "title": "t", "html_url": "u"}

    def run(cmd):
        calls.append(cmd)
        if cmd[:3] == ["gh", "issue", "list"]:
            return existing
        if cmd[:3] == ["gh", "issue", "create"]:
            return "https://x/issues/9"
        if cmd[-1].endswith("/reviews"):
            return json.dumps(reviews)
        return json.dumps(pr)
    return run


@pytest.mark.parametrize("reasons,reviews,existing,opens", [
    (["x"], [], "", True),
    ([], [], "", False),                                   # needed no review
    (["x"], [rv("Skigim", "APPROVED")], "", False),        # approved at its head
    (["x"], [rv("Skigim", "APPROVED", OLD)], "", True),    # stale approval
    (["x"], [], "Post-merge core review: #5\n", False),    # issue already open
])
def test_cmd_audit(monkeypatch, reasons, reviews, existing, opens):
    calls = []
    monkeypatch.setattr(cr, "read_owners", lambda: OWNERS)
    monkeypatch.setattr(cr, "_assess_diff", lambda b, h: (reasons, True, []))
    monkeypatch.setattr(cr, "_run", _audit_gh(calls, reviews, existing))
    assert cr.cmd_audit("o/n", 5, "base", "head") == 0
    created = [c for c in calls if c[:3] == ["gh", "issue", "create"]]
    assert bool(created) is opens
    if opens:
        assert created[0][-2:] == ["--assignee", "Skigim"]


# --- required (real git repo) -------------------------------------------

def _git(cwd, *args):
    cfg = ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false"]
    subprocess.run(["git", *cfg, *args], cwd=cwd, check=True, capture_output=True)


@pytest.fixture
def repo(tmp_path, monkeypatch):
    (tmp_path / ".github").mkdir()
    (tmp_path / ".github" / "core-paths.txt").write_text("core/**\n", encoding="utf-8")
    (tmp_path / "scripts").mkdir()
    (tmp_path / "scripts" / "contract_pins.py").write_text("", encoding="utf-8")  # prints nothing
    (tmp_path / "core").mkdir()
    (tmp_path / "core" / "a.txt").write_text("1\n2\n3\n", encoding="utf-8")
    _git(tmp_path, "init", "-q", "-b", "main")
    _git(tmp_path, "add", "-A")
    _git(tmp_path, "commit", "-q", "-m", "base")
    monkeypatch.setattr(cr, "ROOT", tmp_path)
    monkeypatch.setattr(cr, "CORE_PATHS", tmp_path / ".github" / "core-paths.txt")
    return tmp_path


def _commit(repo, text):
    (repo / "core" / "a.txt").write_text(text, encoding="utf-8")
    _git(repo, "commit", "-q", "-am", "change")


def test_required_small_core_change_exempt(repo, capsys):
    _git(repo, "checkout", "-q", "-b", "pr")
    _commit(repo, "1\n2\nX\n")  # 1 added + 1 removed = 2
    assert cr.cmd_required("main", "pr") == 0
    assert "not required" in capsys.readouterr().out


def test_required_large_core_change(repo, capsys):
    _git(repo, "checkout", "-q", "-b", "pr")
    _commit(repo, "X\nY\nZ\n")  # 6
    assert cr.cmd_required("main", "pr") == 0
    out = capsys.readouterr().out
    assert out.startswith("owner review required") and "core/a.txt (6)" in out


def test_required_one_line_in_no_exemption_path(repo, capsys):
    (repo / ".github" / "core-paths.txt").write_text(
        "core/**\n[no exemption]\ncore/a.txt\n", encoding="utf-8")
    _git(repo, "commit", "-q", "-am", "strict")
    _git(repo, "checkout", "-q", "-b", "pr")
    _commit(repo, "1\n2\n3\n4\n")  # 1 line only
    cr.cmd_required("main", "pr")
    out = capsys.readouterr().out
    assert out.startswith("owner review required") and "no line exemption" in out


def test_required_writes_bypassable_output(repo, tmp_path_factory, monkeypatch, capsys):
    (repo / ".github" / "core-paths.txt").write_text(
        "[no exemption, bypass]\ncore/a.txt\n", encoding="utf-8")
    _git(repo, "commit", "-q", "-am", "bypass")
    _git(repo, "checkout", "-q", "-b", "pr")
    _commit(repo, "1\n2\n3\n4\n")
    out_file = tmp_path_factory.mktemp("gh") / "output"
    monkeypatch.setenv("GITHUB_OUTPUT", str(out_file))
    cr.cmd_required("main", "pr")
    assert out_file.read_text(encoding="utf-8").splitlines() == ["required=true", "bypassable=true"]
    assert "core-bypass" in capsys.readouterr().out


def test_required_non_core_change_ignored(repo, capsys):
    _git(repo, "checkout", "-q", "-b", "pr")
    (repo / "other.txt").write_text("\n".join("x" * 10 for _ in range(50)), encoding="utf-8")
    _git(repo, "add", "-A")
    _git(repo, "commit", "-q", "-m", "other")
    cr.cmd_required("main", "pr")
    assert "not required" in capsys.readouterr().out


def test_required_when_pins_report_breaking(repo, capsys):
    (repo / "scripts" / "contract_pins.py").write_text(
        "print('r_surface: R.x removed')\n", encoding="utf-8")
    _git(repo, "checkout", "-q", "-b", "pr")
    _commit(repo, "1\n2\n3\n4\n")  # 1 line only
    cr.cmd_required("main", "pr")
    out = capsys.readouterr().out
    assert out.startswith("owner review required") and "R.x removed" in out
