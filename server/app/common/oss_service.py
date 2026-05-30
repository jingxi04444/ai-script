import hashlib
import time
from enum import Enum
from typing import BinaryIO

import oss2

from app.core.config import get_settings


class OssBucket(str, Enum):
    PROJECT = "project"
    AVATAR = "avatar"
    MATERIAL = "material"
    PUBLIC = "public"


def _oss_bucket_name(bucket: OssBucket) -> str:
    settings = get_settings()
    mapping = {
        OssBucket.PROJECT: settings.oss_bucket_project,
        OssBucket.AVATAR: settings.oss_bucket_avatar,
        OssBucket.MATERIAL: settings.oss_bucket_material,
        OssBucket.PUBLIC: settings.oss_bucket_public,
    }
    return mapping[bucket]


def _oss_bucket(bucket: OssBucket) -> oss2.Bucket:
    settings = get_settings()
    auth = oss2.Auth(settings.oss_access_key_id, settings.oss_access_key_secret)
    return oss2.Bucket(auth, settings.oss_endpoint, _oss_bucket_name(bucket))


def _normalize_ext(filename: str) -> str:
    if "." not in filename:
        return ""
    return "." + filename.rsplit(".", 1)[-1].lower()


def _safe_key(prefix: str, original_name: str) -> str:
    ext = _normalize_ext(original_name)
    safe = hashlib.sha1(original_name.encode()).hexdigest()[:8]
    ts = int(time.time())
    return f"{prefix}/{ts}_{safe}{ext}"


def oss_upload_file(
    bucket: OssBucket,
    prefix: str,
    filename: str,
    content: BinaryIO,
    content_type: str = "application/octet-stream",
) -> str:
    """
    Upload a file to OSS and return the public URL.
    Raises an exception if OSS credentials are not configured.
    """
    oss = _oss_bucket(bucket)
    key = _safe_key(prefix, filename)
    result = oss.put_object(key, content, headers={"Content-Type": content_type})
    bucket_name = _oss_bucket_name(bucket)
    endpoint = get_settings().oss_endpoint
    # Strip protocol from endpoint for URL construction
    host = endpoint.removeprefix("https://").removeprefix("http://")
    return f"https://{bucket_name}.{host}/{key}"


def oss_delete_file(url: str) -> None:
    """
    Delete a file from OSS given its full URL.
    """
    settings = get_settings()
    endpoint = settings.oss_endpoint
    host = endpoint.removeprefix("https://").removeprefix("http://")
    # Extract bucket name and key from URL like https://bucket.host/key
    if url.startswith("https://"):
        url = url[8:]
    elif url.startswith("http://"):
        url = url[7:]
    parts = url.split("/", 1)
    if len(parts) < 2:
        return
    bucket_name = parts[0].split(".")[0]  # "bucket.host" -> "bucket"
    key = parts[1]
    auth = oss2.Auth(settings.oss_access_key_id, settings.oss_access_key_secret)
    oss = oss2.Bucket(auth, endpoint, bucket_name)
    oss.delete_object(key)
