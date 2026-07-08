import traceback

from anthropic import APIStatusError, AuthenticationError
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

    @app.exception_handler(AuthenticationError)
    async def anthropic_auth_exception_handler(_request: Request, _exc: AuthenticationError):
        return JSONResponse(
            status_code=502,
            content={
                "error": "Anthropic authentication failed",
                "detail": "Check ANTHROPIC_API_KEY in yns-api/.env. It should be a valid Anthropic key.",
            },
        )

    @app.exception_handler(APIStatusError)
    async def anthropic_status_exception_handler(_request: Request, exc: APIStatusError):
        return JSONResponse(
            status_code=502,
            content={
                "error": "Anthropic request failed",
                "detail": f"Anthropic returned status {exc.status_code}. Please try again.",
            },
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
