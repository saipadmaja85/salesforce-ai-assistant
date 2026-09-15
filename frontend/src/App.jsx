import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { auth, googleProvider } from "./firebase";

const BACKEND_URL =
  "https://salesforce-ai-assistant-8gvo.onrender.com";

function App() {
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  const handleEmailAuth = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setMessage("Please enter your email and password.");
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

        setMessage("Account created successfully.");
      } else {
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        setMessage("Signed in successfully.");
      }
    } catch (error) {
      console.error("Authentication error:", error);

      switch (error.code) {
        case "auth/email-already-in-use":
          setMessage("This email is already registered.");
          break;

        case "auth/invalid-email":
          setMessage("Please enter a valid email address.");
          break;

        case "auth/weak-password":
          setMessage("Password must be at least 6 characters.");
          break;

        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          setMessage("Invalid email or password.");
          break;

        default:
          setMessage(error.message || "Authentication failed.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setMessage("");

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google sign-in error:", error);
      setMessage(
        error.message || "Google sign-in failed."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setMessage("Enter your email address first.");
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
      console.error("Password reset error:", error);

      if (error.code === "auth/user-not-found") {
        setMessage("No account was found with this email.");
      } else {
        setMessage(
          error.message || "Unable to send reset email."
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
      setMessage("");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const askQuestion = async () => {
    if (!question.trim()) {
      setAnswer("Please enter a question.");
      return;
    }

    if (!user) {
      setAnswer("Please sign in before asking a question.");
      return;
    }

    setLoading(true);
    setAnswer("");
    setIllustration(null);

    try {
      const token = await user.getIdToken(true);

      const response = await fetch(
        `${BACKEND_URL}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            question: question.trim(),
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (
          response.status === 403 &&
          data?.upgrade_required
        ) {
          setAnswer(
            "🔒 You've used your 10 free questions for this month. Upgrade to Pro for ₹100/month to continue."
          );
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
        data?.answer || "No answer received."
      );

      setIllustration(
        data?.illustration || null
      );
    } catch (error) {
      console.error("Chat error:", error);

      setAnswer(
        "Unable to connect to the AI backend. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();
      askQuestion();
    }
  };

  const quickQuestions = [
    "What is Salesforce Flow?",
    "Explain Salesforce OWD",
    "What is an Apex trigger?",
    "What is LWC?",
  ];

  if (!user) {
    return (
      <div style={styles.page}>
        <div style={styles.authCard}>
          <img
            src="/assets/salesforce-ai-robot-B7rriz3-.png"
            alt="Salesforce AI Assistant"
            style={styles.robotSmall}
          />

          <h1 style={styles.title}>
            Salesforce AI Assistant
          </h1>

          <p style={styles.subtitle}>
            Ask anything in any language.
          </p>

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

          <form onSubmit={handleEmailAuth}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              style={styles.input}
              autoComplete="email"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
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
              style={styles.primaryButton}
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
              onClick={handleForgotPassword}
              style={styles.linkButton}
            >
              Forgot password?
            </button>
          )}

          <div style={styles.divider}>
            <span>OR</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={authLoading}
            style={styles.googleButton}
          >
            <span style={styles.googleIcon}>
              G
            </span>
            Continue with Google
          </button>

          {message && (
            <div style={styles.message}>
              {message}
            </div>
          )}

          <p style={styles.terms}>
            By continuing, you agree to our{" "}
            <a href="#" style={styles.termsLink}>
              Terms
            </a>{" "}
            and{" "}
            <a href="#" style={styles.termsLink}>
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appPage}>
      <header style={styles.header}>
        <div style={styles.brand}>
          <img
            src="/assets/salesforce-ai-robot-B7rriz3-.png"
            alt="AI Assistant"
            style={styles.headerRobot}
          />

          <div>
            <h1 style={styles.headerTitle}>
              Salesforce AI Assistant
            </h1>

            <p style={styles.headerSubtitle}>
              Ask anything in any language.
            </p>
          </div>
        </div>

        <div style={styles.userArea}>
          <span style={styles.userEmail}>
            {user.email}
          </span>

          <button
            type="button"
            onClick={handleSignOut}
            style={styles.signOutButton}
          >
            Sign Out
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.hero}>
          <img
            src="/assets/salesforce-ai-robot-B7rriz3-.png"
            alt="Salesforce AI Assistant"
            style={styles.robotMain}
          />

          <h2 style={styles.heroTitle}>
            How can I help you today?
          </h2>

          <p style={styles.heroText}>
            Ask Salesforce questions about Admin,
            Development, Testing, Apex, LWC, CPQ,
            Sales Cloud, Service Cloud and more.
          </p>
        </section>

        <section style={styles.chatCard}>
          <textarea
            value={question}
            onChange={(event) =>
              setQuestion(event.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="Ask your Salesforce question..."
            style={styles.textarea}
            rows={5}
          />

          <div style={styles.actionRow}>
            <span style={styles.enterHint}>
              Press Enter to ask
            </span>

            <button
              type="button"
              onClick={askQuestion}
              disabled={loading}
              style={styles.askButton}
            >
              {loading ? "Thinking..." : "Ask AI"}
            </button>
          </div>
        </section>

        <section style={styles.quickSection}>
          <h3 style={styles.sectionTitle}>
            Quick Questions
          </h3>

          <div style={styles.quickGrid}>
            {quickQuestions.map(
              (quickQuestion) => (
                <button
                  key={quickQuestion}
                  type="button"
                  onClick={() => {
                    setQuestion(quickQuestion);
                    setAnswer("");
                    setIllustration(null);
                  }}
                  style={styles.quickButton}
                >
                  {quickQuestion}
                </button>
              )
            )}
          </div>
        </section>

        {loading && (
          <section style={styles.answerCard}>
            <div style={styles.loading}>
              <div style={styles.spinner}></div>
              <span>
                Salesforce AI is thinking...
              </span>
            </div>
          </section>
        )}

        {!loading && answer && (
          <section style={styles.answerCard}>
            <h3 style={styles.answerTitle}>
              AI Response
            </h3>

            <div style={styles.answerText}>
              {answer}
            </div>

            {illustration && (
              <img
                src={illustration}
                alt="AI illustration"
                style={styles.illustration}
              />
            )}
          </section>
        )}
      </main>

      <footer style={styles.footer}>
        <p>
          Salesforce AI Assistant
        </p>
        <p>
          AI-powered Salesforce learning
          assistant
        </p>
      </footer>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background:
      "linear-gradient(135deg, #f5f8ff, #eef3ff)",
    padding: "20px",
    boxSizing: "border-box",
    fontFamily:
      "Inter, Arial, sans-serif",
  },

  authCard: {
    width: "100%",
    maxWidth: "430px",
    background: "#ffffff",
    borderRadius: "20px",
    padding: "32px",
    boxSizing: "border-box",
    boxShadow:
      "0 15px 45px rgba(0, 0, 0, 0.10)",
    textAlign: "center",
  },

  robotSmall: {
    width: "120px",
    height: "120px",
    objectFit: "contain",
    display: "block",
    margin: "0 auto 12px",
  },

  title: {
    margin: "0",
    fontSize: "28px",
    fontWeight: "700",
    color: "#172033",
  },

  subtitle: {
    margin: "8px 0 24px",
    color: "#667085",
    fontSize: "15px",
  },

  tabs: {
    display: "flex",
    gap: "8px",
    marginBottom: "20px",
    background: "#f2f4f7",
    borderRadius: "10px",
    padding: "4px",
  },

  tab: {
    flex: 1,
    border: "none",
    background: "transparent",
    padding: "11px 8px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
  },

  activeTab: {
    background: "#ffffff",
    boxShadow:
      "0 1px 5px rgba(0,0,0,0.10)",
  },

  input: {
    width: "100%",
    padding: "13px 14px",
    marginBottom: "12px",
    border: "1px solid #d0d5dd",
    borderRadius: "9px",
    boxSizing: "border-box",
    fontSize: "15px",
    outline: "none",
  },

  primaryButton: {
    width: "100%",
    border: "none",
    borderRadius: "9px",
    padding: "13px",
    background: "#0176d3",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
  },

  linkButton: {
    marginTop: "15px",
    border: "none",
    background: "transparent",
    color: "#0176d3",
    cursor: "pointer",
    fontSize: "14px",
  },

  divider: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "22px 0",
    color: "#98a2b3",
    fontSize: "12px",
  },

  googleButton: {
    width: "100%",
    padding: "12px",
    borderRadius: "9px",
    border: "1px solid #d0d5dd",
    background: "#ffffff",
    cursor: "pointer",
    fontSize: "15px",
    fontWeight: "600",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  },

  googleIcon: {
    fontWeight: "700",
    fontSize: "18px",
  },

  message: {
    marginTop: "16px",
    padding: "10px",
    borderRadius: "8px",
    background: "#f2f4f7",
    color: "#344054",
    fontSize: "13px",
  },

  terms: {
    marginTop: "22px",
    color: "#98a2b3",
    fontSize: "12px",
    lineHeight: "1.5",
  },

  termsLink: {
    color: "#667085",
  },

  appPage: {
    minHeight: "100vh",
    background: "#f7f9fc",
    fontFamily:
      "Inter, Arial, sans-serif",
    color: "#172033",
  },

  header: {
    background: "#ffffff",
    borderBottom: "1px solid #e4e7ec",
    padding: "14px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  headerRobot: {
    width: "55px",
    height: "55px",
    objectFit: "contain",
  },

  headerTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "700",
  },

  headerSubtitle: {
    margin: "3px 0 0",
    fontSize: "12px",
    color: "#667085",
  },

  userArea: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  userEmail: {
    fontSize: "13px",
    color: "#667085",
  },

  signOutButton: {
    border: "1px solid #d0d5dd",
    background: "#ffffff",
    borderRadius: "8px",
    padding: "8px 13px",
    cursor: "pointer",
    fontSize: "13px",
  },

  main: {
    width: "100%",
    maxWidth: "900px",
    margin: "0 auto",
    padding: "45px 20px",
    boxSizing: "border-box",
  },

  hero: {
    textAlign: "center",
    marginBottom: "30px",
  },

  robotMain: {
    width: "120px",
    height: "120px",
    objectFit: "contain",
    margin: "0 auto 12px",
    display: "block",
  },

  heroTitle: {
    fontSize: "30px",
    margin: "0 0 8px",
  },

  heroText: {
    maxWidth: "650px",
    margin: "0 auto",
    color: "#667085",
    lineHeight: "1.6",
    fontSize: "15px",
  },

  chatCard: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "18px",
    boxShadow:
      "0 5px 20px rgba(0, 0, 0, 0.06)",
    border: "1px solid #eaecf0",
  },

  textarea: {
    width: "100%",
    resize: "vertical",
    minHeight: "130px",
    border: "1px solid #d0d5dd",
    borderRadius: "10px",
    padding: "14px",
    boxSizing: "border-box",
    fontSize: "15px",
    fontFamily:
      "Inter, Arial, sans-serif",
    outline: "none",
  },

  actionRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "12px",
  },

  enterHint: {
    color: "#98a2b3",
    fontSize: "12px",
  },

  askButton: {
    border: "none",
    borderRadius: "9px",
    padding: "11px 22px",
    background: "#0176d3",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
  },

  quickSection: {
    marginTop: "28px",
  },

  sectionTitle: {
    fontSize: "17px",
    marginBottom: "12px",
  },

  quickGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "10px",
  },

  quickButton: {
    border: "1px solid #d0d5dd",
    background: "#ffffff",
    borderRadius: "9px",
    padding: "12px",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "13px",
  },

  answerCard: {
    marginTop: "28px",
    background: "#ffffff",
    borderRadius: "16px",
    padding: "22px",
    border: "1px solid #eaecf0",
    boxShadow:
      "0 5px 20px rgba(0, 0, 0, 0.05)",
  },

  answerTitle: {
    marginTop: 0,
    fontSize: "18px",
  },

  answerText: {
    whiteSpace: "pre-wrap",
    lineHeight: "1.7",
    fontSize: "15px",
    color: "#344054",
  },

  illustration: {
    display: "block",
    maxWidth: "100%",
    maxHeight: "350px",
    objectFit: "contain",
    margin: "20px auto 0",
    borderRadius: "10px",
  },

  loading: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    color: "#667085",
  },

  spinner: {
    width: "20px",
    height: "20px",
    border: "3px solid #e4e7ec",
    borderTop:
      "3px solid #0176d3",
    borderRadius: "50%",
    animation:
      "spin 1s linear infinite",
  },

  footer: {
    textAlign: "center",
    padding: "25px",
    color: "#98a2b3",
    fontSize: "12px",
  },
};

export default App;