import React, { useMemo } from 'react';
import { useMessages } from 'App/messagesStore';
import Messages from './Messages';

function MessagesConnector() {
  const items = useMessages();
  const messages = useMemo(() => items.slice().reverse(), [items]);

  return <Messages messages={messages} />;
}

export default MessagesConnector;
