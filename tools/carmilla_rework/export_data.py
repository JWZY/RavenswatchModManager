"""Export Carmilla research data without applying a mod or launching the game.

Run from a checkout with Python 3.11+. Produces a new ZIP containing selected
pristine assets, hashes, component fields/links, and a list of unresolved inputs.
It never reads saves, invokes apply, changes the asset map, or overwrites a ZIP.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import struct
import sys
import zipfile
from collections import deque
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))

from rsmm.engine import corpus  # noqa: E402
from rsmm.engine import entity_components as EC  # noqa: E402
from rsmm.engine import entity_fields as EF  # noqa: E402
from rsmm.engine import entity_graph as EG  # noqa: E402
from rsmm.engine import talent_values as TV  # noqa: E402
from rsmm.engine.paths import BACKUP_SUFFIX  # noqa: E402

ENTITY = ".entity.ot.EntitySettingsResource.gen"
CARMILLA = "EntitySettings/Heroes/Hero_Carmilla/"
MAIN = CARMILLA + "Hero_Carmilla" + ENTITY
COMMON = "EntitySettings/Heroes/Hero_Common/Hero_Common" + ENTITY
CHARACTER = "EntitySettings/Character_Common/Character_Common" + ENTITY
TEXT = "Text/Hero_Carmilla_Common~GAM.xls.LocalText.gen"
PREFIXES = (CARMILLA, "EntitySettings/Heroes/Hero_Common/",
            "EntitySettings/Character_Common/")
FOCUS = {
    "seductive_provocation": ("dash taunt", "dash", "seduc"),
    "blood_reserve": ("blood", "basic attack speed"),
    "onslaught": ("attack special rush", "secondary", "special rush"),
}
PARSE_ERRORS = (ValueError, IndexError, KeyError, struct.error, UnicodeError)


def safe_rel(rel: str) -> str:
    rel = rel.replace("\\", "/")
    path = PurePosixPath(rel)
    if (path.is_absolute() or not rel or ":" in rel
            or any(part in ("", ".", "..") for part in rel.split("/"))):
        raise ValueError(f"unsafe resource path: {rel!r}")
    if path.parts[0] not in ("EntitySettings", "Definitions", "Text"):
        raise ValueError(f"not a gameplay resource path: {rel!r}")
    return rel


@dataclass(frozen=True)
class Source:
    mode: str
    root: Path

    def path(self, rel: str) -> Path | None:
        rel = safe_rel(rel)
        path = corpus.mirror_path(rel) if self.mode == "mirror" else corpus.install_path(rel)
        if path is None:
            return None
        if not path.resolve().is_relative_to(self.root.resolve()):
            raise ValueError(f"resource escapes the selected source: {rel}")
        return path

    def read(self, rel: str) -> tuple[bytes, dict] | None:
        path = self.path(rel)
        if path is None:
            return None
        # corpus selected the pristine backup for an install. Do not fall back
        # to a modified live file if that backup exists but cannot be read.
        raw = path.read_bytes()
        return raw, {"source": self.mode, "backup": path.name.endswith(BACKUP_SUFFIX),
                     "size": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}


def select_source(game_dir: Path | None, mirror: Path | None) -> Source:
    if mirror is not None:
        mirror = mirror.expanduser().resolve()
        if not mirror.is_dir():
            raise ValueError("--corpus must be an extracted corpus directory")
        corpus.UNCOOKED = mirror
        return Source("mirror", mirror)
    if game_dir is not None:
        game_dir = game_dir.expanduser().resolve()
        if not (game_dir / "DarkTalesResources/_Cooking").is_dir():
            raise ValueError("--game-dir must contain DarkTalesResources/_Cooking")
        os.environ["RSMM_GAME_DIR"] = str(game_dir)
        return Source("install", game_dir)
    if corpus.UNCOOKED.is_dir():
        return Source("mirror", corpus.UNCOOKED.resolve())
    cooking = corpus.cooking_dir()
    if cooking is not None:
        return Source("install", cooking.parent.parent.resolve())
    raise ValueError("No game assets found. Supply --game-dir or --corpus. No ZIP was created.")


def inspect_entity(raw: bytes, rel: str) -> tuple[dict, list[str], list[str]]:
    """Keep each update layer separate; never guess which override wins."""
    name = PurePosixPath(rel).name.removesuffix(ENTITY)
    graph = EG.parse(raw, name)
    if not graph.components:
        raise ValueError("no components decoded")
    warnings = []
    try:
        parents = EC.parents(raw)
    except PARSE_ERRORS as exc:
        parents = []
        warnings.append(f"{rel}: could not decode parents ({exc})")
    components = []
    for c in graph.components:
        row = {
            "index": c.index, "name": c.name, "group": c.group, "class": c.cls,
            "guid": c.guid.hex(), "flags": c.flags,
            "override": {"guid": c.override.guid.hex(), "path": c.override.path}
            if c.override else None,
            "references": [{"guid": r.guid.hex(), "path": r.path, "scope": r.scope}
                           for r in c.refs],
            "literals": c.literals,
        }
        try:
            row["fields"] = [asdict(f) for f in EF.fields(c)]
            if c.cls.endswith("ValueSelectorSettings"):
                row["numeric_unions"] = [
                    {"index": i, "offset": off, "value": value, "type": kind}
                    for i, (off, value, kind) in enumerate(TV.list_union_values(raw, c.name))]
        except PARSE_ERRORS as exc:
            row["decode_error"] = str(exc)
            warnings.append(f"{rel}: incomplete field decode for {c.name}")
        components.append(row)
    return {"scope": name, "parents": parents, "components": components,
            "authored_values": [asdict(v) for v in TV.list_talent_values(
                raw, include_spawner=True)]}, parents, warnings


def _json(data) -> str:
    # A raw numeric field can contain NaN/Inf; retain it explicitly as text
    # instead of emitting invalid JSON or losing the rest of the inspection.
    def finite(value):
        if isinstance(value, float) and not math.isfinite(value):
            return str(value)
        if isinstance(value, dict):
            return {k: finite(v) for k, v in value.items()}
        if isinstance(value, list | tuple):
            return [finite(v) for v in value]
        return value
    return json.dumps(finite(data), indent=2, ensure_ascii=True, allow_nan=False) + "\n"


def collect(source: Source, app_settings: Path | None = None) -> tuple[dict, dict[str, bytes]]:
    first = source.read(MAIN)
    if first is None:
        raise ValueError("Carmilla's main entity is missing from this source. No ZIP was created.")
    selected = {MAIN, COMMON, CHARACTER, TEXT, TEXT + ".LangEN"}
    for prefix in PREFIXES:
        selected.update(corpus.rels(prefix, ".gen"))
    # A mirror's rels() walks directories, not filename-prefix globs.
    selected.update(rel for rel in corpus.rels("Definitions/Heroes/", ".gen")
                    if PurePosixPath(rel).name.startswith("Carmilla"))
    todo = deque(sorted(selected))
    visited: set[str] = set()
    assets: dict[str, bytes] = {}
    inventory: dict[str, dict] = {}
    entities: dict[str, dict] = {}
    missing: list[str] = []
    warnings: list[str] = []
    while todo:
        rel = safe_rel(todo.popleft())
        if rel in visited:
            continue
        visited.add(rel)
        try:
            found = first if rel == MAIN else source.read(rel)
        except OSError as exc:
            missing.append(rel)
            warnings.append(f"{rel}: unreadable ({exc.__class__.__name__})")
            continue
        if found is None:
            missing.append(rel)
            continue
        raw, info = found
        assets["corpus/" + rel] = raw
        inventory[rel] = info
        if not rel.endswith(ENTITY):
            continue
        try:
            graph, parents, notes = inspect_entity(raw, rel)
            entities[rel] = graph
            warnings.extend(notes)
            for parent in parents:
                parent = parent.replace("\\", "/")
                if parent.endswith(".entity.ot"):
                    todo.append(safe_rel("EntitySettings/" + parent
                                         + ".EntitySettingsResource.gen"))
        except PARSE_ERRORS as exc:
            warnings.append(f"{rel}: entity inspection incomplete ({exc})")

    settings = app_settings
    if settings is None and source.mode == "install":
        settings = source.root / "DarkTalesResources/ApplicationSettings.ot"
    if settings is not None:
        settings = settings.expanduser().resolve()
        allowed = ("ApplicationSettings.ot", "ApplicationSettings.ot" + BACKUP_SUFFIX)
        if settings.name not in allowed:
            raise ValueError("--app-settings must name ApplicationSettings.ot or its RSMM backup")
        backup = settings.with_name(settings.name + BACKUP_SUFFIX)
        settings = backup if backup.exists() else settings
        if settings.is_file():
            data = settings.read_bytes()
            assets["application_settings/ApplicationSettings.ot"] = data
            inventory["ApplicationSettings.ot"] = {
                "backup": settings.name.endswith(BACKUP_SUFFIX), "size": len(data),
                "sha256": hashlib.sha256(data).hexdigest(), "source": "application settings"}
        else:
            missing.append("ApplicationSettings.ot")
    else:
        missing.append("ApplicationSettings.ot")
    if not any(r.startswith("Definitions/Heroes/Carmilla") for r in inventory):
        missing.append("Definitions/Heroes/Carmilla*.herodef.ot.DtHeroDefinition.gen")

    focus = {key: [] for key in FOCUS}
    incoming: dict[str, list[dict]] = {}
    external_scopes: set[str] = set()
    scopes = {g["scope"] for g in entities.values()}
    for rel, graph in entities.items():
        for c in graph["components"]:
            where = {"file": rel, "component": c["name"], "guid": c["guid"]}
            label = (c["group"] + " " + c["name"]).lower()
            for key, words in FOCUS.items():
                if any(word in label for word in words):
                    focus[key].append(where)
            for ref in c["references"]:
                incoming.setdefault(ref["guid"], []).append(where)
                if ref["scope"] and ref["scope"] not in scopes:
                    external_scopes.add(ref["scope"])
    report = {
        "schema_version": 1,
        "status": "needs_more_data" if missing or warnings else "collected_unverified",
        "created_utc": datetime.now(UTC).isoformat(),
        "notice": ("Research bundle, not a mod. "
                   "Individual layers are not an effective merged graph."),
        "source_mode": source.mode,
        "files": inventory, "missing": sorted(set(missing)), "warnings": warnings,
        "external_scopes_not_collected": sorted(external_scopes),
        "candidate_components_not_verified_bindings": focus,
        "entities": entities, "incoming_references_by_guid": incoming,
    }
    return report, assets


def write_bundle(output: Path, source: Source, report: dict, assets: dict[str, bytes]) -> None:
    output = output.expanduser().resolve()
    if output.suffix.lower() != ".zip":
        raise ValueError("--output must end in .zip")
    protected = [source.root.resolve(), (ROOT / "data").resolve(), (ROOT / "mods").resolve()]
    cooking = corpus.cooking_dir()
    if cooking is not None:
        protected.append(cooking.parent.parent.resolve())
    if any(output.is_relative_to(root) for root in protected):
        raise ValueError("write the research ZIP outside the game, source corpus, data, and mods")
    # All member names are constructed locally; validate even when called as a library.
    for member in assets:
        if member == "application_settings/ApplicationSettings.ot":
            continue
        if not member.startswith("corpus/"):
            raise ValueError("unexpected archive member")
        safe_rel(member.removeprefix("corpus/"))
    encoded_report = _json(report)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("xb") as stream:  # never replace a previous inspection
        try:
            with zipfile.ZipFile(stream, "w", compression=zipfile.ZIP_DEFLATED) as archive:
                archive.writestr("inspection.json", encoded_report)
                archive.writestr("README.txt", (
                    "Carmilla research export — not an installable mod.\n"
                    "See inspection.json for missing files, parse warnings, and SHA-256 hashes.\n"
                    "corpus/ contains the selected original resources; no saves are included.\n"
                    "A backup may predate a game update; compare the recorded asset hashes.\n"
                    "Candidate matches are search results, not verified gameplay bindings.\n"))
                for member, raw in sorted(assets.items()):
                    archive.writestr(member, raw)
        except (OSError, ValueError, RuntimeError):
            # On Windows the stream must be closed before deleting a partial ZIP.
            stream.close()
            output.unlink(missing_ok=True)
            raise


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--game-dir", type=Path)
    group.add_argument("--corpus", type=Path, help="extracted directory containing EntitySettings")
    parser.add_argument("--app-settings", type=Path,
                        help="ApplicationSettings.ot for an extracted corpus; backup preferred")
    parser.add_argument("--output", type=Path, required=True, help="new research ZIP outside game")
    args = parser.parse_args(argv)
    try:
        source = select_source(args.game_dir, args.corpus)
        report, assets = collect(source, args.app_settings)
        write_bundle(args.output, source, report, assets)
    except (OSError, ValueError) as exc:
        print(f"Carmilla inspection: {exc}", file=sys.stderr)
        return 2
    print(f"Wrote {args.output}: {len(assets)} files, {len(report['entities'])} entity graphs.")
    print(f"Status: {report['status']}; missing: {len(report['missing'])}; "
          f"warnings: {len(report['warnings'])}.")
    return 1 if report["status"] == "needs_more_data" else 0


if __name__ == "__main__":
    raise SystemExit(main())
