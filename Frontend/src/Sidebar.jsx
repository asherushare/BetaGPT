import "./Sidebar.css";
import { useContext, useEffect, useState, useMemo } from "react";
import { MyContext } from "./MyContext.jsx";
import { v1 as uuidv1 } from "uuid";
import logo from "./assets/blacklogo.png";

function Sidebar({ isOpen: controlledIsOpen, onClose, onOpen }) {
  const {
    allThreads,
    setAllThreads,
    currThreadId,
    setNewChat,
    setPrompt,
    setReply,
    setCurrThreadId,
    setPrevChats,
  } = useContext(MyContext);

  // ---- Hybrid control: controlled if prop provided; otherwise internal state ----
  const isControlled = typeof controlledIsOpen === "boolean";
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = isControlled ? controlledIsOpen : uncontrolledOpen;

  const setOpen = (next) => {
    if (isControlled) {
      if (next) onOpen?.();
      else onClose?.();
    } else {
      setUncontrolledOpen(next);
    }
  };

  const toggle = () => setOpen(!isOpen);
  const close = () => setOpen(false);
  const open = () => setOpen(true);

  // Listen for header-dispatched events (works without parent wiring)
  useEffect(() => {
    const onToggle = () => toggle();
    const onCloseEvt = () => close();
    const onOpenEvt = () => open();

    window.addEventListener("toggle-sidebar", onToggle);
    window.addEventListener("close-sidebar", onCloseEvt);
    window.addEventListener("open-sidebar", onOpenEvt);

    return () => {
      window.removeEventListener("toggle-sidebar", onToggle);
      window.removeEventListener("close-sidebar", onCloseEvt);
      window.removeEventListener("open-sidebar", onOpenEvt);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // depends on current state for correct toggle

  const getAllThreads = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/thread");
      const res = await response.json();
      const filteredData = res.map((thread) => ({
        threadId: thread.threadId,
        title: thread.title,
      }));
      setAllThreads(filteredData);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch threads on mount
  useEffect(() => {
    getAllThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After threads load, restore last open thread if present
  useEffect(() => {
    const saved = localStorage.getItem("currThreadId");
    if (saved && allThreads?.some(t => t.threadId === saved)) {
      changeThread(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allThreads]);

  const createNewChat = () => {
    setNewChat(true);
    setPrompt("");
    setReply(null);
    setCurrThreadId(uuidv1());
    setPrevChats([]);
    close(); // close drawer on mobile after action
  };

  const changeThread = async (newThreadId) => {
    setCurrThreadId(newThreadId);
    try {
      const response = await fetch(
        `http://localhost:8080/api/thread/${newThreadId}`
      );
      const res = await response.json();
      setPrevChats(res);
      setNewChat(false);
      setReply(null);
      localStorage.setItem("currThreadId", newThreadId);
      localStorage.setItem("newChat", "false");
      close();
    } catch (err) {
      console.log(err);
    }
  };

  const deleteThread = async (threadId) => {
    try {
      const response = await fetch(
        `http://localhost:8080/api/thread/${threadId}`,
        { method: "DELETE" }
      );
      const res = await response.json();
      console.log(res);

      setAllThreads((prev) =>
        prev.filter((thread) => thread.threadId !== threadId)
      );

      if (threadId === currThreadId) {
        createNewChat();
      }
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <>
      {/* Off-canvas Sidebar */}
      <section
        id="app-sidebar"
        className={`sidebar ${isOpen ? "is-open" : ""}`}
        aria-hidden={isOpen ? "false" : "true"}
      >
        {/* new chat button */}
        <button className="newChatBtn" onClick={createNewChat}>
          {/* Put logo in /public as /blacklogo.png OR import from src/assets */}
          <img className="logo" src={logo} alt="BetaGPT logo" />
          <span>
            <i className="fa-solid fa-pen-to-square" aria-hidden="true"></i>
          </span>
        </button>

        {/* history */}
        <ul className="history">
          {allThreads?.map((thread, idx) => (
            <li
              key={idx}
              onClick={() => changeThread(thread.threadId)}
              title={thread.title}
              className={thread.threadId === currThreadId ? "active" : ""}
              aria-current={thread.threadId === currThreadId ? "true" : "false"}
            >
              <span className="threadTitle">{thread.title}</span>
              <i
                className="fa-solid fa-trash"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteThread(thread.threadId);
                }}
                title="Delete thread"
              ></i>
            </li>
          ))}
        </ul>

        {/* sign */}
        <div className="sign">
          <p>By Patra &hearts; Mettle </p>
        </div>
      </section>

      {/* Overlay for mobile */}
      <div
        className={`sidebarOverlay ${isOpen ? "is-open" : ""}`}
        onClick={close}
        role="presentation"
        aria-hidden={isOpen ? "false" : "true"}
      />
    </>
  );
}

export default Sidebar;


