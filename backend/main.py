from fastapi import (
    FastAPI,
    HTTPException,
    Header,
    UploadFile,
    File,
    Form,
)
from fastapi.middleware.cors import CORSMiddleware

from openai import OpenAI
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials, auth

import os
import json
import base64
import mimetypes


# ============================================================
# Environment
# ============================================================

load_dotenv()


# ============================================================
# Firebase Admin
# ============================================================

firebase_service_account = os.getenv(
    "FIREBASE_SERVICE_ACCOUNT_JSON"
)

if not firebase_service_account:
    raise RuntimeError(
        "FIREBASE_SERVICE_ACCOUNT_JSON is not configured"
    )

try:
    firebase_service_account_info = json.loads(
        firebase_service_account
    )

    if not firebase_admin._apps:
        firebase_admin.initialize_app(
            credentials.Certificate(
                firebase_service_account_info
            )
        )

except Exception as error:
    print(
        "Firebase initialization error:",
        error
    )
    raise


# ============================================================
# FastAPI
# ============================================================

app = FastAPI(
    title="Technology AI Assistant",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://frontend-git-main-salesforce21.vercel.app",
        "https://frontend-rho-liart-ck2le9pec.vercel.app",
        "https://www.salesforce-ai-assistant.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# OpenAI Client
# ============================================================

openai_api_key = os.getenv(
    "OPENAI_API_KEY"
)

if not openai_api_key:
    raise RuntimeError(
        "OPENAI_API_KEY is not configured"
    )

client = OpenAI(
    api_key=openai_api_key
)


# ============================================================
# AI Instructions
# ============================================================

AI_INSTRUCTIONS = """
You are a highly capable general-purpose AI assistant.

Your goal is to understand the user's question and provide
a useful, accurate, practical, and easy-to-understand answer.

You are NOT limited to Salesforce.

You can answer questions about:

- Salesforce
- ServiceNow
- SAP
- Python
- Java
- JavaScript
- React
- HTML
- CSS
- APIs
- Databases
- Cloud computing
- AWS
- Azure
- Google Cloud
- DevOps
- Git
- Testing
- Selenium
- Playwright
- Cypress
- Appium
- Automation
- Software engineering
- Programming
- Business technology
- General technology
- Other technologies

You should also answer questions about technologies
that are not explicitly listed above.


==================================================
LANGUAGE SUPPORT
==================================================

Understand the user's language automatically.

The user may write in:

English, Telugu, Hindi, Tamil, Kannada, Malayalam,
Marathi, Bengali, Gujarati, Punjabi, Urdu, Spanish,
French, German, Portuguese, Japanese, Korean, Chinese,
Arabic, or other languages.

The user may mix languages.

The user may also type Indian languages using English letters.

Examples:

"naku python lo loop explain cheyyi"

"mujhe java ka program samjhao"

"oka validation rule ela create cheyalo cheppu"

Understand the intended meaning.

Do not force the user to select a language.

Whenever practical, answer in the same language or
mixed-language style used by the user.

If the user asks in Telugu + English, respond naturally
in Telugu + English.

If the user asks in Hindi + English, respond naturally
in Hindi + English.

If the user asks in English, respond in English.

If the user explicitly requests another language,
follow that request.


==================================================
SALESFORCE QUESTIONS
==================================================

When the question is about Salesforce, provide a practical
Salesforce-specific answer.

For Salesforce implementation questions:

1. Give the recommended solution first.
2. Give clear step-by-step instructions.
3. Keep every step separate.
4. Explain where to navigate in Salesforce.
5. Explain what to click.
6. Explain what to configure.
7. Mention relevant Salesforce features when applicable:
   - Objects
   - Fields
   - Flow
   - Validation Rules
   - Profiles
   - Permission Sets
   - Role Hierarchy
   - Sharing Rules
   - OWD
   - Apex
   - LWC
   - SOQL
   - SOSL
   - CPQ
   - Integrations
   - Automation

8. Include code when required.
9. Include testing scenarios when useful.
10. Mention assumptions and limitations.
11. Prefer current Salesforce functionality.
12. Do not invent Salesforce features.

For Salesforce questions, use this structure when appropriate:

Recommended Solution

Step 1 — Action

1. Navigation
2. What to click
3. What to configure

Step 2 — Action

1. Navigation
2. What to click
3. What to configure

Example / Code

Testing

Test 1 — Scenario

Expected Result

Important Notes


==================================================
PROGRAMMING QUESTIONS
==================================================

For programming questions:

- Explain the concept clearly.
- Provide working code when useful.
- Explain the code simply.
- Mention expected output when useful.
- Carefully diagnose errors.
- Match the requested programming language.
- Do not unnecessarily change languages.

For beginners, keep explanations simple.

For advanced users, provide more technical detail.


==================================================
TESTING QUESTIONS
==================================================

For testing questions, explain practical approaches
including when relevant:

- Test scenarios
- Test cases
- Functional testing
- Regression testing
- Sanity testing
- Smoke testing
- Integration testing
- UAT
- Test planning
- Test strategy
- Defect lifecycle
- Automation testing
- API testing
- UI testing

For automation questions, provide practical examples
for Playwright, Selenium, Cypress, Appium, or other
relevant tools.


==================================================
BUSINESS QUESTIONS
==================================================

For business technology questions:

1. Understand the business requirement.
2. Explain the recommended solution.
3. Give practical implementation steps.
4. Mention alternatives when useful.
5. Explain risks and limitations.

Do not assume every business problem requires Salesforce.


==================================================
UPLOADED FILES
==================================================

When an image or document is uploaded, analyze the
uploaded content carefully.

If the user asks a question about the uploaded content,
base the answer on the uploaded content.

Do not pretend to see information that is not actually
present in the uploaded file.

If the uploaded content is unclear, explain what is unclear.

For images:

- Analyze visible objects.
- Read visible text where possible.
- Analyze diagrams.
- Analyze charts.
- Analyze code.
- Analyze error messages.
- Analyze Salesforce screens.
- Analyze UI elements.

For documents:

- Understand the document content.
- Summarize when requested.
- Answer questions based on the document.
- Explain relevant sections.


==================================================
RESPONSE STYLE
==================================================

Answer directly and clearly.

For simple questions, keep the answer concise.

For complex questions, use:

- Headings
- Numbered steps
- Bullet points
- Code blocks
- Examples
- Testing scenarios

Match the user's technical knowledge.

If the user uses informal language, respond naturally.

Do not pretend to know something you do not know.

Do not invent commands, APIs, configuration options,
or software features.

Focus on solving the user's actual question.
"""


# ============================================================
# Firebase Authentication
# ============================================================

def verify_user(
    authorization: str | None
):

    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authentication required.",
        )

    if not authorization.startswith(
        "Bearer "
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication format.",
        )

    id_token = authorization.split(
        " ",
        1
    )[1]

    if not id_token:
        raise HTTPException(
            status_code=401,
            detail="Missing authentication token.",
        )

    try:

        decoded_token = auth.verify_id_token(
            id_token
        )

        return decoded_token["uid"]

    except Exception as error:

        print(
            "Firebase token verification error:",
            error
        )

        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token.",
        )


# ============================================================
# Home
# ============================================================

@app.get("/")
def home():

    return {
        "message":
            "Salesforce AI Assistant backend is running",
        "status":
            "ok",
    }


# ============================================================
# Normal Text Chat
# ============================================================

@app.post("/chat")
def chat(
    data: dict,
    authorization: str | None = Header(
        default=None
    ),
):

    uid = verify_user(
        authorization
    )

    print(
        f"Authenticated Firebase user: {uid}"
    )

    question = data.get(
        "question",
        ""
    )

    if not isinstance(
        question,
        str
    ):
        raise HTTPException(
            status_code=400,
            detail="Question must be text.",
        )

    if not question.strip():

        return {
            "answer":
                "Please enter a question.",
            "illustration":
                None,
        }

    try:

        response = client.responses.create(
            model="gpt-5.6-luna",
            instructions=AI_INSTRUCTIONS,
            input=question,
        )

        answer = response.output_text

        return {
            "answer":
                answer,
            "illustration":
                None,
        }

    except Exception as error:

        print(
            "Chat error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "The AI assistant encountered "
                "an error."
            ),
        )


# ============================================================
# Uploaded Image / File Chat
# ============================================================

@app.post("/chat-upload")
async def chat_upload(
    question: str = Form(
        default=""
    ),
    file: UploadFile = File(...),
    authorization: str | None = Header(
        default=None
    ),
):

    uid = verify_user(
        authorization
    )

    print(
        f"Authenticated Firebase user: {uid}"
    )

    if not file:
        raise HTTPException(
            status_code=400,
            detail="No file uploaded.",
        )

    filename = (
        file.filename
        or "uploaded-file"
    )

    content_type = (
        file.content_type
        or mimetypes.guess_type(
            filename
        )[0]
        or "application/octet-stream"
    )

    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    print(
        f"Uploaded file: {filename} | "
        f"type={content_type} | "
        f"size={len(file_bytes)} bytes"
    )

    user_question = question.strip()

    if not user_question:
        user_question = (
            "Please analyze this uploaded file "
            "and explain the important information "
            "in it."
        )

    try:

        # ====================================================
        # IMAGE
        # ====================================================

        if content_type.startswith(
            "image/"
        ):

            encoded_image = (
                base64.b64encode(
                    file_bytes
                ).decode("utf-8")
            )

            image_data_url = (
                f"data:{content_type};base64,"
                f"{encoded_image}"
            )

            response = client.responses.create(

                model="gpt-5.6-luna",

                instructions=AI_INSTRUCTIONS,

                input=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type":
                                    "input_text",
                                "text":
                                    user_question,
                            },
                            {
                                "type":
                                    "input_image",
                                "image_url":
                                    image_data_url,
                                "detail":
                                    "auto",
                            },
                        ],
                    }
                ],
            )

            answer = (
                response.output_text
            )

            return {
                "answer":
                    answer,
                "filename":
                    filename,
                "file_type":
                    content_type,
                "illustration":
                    None,
            }


        # ====================================================
        # PDF / DOCUMENT / TEXT
        # ====================================================

        document_types = [
            "application/pdf",
            "text/plain",
            "text/csv",
            "text/markdown",
            "text/xml",
            "application/json",
            "application/xml",
            "application/msword",
            "application/vnd.ms-excel",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ]

        if (
            content_type in document_types
            or content_type.startswith(
                "text/"
            )
        ):

            encoded_file = (
                base64.b64encode(
                    file_bytes
                ).decode("utf-8")
            )

            file_data = (
                f"data:{content_type};base64,"
                f"{encoded_file}"
            )

            response = client.responses.create(

                model="gpt-5.6-luna",

                instructions=AI_INSTRUCTIONS,

                input=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type":
                                    "input_text",
                                "text":
                                    user_question,
                            },
                            {
                                "type":
                                    "input_file",
                                "filename":
                                    filename,
                                "file_data":
                                    file_data,
                            },
                        ],
                    }
                ],
            )

            answer = (
                response.output_text
            )

            return {
                "answer":
                    answer,
                "filename":
                    filename,
                "file_type":
                    content_type,
                "illustration":
                    None,
            }


        # ====================================================
        # VIDEO
        # ====================================================

        if content_type.startswith(
            "video/"
        ):

            return {
                "answer": (
                    "The video was received successfully, "
                    "but video frame analysis is not enabled "
                    "yet. Video analysis will be added in "
                    "the next backend update."
                ),
                "filename":
                    filename,
                "file_type":
                    content_type,
                "illustration":
                    None,
            }


        # ====================================================
        # UNSUPPORTED
        # ====================================================

        return {
            "answer": (
                f"The file '{filename}' was uploaded "
                f"successfully, but this file type "
                f"({content_type}) is not supported "
                f"for AI analysis yet."
            ),
            "filename":
                filename,
            "file_type":
                content_type,
            "illustration":
                None,
        }

    except Exception as error:

        print(
            "Upload analysis error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "The AI assistant could not "
                "analyze the uploaded file."
            ),
        )