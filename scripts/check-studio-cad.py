#!/usr/bin/env python3
"""Validate generated Mobup CAD GLBs without starting a CAD kernel."""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import trimesh


VARIANTS = {
    "p1-m1": (1250, 1250),
    "p2-m7": (2500, 2500),
    "p3-m8": (3750, 3750),
    "p4-m1-m8": (5000, 5000),
}
DEPTH_MM = 3000
HEIGHT_MM = 2800
TOLERANCE = 0.06


def validate_variant(path: Path, width_mm: int) -> tuple[float, float, float]:
    loaded = trimesh.load(path, force="scene")
    if not isinstance(loaded, trimesh.Scene) or not loaded.geometry:
        raise ValueError(f"{path.name}: GLB has no scene geometry")

    for name, geometry in loaded.geometry.items():
        if not isinstance(geometry, trimesh.Trimesh):
            raise ValueError(f"{path.name}/{name}: expected triangle mesh")
        components = geometry.split(only_watertight=False)
        if not components or any(not component.is_watertight for component in components):
            raise ValueError(f"{path.name}/{name}: non-watertight component")

    extents = loaded.bounds[1] - loaded.bounds[0]
    expected = np.asarray(
        [(width_mm + 220) / 1000, (HEIGHT_MM + 220) / 1000, (DEPTH_MM + 220) / 1000]
    )
    if np.any(np.abs(extents - expected) > expected * TOLERANCE):
        raise ValueError(
            f"{path.name}: bounds {extents.tolist()} differ from {expected.tolist()}"
        )
    return tuple(float(value) for value in extents)


def parse_args() -> argparse.Namespace:
    root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--asset-dir",
        type=Path,
        default=root / "apps" / "web" / "public" / "assets" / "models" / "studio",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    for key, (width_mm, _) in VARIANTS.items():
        path = args.asset_dir / f"mobup-studio-{key}.glb"
        if not path.is_file():
            raise FileNotFoundError(path)
        bounds = validate_variant(path, width_mm)
        print(f"validated {key}: bounds={list(round(value, 6) for value in bounds)}")
    print(f"Studio CAD guard passed: {len(VARIANTS)} variants")


if __name__ == "__main__":
    main()
