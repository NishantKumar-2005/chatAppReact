import  { useState, useEffect, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import "./ChatApp.css"; // Import the CSS file for styling

const ChatApp = () => {
  // State variables
  const [connection, setConnection] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [user, setUser] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState(""); // For status messages
  const [typingUsers, setTypingUsers] = useState([]); // For typing indicators
  const typingTimeoutRef = useRef(null); // To handle typing timeout
  const messagesEndRef = useRef(null); // To scroll to the latest message

  // Initialize SignalR connection when component mounts
  useEffect(() => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl("https://asp-dotnet-projects.onrender.com/chathub") // Replace with your SignalR hub URL
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Setup event listener for receiving messages
    newConnection.on("ReceiveMessage", (sender, message) => {
      if (sender !== user) {
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender, message, timestamp: new Date() },
        ]);
      } else {
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "You", message, timestamp: new Date() },
        ]);
      }
      setStatus(""); // Clear any existing status messages
    });

    // Setup event listener for typing notifications
    newConnection.on("UserTyping", (typingUser) => {
      if (typingUser !== user && typingUser !== "") {
        setTypingUsers((prevTypingUsers) => {
          if (!prevTypingUsers.includes(typingUser)) {
            return [...prevTypingUsers, typingUser];
          }
          return prevTypingUsers;
        });

        // Remove the typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers((prevTypingUsers) =>
            prevTypingUsers.filter((u) => u !== typingUser)
          );
        }, 3000);
      }
    });

    newConnection
      .start()
      .then(() => {
        console.log("Connected to SignalR Hub");
        setConnection(newConnection);
      })
      .catch((err) => {
        console.error("Connection failed:", err.toString());
        setStatus("Join group to start chatting.");
      });

    // Cleanup connection when component unmounts
    return () => {
      if (newConnection) {
        newConnection.stop();
      }
    };
  }, [user]);

  // Scroll to the latest message whenever messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Handle sending a message to the group
  const sendMessage = async () => {
    if (!groupName) {
      alert("Please enter a group name to send a message.");
      return;
    }

    if (!user) {
      alert("Please enter your name.");
      return;
    }

    if (!message.trim()) {
      alert("Please enter a message to send.");
      return;
    }

    try {
      await connection.invoke("SendMessageToGroup", groupName, user, message);
      setStatus("Message sent successfully!");
      setMessage(""); // Clear message input after sending
      // Removed local message appending to prevent duplication
    } catch (err) {
      console.error(err.toString());
      setStatus("Failed to send message. Please try again.");
    }
  };

  // Handle joining a group
  const joinGroup = async () => {
    if (!groupName) {
      alert("Please enter a group name to join.");
      return;
    }

    if (!user) {
      alert("Please enter your name.");
      return;
    }

    try {
      await connection.invoke("AddToGroup", groupName);
      setStatus(`Joined group: ${groupName}`);
    } catch (err) {
      console.error(err.toString());
      setStatus("Failed to join group. Please try again.");
    }
  };

  // Handle leaving a group
  const leaveGroup = async () => {
    if (!groupName) {
      alert("Please enter a group name to leave.");
      return;
    }

    try {
      await connection.invoke("RemoveFromGroup", groupName);
      setStatus(`Left group: ${groupName}`);
    } catch (err) {
      console.error(err.toString());
      setStatus("Failed to leave group. Please try again.");
    }
  };

  // Handle typing event
  const handleTyping = () => {
    if (connection && groupName && user) {
      connection
        .invoke("SendTypingNotification", groupName, user)
        .catch((err) => console.error(err.toString()));

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Remove typing indicator after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setTypingUsers((prevTypingUsers) =>
          prevTypingUsers.filter((u) => u !== user)
        );
      }, 3000);
    }
  };

  return (
    <div className="chat-container">
      <h1 className="chat-title">🌐 Group Chat Room</h1>

      {/* Group actions */}
      <div className="group-actions">
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Enter group name"
          className="input-group"
        />
        <button onClick={joinGroup} className="btn join-btn">
          Join Group
        </button>
        <button onClick={leaveGroup} className="btn leave-btn">
          Leave Group
        </button>
      </div>

      {/* User name input */}
      <div className="user-name">
        <input
          type="text"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder="Your name"
          className="input-user"
        />
      </div>

      {/* Chat message input */}
      <div className="message-input">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleTyping}
          placeholder="Your message"
          className="input-message"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendMessage();
            }
          }}
        />
        <button onClick={sendMessage} className="btn send-btn">
          Send 📨
        </button>
      </div>

      {/* Status message */}
      {status && <div className="status-message">{status}</div>}

      {/* Typing indicators */}
      {typingUsers.length > 0 && (
        <div className="typing-indicator">
          {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"}{" "}
          typing...
        </div>
      )}

      {/* Message display area */}
      <div className="messages-list">
        <TransitionGroup>
          {messages.map((msg, index) => (
            <CSSTransition key={index} timeout={300} classNames="message">
              <div
                className={`message-item ${
                  msg.sender === "You" ? "message-sent" : "message-received"
                }`}
              >
                <span className="message-sender">{msg.sender}</span>
                <span className="message-content">{msg.message}</span>
                <span className="message-time">
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </CSSTransition>
          ))}
        </TransitionGroup>
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatApp;
