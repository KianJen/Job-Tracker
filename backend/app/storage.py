"""Thin wrapper around the S3 API exposed by Garage.

All calls here are blocking (boto3 is synchronous); callers in async routes
should invoke them via fastapi.concurrency.run_in_threadpool.
"""
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from .config import settings


def get_client():
    # Garage requires path-style addressing and SigV4.
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key_id,
        aws_secret_access_key=settings.s3_secret_access_key,
        region_name=settings.s3_region,
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


def ensure_bucket() -> None:
    client = get_client()
    try:
        client.head_bucket(Bucket=settings.s3_bucket)
    except ClientError:
        # Bucket creation in Garage is typically done via the garage CLI during
        # cluster setup; attempt it here for S3 backends that allow it.
        try:
            client.create_bucket(Bucket=settings.s3_bucket)
        except ClientError:
            pass


def upload_bytes(data: bytes, key: str, content_type: str | None) -> None:
    client = get_client()
    client.put_object(
        Bucket=settings.s3_bucket,
        Key=key,
        Body=data,
        ContentType=content_type or "application/octet-stream",
    )


def get_object_bytes(key: str) -> bytes:
    client = get_client()
    obj = client.get_object(Bucket=settings.s3_bucket, Key=key)
    return obj["Body"].read()


def delete_object(key: str) -> None:
    client = get_client()
    client.delete_object(Bucket=settings.s3_bucket, Key=key)
