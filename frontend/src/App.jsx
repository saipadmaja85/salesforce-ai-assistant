import { useEffect, useRef, useState } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";

// --------------------------------------------------
// Firebase
// --------------------------------------------------

const firebaseConfig = {
  apiKey: "AIzaSyDJu1Zp5QqAMBN-Jt4FjE5V6CVgZNQJtHg",
  authDomain: "salesforce-ai-assistant-98aad.firebaseapp.com",
  projectId: "salesforce-ai-assistant-98aad",
  storageBucket: "salesforce-ai-assistant-98aad.firebasestorage.app",
  messagingSenderId: "2876872987",
  appId: "1:2876872987:web:83cff45c3be2d0a20b1bbe",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();

// --------------------------------------------------
// Backend
// --------------------------------------------------

const BACKEND_URL =
  "https://salesforce-ai-assistant-8gvo.onrender.com";

// --------------------------------------------------
// App
// --------------------------------------------------

function App() {
  // ------------------------------------------------
  // Authentication
  // ------------------------------------------------

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ------------------------------------------------
  // AI
  // ------------------------------------------------

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [illustration, setIllustration] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // ------------------------------------------------
  // Voice
  // ------------------------------------------------

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // ------------------------------------------------
  // File uploads
  // ------------------------------------------------

  const [selectedFiles, setSelectedFiles] = useState([]);

  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // ------------------------------------------------
  // PWA install
  // ------------------------------------------------

  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  // ------------------------------------------------
  // Pro
  // ------------------------------------------------

  const [showPro, setShowPro] = useState(false);

  // ------------------------------------------------
  // Firebase authentication listener
  // ------------------------------------------------

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // ------------------------------------------------
  // PWA install event
  // ------------------------------------------------

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();

      setInstallPrompt(event);
      setShowInstallButton(true);
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

  // ------------------------------------------------
  // Login
  // ------------------------------------------------

  const handleLogin = async () => {
    try {
      setMessage("");

      await signInWithPopup(
        auth,
        googleProvider
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "Unable to sign in. Please try again."
      );
    }
  };

  // ------------------------------------------------
  // Logout
  // ------------------------------------------------

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

  // ------------------------------------------------
  // Install app
  // ------------------------------------------------

  const handleInstallApp = async () => {
    if (!installPrompt) {
      setMessage(
        "App installation is not available in this browser. Use your browser's Install App or Add to Home Screen option."
      );

      return;
    }

    try {
      installPrompt.prompt();

      const result =
        await installPrompt.userChoice;

      if (result.outcome === "accepted") {
        setMessage(
          "App installation started."
        );
      } else {
        setMessage(
          "App installation was cancelled."
        );
      }

      setInstallPrompt(null);
      setShowInstallButton(false);
    } catch (error) {
      console.error(error);

      setMessage(
        "Unable to install the app."
      );
    }
  };

  // ------------------------------------------------
  // File selection
  // ------------------------------------------------

  const handleFileSelect = (event) => {
    const files = Array.from(
      event.target.files || []
    );

    if (!files.length) {
      return;
    }

    setSelectedFiles((previousFiles) => [
      ...previousFiles,
      ...files,
    ]);

    setMessage(
      `${files.length} file${
        files.length > 1 ? "s" : ""
      } selected successfully.`
    );

    event.target.value = "";
  };

  // ------------------------------------------------
  // Remove selected file
  // ------------------------------------------------

  const removeSelectedFile = (index) => {
    setSelectedFiles(
      (previousFiles) =>
        previousFiles.filter(
          (_, fileIndex) =>
            fileIndex !== index
        )
    );
  };

  // ------------------------------------------------
  // Clear selected files
  // ------------------------------------------------

  const clearSelectedFiles = () => {
    setSelectedFiles([]);
  };

  // ------------------------------------------------
  // Ask AI
  // ------------------------------------------------

  const askQuestion = async (
    voiceQuestion = null
  ) => {
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
      const token =
        await user.getIdToken();

      // --------------------------------------------
      // FILE / IMAGE / VIDEO UPLOAD
      // --------------------------------------------

      if (selectedFiles.length > 0) {
        const formData =
          new FormData();

        formData.append(
          "question",
          finalQuestion
        );

        formData.append(
          "file",
          selectedFiles[0]
        );

        const response =
          await fetch(
            `${BACKEND_URL}/chat-upload`,
            {
              method: "POST",
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
              body: formData,
            }
          );

        const data =
          await response.json();

        if (response.status === 401) {
          throw new Error(
            "Authentication failed. Please sign in again."
          );
        }

        if (response.status === 403) {
          throw new Error(
            "You do not have permission to use this service."
          );
        }

        if (!response.ok) {
          throw new Error(
            data?.detail ||
              "Unable to process the uploaded file."
          );
        }

        setAnswer(
          data.answer ||
            "No answer returned."
        );

        setIllustration(
          data.illustration ||
            null
        );

        setSelectedFiles([]);

        return;
      }

      // --------------------------------------------
      // NORMAL TEXT QUESTION
      // --------------------------------------------

      const response =
        await fetch(
          `${BACKEND_URL}/chat`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              question:
                finalQuestion,
            }),
          }
        );

      const data =
        await response.json();

      if (response.status === 401) {
        throw new Error(
          "Authentication failed. Please sign in again."
        );
      }

      if (response.status === 403) {
        throw new Error(
          "You do not have permission to use this service."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Unable to get an answer from the AI."
        );
      }

      setAnswer(
        data.answer ||
          "No answer returned."
      );

      setIllustration(
        data.illustration ||
          null
      );
    } catch (error) {
      console.error(
        "AI request error:",
        error
      );

      setMessage(
        error.message ||
          "Unable to connect to the AI backend. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------
  // Voice input
  // ------------------------------------------------

  const startVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessage(
        "Voice input is not supported in this browser. Please use Chrome or another supported browser."
      );

      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();

      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setMessage("Listening...");
    };

    recognition.onresult = async (
      event
    ) => {
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

      // Automatically submit voice question
      await askQuestion(transcript);
    };

    recognition.onerror = (
      event
    ) => {
      console.error(
        "Speech recognition error:",
        event
      );

      setIsListening(false);

      if (
        event.error ===
        "not-allowed"
      ) {
        setMessage(
          "Microphone permission was denied. Please allow microphone access."
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

    recognitionRef.current =
      recognition;

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

  // ------------------------------------------------
  // Quick questions
  // ------------------------------------------------

  const quickQuestions = [
    "What is Salesforce Flow?",
    "Explain Salesforce Admin concepts.",
    "What is ServiceNow?",
    "Explain Apex in Salesforce.",
    "What is Python?",
    "What is Java?",
  ];

  const handleQuickQuestion = (
    item
  ) => {
    setQuestion(item);
    setAnswer("");
    setMessage("");

    setTimeout(() => {
      askQuestion(item);
    }, 50);
  };

  // ------------------------------------------------
  // Pro
  // ------------------------------------------------

  const openPro = () => {
    setShowPro(true);
  };

  const closePro = () => {
    setShowPro(false);
  };

  // ------------------------------------------------
  // Loading screen
  // ------------------------------------------------

  if (authLoading) {
    return (
      <div style={styles.loadingPage}>
        <div style={styles.loadingCard}>
          <h2>
            Salesforce AI Assistant
          </h2>

          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // ------------------------------------------------
  // Main UI
  // ------------------------------------------------

  return (
    <div style={styles.page}>
      {/* Header */}

      <header style={styles.header}>
        <div>
          <h1 style={styles.logo}>
            Salesforce AI Assistant
          </h1>

          <p style={styles.subtitle}>
            AI Assistant for Technology
            &amp; Salesforce
          </p>
        </div>

        <div
          style={styles.headerActions}
        >
          {showInstallButton && (
            <button
              onClick={
                handleInstallApp
              }
              style={
                styles.installButton
              }
            >
              📱 Install App
            </button>
          )}

          <button
            onClick={openPro}
            style={styles.proButton}
          >
            ⭐ Pro ₹100/month
          </button>

          {user ? (
            <div
              style={
                styles.userSection
              }
            >
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  style={styles.avatar}
                />
              )}

              <span
                style={
                  styles.userName
                }
              >
                {user.displayName ||
                  user.email ||
                  "User"}
              </span>

              <button
                onClick={
                  handleLogout
                }
                style={
                  styles.logoutButton
                }
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              style={styles.loginButton}
            >
              Continue with Google
            </button>
          )}
        </div>
      </header>

      {/* Main */}

      <main style={styles.main}>
        <section style={styles.hero}>
          <h2 style={styles.heroTitle}>
            Ask anything about
            technology
          </h2>

          <p style={styles.heroText}>
            Ask questions about any
            technology like Salesforce,
            ServiceNow, SAP, Python, Java
            and more — in English, Telugu,
            Hindi and other languages.
          </p>
        </section>

        {/* Question card */}

        <section
          style={styles.questionCard}
        >
          <textarea
            value={question}
            onChange={(event) =>
              setQuestion(
                event.target.value
              )
            }
            placeholder="Type your technology question here..."
            style={styles.textarea}
            rows={5}
            disabled={loading}
          />

          {/* Buttons */}

          <div
            style={styles.actionRow}
          >
            <button
              onClick={
                startVoiceInput
              }
              style={{
                ...styles.iconButton,

                ...(isListening
                  ? styles.listeningButton
                  : {}),
              }}
              disabled={loading}
              title="Speak your question"
            >
              {isListening
                ? "🔴 Listening..."
                : "🎤 Speak"}
            </button>

            <button
              onClick={() =>
                imageInputRef.current?.click()
              }
              style={
                styles.iconButton
              }
              disabled={loading}
              title="Upload image"
            >
              🖼️ Image
            </button>

            <button
              onClick={() =>
                fileInputRef.current?.click()
              }
              style={
                styles.iconButton
              }
              disabled={loading}
              title="Upload file"
            >
              📎 File
            </button>

            <button
              onClick={() =>
                videoInputRef.current?.click()
              }
              style={
                styles.iconButton
              }
              disabled={loading}
              title="Upload video"
            >
              🎥 Video
            </button>

            <button
              onClick={() =>
                askQuestion()
              }
              style={
                styles.askButton
              }
              disabled={loading}
            >
              {loading
                ? "Thinking..."
                : "Ask AI"}
            </button>
          </div>

          {/* Image input */}

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            style={styles.hiddenInput}
            onChange={
              handleFileSelect
            }
          />

          {/* File input */}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.doc,.docx,.csv,.json,.xml,.md"
            multiple
            style={styles.hiddenInput}
            onChange={
              handleFileSelect
            }
          />

          {/* Video input */}

          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            style={styles.hiddenInput}
            onChange={
              handleFileSelect
            }
          />

          {/* Selected files */}

          {selectedFiles.length >
            0 && (
            <div
              style={
                styles.filesContainer
              }
            >
              <div
                style={
                  styles.filesHeader
                }
              >
                <strong>
                  Selected files
                </strong>

                <button
                  onClick={
                    clearSelectedFiles
                  }
                  style={
                    styles.clearButton
                  }
                >
                  Clear all
                </button>
              </div>

              {selectedFiles.map(
                (file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    style={
                      styles.fileItem
                    }
                  >
                    <div>
                      <span
                        style={
                          styles.fileIcon
                        }
                      >
                        {file.type.startsWith(
                          "image/"
                        )
                          ? "🖼️"
                          : file.type.startsWith(
                              "video/"
                            )
                          ? "🎥"
                          : "📄"}
                      </span>

                      <span>
                        {file.name}
                      </span>

                      <span
                        style={
                          styles.fileSize
                        }
                      >
                        {" "}
                        (
                        {formatFileSize(
                          file.size
                        )}
                        )
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        removeSelectedFile(
                          index
                        )
                      }
                      style={
                        styles.removeButton
                      }
                    >
                      ✕
                    </button>
                  </div>
                )
              )}

              <p
                style={
                  styles.uploadNote
                }
              >
                Click{" "}
                <strong>
                  Ask AI
                </strong>{" "}
                to analyze the
                selected file.
              </p>
            </div>
          )}

          {/* Message */}

          {message && (
            <div
              style={styles.message}
            >
              {message}
            </div>
          )}
        </section>

        {/* Quick questions */}

        <section
          style={styles.quickSection}
        >
          <h3>
            Quick questions
          </h3>

          <div
            style={styles.quickGrid}
          >
            {quickQuestions.map(
              (item) => (
                <button
                  key={item}
                  onClick={() =>
                    handleQuickQuestion(
                      item
                    )
                  }
                  style={
                    styles.quickButton
                  }
                  disabled={loading}
                >
                  {item}
                </button>
              )
            )}
          </div>
        </section>

        {/* Answer */}

        {(answer || loading) && (
          <section
            style={styles.answerCard}
          >
            <div
              style={
                styles.answerHeader
              }
            >
              <h2>
                🤖 AI Answer
              </h2>
            </div>

            {loading ? (
              <div
                style={
                  styles.loadingAnswer
                }
              >
                <div
                  style={
                    styles.spinner
                  }
                ></div>

                <p>
                  AI is analyzing
                  your question...
                </p>
              </div>
            ) : (
              <div
                style={
                  styles.answerText
                }
              >
                {formatAnswer(
                  answer
                )}
              </div>
            )}

            {illustration && (
              <div
                style={
                  styles.illustrationContainer
                }
              >
                <img
                  src={illustration}
                  alt="AI illustration"
                  style={
                    styles.illustration
                  }
                />
              </div>
            )}
          </section>
        )}

        {/* Features */}

        <section
          style={styles.features}
        >
          <div
            style={styles.featureCard}
          >
            <div
              style={
                styles.featureIcon
              }
            >
              🌐
            </div>

            <h3>
              Multiple Technologies
            </h3>

            <p>
              Salesforce, ServiceNow,
              SAP, Python, Java and
              more.
            </p>
          </div>

          <div
            style={styles.featureCard}
          >
            <div
              style={
                styles.featureIcon
              }
            >
              🌍
            </div>

            <h3>
              Multiple Languages
            </h3>

            <p>
              Ask questions in English,
              Telugu, Hindi and other
              languages.
            </p>
          </div>

          <div
            style={styles.featureCard}
          >
            <div
              style={
                styles.featureIcon
              }
            >
              🎤
            </div>

            <h3>
              Voice Questions
            </h3>

            <p>
              Speak your question and
              the AI automatically
              processes it.
            </p>
          </div>

          <div
            style={styles.featureCard}
          >
            <div
              style={
                styles.featureIcon
              }
            >
              📎
            </div>

            <h3>
              Upload Files
            </h3>

            <p>
              Upload images and
              supported documents for
              AI analysis.
            </p>
          </div>
        </section>
      </main>

      {/* Pro modal */}

      {showPro && (
        <div
          style={
            styles.modalOverlay
          }
          onClick={closePro}
        >
          <div
            style={styles.modal}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              onClick={closePro}
              style={
                styles.modalClose
              }
            >
              ✕
            </button>

            <h2>
              ⭐ Pro Plan
            </h2>

            <div
              style={styles.price}
            >
              ₹100

              <span
                style={
                  styles.priceSmall
                }
              >
                + GST / month
              </span>
            </div>

            <p>
              Upgrade to Pro for
              enhanced AI capabilities.
            </p>

            <div
              style={
                styles.paymentList
              }
            >
              <div>
                📱 PhonePe
              </div>

              <div>
                📱 Google Pay
              </div>

              <div>
                💳 Credit / Debit Card
              </div>

              <div>
                🔒 Secure Razorpay
                Checkout
              </div>

              <div>
                🔄 Monthly recurring
                subscription
              </div>
            </div>

            <button
              style={
                styles.paymentButton
              }
              onClick={() => {
                setMessage(
                  "Razorpay subscription checkout will be connected in the payment backend step."
                );

                closePro();
              }}
            >
              Continue to Secure
              Payment
            </button>

            <p
              style={
                styles.paymentNote
              }
            >
              Pro activation should
              happen only after
              successful Razorpay
              payment verification.
            </p>
          </div>
        </div>
      )}

      {/* Footer */}

      <footer
        style={styles.footer}
      >
        <p>
          ©{" "}
          {new Date().getFullYear()}{" "}
          Salesforce AI Assistant
        </p>

        <p>
          Built for technology
          learning, Salesforce
          support and interview
          preparation.
        </p>
      </footer>
    </div>
  );
}

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function formatFileSize(bytes) {
  if (!bytes) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
  ];

  const index = Math.floor(
    Math.log(bytes) /
      Math.log(1024)
  );

  const safeIndex = Math.min(
    index,
    units.length - 1
  );

  return `${(
    bytes /
    Math.pow(
      1024,
      safeIndex
    )
  ).toFixed(1)} ${units[safeIndex]}`;
}

function formatAnswer(text) {
  if (!text) {
    return null;
  }

  return text
    .split("\n")
    .map((line, index) => (
      <p
        key={index}
        style={
          styles.answerParagraph
        }
      >
        {line || "\u00A0"}
      </p>
    ));
}

// --------------------------------------------------
// Styles
// --------------------------------------------------

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #f7f9fc 0%, #eef3ff 100%)",
    color: "#172033",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  header: {
    width: "100%",
    boxSizing: "border-box",
    padding: "18px 5%",
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "20px",
    background: "#ffffff",
    borderBottom:
      "1px solid #e5e7eb",
    position: "sticky",
    top: 0,
    zIndex: 20,
  },

  logo: {
    margin: 0,
    fontSize: "24px",
    fontWeight: 800,
  },

  subtitle: {
    margin: "4px 0 0",
    fontSize: "13px",
    color: "#667085",
  },

  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent:
      "flex-end",
  },

  installButton: {
    border:
      "1px solid #d0d5dd",
    background: "#ffffff",
    padding:
      "10px 14px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
  },

  proButton: {
    border: "none",
    background: "#111827",
    color: "#ffffff",
    padding:
      "10px 14px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 700,
  },

  loginButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding:
      "10px 16px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 700,
  },

  logoutButton: {
    border:
      "1px solid #d0d5dd",
    background: "#ffffff",
    color: "#344054",
    padding:
      "8px 12px",
    borderRadius: "8px",
    cursor: "pointer",
  },

  userSection: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  userName: {
    fontSize: "14px",
    fontWeight: 600,
  },

  avatar: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    objectFit: "cover",
  },

  main: {
    width: "90%",
    maxWidth: "1100px",
    margin: "0 auto",
    padding:
      "50px 0 70px",
  },

  hero: {
    textAlign: "center",
    marginBottom: "35px",
  },

  heroTitle: {
    margin: 0,
    fontSize: "42px",
    lineHeight: 1.15,
    fontWeight: 800,
  },

  heroText: {
    maxWidth: "850px",
    margin:
      "18px auto 0",
    fontSize: "17px",
    lineHeight: 1.7,
    color: "#667085",
  },

  questionCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "22px",
    boxShadow:
      "0 12px 35px rgba(15, 23, 42, 0.08)",
    border:
      "1px solid #eaecf0",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    resize: "vertical",
    minHeight: "130px",
    padding: "16px",
    borderRadius: "12px",
    border:
      "1px solid #d0d5dd",
    outline: "none",
    fontSize: "16px",
    lineHeight: 1.6,
    fontFamily: "inherit",
  },

  actionRow: {
    marginTop: "14px",
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  iconButton: {
    border:
      "1px solid #d0d5dd",
    background: "#ffffff",
    color: "#344054",
    padding:
      "11px 15px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
  },

  listeningButton: {
    border:
      "1px solid #ef4444",
    background: "#fef2f2",
    color: "#b91c1c",
  },

  askButton: {
    marginLeft: "auto",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding:
      "11px 24px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 800,
    minWidth: "120px",
  },

  hiddenInput: {
    display: "none",
  },

  filesContainer: {
    marginTop: "18px",
    padding: "15px",
    background: "#f8fafc",
    borderRadius: "12px",
    border:
      "1px solid #e2e8f0",
  },

  filesHeader: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },

  clearButton: {
    border: "none",
    background: "transparent",
    color: "#dc2626",
    cursor: "pointer",
    fontWeight: 600,
  },

  fileItem: {
    display: "flex",
    justifyContent:
      "space-between",
    alignItems: "center",
    gap: "10px",
    padding: "9px 0",
    borderBottom:
      "1px solid #e5e7eb",
  },

  fileIcon: {
    marginRight: "8px",
  },

  fileSize: {
    color: "#667085",
    fontSize: "12px",
  },

  removeButton: {
    border: "none",
    background: "transparent",
    color: "#dc2626",
    cursor: "pointer",
    fontSize: "16px",
  },

  uploadNote: {
    margin:
      "12px 0 0",
    fontSize: "13px",
    color: "#667085",
  },

  message: {
    marginTop: "15px",
    padding:
      "12px 14px",
    background: "#eff6ff",
    color: "#1d4ed8",
    borderRadius: "10px",
    fontSize: "14px",
  },

  quickSection: {
    marginTop: "35px",
  },

  quickGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "12px",
  },

  quickButton: {
    textAlign: "left",
    padding: "15px",
    border:
      "1px solid #dbe3f0",
    background: "#ffffff",
    borderRadius: "12px",
    cursor: "pointer",
    color: "#344054",
    fontWeight: 600,
  },

  answerCard: {
    marginTop: "30px",
    background: "#ffffff",
    borderRadius: "18px",
    padding: "25px",
    boxShadow:
      "0 12px 35px rgba(15, 23, 42, 0.08)",
    border:
      "1px solid #eaecf0",
  },

  answerHeader: {
    borderBottom:
      "1px solid #eaecf0",
    paddingBottom: "12px",
    marginBottom: "18px",
  },

  answerText: {
    fontSize: "16px",
    lineHeight: 1.8,
    color: "#344054",
  },

  answerParagraph: {
    margin:
      "0 0 10px",
  },

  loadingAnswer: {
    minHeight: "130px",
    display: "flex",
    flexDirection:
      "column",
    alignItems: "center",
    justifyContent:
      "center",
    color: "#667085",
  },

  spinner: {
    width: "30px",
    height: "30px",
    border:
      "3px solid #e5e7eb",
    borderTop:
      "3px solid #2563eb",
    borderRadius: "50%",
    animation:
      "spin 1s linear infinite",
    marginBottom: "12px",
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
    gap: "18px",
  },

  featureCard: {
    background: "#ffffff",
    padding: "24px",
    borderRadius: "16px",
    border:
      "1px solid #eaecf0",
    textAlign: "center",
  },

  featureIcon: {
    fontSize: "32px",
    marginBottom: "10px",
  },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background:
      "rgba(15, 23, 42, 0.55)",
    display: "flex",
    justifyContent:
      "center",
    alignItems: "center",
    padding: "20px",
    zIndex: 100,
  },

  modal: {
    width: "100%",
    maxWidth: "460px",
    background: "#ffffff",
    borderRadius: "18px",
    padding: "30px",
    position: "relative",
    boxSizing: "border-box",
    boxShadow:
      "0 25px 60px rgba(0, 0, 0, 0.2)",
  },

  modalClose: {
    position: "absolute",
    right: "15px",
    top: "15px",
    border: "none",
    background: "transparent",
    fontSize: "20px",
    cursor: "pointer",
  },

  price: {
    fontSize: "38px",
    fontWeight: 800,
    margin:
      "20px 0",
  },

  priceSmall: {
    display: "block",
    fontSize: "14px",
    color: "#667085",
    fontWeight: 500,
    marginTop: "3px",
  },

  paymentList: {
    display: "grid",
    gap: "12px",
    margin:
      "22px 0",
    fontSize: "15px",
  },

  paymentButton: {
    width: "100%",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding:
      "13px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 800,
  },

  paymentNote: {
    fontSize: "12px",
    color: "#667085",
    lineHeight: 1.5,
    marginTop: "15px",
  },

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    justifyContent:
      "center",
    alignItems: "center",
    background: "#f8fafc",
  },

  loadingCard: {
    background: "#ffffff",
    padding: "40px",
    borderRadius: "16px",
    textAlign: "center",
    boxShadow:
      "0 10px 30px rgba(0, 0, 0, 0.08)",
  },

  footer: {
    textAlign: "center",
    padding:
      "30px 20px",
    borderTop:
      "1px solid #e5e7eb",
    background: "#ffffff",
    color: "#667085",
    fontSize: "13px",
  },
};

export default App;