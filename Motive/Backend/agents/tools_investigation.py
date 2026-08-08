from langchain_core.tools import tool

@tool
def request_more_information(
    missing_information: str
):
    """
    Used when there is insufficient information
    to continue an investigation.
    """

    return {
        "status": "need_more_information",
        "question": missing_information
    }

INVESTIGATION_TOOLS = [
    request_more_information
]