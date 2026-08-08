import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import config  # noqa: F401  -- initialises Firebase + LangSmith env before anything else

from routes.chat import router as chat_router
from routes.crime_data import router as crime_data_router
from routes.cases import router as cases_router
from routes.case_graph import router as case_graph_router

app = FastAPI(title="Motive-KSP Crime Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Guarantees every request gets a real HTTP response, even when
    something deep in a route (a Firestore call, a Gemini call, an
    agent tool) raises an uncaught exception.

    Without this, an uncaught exception can tear down the connection
    before any response — including the CORS headers added by
    CORSMiddleware above — ever reaches the browser. The browser then
    reports that as "blocked by CORS policy: No 'Access-Control-Allow-
    Origin' header is present" / net::ERR_FAILED, which looks like a
    CORS misconfiguration but is actually just a crashed request. This
    handler still runs *inside* CORSMiddleware, so its JSON response
    gets the CORS headers attached normally, and the frontend gets a
    real error message to show instead of a dead connection.
    """
    print(f"[unhandled_exception] {request.method} {request.url.path}: {exc}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": f"{type(exc).__name__}: {exc}"},
    )


app.include_router(chat_router)
app.include_router(crime_data_router)
app.include_router(cases_router)
app.include_router(case_graph_router)


@app.get("/")
def home():
    return {"status": "running", "service": "Motive-KSP Crime Intelligence API"}