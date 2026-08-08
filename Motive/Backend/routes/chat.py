import traceback

from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from agents.chat_agent import ask_chat_agent

router = APIRouter()


class ChatRequest(BaseModel):
    message: str = ""
    session_id: str = "default"
    image_base64: str | None = None
    mime_type: str = "image/jpeg"


@router.post("/chat")
async def chat(req: ChatRequest):
    try:
        result = await run_in_threadpool(
            ask_chat_agent,
            req.message,
            req.session_id,
            req.image_base64,
            req.mime_type,
        )
        return result
    except Exception as exc:  # noqa: BLE001
        # Never let an agent/tool/Firestore/Gemini error kill the
        # connection outright (that shows up in the browser as a
        # misleading "blocked by CORS policy" / net::ERR_FAILED,
        # since no response ever arrives). Log the real cause server
        # side and hand the frontend a normal, chat-displayable
        # response instead.
        print(f"[/chat] agent invocation failed: {exc}")
        traceback.print_exc()

        message = str(exc)
        if "RESOURCE_EXHAUSTED" in message or "429" in message:
            reply = (
                "Gemini's free-tier daily quota for this API key/project has been "
                "used up (the free tier caps at 20 requests/day per model). This "
                "isn't a bug — either wait for the daily reset, enable billing on "
                "the Google Cloud project behind this API key, or switch to a key "
                "from a different project."
            )
        elif "NOT_FOUND" in message or "404" in message or "no longer available" in message:
            # Surface the actual model name Google rejected — the generic
            # advice alone isn't enough to debug from the chat window if
            # the .env fix didn't actually take effect (stale process,
            # wrong model still configured, etc).
            reply = (
                "A configured Gemini model isn't available for generation on this "
                "API key (still true even after being set to gemini-2.5-flash — "
                "see the real error below). Check Backend/.env AND make sure the "
                "backend process was fully restarted (not just reloaded), then "
                "check the '[config] GEMINI_CHAT_MODEL=...' line printed at "
                f"startup.\n\nRaw error: {message}"
            )
        else:
            reply = (
                "The intelligence backend hit an error processing that request. "
                f"({type(exc).__name__}: {exc})"
            )

        return {"response": reply, "action": None}