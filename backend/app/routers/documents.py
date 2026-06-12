from datetime import date
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .. import storage
from ..config import ALLOWED_CONTENT_TYPES, settings
from ..database import get_db
from ..models import Document, Job
from ..schemas import DocumentCreate, DocumentOut, DocumentUpdate, serialize_document

router = APIRouter(prefix="/api/documents", tags=["documents"])


def _today() -> str:
    return date.today().isoformat()


async def _get_document(doc_id: int, db: AsyncSession) -> Document:
    result = await db.execute(
        select(Document).options(selectinload(Document.jobs)).where(Document.id == doc_id)
    )
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return doc


async def _resolve_jobs(job_ids: list[int], db: AsyncSession) -> list[Job]:
    if not job_ids:
        return []
    result = await db.execute(select(Job).where(Job.id.in_(job_ids)))
    return list(result.scalars().all())


@router.get("", response_model=list[DocumentOut])
async def list_documents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Document).options(selectinload(Document.jobs)).order_by(Document.id.desc())
    )
    docs = result.scalars().all()
    return [serialize_document(d, settings.public_base_url) for d in docs]


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def create_document(payload: DocumentCreate, db: AsyncSession = Depends(get_db)):
    doc = Document(
        type=payload.type,
        name=payload.name,
        content=payload.content,
        updated=_today(),
        jobs=await _resolve_jobs(payload.linkedJobs, db),
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc, attribute_names=["jobs"])
    return serialize_document(doc, settings.public_base_url)


@router.get("/{doc_id}", response_model=DocumentOut)
async def get_document(doc_id: int, db: AsyncSession = Depends(get_db)):
    doc = await _get_document(doc_id, db)
    return serialize_document(doc, settings.public_base_url)


@router.patch("/{doc_id}", response_model=DocumentOut)
async def update_document(doc_id: int, payload: DocumentUpdate, db: AsyncSession = Depends(get_db)):
    doc = await _get_document(doc_id, db)
    data = payload.model_dump(exclude_unset=True)

    if "linkedJobs" in data:
        doc.jobs = await _resolve_jobs(data.pop("linkedJobs"), db)
    for field, value in data.items():
        setattr(doc, field, value)
    doc.updated = _today()

    await db.commit()
    await db.refresh(doc, attribute_names=["jobs"])
    return serialize_document(doc, settings.public_base_url)


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(doc_id: int, db: AsyncSession = Depends(get_db)):
    doc = await _get_document(doc_id, db)
    if doc.file_key:
        await run_in_threadpool(storage.delete_object, doc.file_key)
    await db.delete(doc)
    await db.commit()


@router.post("/{doc_id}/file", response_model=DocumentOut)
async def upload_document_file(
    doc_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)
):
    doc = await _get_document(doc_id, db)

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF and DOCX files are supported.",
        )

    contents = await file.read()
    if len(contents) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {settings.max_upload_bytes} byte limit.",
        )

    old_key = doc.file_key
    key = f"documents/{doc_id}/{uuid4().hex}-{file.filename}"
    await run_in_threadpool(storage.upload_bytes, contents, key, file.content_type)

    doc.file_key = key
    doc.file_name = file.filename
    doc.file_content_type = file.content_type
    doc.updated = _today()
    await db.commit()
    await db.refresh(doc, attribute_names=["jobs"])

    if old_key and old_key != key:
        await run_in_threadpool(storage.delete_object, old_key)

    return serialize_document(doc, settings.public_base_url)


@router.get("/{doc_id}/file")
async def download_document_file(doc_id: int, db: AsyncSession = Depends(get_db)):
    doc = await _get_document(doc_id, db)
    if not doc.file_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No file attached")

    data = await run_in_threadpool(storage.get_object_bytes, doc.file_key)
    filename = doc.file_name or "document"
    return Response(
        content=data,
        media_type=doc.file_content_type or "application/octet-stream",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.delete("/{doc_id}/file", response_model=DocumentOut)
async def delete_document_file(doc_id: int, db: AsyncSession = Depends(get_db)):
    doc = await _get_document(doc_id, db)
    if doc.file_key:
        await run_in_threadpool(storage.delete_object, doc.file_key)
    doc.file_key = None
    doc.file_name = None
    doc.file_content_type = None
    doc.updated = _today()
    await db.commit()
    await db.refresh(doc, attribute_names=["jobs"])
    return serialize_document(doc, settings.public_base_url)
