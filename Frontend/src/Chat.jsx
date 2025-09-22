// import "./Chat.css"
// import { useContext, useState, useEffect } from "react";
// import { MyContext } from "./MyContext";
// import ReactMarkdown from "react-markdown";
// import rehypeHighlight from "rehype-highlight";
// import "highlight.js/styles/github-dark.css";

// // react-markdown
// // rehype-highlight

// function Chat() {
//     const {newChat, prevChats, reply} = useContext(MyContext);
//     const [latestReply, setLatestReply] = useState(null);

//     useEffect(() => {
//       if(reply === null) {
//         setLatestReply(null);
//         return;
//       }

//         if(!prevChats?.length) return;
//         const content = reply.split(" "); // individual words
//         let idx = 0;
//         const interval = setInterval(() => {
//             setLatestReply(content.slice(0, idx + 1).join(" "));

//             idx++;
//             if(idx >= content.length) clearInterval(interval);
//         }, 40);

//         return () => clearInterval(interval);

//     },[prevChats, reply])

//     return (
//       <>
//         {newChat && <h1>Start a New Chat!</h1>}
//         <div className="chats">
//           {prevChats?.slice(0, -1).map((chat, idx) => (
//             <div
//               key={idx}
//               className={chat.role === "user" ? "userDiv" : "gptDiv"}
//             >
//               {chat.role === "user" ? (
//                 <p className="userMessage">{chat.content}</p>
//               ) : (
//                 <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
//                   {chat.content}
//                 </ReactMarkdown>
//               )}
//             </div>
//           ))}

//           {prevChats.length > 0 && latestReply !== null && (
//             <div className="gptDiv" key={"typing"}>
//               <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
//                 {latestReply}
//               </ReactMarkdown>
//             </div>
//           )}

//           {prevChats.length > 0 && latestReply === null && (
//             <div className="gptDiv" key={"non-typing"}>
//               <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
//                 {prevChats[prevChats.length - 1].content}
//               </ReactMarkdown>
//             </div>
//           )}
//         </div>
//       </>
//     );
// }

// export default Chat;



import "./Chat.css";
import { useContext, useState, useEffect, useMemo, useRef } from "react";
import { MyContext } from "./MyContext";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import "highlight.js/styles/github-dark.css";

// Basic streaming formatter for code-like text: inject newlines around common delimiters/keywords
function formatCodeStream(text = "") {
  let t = text;
  // line breaks after semicolons and colons closing a signature
  t = t.replace(/\s*;\s*/g, ";\n");
  t = t.replace(/\)\s*:\s*/g, "):\n");
  // braces on their own lines
  t = t.replace(/\s*{\s*/g, " {\n");
  t = t.replace(/\s*}\s*/g, "\n}\n");
  // new line before common keywords
  t = t.replace(/\s+(def|class|for|while|if|else|elif|try|except|switch|case|return|public|private|protected|static|void|int|float|double|const|let|var|function)\b/gi, "\n$1");
  // collapse >2 newlines
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

// Heuristic pre-processor to coerce plain text code into fenced blocks
function preprocessMarkdown(src = "") {
  if (!src) return "";

  // 0) If there are any fenced code markers, keep them but ensure they close
  if (/```/.test(src)) {
    const fenceCount = (src.match(/```/g) || []).length;
    if (fenceCount % 2 === 1) {
      // Streaming: fence opened but not closed yet; close it temporarily and format the tail
      const lastFence = src.lastIndexOf("```");
      const head = src.slice(0, lastFence + 3);
      const tail = src.slice(lastFence + 3);
      return head + "\n" + formatCodeStream(tail) + "\n```";
    }
    return src; // balanced fences
  }

  // 1) Normalize inline enumerations like "1. Item 2. Item ..." to real lists
  let text = src
    // insert a newline before any pattern like " 2. " that follows non-whitespace
    .replace(/(?<=\S)\s(?=\d+\.\s)/g, "\n")
    // insert a newline before hyphen bullets like " - "
    .replace(/(?<=\S)\s(?=-\s)/g, "\n");

  const lines = text.split(/\r?\n/);
  const out = [];
  let i = 0;
  const codeStart = /^(\s*)(#include|using\s+namespace|import\s|package\s|class\s|public\s|private\s|protected\s|static\s|void\s|int\s|float\s|double\s|let\s|const\s|var\s|def\s|fn\s|std::|System\.|console\.|printf\(|cout\s*<<|cin\s*>>|for\s*\(|while\s*\(|if\s*\()/i;

  while (i < lines.length) {
    const l = lines[i];
    const tokenCount = (l.match(/[;{}()<>]/g) || []).length;
    const looksLikeCode = codeStart.test(l) || tokenCount >= 3;

    if (looksLikeCode) {
      const block = [];
      while (i < lines.length) {
        const ln = lines[i];
        if (ln.trim() === "") break; // stop at blank line
        block.push(ln);
        const next = lines[i + 1] ?? "";
        const nextLooks = codeStart.test(next) || ((next.match(/[;{}()<>]/g) || []).length >= 2);
        i++;
        if (!nextLooks) break;
      }
      const raw = block.join(" ");
      const formatted = formatCodeStream(raw);
      out.push("```\n" + formatted + "\n```");
    } else {
      out.push(l);
    }
    i++;
  }

  return out.join("\n");
}

function Chat() {
  const { newChat, prevChats, reply } = useContext(MyContext);
  const [latestReply, setLatestReply] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (reply === null) {
      setLatestReply(null);
      return;
    }
    if (!prevChats?.length) return;

    const words = (reply || "").split(/\s+/);
    let idx = 0;
    const interval = setInterval(() => {
      setLatestReply(words.slice(0, idx + 1).join(" "));
      idx++;
      if (idx >= words.length) clearInterval(interval);
    }, 40);

    return () => clearInterval(interval);
  }, [prevChats, reply]);

  // Keep view pinned to bottom when messages/typing change
  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
    // also notify parent to ensure loader remains visible
    window.dispatchEvent(new Event("chat-scroll-to-bottom"));
  }, [prevChats, latestReply]);

  return (
    <>
      {newChat && <h1 className="newChatTitle">Start a New Chat!</h1>}

      <div className="chats">
        {/* Past chats except the last message (which is handled below) */}
        {prevChats?.slice(0, -1).map((chat, idx) => {
          const content = chat.role === "user" ? chat.content : preprocessMarkdown(chat.content);
          return (
            <div key={idx} className={chat.role === "user" ? "userDiv" : "gptDiv"}>
              {chat.role === "user" ? (
                <p className="userMessage">{content}</p>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {content}
                </ReactMarkdown>
              )}
            </div>
          );
        })}

        {/* Streaming/typing assistant reply */}
        {prevChats.length > 0 && latestReply !== null && (
          <div className="gptDiv" key={"typing"}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {preprocessMarkdown(latestReply)}
            </ReactMarkdown>
          </div>
        )}

        {/* Final assistant reply when typing finished */}
        {prevChats.length > 0 && latestReply === null && (
          <div className="gptDiv" key={"non-typing"}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {preprocessMarkdown(prevChats[prevChats.length - 1].content)}
            </ReactMarkdown>
          </div>
        )}
        <div ref={endRef} aria-hidden="true" />
      </div>
    </>
  );
}

export default Chat;
