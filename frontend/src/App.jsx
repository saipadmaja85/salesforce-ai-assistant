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
import robotImage from "./assets/salesforce-ai-robot.png";

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

      if (error.code === "auth/email-already-in-use") {
        setMessage("This email is already registered.");
      } else if (error.code === "auth/invalid-email") {
        setMessage("Please enter a valid email address.");
      } else if (error.code === "auth/weak-password") {
        setMessage("Password must be at least 6 characters.");
      } else if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found"
      ) {
        setMessage("Invalid email or password.");
      } else {
        setMessage(
          error.message || "Authentication failed."
        );
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
      setMessage(
        error.message ||
          "Unable to send password reset email."
      );
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

  /*
   * LOGIN / CREATE ACCOUNT SCREEN
   */
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
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Email address"
              style={styles.input}
              autoComplete="email"
            />

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
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
              style={styles.continueButton}
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
              style={styles.forgotButton}
            >
              Forgot password?
            </button>
          )}

          <div style={styles.orContainer}>
            <div style={styles.line} />
            <span style={styles.orText}>
              OR
            </span>
            <div style={styles.line} />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={authLoading}
            style={styles.googleButton}
          >
            <span style={styles.googleG}>
              G
            </span>

            <span>
              Continue with Google
            </span>
          </button>

          {message && (
            <div style={styles.message}>
              {message}
            </div>
          )}

          <p style={styles.terms}>
            By continuing, you agree to our{" "}
            <a href="#" style={styles.link}>
              Terms
            </a>{" "}
            and{" "}
            <a href="#" style={styles.link}>
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  /*
   * MAIN AI ASSISTANT SCREEN
   */
  return (
    <div style={styles.app}>

      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <img
            src={robotImage}
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

        <div style={styles.headerRight}>
          <span style={styles.email}>
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

      <main style={styles.main}>

        <section style={styles.hero}>
          <img
            src={robotImage}
            alt="Salesforce AI Assistant"
            style={styles.mainRobot}
          />

          <h2 style={styles.heroTitle}>
            How can I help you today?
          </h2>

          <p style={styles.heroDescription}>
            Ask questions about Salesforce Admin,
            Development, Testing, Apex, LWC, CPQ,
            Sales Cloud, Service Cloud and more.
          </p>
        </section>

        <section style={styles.questionCard}>

          <textarea
            value={question}
            onChange={(event) =>
              setQuestion(event.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="Ask your Salesforce question..."
            rows={5}
            style={styles.textarea}
          />

          <div style={styles.questionFooter}>
            <span style={styles.hint}>
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
          <h3 style={styles.quickTitle}>
            Quick Questions
          </h3>

          <div style={styles.quickGrid}>
            {quickQuestions.map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setQuestion(item);
                    setAnswer("");
                    setIllustration(null);
                  }}
                  style={styles.quickButton}
                >
                  {item}
                </button>
              )
            )}
          </div>
        </section>

        {loading && (
          <section style={styles.answerCard}>
            <div style={styles.loading}>
              <div style={styles.spinner} />
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

            <div style={styles.answer}>
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
        <div>
          Salesforce AI Assistant
        </div>

        <div>
          AI-powered Salesforce learning assistant
        </div>
      </footer>
    </div>
  );
}

const styles = {
  loginPage: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "24px",
    boxSizing: "border-box",
    background:
      "linear-gradient(135deg, #f4f8ff 0%, #eef4ff 100%)",
    fontFamily:
      "Inter, Arial, sans-serif",
  },

  loginCard: {
    width: "100%",
    maxWidth: "420px",
    background: "#ffffff",
    borderRadius: "20px",
    padding: "30px",
    boxSizing: "border-box",
    textAlign: "center",
    boxShadow:
      "0 12px 40px rgba(0,0,0,0.10)",
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
    fontSize: "26px",
    lineHeight: "1.25",
    fontWeight: "700",
    color: "#172033",
  },

  loginSubtitle: {
    margin: "8px 0 22px",
    color: "#667085",
    fontSize: "14px",
  },

  tabs: {
    display: "flex",
    width: "100%",
    gap: "5px",
    padding: "4px",
    marginBottom: "18px",
    background: "#f2f4f7",
    borderRadius: "10px",
    boxSizing: "border-box",
  },

  tab: {
    flex: 1,
    border: "none",
    borderRadius: "8px",
    padding: "11px 5px",
    background: "transparent",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    color: "#475467",
  },

  activeTab: {
    background: "#ffffff",
    color: "#172033",
    boxShadow:
      "0 1px 5px rgba(0,0,0,0.10)",
  },

  input: {
    width: "100%",
    height: "46px",
    border: "1px solid #d0d5dd",
    borderRadius: "9px",
    padding: "0 13px",
    marginBottom: "12px",
    boxSizing: "border-box",
    fontSize: "14px",
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
    fontWeight: "600",
    cursor: "pointer",
  },

  forgotButton: {
    border: "none",
    background: "transparent",
    color: "#0176d3",
    fontSize: "13px",
    cursor: "pointer",
    marginTop: "13px",
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
    background: "#eaecf0",
  },

  orText: {
    color: "#98a2b3",
    fontSize: "11px",
    fontWeight: "600",
  },

  googleButton: {
    width: "100%",
    height: "46px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "9px",
    border: "1px solid #d0d5dd",
    borderRadius: "9px",
    background: "#ffffff",
    color: "#344054",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },

  googleG: {
    fontSize: "18px",
    fontWeight: "700",
  },

  message: {
    marginTop: "15px",
    padding: "10px",
    borderRadius: "8px",
    background: "#f2f4f7",
    color: "#344054",
    fontSize: "12px",
    lineHeight: "1.4",
  },

  terms: {
    margin: "20px 0 0",
    color: "#98a2b3",
    fontSize: "11px",
    lineHeight: "1.5",
  },

  link: {
    color: "#667085",
  },

  app: {
    minHeight: "100vh",
    background: "#f7f9fc",
    color: "#172033",
    fontFamily:
      "Inter, Arial, sans-serif",
  },

  header: {
    width: "100%",
    minHeight: "72px",
    background: "#ffffff",
    borderBottom: "1px solid #e4e7ec",
    padding: "10px 24px",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  headerRobot: {
    width: "48px",
    height: "48px",
    objectFit: "contain",
  },

  headerTitle: {
    margin: 0,
    fontSize: "19px",
    fontWeight: "700",
  },

  headerSubtitle: {
    margin: "3px 0 0",
    fontSize: "12px",
    color: "#667085",
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  email: {
    color: "#667085",
    fontSize: "12px",
  },

  signOut: {
    padding: "8px 13px",
    border: "1px solid #d0d5dd",
    borderRadius: "8px",
    background: "#ffffff",
    cursor: "pointer",
    fontSize: "12px",
  },

  main: {
    width: "100%",
    maxWidth: "900px",
    margin: "0 auto",
    padding: "40px 20px",
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
    margin: "0",
    fontSize: "28px",
    fontWeight: "700",
  },

  heroDescription: {
    maxWidth: "650px",
    margin: "9px auto 0",
    color: "#667085",
    fontSize: "14px",
    lineHeight: "1.6",
  },

  questionCard: {
    background: "#ffffff",
    border: "1px solid #eaecf0",
    borderRadius: "15px",
    padding: "16px",
    boxShadow:
      "0 4px 18px rgba(0,0,0,0.05)",
  },

  textarea: {
    width: "100%",
    minHeight: "130px",
    resize: "vertical",
    border: "1px solid #d0d5dd",
    borderRadius: "9px",
    padding: "13px",
    boxSizing: "border-box",
    fontSize: "14px",
    lineHeight: "1.5",
    fontFamily:
      "Inter, Arial, sans-serif",
    outline: "none",
  },

  questionFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "10px",
  },

  hint: {
    color: "#98a2b3",
    fontSize: "11px",
  },

  askButton: {
    border: "none",
    borderRadius: "8px",
    padding: "10px 20px",
    background: "#0176d3",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },

  quickSection: {
    marginTop: "25px",
  },

  quickTitle: {
    margin: "0 0 11px",
    fontSize: "16px",
  },

  quickGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "9px",
  },

  quickButton: {
    background: "#ffffff",
    border: "1px solid #d0d5dd",
    borderRadius: "8px",
    padding: "11px",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "12px",
    color: "#344054",
  },

  answerCard: {
    marginTop: "25px",
    background: "#ffffff",
    border: "1px solid #eaecf0",
    borderRadius: "15px",
    padding: "20px",
    boxShadow:
      "0 4px 18px rgba(0,0,0,0.05)",
  },

  answerTitle: {
    margin: "0 0 12px",
    fontSize: "17px",
  },

  answer: {
    whiteSpace: "pre-wrap",
    fontSize: "14px",
    lineHeight: "1.7",
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
    gap: "10px",
    color: "#667085",
    fontSize: "13px",
  },

  spinner: {
    width: "18px",
    height: "18px",
    border: "3px solid #e4e7ec",
    borderTop: "3px solid #0176d3",
    borderRadius: "50%",
  },

  footer: {
    textAlign: "center",
    padding: "25px 20px",
    color: "#98a2b3",
    fontSize: "11px",
    lineHeight: "1.6",
  },
};

export default App;