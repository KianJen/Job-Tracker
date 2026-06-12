from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Postgres (async driver)
    database_url: str = "postgresql+asyncpg://jobtracker:jobtracker@localhost:5432/jobtracker"

    # Garage / S3-compatible object storage
    s3_endpoint_url: str = "http://localhost:3900"
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_bucket: str = "job-tracker-docs"
    s3_region: str = "garage"

    # Used to build absolute file URLs returned to the frontend.
    # Should be the URL the browser uses to reach this API.
    public_base_url: str = "http://localhost:8000"

    # CORS — origins allowed to call the API (the Vite dev server by default)
    cors_origins: list[str] = ["http://localhost:5173"]

    # Max upload size in bytes (default 10 MB)
    max_upload_bytes: int = 10 * 1024 * 1024


settings = Settings()

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
