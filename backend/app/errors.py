import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("leadflow")


def register_error_handlers(app: FastAPI) -> None:
    """Every error leaves the API as {"detail": ...}.

    404s carry a string (FastAPI's default). 422s carry a trimmed list of
    {loc, msg, type}, without echoing the rejected input back. Anything
    unexpected becomes a 500 with no internals leaked.
    """

    @app.exception_handler(RequestValidationError)
    async def validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = [
            {"loc": list(error["loc"]), "msg": error["msg"], "type": error["type"]}
            for error in exc.errors()
        ]
        return JSONResponse(status_code=422, content={"detail": errors})

    @app.exception_handler(Exception)
    async def unhandled_error(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})
