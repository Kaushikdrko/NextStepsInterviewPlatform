import traceback

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={"error": "Validation error", "detail": str(exc.errors())},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, exc: Exception):
        traceback.print_exception(type(exc), exc, exc.__traceback__)
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal server error",
                "detail": "Something went wrong. Please try again.",
            },
        )
