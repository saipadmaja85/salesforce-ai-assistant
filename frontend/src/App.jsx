import { useEffect, useRef, useState } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import salesforceRobot from "./assets/salesforce-ai-robot.png";

// ==================================================
// FIREBASE
// Keep your existing Firebase values here.
// Do NOT share them in chat.
// ==================================================

const firebaseConfig = {
  apiKey: "AIzaSyDJu1Zp5QqAMBN-Jt4FjE5V6CVgZNQJtHg",
  authDomain: "salesforce-ai-assistant-98aad.firebaseapp.com",
  projectId: "salesforce-ai-assistant-98aad",
  storageBucket: "salesforce-ai-assistant-98aad.firebasestorage.app",
  messagingSenderId: "2876872987",
  appId: "1:2876872987:web:83cff45c3be2d0a20b1bbe",
  measurementId: "G-Q7D55Y6263",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();

// ==================================================
// BACKEND
// ==================================================

const BACKEND_URL =
  "https://salesforce-ai-assistant-8gvo.onrender.com";

// ==================================================
// APP
// ==================================================

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [conversationHistory, setConversationHistory] = useState([]);
  const [illustration, setIllustration] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const [selectedFiles, setSelectedFiles] = useState([]);

  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const [installPrompt, setInstallPrompt] = useState(null);
  const [showPro, setShowPro] = useState(false);

  // ==================================================
  // AUTH LISTENER
  // ==================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  // ==================================================
  // INSTALL PROMPT
  // ==================================================

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  // ==================================================
  // GOOGLE LOGIN
  // ==================================================

  const handleLogin = async () => {
    try {
      setMessage("");
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google login error:", error);

      setMessage(
        "Unable to sign in. Please check your Firebase configuration."
      );
    }
  };

  const handleEmailLogin = async (email, password) => {
    try {
      setMessage("");
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Email login error:", error);
      setMessage(error.code === "auth/invalid-credential"
        ? "Invalid email or password."
        : "Unable to login. Please check your details.");
    }
  };

  const handleSignUp = async (email, password, confirmPassword) => {
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    try {
      setMessage("");
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Sign up error:", error);
      setMessage(error.code === "auth/email-already-in-use"
        ? "An account already exists with this email."
        : "Unable to create account. Please check your details.");
    }
  };

  const handleForgotPassword = async (email) => {
    if (!email) {
      setMessage("Please enter your email address first.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent. Please check your inbox.");
    } catch (error) {
      console.error("Password reset error:", error);
      setMessage("Unable to send password reset email. Please check your email.");
    }
  };

  // ==================================================
  // LOGOUT
  // ==================================================

  const handleLogout = async () => {
    try {
      await signOut(auth);

      setAnswer("");
      setQuestion("");
      setSelectedFiles([]);
      setMessage("");
    } catch (error) {
      console.error(error);
      setMessage("Unable to sign out.");
    }
  };

  // ==================================================
  // INSTALL
  // ==================================================

  const handleInstallApp = async () => {
    if (!installPrompt) {
      setMessage(
        "Install is not available automatically in this browser. Use your browser menu and choose Install App or Add to Home Screen."
      );
      return;
    }

    try {
      installPrompt.prompt();

      const result = await installPrompt.userChoice;

      if (result.outcome === "accepted") {
        setMessage("App installation started.");
      } else {
        setMessage("App installation was cancelled.");
      }

      setInstallPrompt(null);
    } catch (error) {
      console.error(error);
      setMessage("Unable to install the app.");
    }
  };

  // ==================================================
  // FILE SELECT
  // ==================================================

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) return;

    setSelectedFiles((previous) => [
      ...previous,
      ...files,
    ]);

    setMessage(
      `${files.length} file${
        files.length > 1 ? "s" : ""
      } selected successfully.`
    );

    event.target.value = "";
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((previous) =>
      previous.filter(
        (_, fileIndex) => fileIndex !== index
      )
    );
  };

  const clearSelectedFiles = () => {
    setSelectedFiles([]);
  };

  // ==================================================
  // ASK AI
  // ==================================================

  const askQuestion = async (voiceQuestion = null) => {
    const finalQuestion =
      voiceQuestion !== null
        ? voiceQuestion.trim()
        : question.trim();

    if (
      !finalQuestion &&
      selectedFiles.length === 0
    ) {
      setMessage(
        "Please type a question, speak a question, or upload a file."
      );
      return;
    }

    if (!user) {
      setMessage(
        "Please sign in with Google before using the AI."
      );
      return;
    }

    setLoading(true);
    setMessage("");
    setAnswer("");
    setIllustration(null);

    try {
      const token = await user.getIdToken();

      // --------------------------------------------
      // FILE / IMAGE / VIDEO
      // --------------------------------------------

      if (selectedFiles.length > 0) {
        const formData = new FormData();

        formData.append(
          "question",
          finalQuestion
        );

        formData.append(
          "file",
          selectedFiles[0]
        );

        const response = await fetch(
          `${BACKEND_URL}/chat-upload`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.detail ||
              "Unable to process the uploaded file."
          );
        }

        setAnswer(
          data.answer || "No answer returned."
        );

        setIllustration(
          data.illustration || null
        );

        setSelectedFiles([]);

        return;
      }

      // --------------------------------------------
      // NORMAL CHAT
      // --------------------------------------------

      const response = await fetch(
        `${BACKEND_URL}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            question: finalQuestion,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Unable to get an answer from the AI."
        );
      }

      const aiAnswer = data.answer || "No answer returned.";

      setAnswer(aiAnswer);

      setConversationHistory((previous) => [
        ...previous,
        {
          question: finalQuestion,
          answer: aiAnswer,
          timestamp: new Date().toLocaleString(),
        },
      ]);

      setIllustration(
        data.illustration || null
      );
    } catch (error) {
      console.error("AI request error:", error);

      setMessage(
        error.message ||
          "Unable to connect to the AI backend."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // VOICE
  // ==================================================

  const startVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessage(
        "Voice input is not supported in this browser. Please use Chrome."
      );
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setMessage("Listening...");
    };

    recognition.onresult = async (event) => {
      const transcript =
        event.results?.[0]?.[0]?.transcript?.trim() ||
        "";

      if (!transcript) {
        setMessage(
          "I could not hear your question."
        );
        return;
      }

      setQuestion(transcript);
      setMessage(
        "Question received. Asking AI..."
      );

      await askQuestion(transcript);
    };

    recognition.onerror = (event) => {
      console.error(
        "Speech recognition error:",
        event
      );

      setIsListening(false);

      if (event.error === "not-allowed") {
        setMessage(
          "Microphone permission was denied."
        );
      } else {
        setMessage(
          "Unable to recognize your voice. Please try again."
        );
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      console.error(error);
      setIsListening(false);
      setMessage(
        "Unable to start microphone."
      );
    }
  };

  // ==================================================
  // QUICK QUESTIONS
  // ==================================================

  const quickQuestions = [
    "What is Salesforce Flow?",
    "Explain Salesforce OWD",
    "What is an Apex trigger?",
    "What is LWC?",
    "What is Salesforce CPQ?",
    "What is ServiceNow?",
    "What is Python?",
    "What is Java?",
  ];

  const handleQuickQuestion = (item) => {
    setQuestion(item);
    setAnswer("");
    setMessage("");

    setTimeout(() => {
      askQuestion(item);
    }, 50);
  };

  // ==================================================
  // LOADING
  // ==================================================

  if (authLoading) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingCard}>
          <h2>Salesforce AI Assistant</h2>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // ==================================================
  // SIGN IN PAGE
  // ==================================================

  if (!user) {
    return (
      <div style={styles.signInPage}>
        <div style={styles.signInCard}>
          <h1 style={styles.signInTitle}>Salesforce AI Assistant</h1>

          <p style={styles.signInSubtitle}>
            AI Assistant for Technology & Salesforce
          </p>

          <img
            src={salesforceRobot}
            alt="Salesforce AI Assistant"
            style={{ width: "100px", maxWidth: "60%", height: "auto", display: "block", margin: "0 auto 20px" }}
          />

          <button
            type="button"
            onClick={handleInstallApp}
            style={styles.installButton}
          >
            📲 Install App
          </button>

          <div style={styles.authTabs}>
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setMessage("");
              }}
              style={{
                ...styles.authTab,
                ...(authMode === "login" ? styles.authTabActive : {}),
              }}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setMessage("");
              }}
              style={{
                ...styles.authTab,
                ...(authMode === "signup" ? styles.authTabActive : {}),
              }}
            >
              Sign Up
            </button>
          </div>

          {authMode === "login" ? (
            <>
              <h2 style={styles.signInHeading}>Welcome Back</h2>

              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.authInput}
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.authInput}
              />

              <button
                type="button"
                onClick={() => handleEmailLogin(email, password)}
                style={styles.authPrimaryButton}
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setShowForgotPassword(true);
                  setMessage("");
                }}
                style={styles.forgotButton}
              >
                Forgot password?
              </button>
            </>
          ) : (
            <>
              <h2 style={styles.signInHeading}>Create Account</h2>

              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.authInput}
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.authInput}
              />

              <input
                type="password"
                placeholder="Retype password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={styles.authInput}
              />

              <button
                type="button"
                onClick={() =>
                  handleSignUp(email, password, confirmPassword)
                }
                style={styles.authPrimaryButton}
              >
                Create Account
              </button>
            </>
          )}

          {showForgotPassword && (
            <div style={styles.resetOverlay}>
              <div style={styles.resetCard}>
                <h2 style={styles.resetTitle}>Reset your password</h2>
                <p style={styles.resetSubtitle}>
                  Enter your email address and we will send you a password reset link.
                </p>
                <input
                  type="email"
                  placeholder="Email address"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  style={styles.authInput}
                />
                <button
                  type="button"
                  style={styles.authPrimaryButton}
                  onClick={async () => {
                    await handleForgotPassword(resetEmail);
                    setShowForgotPassword(false);
                  }}
                >
                  Send Reset Link
                </button>
                <button
                  type="button"
                  style={styles.resetCancelButton}
                  onClick={() => setShowForgotPassword(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div style={styles.authDivider}>
            <span>OR</span>
          </div>

          <button
            type="button"
            onClick={handleLogin}
            style={styles.googleButton}
          >
            Continue with Google
          </button>

          {message && (
            <p style={styles.authMessage}>{message}</p>
          )}

          <p style={styles.signInSecure}>
            🔒 Secure authentication powered by Firebase
          </p>
        </div>
      </div>
    );
  }

  // ==================================================
  // MAIN UI
  // ==================================================

  return (
    <div style={styles.page}>

      {/* HEADER */}

      <header style={styles.header}>

        <div style={styles.brand}>

          <div>
            <h1 style={styles.logo}>
              Salesforce AI Assistant
            </h1>

            <p style={styles.subtitle}>
              AI Assistant for Technology & Salesforce
            </p>
          </div>
        </div>

        <div style={styles.headerActions}>

          <button
            onClick={handleInstallApp}
            style={styles.installButton}
          >
            📲 Install App
          </button>

          <button
            onClick={() => setShowPro(true)}
            style={styles.proButton}
          >
            ⭐ Pro ₹100/month
          </button>

          {user ? (
            <div style={styles.userSection}>

              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  style={styles.avatar}
                />
              )}

              <span style={styles.userName}>
                {user.displayName ||
                  user.email ||
                  "User"}
              </span>

              <button
                onClick={handleLogout}
                style={styles.logoutButton}
              >
                Sign Out
              </button>

            </div>
          ) : (
            <button
              onClick={handleLogin}
              style={styles.loginButton}
            >
              🔐 Continue with Google
            </button>
          )}

        </div>
      </header>

      {/* HERO */}

      <main style={styles.main}>

        <section className="heroResponsive" style={styles.hero}>

          <div style={styles.robotColumn}>
            <img
              src={salesforceRobot}
              alt="Salesforce AI Assistant"
              style={styles.salesforceRobotImage}
            />
          </div>

          <div style={styles.heroContent}>

            <div style={styles.helloBadge}>
              👋 Hello! How can I help you?
            </div>

            <h2 style={styles.heroTitle}>
              Ask anything about
              <span style={styles.heroHighlight}>
                technology
              </span>
            </h2>

            <p style={styles.heroText}>
              Ask questions about Salesforce,
              ServiceNow, SAP, Python, Java,
              Apex, LWC, CPQ and more.
            </p>

            <div style={styles.featureChecks}>
              <span>✓ Salesforce</span>
              <span>✓ ServiceNow</span>
              <span>✓ Programming</span>
              <span>✓ Multiple languages</span>
            </div>

          </div>

        </section>

        {/* QUESTION CARD */}

        <section style={styles.questionCard}>

          <div style={styles.cardHeading}>
            <div>
              <h2 style={styles.questionTitle}>
                💬 Ask your question
              </h2>

              <p style={styles.questionSubtitle}>
                Type, speak, or upload a file
              </p>
            </div>

            <div style={styles.secureBadge}>
              🔒 Secure
            </div>
          </div>

          <textarea
            value={question}
            onChange={(event) =>
              setQuestion(event.target.value)
            }
            placeholder="Type your technology question here..."
            style={styles.textarea}
            rows={5}
            disabled={loading}
          />

          <div style={styles.actionRow}>

            <button
              onClick={startVoiceInput}
              style={{
                ...styles.actionButton,
                ...(isListening
                  ? styles.listeningButton
                  : {}),
              }}
              disabled={loading}
            >
              {isListening
                ? "🔴 Listening..."
                : "🎤 Speak"}
            </button>

            <button
              onClick={() =>
                imageInputRef.current?.click()
              }
              style={styles.actionButton}
              disabled={loading}
            >
              🖼️ Image
            </button>

            <button
              onClick={() =>
                fileInputRef.current?.click()
              }
              style={styles.actionButton}
              disabled={loading}
            >
              📎 File
            </button>

            <button
              onClick={() =>
                videoInputRef.current?.click()
              }
              style={styles.actionButton}
              disabled={loading}
            >
              🎥 Video
            </button>

            <button
              onClick={() => askQuestion()}
              style={styles.askButton}
              disabled={loading}
            >
              {loading
                ? "⏳ Thinking..."
                : "✨ Ask AI"}
            </button>

          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            style={styles.hiddenInput}
            onChange={handleFileSelect}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.doc,.docx,.csv,.json,.xml,.md"
            multiple
            style={styles.hiddenInput}
            onChange={handleFileSelect}
          />

          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            style={styles.hiddenInput}
            onChange={handleFileSelect}
          />

          {/* SELECTED FILES */}

          {selectedFiles.length > 0 && (
            <div style={styles.filesContainer}>

              <div style={styles.filesHeader}>
                <strong>
                  📁 Selected files
                </strong>

                <button
                  onClick={clearSelectedFiles}
                  style={styles.clearButton}
                >
                  Clear all
                </button>
              </div>

              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  style={styles.fileItem}
                >
                  <span>
                    {file.type.startsWith("image/")
                      ? "🖼️"
                      : file.type.startsWith("video/")
                      ? "🎥"
                      : "📄"}{" "}
                    {file.name}
                    {" "}
                    <small>
                      ({formatFileSize(file.size)})
                    </small>
                  </span>

                  <button
                    onClick={() =>
                      removeSelectedFile(index)
                    }
                    style={styles.removeButton}
                  >
                    ✕
                  </button>
                </div>
              ))}

              <p style={styles.uploadNote}>
                Click <strong>Ask AI</strong> to analyze
                the selected file.
              </p>
            </div>
          )}

          {message && (
            <div style={styles.message}>
              {message}
            </div>
          )}

        </section>

        {/* QUICK QUESTIONS */}

        <section style={styles.quickSection}>

          <div style={styles.sectionHeading}>
            <h2>⚡ Quick Questions</h2>
            <p>Start with a common technology question</p>
          </div>

          <div style={styles.quickGrid}>

            {quickQuestions.map((item) => (
              <button
                key={item}
                onClick={() =>
                  handleQuickQuestion(item)
                }
                style={styles.quickButton}
                disabled={loading}
              >
                <span style={styles.quickIcon}>
                  💡
                </span>

                <span>{item}</span>

                <span style={styles.arrow}>
                  →
                </span>
              </button>
            ))}

          </div>

        </section>

        {/* ANSWER */}

        {(answer || loading) && (
          <section style={styles.answerCard}>

            <div style={styles.answerHeader}>

              <div>
                <h2>
                  AI Answer
                </h2>

                <p>
                  Salesforce AI Assistant
                </p>
              </div>
            </div>

            {loading ? (
              <div style={styles.loadingAnswer}>
                <div style={styles.spinner} />
                <strong>
                  AI is analyzing your question...
                </strong>
              </div>
            ) : (
              <div style={styles.answerText}>
                {formatAnswer(answer)}
              </div>
            )}

            {illustration && (
              <div style={styles.illustrationContainer}>
                <img
                  src={illustration}
                  alt="AI illustration"
                  style={styles.illustration}
                />
              </div>
            )}

          </section>
        )}

        {conversationHistory.length > 0 && (
          <section style={styles.documentCard}>
            <div style={styles.documentHeader}>
              <div>
                <h2 style={styles.documentTitle}>📄 Conversation Document</h2>
                <p style={styles.documentSubtitle}>
                  Your questions and AI answers are collected here.
                </p>
              </div>

              <button
                type="button"
                style={styles.documentButton}
                onClick={() => {
                  const content = conversationHistory
                    .map(
                      (item, index) =>
                        `Question ${index + 1}\n${item.question}\n\nAI Answer\n${item.answer}\n\nDate: ${item.timestamp}\n\n--------------------------------\n`
                    )
                    .join("\n");

                  const blob = new Blob([content], {
                    type: "text/plain;charset=utf-8",
                  });

                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "Salesforce-AI-Conversation.txt";
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                ⬇️ Download Document
              </button>
            </div>

            <div style={styles.documentContent}>
              {conversationHistory.map((item, index) => (
                <div key={`${item.timestamp}-${index}`} style={styles.documentEntry}>
                  <div style={styles.documentQuestion}>
                    Question {index + 1}
                  </div>

                  <div style={styles.documentQuestionText}>
                    {item.question}
                  </div>

                  <div style={styles.documentAnswer}>
                    AI Answer
                  </div>

                  <div style={styles.documentAnswerText}>
                    {item.answer}
                  </div>

                  <div style={styles.documentDate}>
                    {item.timestamp}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FEATURES */}

        <section style={styles.features}>

          <Feature
            icon="☁️"
            title="Salesforce"
            text="Admin, Development, Testing, Apex, LWC, CPQ and more."
          />

          <Feature
            icon="🌐"
            title="Multiple Technologies"
            text="ServiceNow, SAP, Python, Java and other technologies."
          />

          <Feature
            icon="🎤"
            title="Voice Questions"
            text="Speak your question and let AI process it."
          />

          <Feature
            icon="📎"
            title="File Analysis"
            text="Upload supported files and ask AI to analyze them."
          />

        </section>

      </main>

      {/* PRO MODAL */}

      {showPro && (
        <div
          style={styles.modalOverlay}
          onClick={() => setShowPro(false)}
        >
          <div
            style={styles.modal}
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              onClick={() => setShowPro(false)}
              style={styles.modalClose}
            >
              ✕
            </button>

            <div style={styles.proIcon}>
              ⭐
            </div>

            <h2 style={styles.modalTitle}>
              Salesforce AI Assistant Pro
            </h2>

            <div style={styles.price}>
              ₹100
              <span> + GST / month</span>
            </div>

            <p style={styles.modalDescription}>
              Unlock premium AI capabilities
              with a monthly subscription.
            </p>

            <div style={styles.paymentBox}>

              <div>📱 UPI</div>
              <div>📱 Google Pay</div>
              <div>📱 PhonePe</div>
              <div>💳 Credit / Debit Card</div>
              <div>🔒 Secure Razorpay Checkout</div>
              <div>🔄 Monthly Subscription</div>

            </div>

            <button
              style={styles.paymentButton}
              onClick={() => {
                setMessage(
                  "Payment will be connected after Razorpay subscription integration is completed."
                );
                setShowPro(false);
              }}
            >
              💳 Continue to Payment
            </button>

            <p style={styles.paymentNote}>
              Payment is not activated yet.
              Pro access will be enabled only
              after successful payment verification.
            </p>

          </div>
        </div>
      )}

      {/* FOOTER */}

      <footer style={styles.footer}>
        <strong>
          © {new Date().getFullYear()} Salesforce AI Assistant
        </strong>

        <span>
          Built for technology learning and Salesforce support.
        </span>
      </footer>

      {/* GLOBAL ANIMATION */}

      <style>
        {`
          @keyframes robotFloat {
            0%, 100% {
              transform: translateY(0px);
            }
            50% {
              transform: translateY(-12px);
            }
          }

          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.12);
              opacity: 0.7;
            }
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>

    </div>
  );
}

// ==================================================
// FEATURE
// ==================================================

function Feature({ icon, title, text }) {
  return (
    <div style={styles.featureCard}>
      <div style={styles.featureIcon}>
        {icon}
      </div>

      <h3>{title}</h3>

      <p>{text}</p>
    </div>
  );
}

// ==================================================
// HELPERS
// ==================================================

function formatFileSize(bytes) {
  if (!bytes) return "0 B";

  const units = ["B", "KB", "MB", "GB"];

  const index = Math.floor(
    Math.log(bytes) / Math.log(1024)
  );

  const safeIndex = Math.min(
    index,
    units.length - 1
  );

  return `${(
    bytes /
    Math.pow(1024, safeIndex)
  ).toFixed(1)} ${units[safeIndex]}`;
}

function formatAnswer(text) {
  if (!text) return null;

  return text
    .split("\n")
    .map((line, index) => (
      <p
        key={index}
        style={styles.answerParagraph}
      >
        {line || "\u00A0"}
      </p>
    ));
}

// ==================================================
// STYLES
// ==================================================

const styles = {
  signInPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #dbeafe 100%)",
  },

  signInCard: {
    width: "100%",
    maxWidth: "460px",
    padding: "44px 36px",
    borderRadius: "24px",
    background: "#ffffff",
    boxShadow: "0 20px 60px rgba(15, 23, 42, 0.12)",
    textAlign: "center",
  },

  signInTitle: {
    margin: "0",
    color: "#0f172a",
    fontSize: "30px",
    fontWeight: "800",
  },

  signInSubtitle: {
    margin: "10px 0 32px",
    color: "#475569",
    fontSize: "16px",
  },

  signInHeading: {
    margin: "0 0 10px",
    color: "#0f172a",
    fontSize: "24px",
    fontWeight: "700",
  },

  signInText: {
    margin: "0 0 24px",
    color: "#475569",
    fontSize: "15px",
    lineHeight: "1.6",
  },

  authTabs: {
    display: "flex",
    width: "100%",
    marginBottom: "28px",
    padding: "4px",
    background: "#f1f5f9",
    borderRadius: "12px",
  },

  authTab: {
    flex: 1,
    border: "none",
    background: "transparent",
    color: "#64748b",
    padding: "12px",
    borderRadius: "9px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
  },

  authTabActive: {
    background: "#ffffff",
    color: "#2563eb",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
  },

  authInput: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 16px",
    marginBottom: "14px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#0f172a",
    fontSize: "15px",
    outline: "none",
  },

  authPrimaryButton: {
    width: "100%",
    border: "none",
    borderRadius: "10px",
    padding: "14px 20px",
    marginTop: "4px",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
  },

  forgotButton: {
    border: "none",
    background: "transparent",
    color: "#2563eb",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "14px",
    padding: "0",
    outline: "none",
    boxShadow: "none",
    appearance: "none",
  },

  resetOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 1000,
  },
  resetCard: {
    width: "100%",
    maxWidth: "420px",
    boxSizing: "border-box",
    background: "#ffffff",
    borderRadius: "18px",
    padding: "28px",
    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.2)",
  },
  resetTitle: {
    margin: "0 0 8px",
    color: "#0f172a",
    fontSize: "22px",
    fontWeight: "700",
  },
  resetSubtitle: {
    margin: "0 0 20px",
    color: "#64748b",
    fontSize: "14px",
    lineHeight: "1.5",
  },
  resetCancelButton: {
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "13px 20px",
    marginTop: "10px",
    background: "#ffffff",
    color: "#475569",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
  },
  authDivider: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "22px 0",
    color: "#94a3b8",
    fontSize: "13px",
    fontWeight: "600",
  },

  authMessage: {
    margin: "16px 0 0",
    padding: "10px 12px",
    borderRadius: "8px",
    background: "#fef2f2",
    color: "#b91c1c",
    fontSize: "14px",
    lineHeight: "1.4",
  },

  googleButton: {
    width: "100%",
    border: "none",
    borderRadius: "12px",
    padding: "15px 20px",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "700",
    cursor: "pointer",
  },

  signInSecure: {
    margin: "18px 0 0",
    color: "#64748b",
    fontSize: "13px",
  },


  documentCard: {
    width: "100%",
    marginTop: "28px",
    padding: "24px",
    boxSizing: "border-box",
    borderRadius: "18px",
    background: "#ffffff",
    border: "1px solid #dbe4f0",
    boxShadow: "0 8px 30px rgba(15, 23, 42, 0.06)",
  },

  documentHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "20px",
  },

  documentTitle: {
    margin: "0",
    color: "#0f172a",
    fontSize: "21px",
    fontWeight: "700",
  },

  documentSubtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  documentButton: {
    border: "none",
    borderRadius: "10px",
    padding: "11px 16px",
    background: "#2563eb",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  documentContent: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },

  documentEntry: {
    padding: "18px",
    borderRadius: "12px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
  },

  documentQuestion: {
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: "700",
    marginBottom: "6px",
  },

  documentQuestionText: {
    color: "#0f172a",
    fontSize: "15px",
    lineHeight: "1.6",
    marginBottom: "16px",
  },

  documentAnswer: {
    color: "#475569",
    fontSize: "13px",
    fontWeight: "700",
    marginBottom: "6px",
  },

  documentAnswerText: {
    color: "#1e293b",
    fontSize: "15px",
    lineHeight: "1.7",
    whiteSpace: "pre-wrap",
  },

  documentDate: {
    marginTop: "14px",
    color: "#94a3b8",
    fontSize: "12px",
  },

  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #eef5ff 0%, #ffffff 48%, #f3f7ff 100%)",
    color: "#172033",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  header: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    width: "100%",
    boxSizing: "border-box",
    padding: "16px 5%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    background: "#ffffff",
    borderBottom: "2px solid #dbe4f0",
    boxShadow: "0 3px 15px rgba(15, 23, 42, 0.08)",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  brandIcon: {
    fontSize: "38px",
  },

  logo: {
    margin: 0,
    fontSize: "25px",
    fontWeight: 900,
    color: "#0f172a",
  },

  subtitle: {
    margin: "3px 0 0",
    fontSize: "13px",
    fontWeight: 700,
    color: "#475569",
  },

  headerActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "10px",
    flexWrap: "wrap",
  },

  installButton: {
    border: "2px solid #2563eb",
    background: "#eff6ff",
    color: "#174ea6",
    padding: "13px 19px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: "15px",
  },

  proButton: {
    border: "none",
    background: "#111827",
    color: "#ffffff",
    padding: "13px 18px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: "15px",
  },

  loginButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "13px 18px",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: "15px",
  },

  logoutButton: {
    border: "2px solid #cbd5e1",
    background: "#ffffff",
    color: "#172033",
    padding: "10px 13px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 800,
  },

  userSection: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
  },

  userName: {
    fontSize: "14px",
    fontWeight: 800,
    color: "#172033",
  },

  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    objectFit: "cover",
  },

  main: {
    width: "90%",
    maxWidth: "1180px",
    margin: "0 auto",
    padding: "42px 0 70px",
  },

  hero: {
    display: "grid",
    gridTemplateColumns:
      "minmax(260px, 360px) 1fr",
    gap: "40px",
    alignItems: "center",
    marginBottom: "40px",
  },

  salesforceRobotImage: {
    width: "320px",
    maxWidth: "100%",
    height: "auto",
    display: "block",
    margin: "0 auto",
  },

  robotColumn: {
    textAlign: "center",
  },

  robotWrap: {
    position: "relative",
    width: "260px",
    height: "260px",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  robotGlow: {
    position: "absolute",
    width: "220px",
    height: "220px",
    borderRadius: "50%",
    background:
      "radial-gradient(circle, #bfdbfe 0%, #dbeafe 45%, transparent 70%)",
  },

  robot: {
    position: "relative",
    zIndex: 2,
    width: "150px",
    height: "180px",
    animation:
      "robotFloat 3s ease-in-out infinite",
  },

  robotAntenna: {
    position: "absolute",
    top: "-22px",
    left: "67px",
    width: "16px",
    height: "27px",
    background: "#334155",
    borderRadius: "8px",
  },

  antennaLight: {
    position: "absolute",
    top: "-8px",
    left: "1px",
    color: "#2563eb",
    fontSize: "18px",
    animation:
      "pulse 1.5s infinite",
  },

  robotHead: {
    position: "absolute",
    top: "5px",
    left: "15px",
    width: "120px",
    height: "90px",
    borderRadius: "32px",
    background: "#ffffff",
    border: "7px solid #334155",
    boxShadow:
      "0 10px 20px rgba(15,23,42,0.16)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "30px",
  },

  robotEye: {
    color: "#2563eb",
    fontSize: "22px",
  },

  robotSmile: {
    position: "absolute",
    bottom: "13px",
    left: "51px",
    color: "#334155",
    fontSize: "25px",
    fontWeight: 900,
  },

  robotBody: {
    position: "absolute",
    top: "91px",
    left: "30px",
    width: "90px",
    height: "80px",
    borderRadius: "25px",
    background: "#2563eb",
    border: "6px solid #334155",
    boxShadow:
      "0 10px 20px rgba(15,23,42,0.15)",
  },

  robotScreen: {
    position: "absolute",
    top: "20px",
    left: "23px",
    width: "44px",
    height: "30px",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: "13px",
  },

  robotArmLeft: {
    position: "absolute",
    top: "105px",
    left: "4px",
    fontSize: "55px",
    color: "#334155",
    fontWeight: 900,
  },

  robotArmRight: {
    position: "absolute",
    top: "105px",
    right: "4px",
    fontSize: "55px",
    color: "#334155",
    fontWeight: 900,
  },

  robotHandLeft: {
    position: "absolute",
    top: "151px",
    left: "0",
    color: "#2563eb",
  },

  robotHandRight: {
    position: "absolute",
    top: "151px",
    right: "0",
    color: "#2563eb",
  },

  robotBadge: {
    display: "inline-block",
    marginTop: "4px",
    padding: "9px 14px",
    borderRadius: "999px",
    background: "#ffffff",
    border: "2px solid #bfdbfe",
    color: "#174ea6",
    fontWeight: 800,
    fontSize: "13px",
  },

  heroContent: {
    textAlign: "left",
  },

  helloBadge: {
    display: "inline-block",
    padding: "8px 14px",
    borderRadius: "999px",
    background: "#dbeafe",
    color: "#174ea6",
    fontWeight: 900,
    marginBottom: "15px",
  },

  heroTitle: {
    margin: 0,
    fontSize: "48px",
    lineHeight: 1.1,
    fontWeight: 950,
    color: "#0f172a",
  },

  heroHighlight: {
    display: "block",
    color: "#2563eb",
  },

  heroText: {
    maxWidth: "700px",
    margin: "18px 0",
    fontSize: "18px",
    lineHeight: 1.7,
    fontWeight: 600,
    color: "#334155",
  },

  featureChecks: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },

  secureBadge: {
    background: "#ecfdf3",
    color: "#067647",
    padding: "8px 12px",
    borderRadius: "999px",
    fontWeight: 800,
    fontSize: "13px",
  },

  questionCard: {
    background: "#ffffff",
    borderRadius: "22px",
    padding: "26px",
    border: "2px solid #dbe4f0",
    boxShadow:
      "0 15px 40px rgba(15,23,42,0.09)",
  },

  cardHeading: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    marginBottom: "15px",
  },

  questionTitle: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 900,
    color: "#0f172a",
  },

  questionSubtitle: {
    margin: "4px 0 0",
    color: "#475569",
    fontWeight: 600,
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    resize: "vertical",
    minHeight: "145px",
    padding: "18px",
    borderRadius: "15px",
    border: "2px solid #cbd5e1",
    outline: "none",
    fontSize: "17px",
    lineHeight: 1.6,
    fontFamily: "inherit",
    color: "#0f172a",
    fontWeight: 600,
    background: "#ffffff",
  },

  actionRow: {
    marginTop: "15px",
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  actionButton: {
    border: "2px solid #cbd5e1",
    background: "#ffffff",
    color: "#172033",
    padding: "13px 17px",
    borderRadius: "11px",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: "15px",
  },

  listeningButton: {
    background: "#fef2f2",
    color: "#b91c1c",
    border: "2px solid #ef4444",
  },

  askButton: {
    marginLeft: "auto",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "13px 27px",
    borderRadius: "11px",
    cursor: "pointer",
    fontWeight: 950,
    fontSize: "16px",
    minWidth: "135px",
  },

  hiddenInput: {
    display: "none",
  },

  filesContainer: {
    marginTop: "18px",
    padding: "16px",
    background: "#f8fafc",
    borderRadius: "13px",
    border: "2px solid #e2e8f0",
  },

  filesHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "8px",
    color: "#172033",
  },

  clearButton: {
    border: "none",
    background: "transparent",
    color: "#dc2626",
    cursor: "pointer",
    fontWeight: 900,
  },

  fileItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "9px 0",
    borderBottom: "1px solid #e2e8f0",
    fontWeight: 700,
    color: "#172033",
  },

  removeButton: {
    border: "none",
    background: "transparent",
    color: "#dc2626",
    cursor: "pointer",
    fontWeight: 900,
  },

  uploadNote: {
    color: "#475569",
    fontWeight: 600,
  },

  message: {
    marginTop: "15px",
    padding: "13px 15px",
    background: "#eff6ff",
    color: "#174ea6",
    borderRadius: "11px",
    fontWeight: 700,
  },

  quickSection: {
    marginTop: "42px",
  },

  sectionHeading: {
    marginBottom: "16px",
  },

  'sectionHeading h2': {
    margin: 0,
  },

  'sectionHeading p': {
    margin: "5px 0 0",
    color: "#475569",
    fontWeight: 600,
  },

  quickGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "13px",
  },

  quickButton: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "17px",
    border: "2px solid #dbe4f0",
    background: "#ffffff",
    borderRadius: "13px",
    cursor: "pointer",
    textAlign: "left",
    color: "#172033",
    fontWeight: 800,
    fontSize: "15px",
  },

  quickIcon: {
    fontSize: "20px",
  },

  arrow: {
    marginLeft: "auto",
    color: "#2563eb",
    fontSize: "20px",
    fontWeight: 900,
  },

  answerCard: {
    marginTop: "35px",
    background: "#ffffff",
    borderRadius: "20px",
    padding: "26px",
    border: "2px solid #bfdbfe",
    boxShadow:
      "0 15px 40px rgba(15,23,42,0.08)",
  },

  answerHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    borderBottom: "2px solid #e2e8f0",
    paddingBottom: "15px",
    marginBottom: "18px",
  },

  'answerHeader h2': {
    margin: 0,
  },

  'answerHeader p': {
    margin: "3px 0 0",
    color: "#475569",
    fontWeight: 600,
  },


  answerText: {
    fontSize: "17px",
    lineHeight: 1.8,
    color: "#172033",
    fontWeight: 600,
  },

  answerParagraph: {
    margin: "0 0 11px",
  },

  loadingAnswer: {
    minHeight: "120px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#172033",
    gap: "12px",
  },

  spinner: {
    width: "32px",
    height: "32px",
    border: "4px solid #dbeafe",
    borderTop: "4px solid #2563eb",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  illustrationContainer: {
    marginTop: "25px",
    textAlign: "center",
  },

  illustration: {
    maxWidth: "100%",
    borderRadius: "12px",
  },

  features: {
    marginTop: "45px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "17px",
  },

  featureCard: {
    background: "#ffffff",
    padding: "24px",
    borderRadius: "17px",
    border: "2px solid #e2e8f0",
    textAlign: "center",
  },

  featureIcon: {
    fontSize: "35px",
    marginBottom: "8px",
  },

  'featureCard h3': {
    color: "#0f172a",
    fontWeight: 900,
  },

  'featureCard p': {
    color: "#475569",
    fontWeight: 600,
    lineHeight: 1.6,
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    zIndex: 100,
  },

  modal: {
    width: "100%",
    maxWidth: "480px",
    background: "#ffffff",
    borderRadius: "22px",
    padding: "32px",
    boxSizing: "border-box",
    position: "relative",
    boxShadow:
      "0 30px 70px rgba(0,0,0,0.25)",
  },

  modalClose: {
    position: "absolute",
    right: "16px",
    top: "14px",
    border: "none",
    background: "transparent",
    fontSize: "22px",
    cursor: "pointer",
  },

  proIcon: {
    fontSize: "42px",
  },

  modalTitle: {
    fontSize: "25px",
    fontWeight: 950,
    color: "#0f172a",
  },

  price: {
    fontSize: "42px",
    fontWeight: 950,
    color: "#2563eb",
  },

  'price span': {
    fontSize: "15px",
    color: "#475569",
    fontWeight: 700,
  },

  modalDescription: {
    color: "#334155",
    fontWeight: 600,
  },

  paymentBox: {
    display: "grid",
    gap: "11px",
    padding: "17px",
    margin: "20px 0",
    background: "#f8fafc",
    borderRadius: "13px",
    color: "#172033",
    fontWeight: 800,
  },

  paymentButton: {
    width: "100%",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "15px",
    borderRadius: "11px",
    cursor: "pointer",
    fontWeight: 950,
    fontSize: "16px",
  },

  paymentNote: {
    fontSize: "12px",
    lineHeight: 1.5,
    color: "#64748b",
    fontWeight: 600,
  },

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#eef5ff",
  },

  loadingCard: {
    background: "#ffffff",
    padding: "40px",
    borderRadius: "20px",
    textAlign: "center",
    boxShadow:
      "0 20px 50px rgba(15,23,42,0.12)",
  },

  footer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    padding: "30px 20px",
    background: "#ffffff",
    borderTop: "2px solid #e2e8f0",
    color: "#475569",
    fontSize: "13px",
    fontWeight: 600,
  },
};

export default App;