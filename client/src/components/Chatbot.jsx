import React, { useState } from 'react';
import { Icon, icons } from '../icons';
import { api } from '../api';

export function Chatbot({ user, setQuery, setPage, addToast }) {
  const [messages, setMessages] = useState([
    { id: 1, text: `Hello ${user.username}! I'm your CareConnect assistant. How can I help you today-`, sender: "bot" }
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = { id: Date.now(), text: input, sender: "user" };
    setMessages(prev => [...prev, userMsg]);
    
    const text = input.toLowerCase();
    let botResponse = "I'm not sure how to help with that. Try asking about doctors, medicines, or your cart.";
    
    if (text.includes("fever") || text.includes("cold") || text.includes("headache")) {
      botResponse = "For fever or cold, common medicines include Dolo 650, Calpol, or Vicks Action 500. I've set your search to these options.";
      setQuery("paracetamol, cold");
      setTimeout(() => { setPage("search"); }, 2000);
    } else if (text.includes("sugar") || text.includes("diabetes") || text.includes("diabetic")) {
      botResponse = "Managing blood sugar is important. Common treatments include Metformin or Glycomet. Let me show you our Antidiabetic range.";
      setQuery("Antidiabetic");
      setTimeout(() => { setPage("search"); }, 2000);
    } else if (text.includes("heart") || text.includes("bp") || text.includes("blood pressure")) {
      botResponse = "Cardiac health is vital. We have Telma, Atorva, and Amlokind available. Redirecting to Cardiac care...";
      setQuery("Cardiac, Antihypertensive");
      setTimeout(() => { setPage("search"); }, 2000);
    } else if (text.includes("skin") || text.includes("rash") || text.includes("itching")) {
      botResponse = "For skin issues, we have various ointments like Betadine, Candid, or Itaspor. Check them out in Skin Care.";
      setQuery("Skin Care");
      setTimeout(() => { setPage("search"); }, 2000);
    } else if (text.includes("baby") || text.includes("child") || text.includes("kids") || text.includes("pediatric")) {
      botResponse = "Opening our Pediatric section. We have child-safe suspensions for fever, colic, and more.";
      setQuery("Pediatric");
      setTimeout(() => { setPage("search"); }, 2000);
    } else if (text.includes("doctor") || text.includes("appointment") || text.includes("book") || text.includes("checkup")) {
      botResponse = "I'll help you find a specialist. Opening the appointment booking system now...";
      setTimeout(() => { setPage("appointment"); }, 1500);
    } else if (text.includes("medicine") || text.includes("search") || text.includes("buy") || text.includes("pill")) {
      botResponse = "Sure! You can search for medicines and check availability in nearby pharmacies here.";
      setTimeout(() => { setPage("search"); }, 1500);
    } else if (text.includes("cart") || text.includes("basket") || text.includes("my order")) {
      botResponse = "Navigating to your shopping cart to review items and proceed to checkout...";
      setTimeout(() => { setPage("cart"); }, 1500);
    } else if (text.includes("emergency") || text.includes("urgent") || text.includes("sos")) {
      botResponse = "⚠️ EMERGENCY PROTOCOL: Opening the Emergency Request system immediately. Please provide your location and needs.";
      setTimeout(() => { setPage("emergency"); }, 1000);
    } else if (text.includes("map") || text.includes("pharmacy") || text.includes("near me")) {
      botResponse = "Locating nearby pharmacies on our interactive map. You can see real-time stock levels there.";
      setTimeout(() => { setPage("map"); }, 1500);
    }

    setTimeout(() => {
      setMessages(prev => [...prev, { id: Date.now() + 1, text: botResponse, sender: "bot" }]);
    }, 800);
    
    setInput("");
  };

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", height: "70vh", display: "flex", flexDirection: "column" }}>
      <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="card-header"><div className="card-title">CareBot Assistant</div></div>
        <div className="card-body" style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {messages.map(m => (
            <div key={m.id} style={{ display: "flex", justifyContent: m.sender === "user" ? "flex-end" : "flex-start", marginBottom: 16 }}>
              <div style={{ 
                maxWidth: "80%", 
                padding: "12px 16px", 
                borderRadius: 12, 
                background: m.sender === "user" ? "var(--teal)" : "var(--surface)", 
                color: m.sender === "user" ? "white" : "var(--navy)",
                fontSize: 14,
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
              }}>
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <div className="card-body" style={{ borderTop: "1px solid var(--border)", display: "flex", gap: 10 }}>
          <input className="form-input" style={{ flex: 1 }} placeholder="Ask about doctors, medicines..." value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSend()} />
          <button className="btn btn-primary" onClick={handleSend}>Send</button>
        </div>
      </div>
    </div>
  );
}

