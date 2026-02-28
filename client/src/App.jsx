import { useEffect, useState } from "react";

export default function App() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("Checking...");

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/test");
      const data = await res.json();
      setItems(data);
      setStatus("✅ Backend connected");
    } catch (err) {
      setStatus("❌ Backend not connected");
    }
  };

  const addItem = async () => {
    if (!name.trim()) return;

    await fetch("/api/test", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    setName("");
    fetchItems();
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <h1 className="text-4xl font-bold text-blue-400">
          Smart Campus Dashboard
        </h1>

        {/* Backend Status */}
        <div className="bg-slate-800 p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Backend Status</h2>
          <p>{status}</p>
          <button
            onClick={fetchItems}
            className="mt-3 bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded"
          >
            Refresh
          </button>
        </div>

        {/* Add Item */}
        <div className="bg-slate-800 p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-3">Add Item</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter item name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 px-4 py-2 rounded bg-slate-700 focus:outline-none"
            />
            <button
              onClick={addItem}
              className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded"
            >
              Save
            </button>
          </div>
        </div>

        {/* Items List */}
        <div className="bg-slate-800 p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-3">Items</h2>

          {items.length === 0 ? (
            <p className="text-gray-400">No items found</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="bg-slate-700 p-3 rounded flex justify-between"
                >
                  <span>{item.name}</span>
                  <span className="text-xs text-gray-400">{item.id}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}