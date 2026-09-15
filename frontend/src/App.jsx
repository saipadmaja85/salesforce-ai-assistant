import { useState, useEffect } from "react";
import "./App.css";
import aiRobot from "./assets/salesforce-ai-robot.png";

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [illustration, setIllustration] = useState(null);
  const [loading, setLoading] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

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

    window.addEventListener("appinstalled", handleAppInstalled);

    // Detect if the app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
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

    const { outcome } = await installPrompt.userChoice;

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
      const response = await fetch(
        "https://salesforce-ai-assistant-8gvo.onrender.com/chat",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: question,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      setAnswer(data.answer || "No answer received.");
      setIllustration(data.illustration || null);
    } catch (error) {
      console.error(error);
      setAnswer(
        "Unable to connect to the AI backend. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">

      {/* Header */}
      <header className="header">
        <h1>Salesforce AI Assistant</h1>

        <p>
          Your AI assistant for Technology & Business Solutions
        </p>

        <button
          className="install-button"
          onClick={installApp}
        >
          {isInstalled
            ? "✅ App Installed"
            : "📲 Install Salesforce AI Assistant"}
        </button>
      </header>

      {/* Main */}
      <main className="main-container">

        <img
          src={aiRobot}
          alt="AI Assistant"
          className="ai-robot"
        />

        <h2>How can I help you?</h2>

        <p className="subtitle">
          Ask any technology, business, or general question in any language.
        </p>

        {/* Quick Questions */}
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

        {/* Question Input */}
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask anything in any language..."
        />

        {/* Ask AI */}
        <button
          className="ask-button"
          onClick={askQuestion}
          disabled={loading}
        >
          {loading ? "Generating..." : "Ask AI →"}
        </button>

        {/* AI Response */}
        {answer && (
          <div className="answer">

            <h3>AI Response</h3>

            <div className="answer-content">
              {answer}
            </div>

            {/* AI Illustration */}
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

            {/* Documentation */}
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