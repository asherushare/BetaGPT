import { useContext, useState, useEffect, useRef } from "react";
import Chat from "./Chat.jsx";
import "./ChatWindow.css";
import { MyContext } from "./MyContext.jsx";
import { useClerk, UserButton, useUser } from "@clerk/clerk-react";
import { RingLoader } from "react-spinners";

function ChatWindow({ onToggleSidebar }) {
  const { openSignIn } = useClerk();
  const { user } = useUser();

  const {
    prompt,
    setPrompt,
    reply,
    setReply,
    currThreadId,
    prevChats,
    setPrevChats,
    setNewChat,
  } = useContext(MyContext);

  const [loading, setLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const chatBodyRef = useRef(null);

  // ✅ Load API base URL from .env
  const API_URL = import.meta.env.VITE_API_URL;

  const getReply = async () => {
    // Enforce guest limit: 5 messages max without login
    if (!user) {
      const used = parseInt(localStorage.getItem("anonChatCount") || "0", 10);
      if (used >= 5) {
        setShowLoginModal(true);
        return;
      }
      localStorage.setItem("anonChatCount", String(used + 1));
    }

    setLoading(true);
    setNewChat(false);
    const options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt, threadId: currThreadId }),
    };
    try {
      // ✅ Use .env API_URL
      const response = await fetch(`${API_URL}/chat`, options);
      const res = await response.json();
      setReply(res.reply);
    } catch (err) {
      console.error("Error fetching reply:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (prompt && reply) {
      setPrevChats((prevChats) => [
        ...prevChats,
        { role: "user", content: prompt },
        { role: "assistant", content: reply },
      ]);
    }
    setPrompt("");
  }, [reply]);

  // Fallback: if parent didn't pass onToggleSidebar, dispatch a DOM event
  const handleToggleSidebar = () => {
    if (typeof onToggleSidebar === "function") {
      onToggleSidebar();
    } else {
      window.dispatchEvent(new Event("toggle-sidebar"));
    }
  };

  // Auto-scroll when Chat requests it or when loader toggles
  useEffect(() => {
    const scrollToBottom = () => {
      const el = chatBodyRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    };

    window.addEventListener("chat-scroll-to-bottom", scrollToBottom);
    return () =>
      window.removeEventListener("chat-scroll-to-bottom", scrollToBottom);
  }, []);

  useEffect(() => {
    // when loading starts or stops, keep view pinned to bottom
    const el = chatBodyRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [loading]);

  // Clear guest counter once the user logs in
  useEffect(() => {
    if (user) {
      localStorage.removeItem("anonChatCount");
    }
  }, [user]);

  return (
    <div className="chatWindow">
      {/* Header */}
      <div className="navbar">
        {/* Hamburger (shown on mobile) */}
        <button
          className="navToggle"
          aria-label="Open menu"
          onClick={handleToggleSidebar}
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>

        <span className="brand">BetaGPT</span>

        {user ? (
          <div className="userProfile profileChip">
            <p className="userName" title={user.firstName || "Profile"}>
              {user.firstName}
            </p>
            <div className="userButtonWrapper">
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: "customUserAvatar",
                    userButtonTrigger: "customUserButton",
                  },
                }}
              />
            </div>
          </div>
        ) : (
          <div className="userProfile">
            <button
              className="loginButton profileChip"
              onClick={() => openSignIn()}
              aria-label="Login"
            >
              <i
                className="fa-solid fa-right-to-bracket"
                aria-hidden="true"
              ></i>
              <span className="loginText">Login</span>
            </button>
          </div>
        )}
      </div>

      {/* Scrollable chat area */}
      <div className="chatBody" ref={chatBodyRef}>
        <Chat />
        {loading && (
          <div
            className="loaderWrap"
            role="status"
            aria-live="polite"
            aria-label="Loading"
          >
            <RingLoader color="#0ea5e9" size={54} speedMultiplier={0.9} />
          </div>
        )}
      </div>

      {/* Login required modal */}
      {showLoginModal && (
        <div className="modalOverlay" onClick={() => setShowLoginModal(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="login-modal-title">Login required</h3>
            <p>
              You’ve reached the free limit of 5 messages. Please log in to
              continue chatting.
            </p>
            <div className="modalActions">
              <button className="btn" onClick={() => setShowLoginModal(false)}>
                Cancel
              </button>
              <button
                className="btnPrimary"
                onClick={() => {
                  setShowLoginModal(false);
                  openSignIn();
                }}
              >
                Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="chatInput">
        <div className="inputBox">
          <input
            placeholder="Ask anything"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                getReply();
              }
            }}
          />
          <div id="submit" onClick={getReply}>
            <i className="fa-solid fa-paper-plane"></i>
          </div>
        </div>
        <p className="info">
          BetaGPT can make mistakes. Check important info. See Cookie
          Preferences.
        </p>
      </div>
    </div>
  );
}

export default ChatWindow;
