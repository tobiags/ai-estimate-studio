"""Fetch pinned NVIDIA USD dependencies without downloading the full dataset."""
import json
import subprocess
import re
from pathlib import Path
from pxr import Sdf

ROOT = Path(__file__).resolve().parents[1] / 'outputs/simready-source'
REV = '653d91e182011f357cf1644013cc94ddf194d349'
BASE = f'https://huggingface.co/datasets/nvidia/simready-assets/resolve/{REV}/'

def fetch(relative):
    target = ROOT / relative
    if target.exists() and target.stat().st_size > 100:
        return target
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(target.name + '.part')
    for suffix in ('', '?download=true', '?raw=true', '?download=1', '?x=2'):
        result = subprocess.run(['curl.exe', '-fLsS', '--retry', '1', '--retry-all-errors', BASE + relative + suffix, '-o', str(temporary)])
        if result.returncode == 0:
            temporary.replace(target)
            return target
    raise RuntimeError(f'Download failed: {relative}')
    return target

def visit(relative, seen):
    if relative in seen:
        return
    seen.add(relative)
    path = fetch(relative)
    print(relative, path.stat().st_size, flush=True)
    if path.suffix.lower() not in ('.usd', '.usda', '.usdc'):
        return
    layer = Sdf.Layer.FindOrOpen(str(path))
    if not layer:
        raise RuntimeError(f'Invalid USD: {path}')
    for dependency in sorted(set(re.findall(r'@([^@\r\n]*)@', layer.ExportToString()))):
        if not dependency:
            continue
        if any('/' + engine + '/' in dependency for engine in ('MuJoCo', 'Newton', 'PhysX', 'Physics')) or dependency.endswith('.mdl'):
            continue  # Physics variants are not part of the web visual asset.
        if dependency.startswith(('http:', 'https:', 'omniverse:')):
            raise RuntimeError(f'External dependency: {dependency}')
        resolved = (path.parent / dependency).resolve()
        visit(resolved.relative_to(ROOT.resolve()).as_posix(), seen)

if __name__ == '__main__':
    import sys
    for asset in sys.argv[1:]:
        seen = set()
        fetch(asset + '/com.nvidia.simready.packaging.json')
        visit(f'{asset}/simready_usd/sm_{asset}_01.usd', seen)
        print(json.dumps({'asset': asset, 'revision': REV, 'files': sorted(seen)}), flush=True)
