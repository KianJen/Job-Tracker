from sqlalchemy import Column, ForeignKey, String, Table, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

# Association table for the many-to-many link between documents and jobs.
document_jobs = Table(
    "document_jobs",
    Base.metadata,
    Column("document_id", ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True),
    Column("job_id", ForeignKey("jobs.id", ondelete="CASCADE"), primary_key=True),
)


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    company: Mapped[str] = mapped_column(String(200))
    role: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(50))
    # Dates are stored as ISO strings ('YYYY-MM-DD'); '' means unset, matching the frontend.
    applied: Mapped[str] = mapped_column(String(10), default="")
    interview: Mapped[str] = mapped_column(String(10), default="")
    followup: Mapped[str] = mapped_column(String(10), default="")
    notes: Mapped[str] = mapped_column(Text, default="")

    documents: Mapped[list["Document"]] = relationship(
        secondary=document_jobs, back_populates="jobs", passive_deletes=True
    )


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[str] = mapped_column(String(20))  # 'resume' | 'cover'
    name: Mapped[str] = mapped_column(String(200))
    content: Mapped[str] = mapped_column(Text, default="")
    updated: Mapped[str] = mapped_column(String(10))

    # Attachment metadata — the file itself lives in Garage under file_key.
    file_name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    file_key: Mapped[str | None] = mapped_column(String(400), nullable=True)
    file_content_type: Mapped[str | None] = mapped_column(String(120), nullable=True)

    jobs: Mapped[list[Job]] = relationship(
        secondary=document_jobs, back_populates="documents", passive_deletes=True
    )
