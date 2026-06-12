from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Job
from ..schemas import JobCreate, JobOut, JobUpdate

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


async def _get_job(job_id: int, db: AsyncSession) -> Job:
    job = await db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job


@router.get("", response_model=list[JobOut])
async def list_jobs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).order_by(Job.id.desc()))
    return result.scalars().all()


@router.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED)
async def create_job(payload: JobCreate, db: AsyncSession = Depends(get_db)):
    job = Job(**payload.model_dump())
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: int, db: AsyncSession = Depends(get_db)):
    return await _get_job(job_id, db)


@router.patch("/{job_id}", response_model=JobOut)
async def update_job(job_id: int, payload: JobUpdate, db: AsyncSession = Depends(get_db)):
    job = await _get_job(job_id, db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(job, field, value)
    await db.commit()
    await db.refresh(job)
    return job


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(job_id: int, db: AsyncSession = Depends(get_db)):
    job = await _get_job(job_id, db)
    await db.delete(job)
    await db.commit()
