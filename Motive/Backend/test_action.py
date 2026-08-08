from services.gemini_service import extract_action

result = extract_action(
    "Show robbery hotspots in Mysuru"
)

print(result)
print(type(result))