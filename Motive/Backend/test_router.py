from services.gemini_service import extract_action
from tools.router import execute_tool

action = extract_action(
    "Show robbery hotspots in Mysuru"
)

print("Action:")
print(action)

result = execute_tool(action)

print("\nResult:")
print(result)