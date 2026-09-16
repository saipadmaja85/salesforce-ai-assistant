import { useEffect, useRef, useState } from "react";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { auth, googleProvider } from "./firebase";

import robotImage from "./assets/salesforce-ai-robot.png";

const BACKEND_URL =
  "https://salesforce-ai-assistant-8gvo.onrender.com";

function App() {
  /* =========================
     STATE
  ========================= */

  const [user, setUser] = useState(null);
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [illustration, setIllustration] = useState(null);

  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [message, setMessage] = useState("");

  /* =========================
     VOICE STATE
  ========================= */

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  /* =========================
     PWA STATE
  ========================= */

  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(true);

  /* =========================
     PRO STATE
  ========================= */

  const [showPro, setShowPro] = useState(false);

  /* =========================
     UPLOAD STATE
  ========================= */

  const [selectedFiles, setSelectedFiles] = useState([]);

  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  /* =========================
     FIREBASE AUTH STATE
  ========================= */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
      }
    );

    return () => unsubscribe();
  }, []);

  /* =========================
     DARKER PLACEHOLDERS
  ========================= */

  useEffect(() => {
    const style = document.createElement("style");

    style.innerHTML = `
      input::placeholder,
      textarea::placeholder {
        color: #667085 !important;
        opacity: 1 !important;
      }

      button:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }

      @media (max-width: 700px) {
        .desktop-only {
          display: none !important;
        }

        .header-email {
          display: none !important;
        }

        .upload-row {
          flex-direction: column;
        }

        .upload-button {
          width: 100%;
        }
      }
    `;

    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  /* =========================
     PWA INSTALL
  ========================= */

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

  /* =========================
     INSTALL APP
  ========================= */

  const installApp = async () => {
    if (!installPrompt) {
      setMessage(
        "The Install App option is not available in this browser right now. Please use the browser menu and choose Install App or Add to Home Screen."
      );

      return;
    }

    try {
      await installPrompt.prompt();

      const result = await installPrompt.userChoice;

      if (
        result &&
        result.outcome === "accepted"
      ) {
        setMessage(
          "Salesforce AI Assistant installed successfully."
        );
      }

      setInstallPrompt(null);
      setShowInstallButton(false);
    } catch (error) {
      console.error(
        "PWA installation error:",
        error
      );
    }
  };

  /* =========================
     EMAIL SIGN IN / SIGN UP
  ========================= */

  const handleEmailAuth = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setMessage(
        "Please enter your email and password."
      );
      return;
    }

    setAuthLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        setMessage(
          "Account created successfully."
        );
      } else {
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        setMessage(
          "Signed in successfully."
        );
      }
    } catch (error) {
      console.error(
        "Authentication error:",
        error
      );

      if (
        error.code ===
        "auth/email-already-in-use"
      ) {
        setMessage(
          "This email is already registered."
        );
      } else if (
        error.code === "auth/invalid-email"
      ) {
        setMessage(
          "Please enter a valid email address."
        );
      } else if (
        error.code === "auth/weak-password"
      ) {
        setMessage(
          "Password must be at least 6 characters."
        );
      } else if (
        error.code ===
          "auth/invalid-credential" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found"
      ) {
        setMessage(
          "Invalid email or password."
        );
      } else {
        setMessage(
          error.message ||
            "Authentication failed."
        );
      }
    } finally {
      setAuthLoading(false);
    }
  };

  /* =========================
     GOOGLE SIGN IN
  ========================= */

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setMessage("");

    try {
      await signInWithPopup(
        auth,
        googleProvider
      );
    } catch (error) {
      console.error(
        "Google sign-in error:",
        error
      );

      setMessage(
        error.message ||
          "Google sign-in failed."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  /* =========================
     FORGOT PASSWORD
  ========================= */

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setMessage(
        "Enter your email address first."
      );
      return;
    }

    setAuthLoading(true);
    setMessage("");

    try {
      await sendPasswordResetEmail(
        auth,
        email.trim()
      );

      setMessage(
        "Password reset email sent. Please check your inbox."
      );
    } catch (error) {
      console.error(
        "Password reset error:",
        error
      );

      setMessage(
        error.message ||
          "Unable to send password reset email."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  /* =========================
     SIGN OUT
  ========================= */

  const handleSignOut = async () => {
    try {
      if (
        recognitionRef.current
      ) {
        recognitionRef.current.stop();
      }

      await signOut(auth);

      setQuestion("");
      setAnswer("");
      setIllustration(null);
      setSelectedFiles([]);
      setMessage("");
      setShowPro(false);
      setIsListening(false);
    } catch (error) {
      console.error(
        "Sign out error:",
        error
      );
    }
  };

  /* =========================
     PRO UPGRADE
  ========================= */

  const handleUpgrade = async () => {
    setMessage(
      "Pro payment is ready for Razorpay integration. The secure Razorpay subscription backend still needs to be connected."
    );

    setShowPro(true);
  };

  /* =========================
     FILE UPLOAD
  ========================= */

  const handleFileSelect = (event) => {
    const files = Array.from(
      event.target.files || []
    );

    if (files.length === 0) {
      return;
    }

    setSelectedFiles(files);

    setMessage(
      `${files.length} file${
        files.length > 1 ? "s" : ""
      } selected.`
    );

    event.target.value = "";
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles(
      (currentFiles) =>
        currentFiles.filter(
          (_, fileIndex) =>
            fileIndex !== index
        )
    );
  };

  const clearSelectedFiles = () => {
    setSelectedFiles([]);
  };

  /* =========================
     ASK AI
  ========================= */

  const askQuestion = async (
    questionOverride = null
  ) => {
    const currentQuestion =
      questionOverride !== null
        ? questionOverride
        : question;

    if (
      !currentQuestion.trim() &&
      selectedFiles.length === 0
    ) {
      setAnswer(
        "Please enter a question or upload a file."
      );
      return;
    }

    if (!user) {
      setAnswer(
        "Please sign in before asking a question."
      );
      return;
    }

    /*
     * File processing will be connected
     * to the backend separately.
     */

    if (selectedFiles.length > 0) {
      setAnswer(
        "Your file has been selected successfully. Upload analysis will be connected to the AI backend next."
      );
      return;
    }

    setLoading(true);
    setAnswer("");
    setIllustration(null);

    try {
      const token =
        await user.getIdToken(true);

      const response = await fetch(
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
              currentQuestion.trim(),
          }),
        }
      );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        if (
          response.status === 403 &&
          data?.upgrade_required
        ) {
          setAnswer(
            "🔒 You've used your 10 free questions for this month."
          );

          setShowPro(true);

          return;
        }

        if (response.status === 401) {
          setAnswer(
            "Your login session has expired. Please sign out and sign in again."
          );

          return;
        }

        throw new Error(
          data?.detail ||
            `Server error: ${response.status}`
        );
      }

      setAnswer(
        data?.answer ||
          "No answer received."
      );

      setIllustration(
        data?.illustration || null
      );
    } catch (error) {
      console.error(
        "Chat error:",
        error
      );

      setAnswer(
        "Unable to connect to the AI backend. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     VOICE INPUT
  ========================= */

  const startVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMessage(
        "Voice input is not supported in this browser. Please use Google Chrome."
      );

      return;
    }

    if (
      isListening &&
      recognitionRef.current
    ) {
      recognitionRef.current.stop();

      return;
    }

    const recognition =
      new SpeechRecognition();

    /*
     * Change this to:
     *
     * te-IN = Telugu
     * hi-IN = Hindi
     * en-IN = English
     *
     * We can add a language selector later.
     */

    recognition.lang = "en-IN";

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setMessage(
        "🎤 Listening... Please speak your question."
      );
    };

    recognition.onresult = async (
      event
    ) => {
      const transcript =
        event.results[0][0].transcript.trim();

      if (!transcript) {
        setMessage(
          "I couldn't hear a question. Please try again."
        );

        return;
      }

      setQuestion(transcript);
      setMessage(
        `🎤 You said: ${transcript}`
      );

      /*
       * Automatically send the spoken question
       * to the AI backend.
       */

      await askQuestion(transcript);
    };

    recognition.onerror = (event) => {
      console.error(
        "Speech recognition error:",
        event.error
      );

      setIsListening(false);
      recognitionRef.current = null;

      if (
        event.error ===
        "not-allowed"
      ) {
        setMessage(
          "Microphone permission was denied. Please allow microphone access in your browser."
        );
      } else if (
        event.error ===
        "no-speech"
      ) {
        setMessage(
          "I didn't hear anything. Please tap Mic and speak again."
        );
      } else {
        setMessage(
          "Voice input failed. Please try again."
        );
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current =
      recognition;

    try {
      recognition.start();
    } catch (error) {
      console.error(
        "Could not start microphone:",
        error
      );

      setIsListening(false);
      recognitionRef.current = null;

      setMessage(
        "Unable to start the microphone. Please try again."
      );
    }
  };

  /* =========================
     ENTER KEY
  ========================= */

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      askQuestion();
    }
  };

  /* =========================
     QUICK QUESTIONS
  ========================= */

  const quickQuestions = [
    "What is Salesforce Flow?",
    "Explain Salesforce OWD",
    "What is an Apex trigger?",
    "What is LWC?",
    "What is Salesforce CPQ?",
    "What is a Permission Set?",
  ];

  /* =========================
     LOGIN SCREEN
  ========================= */

  if (!user) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginCard}>
          <img
            src={robotImage}
            alt="Salesforce AI Assistant"
            style={styles.loginRobot}
          />

          <h1 style={styles.loginTitle}>
            Salesforce AI Assistant
          </h1>

          <p style={styles.loginSubtitle}>
            Ask any question!
          </p>

          {showInstallButton && (
            <button
              type="button"
              onClick={installApp}
              style={styles.installButton}
            >
              📲 Install App
            </button>
          )}

          <div style={styles.tabs}>
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setMessage("");
              }}
              style={{
                ...styles.tab,
                ...(mode === "signin"
                  ? styles.activeTab
                  : {}),
              }}
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setMessage("");
              }}
              style={{
                ...styles.tab,
                ...(mode === "signup"
                  ? styles.activeTab
                  : {}),
              }}
            >
              Create Account
            </button>
          </div>

          <form
            onSubmit={handleEmailAuth}
          >
            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="Email address"
              style={styles.input}
              autoComplete="email"
            />

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="Password"
              style={styles.input}
              autoComplete={
                mode === "signup"
                  ? "new-password"
                  : "current-password"
              }
            />

            <button
              type="submit"
              disabled={authLoading}
              style={
                styles.continueButton
              }
            >
              {authLoading
                ? "Please wait..."
                : mode === "signin"
                ? "Continue"
                : "Create Account"}
            </button>
          </form>

          {mode === "signin" && (
            <button
              type="button"
              onClick={
                handleForgotPassword
              }
              style={
                styles.forgotButton
              }
            >
              Forgot password?
            </button>
          )}

          <div
            style={styles.orContainer}
          >
            <div
              style={styles.line}
            />

            <span
              style={styles.orText}
            >
              OR
            </span>

            <div
              style={styles.line}
            />
          </div>

          <button
            type="button"
            onClick={
              handleGoogleLogin
            }
            disabled={authLoading}
            style={
              styles.googleButton
            }
          >
            <span
              style={styles.googleG}
            >
              G
            </span>

            <span>
              Continue with Google
            </span>
          </button>

          {message && (
            <div
              style={styles.message}
            >
              {message}
            </div>
          )}

          <p style={styles.terms}>
            By continuing, you agree
            to our{" "}
            <a
              href="#"
              style={styles.link}
            >
              Terms
            </a>{" "}
            and{" "}
            <a
              href="#"
              style={styles.link}
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  /* =========================
     MAIN APP
  ========================= */

  return (
    <div style={styles.app}>
      {/* HEADER */}

      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <img
            src={robotImage}
            alt="AI Assistant"
            style={styles.headerRobot}
          />

          <div>
            <h1
              style={styles.headerTitle}
            >
              Salesforce AI Assistant
            </h1>

            <p
              style={
                styles.headerSubtitle
              }
            >
              Ask anything in any
              language.
            </p>
          </div>
        </div>

        <div
          style={styles.headerRight}
        >
          {showInstallButton && (
            <button
              type="button"
              onClick={installApp}
              style={
                styles.installHeaderButton
              }
            >
              📲 Install App
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              setShowPro(!showPro)
            }
            style={
              styles.proHeaderButton
            }
          >
            ⭐ Pro ₹100/month
          </button>

          <span
            style={styles.email}
            className="header-email"
          >
            {user.email}
          </span>

          <button
            type="button"
            onClick={handleSignOut}
            style={styles.signOut}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* PRO PANEL */}

      {showPro && (
        <section
          style={styles.proSection}
        >
          <div style={styles.proCard}>
            <div
              style={styles.proIcon}
            >
              ⭐
            </div>

            <div
              style={styles.proContent}
            >
              <h2
                style={styles.proTitle}
              >
                Upgrade to Pro
              </h2>

              <p
                style={styles.proPrice}
              >
                ₹100 / month
              </p>

              <ul
                style={styles.proList}
              >
                <li>
                  More AI questions
                </li>

                <li>
                  Advanced Salesforce
                  assistance
                </li>

                <li>
                  Priority features
                </li>

                <li>
                  Monthly subscription
                </li>
              </ul>

              <button
                type="button"
                onClick={
                  handleUpgrade
                }
                style={
                  styles.upgradeButton
                }
              >
                💳 Upgrade to Pro
              </button>

              <p
                style={
                  styles.paymentNote
                }
              >
                Secure payment through
                Razorpay.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* MAIN */}

      <main style={styles.main}>
        {/* HERO */}

        <section style={styles.hero}>
          <img
            src={robotImage}
            alt="Salesforce AI Assistant"
            style={styles.mainRobot}
          />

          <h2
            style={styles.heroTitle}
          >
            How can I help you today?
          </h2>

          <p
            style={
              styles.heroDescription
            }
          >
            Ask questions about any
            technology like Salesforce,
            ServiceNow, SAP, Python,
            Java and more — in English,
            Telugu, Hindi and other
            languages.
          </p>

          <p
            style={
              styles.uploadDescription
            }
          >
            Type a question or upload
            an image, file or video and
            ask about it.
          </p>
        </section>

        {/* QUESTION BOX */}

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
            onKeyDown={handleKeyDown}
            placeholder="Ask your technology question..."
            rows={5}
            style={styles.textarea}
          />

          {/* UPLOAD + MICROPHONE BUTTONS */}

          <div
            className="upload-row"
            style={styles.uploadRow}
          >
            {/* MIC */}

            <button
              type="button"
              className="upload-button"
              style={{
                ...styles.uploadButton,
                ...(isListening
                  ? styles.listeningButton
                  : {}),
              }}
              onClick={
                startVoiceInput
              }
              disabled={loading}
            >
              {isListening
                ? "🔴 Listening..."
                : "🎤 Mic"}
            </button>

            {/* IMAGE */}

            <button
              type="button"
              className="upload-button"
              style={
                styles.uploadButton
              }
              onClick={() =>
                imageInputRef.current?.click()
              }
            >
              📷 Image
            </button>

            {/* FILE */}

            <button
              type="button"
              className="upload-button"
              style={
                styles.uploadButton
              }
              onClick={() =>
                fileInputRef.current?.click()
              }
            >
              📎 File
            </button>

            {/* VIDEO */}

            <button
              type="button"
              className="upload-button"
              style={
                styles.uploadButton
              }
              onClick={() =>
                videoInputRef.current?.click()
              }
            >
              🎥 Video
            </button>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              style={
                styles.hiddenInput
              }
              onChange={
                handleFileSelect
              }
            />

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls,.ppt,.pptx"
              multiple
              style={
                styles.hiddenInput
              }
              onChange={
                handleFileSelect
              }
            />

            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              multiple
              style={
                styles.hiddenInput
              }
              onChange={
                handleFileSelect
              }
            />
          </div>

          {/* SELECTED FILES */}

          {selectedFiles.length >
            0 && (
            <div
              style={
                styles.selectedFilesBox
              }
            >
              <div
                style={
                  styles.selectedFilesHeader
                }
              >
                <strong>
                  Selected files
                </strong>

                <button
                  type="button"
                  onClick={
                    clearSelectedFiles
                  }
                  style={
                    styles.clearFilesButton
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
                      styles.selectedFile
                    }
                  >
                    <span
                      style={
                        styles.fileName
                      }
                    >
                      📎 {file.name}
                    </span>

                    <span
                      style={
                        styles.fileSize
                      }
                    >
                      {(
                        file.size /
                        (1024 * 1024)
                      ).toFixed(2)}{" "}
                      MB
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        removeSelectedFile(
                          index
                        )
                      }
                      style={
                        styles.removeFileButton
                      }
                    >
                      ✕
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          {/* QUESTION FOOTER */}

          <div
            style={
              styles.questionFooter
            }
          >
            <span
              style={styles.hint}
            >
              Press Enter to ask
            </span>

            <button
              type="button"
              onClick={() =>
                askQuestion()
              }
              disabled={loading}
              style={
                styles.askButton
              }
            >
              {loading
                ? "Thinking..."
                : "Ask AI"}
            </button>
          </div>
        </section>

        {/* MESSAGE */}

        {message && (
          <div
            style={{
              ...styles.message,
              marginTop: "12px",
              textAlign: "center",
            }}
          >
            {message}
          </div>
        )}

        {/* QUICK QUESTIONS */}

        <section
          style={styles.quickSection}
        >
          <h3
            style={styles.quickTitle}
          >
            Quick Questions
          </h3>

          <div
            style={styles.quickGrid}
          >
            {quickQuestions.map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setQuestion(item);
                    setAnswer("");
                    setIllustration(
                      null
                    );
                  }}
                  style={
                    styles.quickButton
                  }
                >
                  {item}
                </button>
              )
            )}
          </div>
        </section>

        {/* LOADING */}

        {loading && (
          <section
            style={styles.answerCard}
          >
            <div
              style={styles.loading}
            >
              <div
                style={styles.spinner}
              />

              <span>
                Salesforce AI is
                thinking...
              </span>
            </div>
          </section>
        )}

        {/* ANSWER */}

        {!loading &&
          answer && (
            <section
              style={
                styles.answerCard
              }
            >
              <h3
                style={
                  styles.answerTitle
                }
              >
                AI Response
              </h3>

              <div
                style={styles.answer}
              >
                {answer}
              </div>

              {illustration && (
                <img
                  src={illustration}
                  alt="AI illustration"
                  style={
                    styles.illustration
                  }
                />
              )}
            </section>
          )}
      </main>

      {/* FOOTER */}

      <footer style={styles.footer}>
        <strong>
          Salesforce AI Assistant
        </strong>

        <div>
          AI-powered Salesforce
          learning assistant
        </div>
      </footer>
    </div>
  );
}

/* =========================
   STYLES
========================= */

const styles = {
  /* LOGIN */

  loginPage: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "24px",
    boxSizing: "border-box",
    background:
      "linear-gradient(135deg, #eef5ff, #f8fbff)",
    fontFamily:
      "Inter, Arial, sans-serif",
  },

  loginCard: {
    width: "100%",
    maxWidth: "430px",
    background: "#ffffff",
    border: "1px solid #d0d5dd",
    borderRadius: "20px",
    padding: "30px",
    boxSizing: "border-box",
    textAlign: "center",
    boxShadow:
      "0 12px 35px rgba(0,0,0,0.12)",
  },

  loginRobot: {
    width: "120px",
    height: "120px",
    objectFit: "contain",
    display: "block",
    margin: "0 auto 12px",
  },

  loginTitle: {
    margin: "0",
    color: "#101828",
    fontSize: "27px",
    lineHeight: "1.25",
    fontWeight: "800",
  },

  loginSubtitle: {
    margin: "8px 0 20px",
    color: "#344054",
    fontSize: "14px",
    fontWeight: "500",
  },

  installButton: {
    width: "100%",
    height: "44px",
    marginBottom: "16px",
    border: "none",
    borderRadius: "9px",
    background: "#172033",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },

  tabs: {
    display: "flex",
    gap: "5px",
    padding: "4px",
    marginBottom: "18px",
    background: "#eaecf0",
    borderRadius: "10px",
  },

  tab: {
    flex: 1,
    border: "none",
    borderRadius: "8px",
    padding: "11px 5px",
    background: "transparent",
    color: "#344054",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "700",
  },

  activeTab: {
    background: "#ffffff",
    color: "#101828",
    boxShadow:
      "0 1px 5px rgba(0,0,0,0.12)",
  },

  input: {
    width: "100%",
    height: "46px",
    border: "2px solid #98a2b3",
    borderRadius: "9px",
    padding: "0 13px",
    marginBottom: "12px",
    boxSizing: "border-box",
    fontSize: "14px",
    color: "#101828",
    background: "#ffffff",
    outline: "none",
  },

  continueButton: {
    width: "100%",
    height: "46px",
    border: "none",
    borderRadius: "9px",
    background: "#0176d3",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },

  forgotButton: {
    marginTop: "13px",
    border: "none",
    background: "transparent",
    color: "#005fb2",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },

  orContainer: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    margin: "20px 0",
  },

  line: {
    flex: 1,
    height: "1px",
    background: "#98a2b3",
  },

  orText: {
    color: "#475467",
    fontSize: "11px",
    fontWeight: "700",
  },

  googleButton: {
    width: "100%",
    height: "46px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "9px",
    border: "2px solid #98a2b3",
    borderRadius: "9px",
    background: "#ffffff",
    color: "#172033",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },

  googleG: {
    fontSize: "18px",
    fontWeight: "800",
  },

  message: {
    marginTop: "15px",
    padding: "11px",
    borderRadius: "8px",
    background: "#f2f4f7",
    border: "1px solid #98a2b3",
    color: "#172033",
    fontSize: "12px",
    lineHeight: "1.5",
  },

  terms: {
    margin: "20px 0 0",
    color: "#475467",
    fontSize: "11px",
    lineHeight: "1.6",
  },

  link: {
    color: "#005fb2",
    fontWeight: "600",
  },

  /* APP */

  app: {
    minHeight: "100vh",
    background: "#f7f9fc",
    color: "#101828",
    fontFamily:
      "Inter, Arial, sans-serif",
  },

  header: {
    minHeight: "74px",
    background: "#ffffff",
    borderBottom:
      "2px solid #d0d5dd",
    padding: "10px 20px",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: 0,
  },

  headerRobot: {
    width: "48px",
    height: "48px",
    objectFit: "contain",
    flexShrink: 0,
  },

  headerTitle: {
    margin: 0,
    color: "#101828",
    fontSize: "19px",
    fontWeight: "800",
  },

  headerSubtitle: {
    margin: "3px 0 0",
    color: "#475467",
    fontSize: "12px",
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "8px",
    flexWrap: "wrap",
  },

  installHeaderButton: {
    border: "none",
    borderRadius: "8px",
    padding: "9px 12px",
    background: "#172033",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "700",
  },

  proHeaderButton: {
    border: "none",
    borderRadius: "8px",
    padding: "9px 12px",
    background: "#f5b700",
    color: "#172033",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "800",
  },

  email: {
    color: "#172033",
    fontSize: "12px",
    fontWeight: "700",
  },

  signOut: {
    padding: "9px 13px",
    border: "2px solid #667085",
    borderRadius: "8px",
    background: "#ffffff",
    color: "#172033",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "700",
  },

  /* PRO */

  proSection: {
    width: "100%",
    padding: "18px 20px 0",
    boxSizing: "border-box",
  },

  proCard: {
    width: "100%",
    maxWidth: "850px",
    margin: "0 auto",
    background: "#ffffff",
    border: "2px solid #f5b700",
    borderRadius: "15px",
    padding: "20px",
    display: "flex",
    gap: "18px",
    boxSizing: "border-box",
    boxShadow:
      "0 5px 20px rgba(0,0,0,0.07)",
  },

  proIcon: {
    fontSize: "34px",
    flexShrink: 0,
  },

  proContent: {
    flex: 1,
  },

  proTitle: {
    margin: 0,
    color: "#101828",
    fontSize: "21px",
    fontWeight: "800",
  },

  proPrice: {
    margin: "5px 0 10px",
    color: "#101828",
    fontSize: "19px",
    fontWeight: "800",
  },

  proList: {
    margin: "8px 0 16px",
    paddingLeft: "20px",
    color: "#344054",
    fontSize: "13px",
    lineHeight: "1.9",
  },

  upgradeButton: {
    border: "none",
    borderRadius: "8px",
    padding: "12px 20px",
    background: "#0176d3",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "800",
  },

  paymentNote: {
    margin: "9px 0 0",
    color: "#475467",
    fontSize: "11px",
  },

  /* MAIN */

  main: {
    width: "100%",
    maxWidth: "900px",
    margin: "0 auto",
    padding: "38px 20px",
    boxSizing: "border-box",
  },

  hero: {
    textAlign: "center",
    marginBottom: "28px",
  },

  mainRobot: {
    width: "120px",
    height: "120px",
    objectFit: "contain",
    display: "block",
    margin: "0 auto 10px",
  },

  heroTitle: {
    margin: 0,
    color: "#101828",
    fontSize: "29px",
    fontWeight: "800",
  },

  heroDescription: {
    maxWidth: "680px",
    margin: "10px auto 0",
    color: "#344054",
    fontSize: "14px",
    fontWeight: "500",
    lineHeight: "1.7",
  },

  uploadDescription: {
    maxWidth: "680px",
    margin: "7px auto 0",
    color: "#667085",
    fontSize: "13px",
    lineHeight: "1.6",
  },

  /* QUESTION */

  questionCard: {
    background: "#ffffff",
    border: "2px solid #98a2b3",
    borderRadius: "15px",
    padding: "16px",
    boxShadow:
      "0 4px 18px rgba(0,0,0,0.06)",
  },

  textarea: {
    width: "100%",
    minHeight: "130px",
    resize: "vertical",
    border: "2px solid #667085",
    borderRadius: "9px",
    padding: "13px",
    boxSizing: "border-box",
    fontSize: "15px",
    lineHeight: "1.6",
    fontFamily:
      "Inter, Arial, sans-serif",
    color: "#101828",
    background: "#ffffff",
    outline: "none",
  },

  /* UPLOAD */

  uploadRow: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    marginTop: "12px",
    flexWrap: "wrap",
  },

  uploadButton: {
    border: "2px solid #98a2b3",
    borderRadius: "8px",
    padding: "9px 15px",
    background: "#ffffff",
    color: "#172033",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "700",
  },

  listeningButton: {
    border: "2px solid #d92d20",
    background: "#fff1f0",
    color: "#b42318",
  },

  hiddenInput: {
    display: "none",
  },

  selectedFilesBox: {
    marginTop: "12px",
    padding: "12px",
    border: "1px solid #d0d5dd",
    borderRadius: "9px",
    background: "#f8fafc",
  },

  selectedFilesHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
    color: "#172033",
    fontSize: "13px",
  },

  clearFilesButton: {
    border: "none",
    background: "transparent",
    color: "#b42318",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "700",
  },

  selectedFile: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 0",
    borderTop:
      "1px solid #eaecf0",
  },

  fileName: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: "#172033",
    fontSize: "12px",
    fontWeight: "600",
  },

  fileSize: {
    color: "#667085",
    fontSize: "11px",
    whiteSpace: "nowrap",
  },

  removeFileButton: {
    border: "none",
    background: "#fee4e2",
    color: "#b42318",
    borderRadius: "6px",
    width: "26px",
    height: "26px",
    cursor: "pointer",
    fontWeight: "800",
  },

  questionFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "10px",
  },

  hint: {
    color: "#344054",
    fontSize: "12px",
    fontWeight: "600",
  },

  askButton: {
    border: "none",
    borderRadius: "8px",
    padding: "11px 23px",
    background: "#0176d3",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "800",
  },

  /* QUICK QUESTIONS */

  quickSection: {
    marginTop: "27px",
  },

  quickTitle: {
    margin: "0 0 12px",
    color: "#101828",
    fontSize: "18px",
    fontWeight: "800",
  },

  quickGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "10px",
  },

  quickButton: {
    minHeight: "48px",
    background: "#ffffff",
    border: "2px solid #98a2b3",
    borderRadius: "9px",
    padding: "12px",
    textAlign: "left",
    cursor: "pointer",
    color: "#172033",
    fontSize: "13px",
    fontWeight: "700",
  },

  /* ANSWER */

  answerCard: {
    marginTop: "25px",
    background: "#ffffff",
    border: "2px solid #98a2b3",
    borderRadius: "15px",
    padding: "20px",
    boxShadow:
      "0 4px 18px rgba(0,0,0,0.05)",
  },

  answerTitle: {
    margin: "0 0 12px",
    color: "#101828",
    fontSize: "18px",
    fontWeight: "800",
  },

  answer: {
    whiteSpace: "pre-wrap",
    color: "#172033",
    fontSize: "14px",
    lineHeight: "1.8",
    fontWeight: "500",
  },

  illustration: {
    display: "block",
    maxWidth: "100%",
    maxHeight: "350px",
    objectFit: "contain",
    margin: "20px auto 0",
    borderRadius: "10px",
  },

  /* LOADING */

  loading: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#344054",
    fontSize: "13px",
    fontWeight: "600",
  },

  spinner: {
    width: "18px",
    height: "18px",
    border: "3px solid #d0d5dd",
    borderTop:
      "3px solid #0176d3",
    borderRadius: "50%",
  },

  /* FOOTER */

  footer: {
    textAlign: "center",
    padding: "25px 20px",
    color: "#475467",
    fontSize: "11px",
    lineHeight: "1.7",
  },
};

export default App;