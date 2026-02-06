import { useState } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState("");

  const fetchMessage = () => {
    fetch("http://localhost:5000/api/message")
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch((err) => setMessage("Erreur : impossible de joindre le backend"));
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Exemple Front &amp; Back</h1>
        <button className="App-button" onClick={fetchMessage}>
          Appeler le backend
        </button>
        {message && <p className="App-response">{message}</p>}
      </header>
    </div>
  );
}

export default App;
