from pydantic import BaseModel, ConfigDict

from .models import Document


# ---- Jobs ----
class JobBase(BaseModel):
    company: str
    role: str
    status: str
    applied: str = ""
    interview: str = ""
    followup: str = ""
    notes: str = ""


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    company: str | None = None
    role: str | None = None
    status: str | None = None
    applied: str | None = None
    interview: str | None = None
    followup: str | None = None
    notes: str | None = None


class JobOut(JobBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# ---- Documents ----
class DocumentCreate(BaseModel):
    type: str
    name: str
    content: str = ""
    linkedJobs: list[int] = []


class DocumentUpdate(BaseModel):
    type: str | None = None
    name: str | None = None
    content: str | None = None
    linkedJobs: list[int] | None = None


class DocumentOut(BaseModel):
    id: int
    type: str
    name: str
    content: str
    updated: str
    linkedJobs: list[int]
    fileName: str | None = None
    fileUrl: str | None = None


def serialize_document(doc: Document, public_base_url: str) -> DocumentOut:
    return DocumentOut(
        id=doc.id,
        type=doc.type,
        name=doc.name,
        content=doc.content,
        updated=doc.updated,
        linkedJobs=sorted(j.id for j in doc.jobs),
        fileName=doc.file_name,
        fileUrl=f"{public_base_url}/api/documents/{doc.id}/file" if doc.file_key else None,
    )
