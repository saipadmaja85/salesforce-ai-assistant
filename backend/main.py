from fastapi import FastAPI, HTTPException, Header, UploadFile, File, Form
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
    print("Firebase initialization error:", error)
    raise


# ============================================================
# FastAPI
# ============================================================

app = FastAPI(
    title="Technology AI Assistant",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://frontend-git-main-salesforce21.vercel.app",
        "https://frontend-rho-liart-ck2le9peci.vercel.app",
        "https://www.salesforce-ai-assistant.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# OpenAI Client
# ============================================================

openai_api_key = os.getenv("OPENAI_API_KEY")

if not openai_api_key:
    raise RuntimeError(
        "OPENAI_API_KEY is not configured"
    )

client = OpenAI(
    api_key=openai_api_key
)


# ============================================================
# Firebase Authentication
# ============================================================

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

    id_token = authorization.split(
        " ",
        1
    )[1]

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

You should also answer questions about technologies
that are not explicitly listed above.

==================================================
LANGUAGE SUPPORT
==================================================

Understand the user's language automatically.

The user may write in English, Telugu, Hindi, Tamil,
Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi,
Urdu, Spanish, French, German, Portuguese, Japanese,
Korean, Chinese, Arabic, or other languages.

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

When the question is about Salesforce, provide a
practical Salesforce-specific answer.

For Salesforce implementation questions:

1. Give the Recommended Solution first.
2. Give clear step-by-step instructions.
3. Keep every step separate.
4. Explain where to navigate in Salesforce.
5. Explain what to click.
6. Explain what to configure.
7. Mention relevant objects, fields, flows,
   validation rules, permissions, profiles,
   permission sets, sharing rules, Apex, LWC,
   SOQL, CPQ, integrations, and automation
   when applicable.
8. Include code when required.
9. Include testing scenarios and expected results.
10. Mention important notes and limitations.
11. Prefer current Salesforce functionality.
12. Avoid outdated Salesforce features.
13. Never invent Salesforce features.

==================================================
PROGRAMMING QUESTIONS
==================================================

For programming questions:

- Explain the concept clearly.
- Provide working code when useful.
- Explain the code simply.
- Mention expected output when useful.
- Carefully diagnose errors.
- Match the programming language requested.
- Do not change programming languages unnecessarily.

==================================================
TESTING QUESTIONS
==================================================

For testing questions, explain practical approaches
including when relevant:

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
for Playwright, Selenium, Cypress, Appium, or other
relevant tools.

==================================================
BUSINESS QUESTIONS
==================================================

For business scenarios:

1. Understand the business requirement.
2. Identify the problem.
3. Explain the recommended solution.
4. Give practical implementation steps.
5. Mention alternatives when useful.
6. Explain risks and limitations.

Do not assume every business problem requires Salesforce.

==================================================
GENERAL QUESTIONS
==================================================

For general questions:

Answer directly and clearly.

For simple questions, keep the answer concise.

For complex questions, use structured explanations.

==================================================
UPLOADED FILES
==================================================

When an image or document is uploaded, analyze the
uploaded content carefully.

If the user asks a question about the uploaded content,
base the answer on the uploaded content.

Do not pretend that you saw information that is not
actually present in the uploaded file.

If the uploaded content is unclear, explain what is unclear.

For images:

- Identify visible objects, text, diagrams, UI elements,
  charts, code, errors, or other relevant content.
- Answer the user's question based on the image.

For documents:

- Extract and understand the relevant content.
- Summarize or explain it when requested.
- Answer questions about the document.

==================================================
RESPONSE STYLE
==================================================

Be helpful, accurate, practical, and clear.

Do not make every response unnecessarily long.

For simple questions:
give a concise answer.

For implementation questions:
give detailed step-by-step instructions.

Use headings, numbered steps, bullet points, and code
blocks when they improve readability.

Match the user's level of technical knowledge.

If the user uses informal language, respond naturally.
"""


# ============================================================
# AI Illustration
# ============================================================

def generate_illustration(prompt):

    try:

        result = client.images.generate(
            model="gpt-image-2",
            prompt=prompt,
            size="1024x1024",
        )

        if (
            result.data
            and result.data[0].b64_json
        ):
            return result.data[0].b64_json

        return None

    except Exception as error:

        print(
            "Image generation error:",
            error
        )

        return None


# ============================================================
# Home
# ============================================================

@app.get("/")
def home():

    return {
        "message": "Salesforce AI Assistant backend is running",
        "status": "ok"
    }


# ============================================================
# Normal Text Chat
# ============================================================

@app.post("/chat")
def chat(
    data: dict,
    authorization: str | None = Header(
        default=None
    )
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

    if not question.strip():

        return {
            "answer": "Please enter a question.",
            "illustration": None
        }

    try:

        response = client.responses.create(

            model="gpt-5.6-luna",

            instructions=AI_INSTRUCTIONS,

            input=question,
        )

        answer = response.output_text

        return {
            "answer": answer,
            "illustration": None
        }

    except Exception as error:

        print(
            "Chat error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail="The AI assistant encountered an error."
        )


# ============================================================
# Uploaded Image / File Chat
# ============================================================

@app.post("/chat-upload")
async def chat_upload(
    question: str = Form(default=""),
    file: UploadFile = File(...),
    authorization: str | None = Header(
        default=None
    )
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
            detail="No file uploaded."
        )

    filename = file.filename or "uploaded-file"

    content_type = (
        file.content_type
        or mimetypes.guess_type(filename)[0]
        or "application/octet-stream"
    )

    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty."
        )

    print(
        f"Uploaded file: {filename} | "
        f"type={content_type} | "
        f"size={len(file_bytes)} bytes"
    )

    try:

        user_question = question.strip()

        if not user_question:

            user_question = (
                "Please analyze this uploaded file and "
                "explain the important information in it."
            )

        # ----------------------------------------------------
        # IMAGE
        # ----------------------------------------------------

        if content_type.startswith("image/"):

            encoded_image = base64.b64encode(
                file_bytes
            ).decode("utf-8")

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
                                "type": "input_text",
                                "text": user_question
                            },
                            {
                                "type": "input_image",
                                "image_url": image_data_url,
                                "detail": "auto"
                            }
                        ]
                    }
                ]
            )

            answer = response.output_text

            return {
                "answer": answer,
                "filename": filename,
                "file_type": content_type,
                "illustration": None
            }

        # ----------------------------------------------------
        # DOCUMENT / PDF / TEXT FILE
        # ----------------------------------------------------

        if (
            content_type == "application/pdf"
            or content_type.startswith("text/")
            or content_type
            in [
                "application/json",
                "application/xml",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-powerpoint",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ]
        ):

            encoded_file = base64.b64encode(
                file_bytes
            ).decode("utf-8")

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
                                "type": "input_text",
                                "text": user_question
                            },
                            {
                                "type": "input_file",
                                "filename": filename,
                                "file_data": file_data
                            }
                        ]
                    }
                ]
            )

            answer = response.output_text

            return {
                "answer": answer,
                "filename": filename,
                "file_type": content_type,
                "illustration": None
            }

        # ----------------------------------------------------
        # VIDEO
        # ----------------------------------------------------

        if content_type.startswith("video/"):

            return {
                "answer": (
                    "The video was received successfully, but "
                    "video frame analysis is not enabled yet. "
                    "The next backend update will extract video "
                    "frames and send them to the AI for analysis."
                ),
                "filename": filename,
                "file_type": content_type,
                "illustration": None
            }

        # ----------------------------------------------------
        # UNSUPPORTED FILE
        # ----------------------------------------------------

        return {
            "answer": (
                f"The file '{filename}' was uploaded successfully, "
                f"but this file type ({content_type}) is not "
                f"supported for AI analysis yet."
            ),
            "filename": filename,
            "file_type": content_type,
            "illustration": None
        }

    except Exception as error:

        print(
            "Upload analysis error:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "The AI assistant could not analyze "
                "the uploaded file."
            )
        )