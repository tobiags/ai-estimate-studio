#!/usr/bin/env python3
"""Generate the canonical Mobup studio CAD display assets.

The browser must not run a CAD kernel.  This script is the reproducible
authoring step: build123d creates the dimensioned solids, trimesh converts the
parts to a compact GLB scene and validates the resulting bounds before the
asset is published under apps/web/public.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence

import numpy as np
import trimesh
from build123d import Box, Compound, Pos, chamfer, export_stl
from trimesh.visual import TextureVisuals
from trimesh.visual.material import PBRMaterial


MM_TO_M = 0.001
STUDIO_DEPTH_MM = 3000
STUDIO_HEIGHT_MM = 2800
WALL_WIDTH_MM = {
    "M1": 1250,
    "M7": 2500,
    "M8": 3750,
    "M9": 2500,
}


@dataclass(frozen=True)
class StudioVariant:
    key: str
    base_code: str
    width_mm: int
    wall_codes: tuple[str, ...]


VARIANTS: tuple[StudioVariant, ...] = (
    StudioVariant("p1-m1", "P1", 1250, ("M1",)),
    StudioVariant("p2-m7", "P2", 2500, ("M7",)),
    StudioVariant("p3-m8", "P3", 3750, ("M8",)),
    StudioVariant("p4-m1-m8", "P4", 5000, ("M1", "M8")),
)

MATERIAL_COLORS: dict[str, tuple[int, int, int, int]] = {
    "cedar": (132, 78, 47, 255),
    "graphite": (35, 38, 39, 255),
    "mineral": (165, 160, 151, 255),
    "glass": (168, 205, 212, 142),
    "floor": (76, 78, 75, 255),
}


def placed_box(
    size_mm: tuple[float, float, float],
    center_mm: tuple[float, float, float],
    bevel_mm: float = 0,
):
    """Create a centered build123d box in the viewer's x/y/z convention.

    x is width, y is height and z is depth.  Keeping this convention equal to
    the Three.js viewer means no hidden axis conversion is needed at runtime.
    """

    shape = Box(*size_mm)
    if bevel_mm:
        shape = chamfer(shape.edges(), bevel_mm)
    return Pos(*center_mm) * shape


def compound(shapes: Iterable[object]):
    return Compound(list(shapes))


def cladding_slats(
    width_mm: float,
    height_mm: float,
    panel_depth_mm: float,
    center_mm: tuple[float, float, float],
    axis: str = "x",
) -> object:
    """Create a backed, evenly spaced cedar cladding panel."""

    spacing_mm = 85
    count = max(2, math.ceil(width_mm / spacing_mm))
    slat_width_mm = min(35, width_mm / count - 8)
    backing_size = (
        (width_mm, height_mm, panel_depth_mm)
        if axis == "x"
        else (panel_depth_mm, height_mm, width_mm)
    )
    pieces = [placed_box(backing_size, center_mm)]
    for index in range(count):
        offset = -width_mm / 2 + (index + 0.5) * (width_mm / count)
        if axis == "x":
            slat_size = (slat_width_mm, height_mm - 100, panel_depth_mm + 18)
            slat_center = (
                center_mm[0] + offset,
                center_mm[1],
                center_mm[2] + 4,
            )
        else:
            slat_size = (panel_depth_mm + 18, height_mm - 100, slat_width_mm)
            slat_center = (
                center_mm[0] + 4,
                center_mm[1],
                center_mm[2] + offset,
            )
        pieces.append(placed_box(slat_size, slat_center))
    return compound(pieces)


def solid_front_module(
    width_mm: float,
    height_mm: float,
    base_y_mm: float,
    front_z_mm: float,
    center_x_mm: float,
) -> object:
    slats = cladding_slats(
        width_mm,
        height_mm,
        80,
        (center_x_mm, base_y_mm + height_mm / 2, front_z_mm),
    )
    rails = [
        placed_box(
            (width_mm, 110, 160),
            (center_x_mm, base_y_mm + 55, front_z_mm),
        ),
        placed_box(
            (width_mm, 110, 160),
            (center_x_mm, base_y_mm + height_mm - 55, front_z_mm),
        ),
    ]
    return compound([slats, *rails])


def glazed_front_module(
    code: str,
    width_mm: float,
    height_mm: float,
    base_y_mm: float,
    front_z_mm: float,
    center_x_mm: float,
) -> tuple[object, object]:
    frame_mm = 75
    pane_width_mm = max(200, width_mm - frame_mm * 2)
    graphite = [
        placed_box(
            (width_mm, frame_mm, 140),
            (center_x_mm, base_y_mm + frame_mm / 2, front_z_mm),
        ),
        placed_box(
            (width_mm, frame_mm, 140),
            (center_x_mm, base_y_mm + height_mm - frame_mm / 2, front_z_mm),
        ),
        placed_box(
            (frame_mm, height_mm, 140),
            (center_x_mm - width_mm / 2 + frame_mm / 2, base_y_mm + height_mm / 2, front_z_mm),
        ),
        placed_box(
            (frame_mm, height_mm, 140),
            (center_x_mm + width_mm / 2 - frame_mm / 2, base_y_mm + height_mm / 2, front_z_mm),
        ),
    ]
    mullions = 2 if code == "M8" else 1
    for index in range(1, mullions + 1):
        x = center_x_mm - width_mm / 2 + width_mm * index / (mullions + 1)
        graphite.append(
            placed_box(
                (45, height_mm - frame_mm * 2, 160),
                (x, base_y_mm + height_mm / 2, front_z_mm - 15),
            )
        )
    graphite.append(
        placed_box(
            (120, 360, 180),
            (center_x_mm + width_mm * 0.18, base_y_mm + height_mm * 0.5, front_z_mm - 80),
            12,
        )
    )
    glass = placed_box(
        (pane_width_mm, height_mm - frame_mm * 2, 25),
        (center_x_mm, base_y_mm + height_mm / 2, front_z_mm - 4),
    )
    return glass, compound(graphite)


def opening_front_module(
    width_mm: float,
    height_mm: float,
    base_y_mm: float,
    front_z_mm: float,
    center_x_mm: float,
) -> object:
    opening_width_mm = min(width_mm - 140, 2100)
    opening_height_mm = min(height_mm - 140, 2200)
    side_width_mm = max(70, (width_mm - opening_width_mm) / 2)
    lintel_height_mm = max(70, height_mm - opening_height_mm)
    pieces = [
        placed_box(
            (side_width_mm, opening_height_mm, 100),
            (center_x_mm - (width_mm - side_width_mm) / 2, base_y_mm + opening_height_mm / 2, front_z_mm),
        ),
        placed_box(
            (side_width_mm, opening_height_mm, 100),
            (center_x_mm + (width_mm - side_width_mm) / 2, base_y_mm + opening_height_mm / 2, front_z_mm),
        ),
        placed_box(
            (opening_width_mm, lintel_height_mm, 100),
            (center_x_mm, base_y_mm + opening_height_mm + lintel_height_mm / 2, front_z_mm),
        ),
        placed_box(
            (opening_width_mm, 60, 140),
            (center_x_mm, base_y_mm + 30, front_z_mm - 30),
        ),
        placed_box(
            (opening_width_mm, 60, 140),
            (center_x_mm, base_y_mm + opening_height_mm, front_z_mm - 30),
        ),
    ]
    return compound(pieces)


def build_parts(variant: StudioVariant) -> list[tuple[str, object, str]]:
    if sum(WALL_WIDTH_MM[code] for code in variant.wall_codes) != variant.width_mm:
        raise ValueError(f"{variant.key} facade does not fill its base exactly")

    width_mm = variant.width_mm
    depth_mm = STUDIO_DEPTH_MM
    height_mm = STUDIO_HEIGHT_MM
    wall_base_y_mm = 180
    front_z_mm = depth_mm / 2
    parts: list[tuple[str, object, str]] = []

    parts.extend(
        [
            ("foundation-slab", placed_box((width_mm, 180, depth_mm), (0, 90, 0), 20), "mineral"),
            ("foundation-edge", placed_box((width_mm + 60, 120, depth_mm + 60), (0, 20, 0), 12), "graphite"),
            ("interior-floor", placed_box((width_mm - 120, 35, depth_mm - 120), (0, 218, 0), 8), "floor"),
            ("flat-roof", placed_box((width_mm + 160, 180, depth_mm + 160), (0, height_mm + 90, 0), 24), "graphite"),
            ("roof-fascia", placed_box((width_mm + 220, 80, depth_mm + 220), (0, height_mm - 20, 0), 14), "cedar"),
        ]
    )

    parts.extend(
        [
            (
                "rear-cladding",
                cladding_slats(width_mm, height_mm, 100, (0, wall_base_y_mm + height_mm / 2, -depth_mm / 2), "x"),
                "cedar",
            ),
            (
                "left-cladding",
                cladding_slats(depth_mm, height_mm, 120, (-width_mm / 2, wall_base_y_mm + height_mm / 2, 0), "z"),
                "cedar",
            ),
            (
                "right-cladding",
                cladding_slats(depth_mm, height_mm, 120, (width_mm / 2, wall_base_y_mm + height_mm / 2, 0), "z"),
                "cedar",
            ),
        ]
    )

    used_width_mm = 0
    for code in variant.wall_codes:
        module_width_mm = WALL_WIDTH_MM[code]
        center_x_mm = used_width_mm + module_width_mm / 2 - width_mm / 2
        if code == "M1":
            module = solid_front_module(
                module_width_mm,
                height_mm,
                wall_base_y_mm,
                front_z_mm,
                center_x_mm,
            )
            material = "cedar"
        elif code in {"M7", "M8"}:
            glass, graphite_frame = glazed_front_module(
                code,
                module_width_mm,
                height_mm,
                wall_base_y_mm,
                front_z_mm,
                center_x_mm,
            )
            parts.extend(
                [
                    (f"front-{code.lower()}-glass", glass, "glass"),
                    (f"front-{code.lower()}-frame", graphite_frame, "graphite"),
                ]
            )
            used_width_mm += module_width_mm
            continue
        elif code == "M9":
            module = opening_front_module(
                module_width_mm,
                height_mm,
                wall_base_y_mm,
                front_z_mm,
                center_x_mm,
            )
            material = "cedar"
        else:
            raise ValueError(f"Unsupported CAD module: {code}")
        parts.append((f"front-{code.lower()}", module, material))
        used_width_mm += module_width_mm

    return parts


def to_trimesh(stl_path: Path) -> trimesh.Trimesh:
    loaded = trimesh.load_mesh(stl_path, process=True)
    if isinstance(loaded, trimesh.Scene):
        meshes = [item for item in loaded.geometry.values() if isinstance(item, trimesh.Trimesh)]
        if not meshes:
            raise ValueError(f"No mesh found in {stl_path}")
        mesh = trimesh.util.concatenate(meshes)
    else:
        mesh = loaded
    mesh.apply_scale(MM_TO_M)
    mesh.remove_unreferenced_vertices()
    return mesh


def color_mesh(mesh: trimesh.Trimesh, material: str) -> None:
    color = MATERIAL_COLORS[material]
    roughness = {
        "cedar": 0.62,
        "graphite": 0.26,
        "mineral": 0.86,
        "glass": 0.12,
        "floor": 0.96,
    }[material]
    metalness = 0.78 if material == "graphite" else 0.04 if material == "cedar" else 0
    mesh.visual = TextureVisuals(
        material=PBRMaterial(
            name=f"mobup-{material}",
            baseColorFactor=tuple(channel / 255 for channel in color),
            metallicFactor=metalness,
            roughnessFactor=roughness,
            doubleSided=material == "glass",
            alphaMode="BLEND" if material == "glass" else "OPAQUE",
        )
    )
    mesh.metadata["material"] = material


def export_variant(variant: StudioVariant, output_path: Path) -> dict[str, object]:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    scene = trimesh.Scene()
    with tempfile.TemporaryDirectory(prefix="mobup-cad-") as temporary:
        temporary_path = Path(temporary)
        for index, (name, shape, material) in enumerate(build_parts(variant)):
            stl_path = temporary_path / f"part-{index:03d}.stl"
            export_stl(shape, stl_path)
            mesh = to_trimesh(stl_path)
            color_mesh(mesh, material)
            scene.add_geometry(mesh, geom_name=name, node_name=name)
        scene.export(output_path)

    loaded = trimesh.load(output_path, force="scene")
    bounds = loaded.bounds
    extents = bounds[1] - bounds[0]
    expected = np.asarray(
        [
            (variant.width_mm + 220) * MM_TO_M,
            (STUDIO_HEIGHT_MM + 220) * MM_TO_M,
            (STUDIO_DEPTH_MM + 220) * MM_TO_M,
        ]
    )
    if np.any(extents < expected * 0.94) or np.any(extents > expected * 1.06):
        raise ValueError(
            f"Unexpected {variant.key} bounds: {extents.tolist()} (expected {expected.tolist()})"
        )
    for name, geometry in loaded.geometry.items():
        if not isinstance(geometry, trimesh.Trimesh):
            raise ValueError(f"Generated geometry is not a triangle mesh: {variant.key}/{name}")
        components = geometry.split(only_watertight=False)
        if not components or any(not component.is_watertight for component in components):
            raise ValueError(f"Generated geometry is not watertight: {variant.key}/{name}")

    digest = hashlib.sha256(output_path.read_bytes()).hexdigest()
    return {
        "key": variant.key,
        "baseCode": variant.base_code,
        "wallCodes": list(variant.wall_codes),
        "path": f"/assets/models/studio/mobup-studio-{variant.key}.glb",
        "bytes": output_path.stat().st_size,
        "sha256": digest,
        "boundsMeters": [round(float(value), 6) for value in extents],
        "source": "scripts/generate-studio-cad.py",
    }


def parse_args() -> argparse.Namespace:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=root / "apps" / "web" / "public" / "assets" / "models" / "studio",
    )
    parser.add_argument(
        "--variant",
        choices=[variant.key for variant in VARIANTS],
        action="append",
        help="Generate only the selected variant (may be repeated).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    selected = [
        variant for variant in VARIANTS if not args.variant or variant.key in args.variant
    ]
    records = []
    for variant in selected:
        output_path = args.output_dir / f"mobup-studio-{variant.key}.glb"
        record = export_variant(variant, output_path)
        records.append(record)
        print(
            f"generated {variant.key}: {record['bytes']} bytes, bounds={record['boundsMeters']}"
        )
    print(json.dumps(records, indent=2))


if __name__ == "__main__":
    main()
