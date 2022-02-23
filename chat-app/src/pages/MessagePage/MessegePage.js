import React, { useEffect, useRef, useState } from 'react';
import './MessagePage.scss';
import { getDispatch, setGlobal, useGlobal } from 'reactn';
import axios from 'axios';
import io from 'socket.io-client';
import { useStateIfMounted } from 'use-state-if-mounted';
import Channels from '../../components/channels/Channels';
import List from '../../components/chat-list/List';
import FriendInfo from '../../components/profile-info/FriendInfo';
import Chat from '../../components/main-chat/Chat';

function MessagePage() {
  const [user] = useGlobal('user');
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useStateIfMounted([]);
  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activeTeam, setActiveTeam] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const socket = useRef();
  const [newMessage, setNewMessage] = useState(null);
  const [notifications, setNotifications] = useState([])
  const [currentPage, setCurrentPage] = useState(1);
  const chatRef = useRef(null);



  useEffect(() => {
    socket.current = io('ws://localhost:8000');
    socket.current.on('receiveMessage', (data) => {
      setNewMessage(data)
    });
    getAllUserConversations();
  }, []);

  useEffect(() => {
    if(newMessage && activeChat?._id === newMessage?.conversationId){
      setMessages((prev) => [...prev, newMessage]);
    }if(activeChat?._id !== newMessage?.conversationId){
      if(!notifications.includes(newMessage.conversationId)){
        setNotifications([...notifications, newMessage?.conversationId])
      }
    }
  }, [newMessage]);

  useEffect(() => {
    updateMessages();
  }, [currentPage, activeChat])

  useEffect(() => {
    socket.current.emit('addUser', user._id);
    socket.current.on('getUsers', (users) => {
      setActiveUsers(users);
    });
  }, [user]);

  useEffect(() => {
    setGlobal({
      notif: notifications
    })
  }, [notifications])

  useEffect(async () => {
    socket.current.emit('joinRoom', { activeChatId: activeChat?._id, userId: user.id });
    console.log(activeChat)
  }, [activeChat]);

  function setTeamActive(team) {
    setActiveTeam(team);
  }

  function defineActiveChat(chat) {
    setCurrentPage(1);
    setMessages([])
    setActiveChat(chat);
  }

  async function getConversationsOfActiveTeam(team) {
    const temp = [];
    try {
      if (team) {
        for (let i = 0; i < team?.conversations.length; i++) {
          await axios.get(`conversations/byId/${team.conversations[i]}`)
            .then((res) => {
              if (res.status === 200) {
                res.data.map((item) => temp.push(item));
              } else {
                getDispatch().openSnackbar({
                  open: true,
                  msg: "Couldn't get conversations",
                  color: 'warning',
                });
              }
            });
        }
        setConversations(temp);
      }
    } catch (err) {
      if (err) console.log(err);
    }
  }

  async function updateMessages() {
    await axios.get(`/messages/${activeChat?._id}?page=${currentPage}&limit=10`)
      .then((res) => {
        for(let i = 0; i < res.data.length; i++){
          setMessages(function (messages) {
            return [ res.data[i], ...messages]
          });
        }
      });
  }

  async function getUsers() {
    try {
      await axios.get('/users/all')
        .then((res) => {
          if (res.status === 200) {
            setAllUsers(res.data);
          } else {
            getDispatch().openSnackbar({
              open: true,
              msg: 'Conversations not found',
              color: 'warning',
            });
          }
        });
    } catch (err) {
      if (err) console.log(err);
    }
  }

  async function getAllUserConversations() {
    try {
      await axios.get(`/conversations/${user._id}`)
        .then((res) => {
          if (res.status === 200) {
            setConversations(res.data);
          } else {
            getDispatch().openSnackbar({
              open: true,
              msg: 'Conversations not found',
              color: 'warning',
            });
          }
        });
    } catch (err) {
      if (err) console.log(err);
    }
  }

  return (
    <div className="main-content">
      <Channels
        activeChat={activeChat}
        activeTeam={activeTeam}
        setTeams={setTeams}
        setGroups={setGroups}
        setConversations={setConversations}
        getUsers={getUsers}
        allUsers={allUsers}
        defineActiveChat={defineActiveChat}
        setTeamActive={setTeamActive}
        groups={groups}
        teams={teams}
        getConversationsOfActiveTeam={getConversationsOfActiveTeam}
      />
      <List
        setNotifications={setNotifications}
        notifications={notifications}
        setConversations={setConversations}
        activeUsers={activeUsers}
        activeChat={activeChat}
        defineActiveChat={defineActiveChat}
        setTeamActive={setTeamActive}
        activeTeam={activeTeam}
        allUsers={allUsers}
        getAllUserConversations={getAllUserConversations}
        getUsers={getUsers}
        getConversationsOfActiveTeam={getConversationsOfActiveTeam}
        conversations={conversations}
      />
      <FriendInfo
        user={user}
        activeChat={activeChat}
      />
      {
        activeChat
          ? (
            <Chat
              setMessages={setMessages}
              setCurrentPage={setCurrentPage}
              chatRef={chatRef}
              socket={socket}
              updateMessages={updateMessages}
              currentUser={user}
              messages={messages}
              activeChat={activeChat}
            />
          )
          : (
            <div
              className="alternative"
            >
              <p className="noConversation">Open a conversation to start the chat</p>
            </div>
          )
      }

    </div>
  );
}

export default MessagePage;
