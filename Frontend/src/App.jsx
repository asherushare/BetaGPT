import "./App.css"
import Sidebar from "./Sidebar.jsx"
import ChatWindow from "./ChatWindow.jsx"
import { MyContext } from "./MyContext.jsx"
import { useEffect, useState } from "react"
import { v1 as uuidv1 } from "uuid";

function App() {
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState(null);
  const [currThreadId, setCurrThreadId] = useState(() => {
    return localStorage.getItem("currThreadId") || uuidv1();
  });
  const [prevChats, setPrevChats] = useState([]); // stores all previous chats of curr threads
  const [newChat, setNewChat] = useState(() => {
    return localStorage.getItem("newChat") === "false" ? false : true;
  });
  const [allThreads, setAllThreads] = useState([]);

  // Persist current thread across refreshes
  useEffect(() => {
    if (currThreadId) localStorage.setItem("currThreadId", currThreadId);
    localStorage.setItem("newChat", String(newChat));
  }, [currThreadId, newChat]);

  const providerValue = {
    prompt, setPrompt,
    reply, setReply,
    currThreadId, setCurrThreadId,
    newChat, setNewChat,
    prevChats, setPrevChats,
    allThreads, setAllThreads
  };
  

  return (
    <div className="app">
      <MyContext.Provider value={providerValue}>
        <Sidebar />
        <ChatWindow />
      </MyContext.Provider>
    </div>
  )
}

export default App;
