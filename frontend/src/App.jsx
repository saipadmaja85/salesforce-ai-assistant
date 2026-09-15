import { useState } from "react";
import "./App.css";
import aiRobot from "./assets/salesforce-ai-robot.png";

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [illustration, setIllustration] = useState(null);
  const [loading, setLoading] = useState(false);

  const askQuestion = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setAnswer("");
    setIllustration(null);

    try {
      const response = await fetch("https://salesforce-ai-assistant-8gvo.onrender.com/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question,
        }),
      });

      const data = await response.json();

      setAnswer(data.answer || "No answer received.");
      setIllustration(data.illustration || null);

    } catch (error) {
      console.error(error);
      setAnswer("Unable to connect to the AI backend.");
    }

    setLoading(false);
  };

  return (
    <div className="app">

      <header className="header">
        <h1>Salesforce AI Assistant</h1>
        <p>Your AI assistant for Salesforce & Business Solutions</p>
      </header>

      <main className="main-container">

        <img
          src={aiRobot}
          alt="Salesforce AI Assistant"
          className="ai-robot"
        />

        <h2>How can I help you?</h2>

        <p className="subtitle">
          Ask any Salesforce or business scenario question.
        </p>

        <div className="quick-buttons">

          <button
            onClick={() =>
              setQuestion(
                "How can I create a Salesforce Flow to automatically update a field?"
              )
            }
          >
            Create a Salesforce Flow
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
                "A business wants to automate its Salesforce approval process. How should I implement it?"
              )
            }
          >
            Business Scenario
          </button>

        </div>

        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask your Salesforce or business question..."
        />

        <button
          className="ask-button"
          onClick={askQuestion}
          disabled={loading}
        >
          {loading ? "Generating..." : "Ask AI →"}
        </button>

        {answer && (
          <div className="answer">

            <h3>AI Response</h3>

            <div className="answer-content">
              {answer}
            </div>

            {illustration && (
              <div className="illustration-section">

                <h3>AI-Generated Salesforce Illustration</h3>

                <img
                  src={`data:image/png;base64,${illustration}`}
                  alt="AI-generated Salesforce illustration"
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