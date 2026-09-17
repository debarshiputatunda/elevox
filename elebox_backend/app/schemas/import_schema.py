from pydantic import BaseModel, Field


class ImportErrorDetail(BaseModel):
    row: int = Field(..., description="Excel row number (1-based)")
    message: str


class ImportResponse(BaseModel):
    total_rows: int
    success_rows: int
    failed_rows: int
    errors: list[ImportErrorDetail]
    import_id: int | None = None
