import traceback

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from google.auth.exceptions import GoogleAuthError
from google.genai.errors import APIError


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_request: Request, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={"error": "Validation error", "detail": str(exc.errors())},
        )

    @app.exception_handler(GoogleAuthError)
    async def gemini_auth_exception_handler(_request: Request, _exc: GoogleAuthError):
        return JSONResponse(
            status_code=502,
            content={
                "error": "Gemini authentication failed",
                "detail": (
                    "Could not authenticate to Vertex AI. Locally, run "
                    "`gcloud auth application-default login`; in deployment, check "
                    "the runtime service account has roles/aiplatform.user."
                ),
            },
        )

    @app.exception_handler(APIError)
    async def gemini_status_exception_handler(_request: Request, exc: APIError):
        return JSONResponse(
            status_code=502,
            content={
                "error": "Gemini request failed",
                "detail": f"Vertex AI returned status {exc.code}. Please try again.",
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
