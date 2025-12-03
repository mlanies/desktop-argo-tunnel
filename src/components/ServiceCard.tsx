import { useState, useRef, useEffect } from "react";

export default function ChatSupport() {
  const [messages, setMessages] = useState<{ sender: string; content: string; isOperator: boolean }[]>([]);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesContainer = useRef<HTMLDivElement>(null);

  const sendMessage = () => {
    if (!message.trim()) return;

    setIsSending(true);
    setMessages((prev) => [
      ...prev,
      { sender: "Вы", content: message, isOperator: false }
    ]);
    setMessage("");

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { sender: "Оператор", content: "Спасибо за ваше сообщение! Мы скоро ответим.", isOperator: true }
      ]);
      setIsSending(false);
    }, 1000);
  };

  useEffect(() => {
    messagesContainer.current?.scrollTo({ top: messagesContainer.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-[430px] bg-[#181818] rounded-2xl p-4 shadow-inner">
      {/* Переписка */}
      <div ref={messagesContainer}
        className="flex flex-col space-y-3 overflow-y-auto flex-grow p-4 bg-[#202020] rounded-xl shadow-md"
      >
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.isOperator ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-xs md:max-w-md p-3 rounded-2xl text-sm leading-relaxed break-words ${msg.isOperator ? "bg-blue-500" : "bg-[#2c2c2c]"}`}>
              <div className="text-[10px] text-gray-400 mb-1 font-light">{msg.sender}</div>
              <div className="text-[13px] text-white font-light">{msg.content}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Форма отправки */}
      <div className="mt-3 flex items-center gap-3">
        <div className="fileUploadWrapper relative">
          <label htmlFor="file" className="cursor-pointer flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-700 transition">
            <svg viewBox="0 0 337 337" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
              <circle cx="168.5" cy="168.5" r="158.5" stroke="#6c6c6c" strokeWidth="20" />
              <path d="M167.759 79V259" stroke="#6c6c6c" strokeWidth="25" strokeLinecap="round" />
              <path d="M79 167.138H259" stroke="#6c6c6c" strokeWidth="25" strokeLinecap="round" />
            </svg>
          </label>
          <input name="file" id="file" type="file" className="hidden" />
        </div>

        <input
          id="messageInput"
          type="text"
          placeholder="Введите сообщение..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className="flex-1 p-2 rounded-xl bg-[#2c2c2c] text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <button
          id="sendButton"
          onClick={sendMessage}
          disabled={isSending}
          className="bg-blue-500 hover:bg-blue-600 rounded-full p-3 transition"
        >
          <svg viewBox="0 0 664 663" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
            <path
              d="M646.293 331.888L17.7538 17.6187L155.245 331.888M646.293 331.888L17.753 646.157L155.245 331.888M646.293 331.888L318.735 330.228L155.245 331.888"
              stroke="white"
              strokeWidth="33.67"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
