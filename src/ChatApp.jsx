import  { useState, useEffect, useRef } from "react";
import * as signalR from "@microsoft/signalr";

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

  // Initialize SignalR connection when component mounts
  useEffect(() => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl("https://asp-dotnet-projects.onrender.com/chathub") // Replace with your SignalR hub URL
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Setup event listener for receiving messages
    newConnection.on("ReceiveMessage", (user, message) => {
      setMessages((prevMessages) => [...prevMessages, `${user}: ${message}`]);
      setStatus(""); // Clear any existing status messages
    });

    // Setup event listener for typing notifications
    newConnection.on("UserTyping", (typingUser) => {
      if (typingUser !== user) {
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
        setStatus("Connection failed. Please try again later.");
      });

    // Cleanup connection when component unmounts
    return () => {
      if (newConnection) {
        newConnection.stop();
      }
    };
  }, [user]);

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

    if (!message) {
      alert("Please enter a message to send.");
      return;
    }

    try {
      await connection.invoke("SendMessageToGroup", groupName, user, message);
      setStatus("Message sent successfully!");
      setMessages((prevMessages) => [...prevMessages, `You: ${message}`]);
      setMessage(""); // Clear message input after sending
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
      connection.invoke("SendTypingNotification", groupName, user).catch((err) =>
        console.error(err.toString())
      );

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
    <div style={styles.container}>
      <h1>Group Chat Room</h1>

      {/* Group actions */}
      <div style={styles.section}>
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Enter group name"
          style={styles.input}
        />
        <button onClick={joinGroup} style={styles.button}>
          Join Group
        </button>
        <button onClick={leaveGroup} style={styles.button}>
          Leave Group
        </button>
      </div>

      {/* User name input */}
      <div style={styles.section}>
        <input
          type="text"
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder="Your name"
          style={styles.input}
        />
      </div>

      {/* Chat message input */}
      <div style={styles.section}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleTyping}
          placeholder="Your message"
          style={styles.input}
        />
        <button onClick={sendMessage} style={styles.button}>
          Send to Group
        </button>
      </div>

      {/* Status message */}
      {status && <div style={styles.status}>{status}</div>}

      {/* Typing indicators */}
      {typingUsers.length > 0 && (
        <div style={styles.typing}>
          {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
        </div>
      )}

      {/* Message display area */}
      <ul style={styles.messageList}>
        {messages.map((msg, index) => (
          <li key={index} style={styles.messageItem}>
            {msg}
          </li>
        ))}
      </ul>
    </div>
  );
};

// Inline styles for better presentation
const styles = {
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
  },
  section: {
    marginBottom: "15px",
    display: "flex",
    gap: "10px",
  },
  input: {
    flex: "1",
    padding: "8px",
    fontSize: "16px",
  },
  button: {
    padding: "8px 12px",
    fontSize: "16px",
    cursor: "pointer",
  },
  status: {
    marginBottom: "10px",
    padding: "10px",
    backgroundColor: "#f0f0f0",
    borderRadius: "5px",
  },
  typing: {
    marginBottom: "10px",
    fontStyle: "italic",
    color: "#555",
  },
  messageList: {
    listStyleType: "none",
    padding: "0",
    maxHeight: "300px",
    overflowY: "auto",
    border: "1px solid #ccc",
    borderRadius: "5px",
  },
  messageItem: {
    marginBottom: "5px",
  },
};

export default ChatApp;
