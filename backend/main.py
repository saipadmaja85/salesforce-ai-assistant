from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)


def generate_salesforce_illustration(prompt):
    try:
        result = client.images.generate(
            model="gpt-image-2",
            prompt=prompt,
            size="1024x1024",
        )

        if result.data and result.data[0].b64_json:
            return result.data[0].b64_json

        return None

    except Exception as error:
        print("Image generation error:", error)
        return None


@app.get("/")
def home():
    return {
        "message": "Salesforce AI Assistant backend is running"
    }


@app.post("/chat")
def chat(data: dict):

    question = data.get("question", "")

    if not question.strip():
        return {
            "answer": "Please enter a question.",
            "illustration": None
        }

    try:

        response = client.responses.create(
            model="gpt-5.6-luna",
            instructions="""
You are a Salesforce AI Assistant.

Your job is to answer Salesforce and business scenario questions
accurately and practically.

For Salesforce questions:

1. Give the Recommended Solution first.

2. Give clear step-by-step Salesforce Setup instructions.

3. Keep every step separate.
Do not combine multiple steps into one paragraph.

4. Use clear headings.

5. For every step, explain:
- Where to navigate in Salesforce
- What to click
- What to configure
- Important configuration details

6. Mention the relevant Salesforce object, field, Flow,
validation rule, permission, automation, Apex, LWC,
or other feature when applicable.

7. Include Apex, SOQL, LWC, or other code when required.

8. Include Testing with test scenarios and expected results.

9. Include Important Notes covering assumptions,
limitations, and org-specific differences.

10. Prefer current Salesforce functionality.

11. Avoid outdated Salesforce features.

12. Never invent Salesforce features or configuration options.

13. Keep every implementation step separate.

Use this structure:

Recommended Solution

Step 1 — [Action]

1. [Exact Salesforce navigation]
2. [What to click]
3. [What to configure]

Step 2 — [Action]

1. [Exact Salesforce navigation]
2. [What to click]
3. [What to configure]

Testing

Test 1 — [Scenario]

Expected Result:
[Expected result]

Important Notes

- [Important note]

For business scenarios, translate the requirement
into a practical Salesforce solution.

Make every answer clear, detailed, practical,
and easy for a Salesforce Admin, Tester, Developer,
or Consultant to follow.
""",
            input=question,
        )

        answer = response.output_text

        illustration_prompt = f"""
Create a professional educational illustration explaining
the Salesforce solution for this question:

{question}

Create a conceptual Salesforce administration diagram,
not a real Salesforce screenshot.

Show the important Salesforce concepts visually,
such as objects, fields, Flow, automation, page layout,
Dynamic Forms, permissions, or other relevant concepts.

Use a clean enterprise software-training illustration style.

Do not use Salesforce logos.
Do not copy Salesforce copyrighted UI.
Do not pretend this is an actual Salesforce screenshot.

The image will be included in technical documentation.
"""

        illustration = generate_salesforce_illustration(
            illustration_prompt
        )

        return {
            "answer": answer,
            "illustration": illustration
        }

    except Exception as error:

        print("Chat error:", error)

        return {
            "answer": "The AI assistant encountered an error while processing your question.",
            "illustration": None
        }