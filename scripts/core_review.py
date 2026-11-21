"""Owner-review gate for core changes (the `core review` CI job).

  required  --base SHA --head SHA          is owner review needed for this diff?
  approved  --repo O/N --pr N --head SHA   has an owner approved this head?
            [--allow-bypass]               (or has its owner author bypassed it?)
  audit     --repo O/N --pr N --base SHA --head SHA
                                           open a post-merge review issue
  match     --files-from FILE              which listed paths are core?
  owners    [--exclude LOGIN]              logins from .github/CODEOWNERS

Core paths live in .github/core-paths.txt (the glob rules are in that file's
header). Review is required when `contract_pins.py breaking` prints anything
or when core files change by more than EXEMPT_LINES lines in total, or when
any path tagged `no exemption` changes at all.

The review is bypassable when everything that requires it is under paths
tagged `bypass`: nothing breaking, and the other core paths would not need
review on their own. A code owner bypasses their own PR with the
BYPASS_LABEL label; the label counts only when the PR's author applied it.
A PR merged into main that needed review without an owner's approval of its
head gets an issue (`audit`), assigned to the other owners.
Stdlib only.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORE_PATHS = ROOT / ".github" / "core-paths.txt"
CODEOWNERS = ROOT / ".github" / "CODEOWNERS"
EXEMPT_LINES = 2
BYPASS_LABEL = "core-bypass"
AUDIT_TITLE = "Post-merge core review: #{pr}"

_LOGIN_RE = re.compile(r"^@([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)$")


# --- core paths --------------------------------------------------------------

SECTION_TAGS = ("no exemption", "bypass")


def parse_sections(text: str) -> tuple[list[str], list[str], list[str]]:
    """-> (every core pattern, those tagged `no exemption`, those tagged `bypass`).

    A header line such as ``[no exemption, bypass]`` tags the patterns below it,
    up to the next header.
    """
    out, strict, bypass, tags = [], [], [], set()
    for n, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("["):
            tags = {t.strip() for t in line.strip("[]").split(",")}
            if not line.endswith("]") or not tags <= set(SECTION_TAGS):
                raise ValueError(f"core-paths line {n}: unknown section: {line}")
            continue
        if line.startswith("!"):
            raise ValueError(f"core-paths line {n}: negation is not supported: {line}")
        out.append(line)
        if "no exemption" in tags:
            strict.append(line)
        if "bypass" in tags:
            bypass.append(line)
    return out, strict, bypass


def parse_patterns(text: str) -> list[str]:
    return parse_sections(text)[0]


def _glob_to_regex(pat: str) -> re.Pattern[str]:
    dir_only = pat.endswith("/")
    anchored = pat.startswith("/") or "/" in pat.rstrip("/")
    pat = pat.strip("/")
    i, out = 0, []
    while i < len(pat):
        if pat.startswith("**/", i):
            out.append("(?:.*/)?")
            i += 3
        elif pat.startswith("**", i):
            out.append(".*")
            i += 2
        elif pat[i] == "*":
            out.append("[^/]*")
            i += 1
        elif pat[i] == "?":
            out.append("[^/]")
            i += 1
        else:
            out.append(re.escape(pat[i]))
            i += 1
    body = "".join(out)
    prefix = "" if anchored else "(?:.*/)?"
    # A match on a directory covers everything below it.
    tail = "/.*$" if dir_only else "(?:/.*)?$"
    return re.compile(f"^{prefix}{body}{tail}")


def compile_patterns(patterns: list[str]) -> list[re.Pattern[str]]:
    return [_glob_to_regex(p) for p in patterns]


def is_core(path: str, regexes: list[re.Pattern[str]]) -> bool:
    path = path.replace("\\", "/")
    if path.startswith("./"):
        path = path[2:]
    return any(r.match(path) for r in regexes)


def load_core_regexes(path: Path | None = None) -> list[re.Pattern[str]]:
    return compile_patterns(parse_patterns((path or CORE_PATHS).read_text(encoding="utf-8")))


def load_strict_regexes(path: Path | None = None) -> list[re.Pattern[str]]:
    return compile_patterns(parse_sections((path or CORE_PATHS).read_text(encoding="utf-8"))[1])


def load_bypass_regexes(path: Path | None = None) -> list[re.Pattern[str]]:
    return compile_patterns(parse_sections((path or CORE_PATHS).read_text(encoding="utf-8"))[2])


# --- diff size ---------------------------------------------------------------

def parse_numstat(raw: str) -> list[tuple[str, int]]:
    """``git diff --numstat -z --no-renames`` -> [(path, changed lines)].

    A binary file counts as more than the exemption allows.
    """
    out = []
    for rec in raw.split("\0"):
        if not rec.strip():
            continue
        added, deleted, path = rec.lstrip("\n").split("\t", 2)
        n = EXEMPT_LINES + 1 if added == "-" else int(added) + int(deleted)
        out.append((path, n))
    return out


def core_changes(numstat: list[tuple[str, int]],
                 regexes: list[re.Pattern[str]]) -> list[tuple[str, int]]:
    return [(p, n) for p, n in numstat if is_core(p, regexes)]


def assess(numstat: list[tuple[str, int]], breaking: list[str],
           core_re: list[re.Pattern[str]], strict_re: list[re.Pattern[str]],
           bypass_re: list[re.Pattern[str]]) -> tuple[list[str], bool]:
    """-> (why owner review is required, [] if it is not; may it be bypassed?)."""
    core = core_changes(numstat, core_re)
    total = sum(n for _, n in core)
    strict = core_changes(core, strict_re)
    reasons = []
    if breaking:
        reasons.append("breaking contract changes:")
        reasons += [f"  {ln}" for ln in breaking]
    if strict:
        reasons.append("paths with no line exemption changed:")
        reasons += [f"  {p} ({n})" for p, n in strict]
    if total > EXEMPT_LINES:
        reasons.append(f"core files changed by {total} lines (limit {EXEMPT_LINES}):")
        reasons += [f"  {p} ({n})" for p, n in core]
    # Would the paths outside `bypass` need review on their own?
    rest = [(p, n) for p, n in core if not is_core(p, bypass_re)]
    rest_needs = bool(core_changes(rest, strict_re)) or sum(n for _, n in rest) > EXEMPT_LINES
    return reasons, bool(reasons) and not breaking and not rest_needs


# --- owners and approval -----------------------------------------------------

def parse_owners(text: str) -> list[str]:
    """User logins named in CODEOWNERS (teams and e-mail owners are skipped)."""
    seen: dict[str, None] = {}
    for raw in text.splitlines():
        for tok in raw.split("#", 1)[0].split():
            m = _LOGIN_RE.match(tok)
            if m:
                seen.setdefault(m.group(1), None)
    return list(seen)


def read_owners(path: Path | None = None) -> list[str]:
    path = path or CODEOWNERS
    if not path.is_file():
        return []
    return parse_owners(path.read_text(encoding="utf-8"))


def approving_owners(reviews: list[dict], owners: list[str], author: str,
                     head: str) -> list[str]:
    """Owners (not the author) whose latest non-comment review approves ``head``."""
    owner_set = {o.lower() for o in owners}
    author = (author or "").lower()
    latest: dict[str, dict] = {}
    for rv in sorted(reviews, key=lambda r: r.get("id", 0)):
        user = ((rv.get("user") or {}).get("login") or "").lower()
        # PENDING reviews are drafts; COMMENTED never changes a verdict.
        if not user or rv.get("state") in ("COMMENTED", "PENDING"):
            continue
        latest[user] = rv
    return [
        user for user, rv in latest.items()
        if user in owner_set and user != author
        and rv.get("state") == "APPROVED" and rv.get("commit_id") == head
    ]


def bypass_applier(events: list[dict], label: str = BYPASS_LABEL) -> str | None:
    """Login that applied ``label``, if it is still on the PR (issue events)."""
    who = None
    for ev in sorted(events, key=lambda e: e.get("id", 0)):
        if (ev.get("label") or {}).get("name") != label:
            continue
        if ev.get("event") == "labeled":
            who = (ev.get("actor") or {}).get("login")
        elif ev.get("event") == "unlabeled":
            who = None
    return who


def audit_assignees(owners: list[str], author: str) -> list[str]:
    """Owners other than the author (every owner when the author is not one)."""
    return [o for o in owners if o.lower() != (author or "").lower()]


def audit_issue(pr: int, title: str, url: str, author: str, head: str,
                reasons: list[str]) -> tuple[str, str]:
    body = "\n".join([
        f"#{pr} ([{title}]({url})) by @{author} merged without an owner's approval "
        f"of its head `{head[:12]}`. It needed one because:",
        "",
        "```",
        *reasons,
        "```",
        "",
        "Review the merged change, then close this issue or link the fix here.",
    ])
    return AUDIT_TITLE.format(pr=pr), body


def load_paginated(raw: str) -> list[dict]:
    """``gh api --paginate`` prints one JSON array per page, back to back."""
    dec, idx, out = json.JSONDecoder(), 0, []
    raw = raw.strip()
    while idx < len(raw):
        val, idx = dec.raw_decode(raw, idx)
        out.extend(val if isinstance(val, list) else [val])
        while idx < len(raw) and raw[idx].isspace():
            idx += 1
    return out


# --- git / gh ----------------------------------------------------------------

def _run(cmd: list[str]) -> str:
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", cwd=ROOT)
    if r.returncode != 0:
        sys.exit(f"{' '.join(cmd)} failed:\n{r.stderr.strip()}")
    return r.stdout


def _set_output(key: str, value: str) -> None:
    path = os.environ.get("GITHUB_OUTPUT")
    if path:
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(f"{key}={value}\n")


# --- commands ----------------------------------------------------------------

def _assess_diff(base: str, head: str) -> tuple[list[str], bool, list[tuple[str, int]]]:
    # Compare against where the branch left the base, like `git diff base...head`;
    # the contract snapshots are read from the working tree (the head checkout).
    fork = _run(["git", "merge-base", base, head]).strip()
    breaking = _run([sys.executable, str(ROOT / "scripts" / "contract_pins.py"),
                     "breaking", "--base", fork]).splitlines()
    numstat = parse_numstat(_run(["git", "diff", "--numstat", "-z", "--no-renames",
                                  f"{fork}...{head}"]))
    core_re = load_core_regexes()
    reasons, bypassable = assess(numstat, breaking, core_re, load_strict_regexes(),
                                 load_bypass_regexes())
    return reasons, bypassable, core_changes(numstat, core_re)


def cmd_required(base: str, head: str) -> int:
    reasons, bypassable, core = _assess_diff(base, head)
    total = sum(n for _, n in core)
    _set_output("required", "true" if reasons else "false")
    _set_output("bypassable", "true" if bypassable else "false")
    if reasons:
        print("owner review required")
        print("\n".join(reasons))
        if bypassable:
            print(f"bypassable: a code owner who authored this PR may apply the "
                  f"{BYPASS_LABEL} label instead")
    else:
        print(f"owner review not required: {total} core line(s) changed "
              f"(limit {EXEMPT_LINES}), nothing breaking")
        for p, n in core:
            print(f"  {p} ({n})")
    return 0


def cmd_approved(repo: str, pr: int, head: str, author: str | None,
                 allow_bypass: bool = False) -> int:
    owners = read_owners()
    if author is None:
        author = _run(["gh", "api", f"repos/{repo}/pulls/{pr}", "--jq", ".user.login"]).strip()
    reviews = load_paginated(_run(["gh", "api", "--paginate", f"repos/{repo}/pulls/{pr}/reviews"]))
    ok = approving_owners(reviews, owners, author, head)
    if ok:
        print(f"approved at {head[:12]} by {', '.join(ok)}")
        return 0
    if allow_bypass and author.lower() in {o.lower() for o in owners}:
        events = load_paginated(_run(["gh", "api", "--paginate",
                                      f"repos/{repo}/issues/{pr}/events"]))
        applier = bypass_applier(events)
        if applier and applier.lower() == author.lower():
            print(f"bypassed by @{author} with the {BYPASS_LABEL} label; an issue for "
                  f"the other owners' review opens when this merges into main")
            return 0
    eligible = [f"@{o}" for o in owners if o.lower() != author.lower()]
    who = " or ".join(eligible) or "nobody (no owners in .github/CODEOWNERS)"
    print(f"owner review required: approval of {head[:12]} from {who} is needed. "
          f"The author (@{author}) cannot approve their own PR, and a new push "
          f"needs a fresh approval.")
    if allow_bypass:
        print(f"This change is bypassable: a code owner who authored it may apply "
              f"the {BYPASS_LABEL} label instead.")
    return 1


def cmd_audit(repo: str, pr: int, base: str, head: str) -> int:
    reasons, _, _ = _assess_diff(base, head)
    if not reasons:
        print(f"#{pr} needed no owner review")
        return 0
    info = json.loads(_run(["gh", "api", f"repos/{repo}/pulls/{pr}"]))
    author, pr_head = info["user"]["login"], info["head"]["sha"]
    owners = read_owners()
    reviews = load_paginated(_run(["gh", "api", "--paginate", f"repos/{repo}/pulls/{pr}/reviews"]))
    ok = approving_owners(reviews, owners, author, pr_head)
    if ok:
        print(f"#{pr} was approved at {pr_head[:12]} by {', '.join(ok)}")
        return 0
    title, body = audit_issue(pr, info["title"], info["html_url"], author, pr_head, reasons)
    found = _run(["gh", "issue", "list", "--repo", repo, "--state", "all",
                  "--search", f'"{title}" in:title', "--json", "title", "--jq", ".[].title"])
    if title in found.splitlines():
        print(f"an issue titled {title!r} already exists")
        return 0
    cmd = ["gh", "issue", "create", "--repo", repo, "--title", title, "--body", body]
    for login in audit_assignees(owners, author):
        cmd += ["--assignee", login]
    print(_run(cmd).strip())
    return 0


def cmd_match(files_from: Path) -> int:
    regexes = load_core_regexes()
    for line in files_from.read_text(encoding="utf-8").splitlines():
        if line.strip() and is_core(line.strip(), regexes):
            print(line.strip())
    return 0


def cmd_owners(exclude: str | None) -> int:
    for o in read_owners():
        if not exclude or o.lower() != exclude.lower():
            print(o)
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("required")
    p.add_argument("--base", required=True)
    p.add_argument("--head", required=True)
    p = sub.add_parser("approved")
    p.add_argument("--repo", required=True)
    p.add_argument("--pr", required=True, type=int)
    p.add_argument("--head", required=True)
    p.add_argument("--author", help="PR author login (default: read from the PR)")
    p.add_argument("--allow-bypass", action="store_true",
                   help=f"accept the {BYPASS_LABEL} label from an owner who authored the PR")
    p = sub.add_parser("audit")
    p.add_argument("--repo", required=True)
    p.add_argument("--pr", required=True, type=int)
    p.add_argument("--base", required=True)
    p.add_argument("--head", required=True)
    p = sub.add_parser("match")
    p.add_argument("--files-from", required=True, type=Path)
    p = sub.add_parser("owners")
    p.add_argument("--exclude", help="login to leave out (the PR author)")
    args = ap.parse_args(argv)
    if args.cmd == "required":
        return cmd_required(args.base, args.head)
    if args.cmd == "approved":
        return cmd_approved(args.repo, args.pr, args.head, args.author, args.allow_bypass)
    if args.cmd == "audit":
        return cmd_audit(args.repo, args.pr, args.base, args.head)
    if args.cmd == "match":
        return cmd_match(args.files_from)
    return cmd_owners(args.exclude)


if __name__ == "__main__":
    sys.exit(main())
