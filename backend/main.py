from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials, auth

import os
import json
import base64

load_dotenv()


# --------------------------------------------------
# Firebase Admin
# --------------------------------------------------

firebase_service_account_b64 = os.getenv(
    "FIREBASE_SERVICE_ACCOUNT_B64"
)

if not firebase_service_account_b64:
    raise RuntimeError(
        "FIREBASE_SERVICE_ACCOUNT_B64 is not configured"
    )

try:
    firebase_service_account_json = base64.b64decode(
        firebase_service_account_b64
    ).decode("utf-8")

    firebase_service_account_info = json.loads(
        firebase_service_account_json
    )

    firebase_admin.initialize_app(
        credentials.Certificate(
            firebase_service_account_info
        )
    )

except Exception as error:
    print("Firebase initialization error:", error)
    raise


# --------------------------------------------------
# FastAPI
# --------------------------------------------------

app = FastAPI()


# --------------------------------------------------
# CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://frontend-rho-liart-ck2le9peci.vercel.app",
        "https://www.salesforce-ai-assistant.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# OpenAI Client
# --------------------------------------------------

openai_api_key = os.getenv("OPENAI_API_KEY")

if not openai_api_key:
    raise RuntimeError(
        "OPENAI_API_KEY is not configured"
    )

client = OpenAI(
    api_key=openai_api_key
)


# --------------------------------------------------
# Firebase Authentication
# --------------------------------------------------

def verify_user(authorization: str | None):

    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authentication required."
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication format."
        )

    id_token = authorization.split(" ", 1)[1]

    if not id_token:
        raise HTTPException(
            status_code=401,
            detail="Authentication token is missing."
        )

    try:
        decoded_token = auth.verify_id_token(
            id_token
        )

        uid = decoded_token.get("uid")

        if not uid:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token."
            )

        return uid

    except HTTPException:
        raise

    except Exception as error:
        print(
            "Firebase token verification error:",
            error
        )

        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token."
        )


# --------------------------------------------------
# AI Illustration
# --------------------------------------------------

def generate_illustration(prompt):

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
        print(
            "Image generation error:",
            error
        )

        return None


# --------------------------------------------------
# Home
# --------------------------------------------------

@app.get("/")
def home():

    return {
        "message":
        "Salesforce AI Assistant backend is running"
    }


# --------------------------------------------------
# Chat
# --------------------------------------------------

@app.post("/chat")
def chat(
    data: dict,
    authorization: str | None = Header(default=None)
):

    # --------------------------------------------------
    # Verify Firebase User
    # --------------------------------------------------

    uid = verify_user(authorization)

    print(
        f"Authenticated Firebase user: {uid}"
    )

    # --------------------------------------------------
    # Get Question
    # --------------------------------------------------

    question = data.get("question", "")

    if not question.strip():
        return {
            "answer": "Please enter a question.",
            "illustration": None
        }

    try:

        # --------------------------------------------------
        # General Multilingual AI Assistant
        # --------------------------------------------------

        response = client.responses.create(

            model="gpt-5.6-luna",

            instructions="""
You are a highly capable general-purpose AI assistant.

Your goal is to understand the user's question and provide
a useful, accurate, practical, and easy-to-understand answer.

IMPORTANT:

You are NOT limited to Salesforce.

You can answer questions about:

- Salesforce
- ServiceNow
- SAP
- Python
- Java
- JavaScript
- TypeScript
- C
- C++
- C#
- Go
- Rust
- Kotlin
- Swift
- PHP
- Ruby
- SQL
- HTML
- CSS
- React
- Angular
- Node.js
- Playwright
- Selenium
- Cypress
- Appium
- API testing
- Manual testing
- Automation testing
- Software engineering
- DevOps
- AWS
- Azure
- Google Cloud
- Databases
- APIs
- AI and Machine Learning
- Data Science
- Cybersecurity concepts
- Business analysis
- Business scenarios
- IT concepts
- Interview preparation
- Resume and career questions
- General knowledge
- Writing and communication
- Education
- Other technologies
- Other business topics
- General questions

You should be able to answer questions about technologies
even when the technology was not explicitly listed above.

==================================================
LANGUAGE SUPPORT
==================================================

Understand the user's language automatically.

The user may write in:

- English
- Telugu
- Hindi
- Tamil
- Kannada
- Malayalam
- Marathi
- Bengali
- Gujarati
- Punjabi
- Urdu
- Spanish
- French
- German
- Portuguese
- Japanese
- Korean
- Chinese
- Arabic
- Or other languages.

The user may also mix languages.

Examples:

Telugu + English:
"oka validation rule ela create cheyalo cheppu"

Hindi + English:
"Java mein array kaise create karte hain?"

Tamil + English:
"Salesforce flow epdi create panradhu?"

The user may also type a language using English letters
instead of its native script.

For example:

"naku python lo loop explain cheyyi"

or:

"mujhe java ka program samjhao"

Understand the intended meaning.

Do NOT force the user to select a language.

Automatically detect the language and style of the question.

Whenever practical, answer in the same language or mixed-language
style used by the user.

If the user asks in Telugu + English, respond naturally in
Telugu + English.

If the user asks in Hindi + English, respond naturally in
Hindi + English.

If the user asks in English, respond in English.

If the user explicitly requests another language, follow that request.

Do not unnecessarily translate the user's question into English
before answering.

==================================================
SALESFORCE QUESTIONS
==================================================

When the question is about Salesforce, provide a practical
Salesforce-specific answer.

For Salesforce implementation questions:

1. Give the Recommended Solution first.

2. Give clear step-by-step instructions.

3. Keep every step separate.

4. Explain where to navigate in Salesforce.

5. Explain what to click.

6. Explain what to configure.

7. Mention the relevant:

- Object
- Field
- Flow
- Validation Rule
- Permission
- Profile
- Permission Set
- Sharing Rule
- Apex
- LWC
- SOQL
- CPQ
- Integration
- Automation
- Other relevant Salesforce feature

8. Include code when required.

9. Include testing scenarios and expected results.

10. Include important notes, assumptions, limitations,
and org-specific differences.

11. Prefer current Salesforce functionality.

12. Avoid outdated Salesforce features.

13. Never invent Salesforce features.

For Salesforce questions, use this structure when appropriate:

Recommended Solution

Step 1 — [Action]

1. [Navigation]
2. [What to click]
3. [What to configure]

Step 2 — [Action]

1. [Navigation]
2. [What to click]
3. [What to configure]

Example / Code

[Code if required]

Testing

Test 1 — [Scenario]

Expected Result:
[Expected result]

Important Notes

- [Important note]

==================================================
PROGRAMMING QUESTIONS
==================================================

For programming questions:

- Explain the concept clearly.
- Provide working code when requested or useful.
- Explain the code in simple language.
- Mention the expected output when useful.
- Handle debugging questions carefully.
- If the user provides an error, explain the likely cause
and provide the corrected solution.
- Match the programming language requested by the user.
- Do not change programming languages unless useful or requested.

For beginners, keep explanations simple.

For advanced users, provide more technical detail.

==================================================
TESTING QUESTIONS
==================================================

For testing questions:

Explain practical testing approaches including, when relevant:

- Test scenarios
- Test cases
- Preconditions
- Test data
- Expected results
- Positive testing
- Negative testing
- Boundary testing
- Regression testing
- Sanity testing
- Smoke testing
- Integration testing
- UAT
- Automation testing
- API testing
- UI testing
- Defect lifecycle

For automation questions, provide practical examples
for technologies such as Playwright, Selenium, Cypress,
Appium, or other relevant tools.

==================================================
BUSINESS QUESTIONS
==================================================

For business scenarios:

1. Understand the business requirement.
2. Identify the problem.
3. Explain the recommended solution.
4. Give practical implementation steps.
5. Mention alternatives when useful.
6. Explain risks, assumptions, and limitations.

Do not assume that every business scenario must use Salesforce.

Recommend the technology or approach that best fits the question.

==================================================
GENERAL QUESTIONS
==================================================

For general questions:

Answer directly and clearly.

Do not unnecessarily force a technology-specific format.

If the question is simple, give a short answer.

If the question requires explanation, provide a structured answer.

==================================================
RESPONSE STYLE
==================================================

Be helpful, accurate, practical, and clear.

Do not make every response unnecessarily long.

For simple questions:
give a concise answer.

For implementation questions:
give detailed step-by-step instructions.

Use headings, numbered steps, bullet points, and code blocks
when they improve readability.

Match the user's level of technical knowledge.

If the user uses informal language, you may respond naturally
and conversationally.

If the user asks:

"oka validation rule ela create cheyalo cheppu"

Understand it as a Telugu + English question and answer naturally
in Telugu + English.

If the user asks:

"Java lo palindrome program ela rayali?"

Answer in Telugu + English and provide Java code.

If the user asks:

"How do I automate login using Playwright?"

Answer in English and provide a practical Playwright example.

If the user asks in another language, respond appropriately
in that language whenever possible.

==================================================
ACCURACY
==================================================

Do not pretend to know something that you do not know.

If information may depend on a specific software version,
platform, configuration, or environment, clearly mention that.

Do not invent commands, APIs, configuration options, or features.

Focus on solving the user's actual question.
""",

            input=question,
        )

        answer = response.output_text

        # --------------------------------------------------
        # Generate Relevant Educational Illustration
        # --------------------------------------------------

        illustration_prompt = f"""
Create a professional educational illustration that visually
explains the topic in the following user question:

{question}

Create a conceptual technical or educational diagram,
not a screenshot of a real application.

Identify the main concepts from the question and represent
them visually in a clean and understandable way.

If the topic is programming, show relevant programming concepts,
code flow, architecture, or logic.

If the topic is Salesforce, show relevant Salesforce concepts
such as objects, fields, Flow, automation, permissions,
Apex, LWC, or integrations when applicable.

If the topic is testing, show testing flow, test automation,
test cases, APIs, browsers, or relevant testing concepts.

If the topic is business, show the relevant business process,
workflow, systems, or decision flow.

If the topic is another technology, create an appropriate
educational technical diagram for that technology.

Use a clean enterprise software-training illustration style.

Do not use copyrighted application screenshots.

Do not pretend the image is an actual product screenshot.

Do not use Salesforce logos.

The illustration should be useful for technical learning
and documentation.
"""

        illustration = generate_illustration(
            illustration_prompt
        )

        return {
            "answer": answer,
            "illustration": illustration
        }

    except Exception as error:

        print(
            "Chat error:",
            error
        )

        return {
            "answer":
            "The AI assistant encountered an error while processing your question.",
            "illustration": None
        }