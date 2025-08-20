import { useContext, useEffect, useRef, useState } from "react";
import assets from "../assets/assets";
import { formatMessageTime } from "../lib/utils";
import { ChatContext } from "../../context/Chatcontext";
import { AuthContext } from "../../context/AuthContext";
import toast from "react-hot-toast";

const ChatContainer = () => {
  const { messages, selectedUser, setSelectedUser, sendMessage, getMessages, setMessages } = useContext(ChatContext);
  const { authUser, onlineUsers, socket } = useContext(AuthContext);

  const [input, setInput] = useState('');
  const scrollEnd = useRef();

  // Real-time socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      // Only add message if it's for the current conversation
      if (selectedUser && (
        (newMessage.senderId === selectedUser._id && newMessage.receiverId === authUser._id) ||
        (newMessage.senderId === authUser._id && newMessage.receiverId === selectedUser._id)
      )) {
        setMessages(prev => [...prev, newMessage]);
      }
    };

    const handleMessageSent = (sentMessage) => {
      // Optional: You can update message status here if needed
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('messageSent', handleMessageSent);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('messageSent', handleMessageSent);
    };
  }, [socket, selectedUser, authUser._id, setMessages]);

  // Handle sending message
  const handlesendMessage = async (e) => {
    e.preventDefault();
    if (input.trim() === "") return null;
    
    const tempMessage = {
      _id: Date.now(),
      text: input.trim(),
      senderId: authUser._id,
      receiverId: selectedUser._id,
      createdAt: new Date().toISOString(),
      sending: true
    };
    
    setMessages(prev => [...prev, tempMessage]);
    const messageText = input.trim();
    setInput(""); 
    
    try {
      await sendMessage({ text: messageText });
      setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
    } catch (error) {
      setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
      toast.error('Failed to send message');
    }
  };

  // Handle sending an image
  const handleSendImage = async (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Select an image file");
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await sendMessage({ image: reader.result });
        e.target.value = "";
      } catch (error) {
        toast.error('Failed to send image');
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (selectedUser) {
      getMessages(selectedUser._id);
    }
  }, [selectedUser]);

  useEffect(() => {
    if (scrollEnd.current && messages) {
      scrollEnd.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return selectedUser ? (
    <div className="h-full overflow-scroll relative backdrop:blur-lg">
      {/* -----header--------- */}
      <div className="flex items-center gap-3 py-3 mx-4 border-b border-stone-500">
        <img 
          src={selectedUser.profilePic || assets.avatar_icon} 
          alt="" 
          className="w-8 rounded-full" 
        />
        <p className="flex-1 text-lg text-white flex items-center gap-2">
          {selectedUser.fullName}
          {onlineUsers.includes(selectedUser._id) && (
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
          )}
        </p>
        <img
          onClick={() => setSelectedUser(null)}
          className="md:hidden max-w-7"
          src={assets.arrow_icon}
          alt=""
        />
        <img
          src={assets.help_icon}
          alt=""
          className="max-md:hidden max-w-5"
        />
      </div>

      {/* ----------chat area ------------ */}
      <div className="flex flex-col h-[calc(100%-120px)] overflow-y-scroll p-3 pb-6">
        {messages.map((msg, index) => (
          <div
            className={`flex items-end gap-2 justify-end ${
              msg.senderId !== authUser._id && "flex-row-reverse"
            }`}
            key={msg._id || index}
          >
            {msg.image ? (
              <img
                className="max-w-[230px] border border-gray-700 rounded-lg overflow-hidden mb-8"
                src={msg.image}
                alt=""
              />
            ) : (
              <p
                className={`p-2 max-w-[200px] md:text-sm font-light rounded-lg mb-8 break-all bg-violet-500/30 text-white ${
                  msg.senderId === authUser._id
                    ? "rounded-br-none"
                    : "rounded-bl-none"
                } ${msg.sending ? 'opacity-50' : ''}`}
              >
                {msg.text}
                {msg.sending && <span className="ml-1">⏳</span>}
              </p>
            )}
            <div className="text-center text-xs">
              <img
                src={
                  msg.senderId === authUser._id 
                    ? authUser?.profilePic || assets.avatar_icon
                    : selectedUser?.profilePic || assets.avatar_icon
                }
                alt=""
                className="w-7 rounded-full"
              />
              <p className="text-gray-500">
                {formatMessageTime(msg.createdAt)}
              </p>
            </div>
          </div>
        ))}
        <div ref={scrollEnd}></div>

        {/* ----bottom area----- */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 p-3">
          <div className="flex-1 flex items-center bg-gray-100/12 rounded-full">
            <input 
              onChange={(e) => setInput(e.target.value)} 
              value={input}
              onKeyDown={(e) => e.key === "Enter" ? handlesendMessage(e) : null}
              className="flex-1 text-sm p-3 border-none rounded-lg outline-none text-white placeholder-gray-400"
              type="text"
              placeholder="Send a Message"
            />
            <input onChange={handleSendImage} type="file" id="image" accept="image/png, image/jpeg" hidden />
            <label htmlFor="image">
              <img
                src={assets.gallery_icon}
                alt=""
                className="w-5 mr-2 cursor-pointer"
              />
            </label>
          </div>
          <img
            onClick={handlesendMessage}
            className="w-7 cursor-pointer"
            src={assets.send_button}
            alt=""
          />
        </div>
      </div>
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center gap-2 text-gray-500 bg-white/10 max-md:hidden">
      <img src={assets.logo_icon} className="max-w-16" alt="" />
      <p className="text-lg font-medium text-white">Chat anytime, anywhere</p>
    </div>
  );
};

export default ChatContainer;
