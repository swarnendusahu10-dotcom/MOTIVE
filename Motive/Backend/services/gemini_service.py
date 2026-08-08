import os
import json
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

genai.configure(
    api_key=os.getenv("GEMINI_API_KEY")
)

model = genai.GenerativeModel("gemini-2.5-flash")


def ask_gemini(message):
    response = model.generate_content(message)

    return response.text
def extract_action(query):

    prompt = f"""
Return ONLY valid JSON.

Use EXACTLY this schema:

{{
  "tool": "",
  "district": "",
  "crime": ""
}}

Available tools:
- showHotspots
- showCrimeTrend
- compareDistricts
- zoomDistrict

Do not create other keys.
Do not use tool_code.
Do not use parameters.
Do not add explanations..

User:
{query}
"""

    response = model.generate_content(prompt)

    text = response.text.strip()

    text = text.replace("```json", "")
    text = text.replace("```", "")

    return json.loads(text)