import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/http";

export default function TestApiPanel() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("Smart Campus");
  const [status, setStatus] = useState("Not checked yet");
  const [error, setError] = useState("");

  async function loadItems() {
    setStatus("Checking backend...");
    setError("");
    try {
      const data = await apiGet("/api/test");
      setItems(data);
      setStatus("✅ Backend connected (GET works)");
    } catch (e) {
      setStatus("❌ Backend not connected");
      setError(e.message);
    }
  }

  async function addItem() {
    setError("");
    try {
      await apiPost("/api/test", { name });
      await loadItems();
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  return (
    <div className="card">
      <h2>Backend Connection Test</h2>

      <div className="row">
        <span className="label">Status:</span>
        <span>{status}</span>
      </div>

      {error && <p className="error">Error: {error}</p>}

      <div className="actions">
        <button onClick={loadItems}>Refresh (GET)</button>
      </div>

      <hr />

      <h3>Add Item (POST)</h3>
      <div className="actions">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter name"
        />
        <button onClick={addItem}>Save</button>
      </div>

      <h3>Items (GET Result)</h3>
      <pre>{JSON.stringify(items, null, 2)}</pre>
    </div>
  );
}