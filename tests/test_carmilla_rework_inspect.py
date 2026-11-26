"""The inspector must preserve inputs and expose missing/undecoded data honestly."""

import hashlib
import json
import math
import struct
import subprocess
import sys
import zipfile
from pathlib import Path

import pytest

from rsmm.engine import cooked, corpus
from tools.carmilla_rework import export_data as inspect_mod


def entity(label="Skill Passive Blood Reserve Value", amount=.2, *, override=False):
    """Small synthetic cooked graph; intentionally has no real inheritance root."""
    classes = [cooked.ClassDef(n, i + 1, 1, 0, 0) for i, n in enumerate([
        "oCEntityCpntValueSettings", "oCEntityCpntPicker", "oCEntityCpntValuePicker",
        "oCEntityValueUnion"])]

    def lstr(text):
        data = text.encode("ascii")
        return struct.pack("<I", len(data)) + data

    def obj(index, data):
        return cooked.MARK_BEGIN + struct.pack("<I", index) + data + cooked.MARK_END

    original = "[Value] Hero_Carmilla\\Skill Passive Blood Reserve\\" + label
    ref = b"A" * 16 + lstr(original) if override else bytes(16) + lstr("")
    body = bytes(7) + obj(2, b"\0" + obj(3, struct.pack("<IIf", 0, 0, amount))) + b"\0"
    node = (struct.pack("<I", 0) + obj(1, ref) + b"B" * 16 + lstr(label)
            + struct.pack("<I", 1) + lstr("Skill Passive Blood Reserve") + body)
    cf = cooked.CookedFile(variant="A", hdr_a=0x10, flags=1, extra=0, type_tag=0x31,
                          classes=classes,
                          sections=[cooked.Section(payload=bytes(4)),
                                    cooked.Section(payload=node), cooked.Section(payload=bytes(4))])
    return cooked.emit(cf)


@pytest.fixture
def source(tmp_path, monkeypatch):
    mirror = tmp_path / "mirror"
    mirror.mkdir()
    monkeypatch.setattr(corpus, "UNCOOKED", mirror)
    monkeypatch.setattr(corpus, "cooking_dir", lambda: None)
    p = mirror / inspect_mod.MAIN
    p.parent.mkdir(parents=True)
    p.write_bytes(entity())
    return inspect_mod.Source("mirror", mirror)


def snapshot(root):
    return {p.relative_to(root).as_posix(): (p.read_bytes(), p.stat().st_mtime_ns)
            for p in root.rglob("*") if p.is_file()}


def test_bundle_decodes_real_fields_keeps_raw_hashes_and_does_not_touch_source(source, tmp_path):
    # A nearby save must never be selected.
    save = source.root / "_Save/Profile_1.ob"
    save.parent.mkdir()
    save.write_bytes(b"do not collect me")
    before = snapshot(source.root)
    report, assets = inspect_mod.collect(source)
    graph = report["entities"][inspect_mod.MAIN]
    assert graph["components"][0]["name"] == "Skill Passive Blood Reserve Value"
    assert any(f["name"] == "value" for f in graph["components"][0]["fields"])
    assert report["candidate_components_not_verified_bindings"]["blood_reserve"]
    assert "ApplicationSettings.ot" in report["missing"]
    assert report["warnings"]  # synthetic fixture has no real parent table
    output = tmp_path / "inspection.zip"
    inspect_mod.write_bundle(output, source, report, assets)
    with zipfile.ZipFile(output) as archive:
        data = archive.read("corpus/" + inspect_mod.MAIN)
        saved = json.loads(archive.read("inspection.json"))
        assert hashlib.sha256(data).hexdigest() == saved["files"][inspect_mod.MAIN]["sha256"]
        assert not any("_Save" in member for member in archive.namelist())
    assert snapshot(source.root) == before


def test_update_layers_and_override_identity_are_preserved_separately(source):
    update = inspect_mod.CARMILLA + "Hero_Carmilla_Update6" + inspect_mod.ENTITY
    (source.root / update).write_bytes(entity(amount=.5, override=True))
    report, _ = inspect_mod.collect(source)
    assert report["entities"][inspect_mod.MAIN]["components"][0]["override"] is None
    override = report["entities"][update]["components"][0]["override"]
    assert override["guid"] == (b"A" * 16).hex()
    assert "Hero_Carmilla" in override["path"]


def test_carmilla_definitions_are_discovered_from_an_extracted_directory(source):
    rel = "Definitions/Heroes/Carmilla_Update6.herodef.ot.DtHeroDefinition.gen"
    path = source.root / rel
    path.parent.mkdir(parents=True)
    path.write_bytes(b"definition bytes copied unchanged")
    (path.parent / "Other.herodef.ot.DtHeroDefinition.gen").write_bytes(b"unrelated")
    report, assets = inspect_mod.collect(source)
    assert assets["corpus/" + rel] == path.read_bytes()
    assert not any("Carmilla*.herodef" in item for item in report["missing"])
    assert not any("Other.herodef" in member for member in assets)


def test_inherited_entity_is_collected_transitively(source, monkeypatch):
    parent = "EntitySettings/Shared/Parent" + inspect_mod.ENTITY
    path = source.root / parent
    path.parent.mkdir()
    path.write_bytes(entity(label="Inherited Blood Value"))
    monkeypatch.setattr(inspect_mod.EC, "parents", lambda raw: ["Shared/Parent.entity.ot"])
    report, assets = inspect_mod.collect(source)
    assert parent in report["entities"]
    assert "corpus/" + parent in assets


def test_corrupt_entity_is_retained_and_reported(source):
    other = inspect_mod.CARMILLA + "Hero_Carmilla_Update6" + inspect_mod.ENTITY
    (source.root / other).write_bytes(b"not a cooked entity")
    report, assets = inspect_mod.collect(source)
    assert report["status"] == "needs_more_data"
    assert any(other in warning for warning in report["warnings"])
    assert assets["corpus/" + other] == b"not a cooked entity"


def test_install_reads_backup_and_application_settings_backup(tmp_path, monkeypatch):
    game = tmp_path / "game"
    cooking = game / "DarkTalesResources/_Cooking"
    cooking.mkdir(parents=True)
    live = cooking / "encoded.gen"
    live.write_bytes(b"modified live")
    backup = live.with_name(live.name + ".rsmm.bak")
    backup.write_bytes(entity())
    monkeypatch.setattr(corpus, "cooking_dir", lambda: cooking)
    monkeypatch.setattr(corpus, "rels", lambda *args: [])
    monkeypatch.setattr("rsmm.engine.asset_map.decoded_to_encoded",
                        lambda: {inspect_mod.MAIN: "encoded.gen"})
    app = game / "DarkTalesResources/ApplicationSettings.ot"
    app.write_bytes(b"changed settings")
    app.with_name(app.name + ".rsmm.bak").write_bytes(b"original settings")
    before = snapshot(game)
    report, assets = inspect_mod.collect(inspect_mod.Source("install", game))
    assert assets["corpus/" + inspect_mod.MAIN] == backup.read_bytes()
    assert report["files"][inspect_mod.MAIN]["backup"]
    assert assets["application_settings/ApplicationSettings.ot"] == b"original settings"
    assert snapshot(game) == before


def test_missing_main_creates_no_zip(tmp_path, monkeypatch, capsys):
    mirror = tmp_path / "empty"
    mirror.mkdir()
    monkeypatch.setattr(corpus, "UNCOOKED", mirror)
    output = tmp_path / "missing.zip"
    assert inspect_mod.main(["--corpus", str(mirror), "--output", str(output)]) == 2
    assert not output.exists()
    assert "main entity is missing" in capsys.readouterr().err


def test_never_overwrites_an_existing_zip_or_writes_inside_source(source, tmp_path):
    output = tmp_path / "existing.zip"
    output.write_bytes(b"keep me")
    with pytest.raises(FileExistsError):
        inspect_mod.write_bundle(output, source, {}, {})
    assert output.read_bytes() == b"keep me"
    with pytest.raises(ValueError, match="outside"):
        inspect_mod.write_bundle(source.root / "output.zip", source, {}, {})


@pytest.mark.parametrize("rel", ["../_Save/Profile_1.ob", "C:/game/file", "/tmp/file",
                                "EntitySettings/../../file", "EntitySettings\\..\\secret",
                                "_Save/Profile_1.ob"])
def test_paths_cannot_escape_or_select_saves(rel):
    with pytest.raises(ValueError):
        inspect_mod.safe_rel(rel)


def test_symlink_cannot_export_outside_source(source, tmp_path):
    outside = tmp_path / "outside.gen"
    outside.write_bytes(b"private")
    target = source.root / inspect_mod.CARMILLA / ("Escape" + inspect_mod.ENTITY)
    target.symlink_to(outside)
    with pytest.raises(ValueError, match="escapes"):
        source.read(target.relative_to(source.root).as_posix())


def test_nonfinite_fields_are_valid_json():
    assert json.loads(inspect_mod._json({"value": math.inf})) == {"value": "inf"}


@pytest.mark.parametrize("script", ["model.py", "export_data.py"])
def test_scripts_run_directly_outside_the_checkout(script, tmp_path):
    path = Path(inspect_mod.__file__).with_name(script)
    result = subprocess.run([sys.executable, str(path), "--help"], cwd=tmp_path,
                            capture_output=True, text=True, timeout=10)
    assert result.returncode == 0, result.stderr
    assert "usage:" in result.stdout
