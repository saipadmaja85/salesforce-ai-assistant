import { useState, useEffect } from "react";
import "./App.css";
import aiRobot from "./assets/salesforce-ai-robot.png";

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [illustration, setIllustration] = useState(null);
  const [loading, setLoading] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

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

  const installApp = async () => {
    if (!installPrompt) {
      alert(
        "To install the app, open your browser menu and choose 'Install App' or 'Add to Home Screen'."
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
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();

      setAnswer(data.answer || "No answer received.");
      setIllustration(data.illustration || null);
    } catch (error) {
      console.error(error);
      setAnswer("Unable to connect to the AI backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <img
          src={aiRobot}
          alt="Salesforce AI Assistant"
          className="robot-image"
        />

        <h1>Salesforce AI Assistant</h1>

        <p>
          Your AI assistant for Salesforce Admin, Testing, Development and
          Consulting
        </p>

        <button className="install-button" onClick={installApp}>
          📲 Install Salesforce AI Assistant
        </button>
      </header>

      <main className="main-content">
        <div className="question-section">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask your Salesforce question..."
            rows="5"
          />

          <button
            className="ask-button"
            onClick={askQuestion}
            disabled={loading}
          >
            {loading ? "Thinking..." : "Ask AI"}
          </button>
        </div>

        {answer && (
          <section className="answer-section">
            <h2>AI Response</h2>

            <div className="answer">
              {answer}
            </div>
          </section>
        )}

        {illustration && (
          <section className="illustration-section">
            <h2>Illustration</h2>

            <img
              src={`data:image/png;base64,${illustration}`}
              alt="Salesforce solution illustration"
              className="illustration"
            />
          </section>
        )}
      </main>

      <footer className="footer">
        <p>Salesforce AI Assistant</p>
      </footer>
    </div>
  );
}

export default App;