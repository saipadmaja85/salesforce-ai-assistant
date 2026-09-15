import { useState, useEffect } from "react";
import "./App.css";
import aiRobot from "./assets/salesforce-ai-robot.png";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";

import { auth, googleProvider } from "./firebase";

function App() {
  const [user, setUser] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [authMode, setAuthMode] = useState("signin");
  const [resetMode, setResetMode] = useState(false);

  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [illustration, setIllustration] = useState(null);
  const [loading, setLoading] = useState(false);

  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );

    window.addEventListener(
      "appinstalled",
      handleAppInstalled
    );

    if (
      window.matchMedia("(display-mode: standalone)").matches
    ) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );

      window.removeEventListener(
        "appinstalled",
        handleAppInstalled
      );
    };
  }, []);

  const handleEmailAuth = async (event) => {
    event.preventDefault();

    setAuthError("");
    setAuthSuccess("");

    if (!email.trim()) {
      setAuthError("Please enter your email address.");
      return;
    }

    if (!password.trim()) {
      setAuthError("Please enter your password.");
      return;
    }

    if (authMode === "signup" && !confirmPassword.trim()) {
      setAuthError("Please re-type your password.");
      return;
    }

    if (password.length < 6) {
      setAuthError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (
      authMode === "signup" &&
      password !== confirmPassword
    ) {
      setAuthError("Passwords do not match.");
      return;
    }

    setAuthLoading(true);

    try {
      if (authMode === "signin") {
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
      } else {
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
      }

      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error(error);

      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found"
      ) {
        setAuthError(
          "Invalid email or password. If you forgot your password, use Forgot password."
        );
      } else if (
        error.code === "auth/email-already-in-use"
      ) {
        setAuthError(
          "An account already exists with this email. Please sign in or use Forgot password."
        );
      } else if (
        error.code === "auth/weak-password"
      ) {
        setAuthError(
          "Password is too weak. Use at least 6 characters."
        );
      } else if (
        error.code === "auth/invalid-email"
      ) {
        setAuthError(
          "Please enter a valid email address."
        );
      } else {
        setAuthError(
          "Authentication failed. Please try again."
        );
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePasswordReset = async (event) => {
    event.preventDefault();

    setAuthError("");
    setAuthSuccess("");

    if (!email.trim()) {
      setAuthError(
        "Please enter the email address associated with your account."
      );
      return;
    }

    setAuthLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);

      setAuthSuccess(
        "Password reset link sent. Please check your email inbox and spam folder."
      );
    } catch (error) {
      console.error(error);

      if (error.code === "auth/invalid-email") {
        setAuthError(
          "Please enter a valid email address."
        );
      } else if (error.code === "auth/user-not-found") {
        setAuthError(
          "No account was found with this email address."
        );
      } else {
        setAuthError(
          "Unable to send the password reset email. Please try again."
        );
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError("");
    setAuthSuccess("");
    setAuthLoading(true);

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error(error);

      if (
        error.code ===
        "auth/popup-closed-by-user"
      ) {
        setAuthError(
          "Google sign-in was cancelled."
        );
      } else {
        setAuthError(
          "Google sign-in failed. Please try again."
        );
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);

      setQuestion("");
      setAnswer("");
      setIllustration(null);
    } catch (error) {
      console.error(error);
    }
  };

  const installApp = async () => {
    if (isInstalled) {
      return;
    }

    if (!installPrompt) {
      alert(
        "Chrome is not showing the automatic install prompt yet. Please use Chrome's Install option from the browser address bar or menu."
      );
      return;
    }

    installPrompt.prompt();

    const { outcome } =
      await installPrompt.userChoice;

    if (outcome === "accepted") {
      setInstallPrompt(null);
    }
  };

  const askQuestion = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setAnswer("");
    setIllustration(null);

    try {
      const token = await user.getIdToken();

      const response = await fetch(
        "https://salesforce-ai-assistant-8gvo.onrender.com/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            question: question,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        if (
          response.status === 403 &&
          errorData?.upgrade_required
        ) {
          setAnswer(
            "🔒 You've used your 10 free questions for this month. Upgrade to Pro for ₹100/month to continue."
          );
          return;
        }

        throw new Error(
          `Server error: ${response.status}`
        );
      }

      const data = await response.json();

      setAnswer(
        data.answer || "No answer received."
      );

      setIllustration(
        data.illustration || null
      );
    } catch (error) {
      console.error(error);

      setAnswer(
        "Unable to connect to the AI backend. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    if (resetMode) {
      return (
        <div className="auth-page">
          <div className="auth-card">

            <img
              src={aiRobot}
              alt="AI Assistant"
              className="auth-logo"
            />

            <h1>
              Reset Password
            </h1>

            <p className="auth-subtitle">
              Enter your email address and we'll send you a password reset link.
            </p>

            <form onSubmit={handlePasswordReset}>

              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                autoComplete="email"
              />

              {authError && (
                <div className="auth-error">
                  {authError}
                </div>
              )}

              {authSuccess && (
                <div className="auth-success">
                  {authSuccess}
                </div>
              )}

              <button
                type="submit"
                className="continue-button"
                disabled={authLoading}
              >
                {authLoading
                  ? "Sending..."
                  : "Send Reset Link"}
              </button>

            </form>

            <button
              className="back-button"
              onClick={() => {
                setResetMode(false);
                setAuthMode("signin");
                setAuthError("");
                setAuthSuccess("");
              }}
            >
              ← Back to Sign In
            </button>

          </div>
        </div>
      );
    }

    return (
      <div className="auth-page">

        <div className="auth-card">

          <img
            src={aiRobot}
            alt="AI Assistant"
            className="auth-logo"
          />

          <h1>
            Salesforce AI Assistant
          </h1>

          <p className="auth-subtitle">
            Ask anything in any language.
          </p>

          <div className="auth-tabs">

            <button
              className={
                authMode === "signin"
                  ? "active"
                  : ""
              }
              onClick={() => {
                setAuthMode("signin");
                setAuthError("");
                setAuthSuccess("");
                setPassword("");
                setConfirmPassword("");
              }}
            >
              Sign In
            </button>

            <button
              className={
                authMode === "signup"
                  ? "active"
                  : ""
              }
              onClick={() => {
                setAuthMode("signup");
                setAuthError("");
                setAuthSuccess("");
                setPassword("");
                setConfirmPassword("");
              }}
            >
              Create Account
            </button>

          </div>

          <form onSubmit={handleEmailAuth}>

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              autoComplete="email"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              autoComplete={
                authMode === "signin"
                  ? "current-password"
                  : "new-password"
              }
            />

            {authMode === "signup" && (
              <input
                type="password"
                placeholder="Re-type password"
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                autoComplete="new-password"
              />
            )}

            {authMode === "signin" && (
              <div className="forgot-password-wrapper">
                <button
                  type="button"
                  className="forgot-password"
                  onClick={() => {
                    setResetMode(true);
                    setAuthError("");
                    setAuthSuccess("");
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {authError && (
              <div className="auth-error">
                {authError}
              </div>
            )}

            {authSuccess && (
              <div className="auth-success">
                {authSuccess}
              </div>
            )}

            <button
              type="submit"
              className="continue-button"
              disabled={authLoading}
            >
              {authLoading
                ? "Please wait..."
                : authMode === "signin"
                ? "Continue"
                : "Create Account"}
            </button>

          </form>

          <div className="divider">
            <span>OR</span>
          </div>

          <button
            className="google-button"
            onClick={handleGoogleSignIn}
            disabled={authLoading}
          >
            <span className="google-icon">
              G
            </span>

            Continue with Google
          </button>

          <p className="terms">
            By continuing, you agree to our{" "}
            <a
              href="#"
              onClick={(e) =>
                e.preventDefault()
              }
            >
              Terms
            </a>{" "}
            and{" "}
            <a
              href="#"
              onClick={(e) =>
                e.preventDefault()
              }
            >
              Privacy Policy
            </a>
            .
          </p>

        </div>

      </div>
    );
  }

  return (
    <div className="app">

      <header className="header">

        <div>
          <h1>
            Salesforce AI Assistant
          </h1>

          <p>
            Your AI assistant for Technology & Business Solutions
          </p>
        </div>

        <div className="header-actions">

          <span className="user-email">
            {user.email}
          </span>

          <button
            className="signout-button"
            onClick={handleSignOut}
          >
            Sign Out
          </button>

          <button
            className="install-button"
            onClick={installApp}
          >
            {isInstalled
              ? "✅ App Installed"
              : "📲 Install App"}
          </button>

        </div>

      </header>

      <main className="main-container">

        <img
          src={aiRobot}
          alt="AI Assistant"
          className="ai-robot"
        />

        <h2>
          How can I help you?
        </h2>

        <p className="subtitle">
          Ask any technology, business, or general question in any language.
        </p>

        <div className="quick-buttons">

          <button
            onClick={() =>
              setQuestion(
                "How can I create a Salesforce Flow to automatically update a field?"
              )
            }
          >
            Salesforce Flow
          </button>

          <button
            onClick={() =>
              setQuestion(
                "How can I automate lead assignment in Salesforce?"
              )
            }
          >
            Lead Automation
          </button>

          <button
            onClick={() =>
              setQuestion(
                "Explain a Python programming concept with an example."
              )
            }
          >
            Python
          </button>

          <button
            onClick={() =>
              setQuestion(
                "Explain a Java programming concept with an example."
              )
            }
          >
            Java
          </button>

          <button
            onClick={() =>
              setQuestion(
                "How can I create an automated test using Playwright?"
              )
            }
          >
            Playwright
          </button>

          <button
            onClick={() =>
              setQuestion(
                "A business wants to automate its approval process. How should I implement it?"
              )
            }
          >
            Business Scenario
          </button>

        </div>

        <textarea
          value={question}
          onChange={(e) =>
            setQuestion(e.target.value)
          }
          placeholder="Ask anything in any language..."
        />

        <button
          className="ask-button"
          onClick={askQuestion}
          disabled={loading}
        >
          {loading
            ? "Generating..."
            : "Ask AI →"}
        </button>

        {answer && (
          <div className="answer">

            <h3>
              AI Response
            </h3>

            <div className="answer-content">
              {answer}
            </div>

            {illustration && (
              <div className="illustration-section">

                <h3>
                  AI-Generated Illustration
                </h3>

                <img
                  src={`data:image/png;base64,${illustration}`}
                  alt="AI-generated illustration"
                  className="salesforce-illustration"
                />

              </div>
            )}

            <button
              className="document-button"
              onClick={() => window.print()}
            >
              📄 Generate Documentation
            </button>

          </div>
        )}

      </main>

    </div>
  );
}

export default App;