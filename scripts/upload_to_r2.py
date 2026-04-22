"""
Upload v10 per-checkpoint images to Cloudflare R2.

Sources (on disk):
    harness_v10/images/EulerDiscreteScheduler/<prompt_id>/seed42_stepNN.jpeg    (14994 files)
    harness_v10/images/DPMSolverMultistepScheduler/<prompt_id>/seed42_stepNN.jpeg (2500 files)
    harness_v10/images/DDIMScheduler/<prompt_id>/seed42_stepNN.jpeg             (2500 files)
    = 19994 total, ~330 MB

Destination keys (on R2):
    euler/<prompt_id>/step_NN.jpeg
    dpm/<prompt_id>/step_NN.jpeg
    ddim/<prompt_id>/step_NN.jpeg

Why the renaming:
    - Short scheduler paths for clean public URLs.
    - Drop the 'seed42_' prefix since we only ever use one seed.
    - Uniform step_NN format makes webapp URL generation trivial.

Behaviour:
    - Resumable: skips any key already present with matching size in R2.
    - Parallel: 16 concurrent upload threads (R2 handles it easily).
    - Progress printed every 200 uploads.
    - Zero-cost read after upload: R2 egress is free for public buckets.

Usage (from repo root):
    pip install -q boto3 python-dotenv tqdm
    python webapp/scripts/upload_to_r2.py
"""

from __future__ import annotations

import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from dotenv import load_dotenv
from tqdm import tqdm


# --------- config ----------------------------------------------------------
SCRIPT_DIR   = Path(__file__).resolve().parent
WEBAPP_DIR   = SCRIPT_DIR.parent
REPO_ROOT    = WEBAPP_DIR.parent
IMAGES_ROOT  = REPO_ROOT / "harness_v10" / "images"

SCHEDULER_DIRS = [
    ("EulerDiscreteScheduler",        "euler"),
    ("DPMSolverMultistepScheduler",   "dpm"),
    ("DDIMScheduler",                 "ddim"),
]

MAX_WORKERS = 16


# --------- client setup ----------------------------------------------------
def make_client():
    load_dotenv(WEBAPP_DIR / ".env.r2", override=False)
    endpoint    = os.environ["R2_ENDPOINT"]
    access_key  = os.environ["R2_ACCESS_KEY_ID"]
    secret_key  = os.environ["R2_SECRET_ACCESS_KEY"]
    bucket      = os.environ["R2_BUCKET"]
    s3 = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        config=Config(signature_version="s3v4"),
        region_name="auto",
    )
    return s3, bucket


# --------- planning --------------------------------------------------------
def plan_uploads() -> list[tuple[Path, str, int]]:
    """Walk local images/ and produce (local_path, r2_key, size_bytes) tuples."""
    out: list[tuple[Path, str, int]] = []
    for disk_name, url_name in SCHEDULER_DIRS:
        root = IMAGES_ROOT / disk_name
        if not root.is_dir():
            print(f"  !! missing {root}, skipping", file=sys.stderr)
            continue
        n = 0
        for prompt_dir in root.iterdir():
            if not prompt_dir.is_dir():
                continue
            for img in prompt_dir.iterdir():
                if img.suffix.lower() not in (".jpeg", ".jpg"):
                    continue
                # Source names: seed42_step05.jpeg  ->  step_05.jpeg
                name = img.name
                if name.startswith("seed42_step"):
                    step_part = name.removeprefix("seed42_step")  # '05.jpeg'
                    new_name  = f"step_{step_part}"
                else:
                    new_name = name
                key = f"{url_name}/{prompt_dir.name}/{new_name}"
                out.append((img, key, img.stat().st_size))
                n += 1
        print(f"  {disk_name:>28} -> {url_name:<5} : {n} files")
    return out


# --------- manifest (what's already on R2) ---------------------------------
def fetch_existing_keys(s3, bucket: str, prefix: str) -> dict[str, int]:
    """Return {key: size} for all objects under a given prefix."""
    keys: dict[str, int] = {}
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            keys[obj["Key"]] = obj["Size"]
    return keys


# --------- upload one file -------------------------------------------------
def upload_one(s3, bucket: str, local: Path, key: str) -> tuple[str, bool, str]:
    try:
        s3.upload_file(
            Filename=str(local),
            Bucket=bucket,
            Key=key,
            ExtraArgs={"ContentType": "image/jpeg", "CacheControl": "public, max-age=31536000"},
        )
        return key, True, ""
    except ClientError as e:
        return key, False, str(e)


# --------- main ------------------------------------------------------------
def main() -> None:
    s3, bucket = make_client()
    print(f"bucket : {bucket}")
    print(f"images : {IMAGES_ROOT}\n")

    print("Planning uploads ...")
    plan = plan_uploads()
    print(f"\n  total files : {len(plan)}")
    total_bytes = sum(sz for _, _, sz in plan)
    print(f"  total size  : {total_bytes / 1e6:.1f} MB\n")

    print("Fetching existing R2 objects (for resume-skipping) ...")
    existing: dict[str, int] = {}
    for _, url_name in SCHEDULER_DIRS:
        existing.update(fetch_existing_keys(s3, bucket, prefix=f"{url_name}/"))
    print(f"  already in R2 : {len(existing)} objects\n")

    # Filter to what still needs uploading: missing OR wrong size.
    todo = [(p, k, sz) for (p, k, sz) in plan if existing.get(k) != sz]
    print(f"to upload : {len(todo)} / {len(plan)}")
    if not todo:
        print("nothing to do.")
        return

    # Parallel upload.
    failed: list[tuple[str, str]] = []
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futures = [ex.submit(upload_one, s3, bucket, p, k) for (p, k, _) in todo]
        with tqdm(total=len(futures), desc="upload", unit="file") as pbar:
            for fut in as_completed(futures):
                key, ok, err = fut.result()
                if not ok:
                    failed.append((key, err))
                pbar.update(1)

    dt = time.time() - t0
    mb = total_bytes / 1e6
    print(f"\nuploaded {len(todo) - len(failed)}/{len(todo)} in {dt:.1f}s  ({mb / dt:.2f} MB/s effective)")
    if failed:
        print(f"\n{len(failed)} failed:")
        for k, e in failed[:10]:
            print(f"  {k}\n    -> {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
