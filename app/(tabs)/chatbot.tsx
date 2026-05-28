import { Ionicons } from '@expo/vector-icons';
import { like, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import React, { useEffect, useRef, useState } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { inventory } from '../../src/db/schema';

// Initialize Database
const expoDb = openDatabaseSync('vapeshop.db');
const db = drizzle(expoDb);

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
};

// Map short chatbot commands to your exact database categories
const CATEGORY_MAP: Record<string, string> = {
  'v1': 'V1 Device',
  'v2': 'V2 Device',
  'v3': 'V3 Device',
  'v1pods': 'V1 Pods',
  'v2pods': 'V2 Pods',
  'v3pods': 'V3 Pods',
  'juice': 'Juice',
  'misc': 'Misc',
};

export default function ChatbotScreen() {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Magandang araw, Vann! 👋 I am your Vault Assistant. How can I help manage the shop today?\n\nTry commands like:\n💨 'add [category] [name] [qty] [price]'\n💨 'delete [name]'\n💨 'stocks'\n\nCategories you can use: v1, v2, v3, v1pods, v2pods, v3pods, juice, misc",
      sender: 'bot'
    }
  ]);
  const scrollViewRef = useRef<ScrollView>(null);

  
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addMessage = (text: string, sender: 'user' | 'bot') => {
    setMessages(prev => [...prev, { id: Math.random().toString(), text, sender }]);
  };

  const processCommand = async (input: string) => {
    const text = input.trim();
    const lowerText = text.toLowerCase();

    
    if (lowerText.startsWith('add')) {
      
      const match = text.match(/^add\s+(v1|v2|v3|v1pods|v2pods|v3pods|juice|misc)\s+(.+)\s+(\d+)\s+(\d+(\.\d+)?)$/i);
      
      if (match) {
        const rawCategory = match[1].toLowerCase();
        const itemCategory = CATEGORY_MAP[rawCategory] || 'Misc';
        const itemName = match[2].trim();
        const itemQty = parseInt(match[3], 10);
        const itemPrice = parseFloat(match[4]);

        try {
          await db.insert(inventory).values({
            name: itemName,
            category: itemCategory, 
            stock: itemQty,
            price: itemPrice,
          });
          addMessage(`✅ Successfully added ${itemQty}x ${itemName} (${itemCategory}) at ₱${itemPrice.toLocaleString()} to the Vault.`, 'bot');
        } catch (error) {
          addMessage('❌ Failed to add item to the database.', 'bot');
        }
      } else {
        addMessage('⚠️ Invalid format. Please use:\nadd [category] [Item Name] [Quantity] [Price]\n\nExample: add juice Mango Chill 10 300', 'bot');
      }
      return;
    }

    // COMMAND: DELETE (e.g., "delete Oxva Pro")
    if (lowerText.startsWith('delete') || lowerText.startsWith('remove')) {
      const match = text.match(/^(?:delete|remove)\s+(.+)$/i);
      
      if (match) {
        const itemName = match[1].trim();
        try {
          const searchPattern = `%${itemName}%`;
          const existingItems = await db.select().from(inventory).where(like(inventory.name, searchPattern));
          
          if (existingItems.length === 0) {
            addMessage(`🤔 I couldn't find any items matching "${itemName}" in the Vault.`, 'bot');
            return;
          }

          await db.delete(inventory).where(like(inventory.name, searchPattern));
          addMessage(`🗑️ Successfully deleted items matching "${itemName}".`, 'bot');
        } catch (error) {
          addMessage('❌ Failed to delete the item.', 'bot');
        }
      } else {
        addMessage('⚠️ Invalid format. Please use:\ndelete [Item Name]', 'bot');
      }
      return;
    }

    // COMMAND: CHECK STOCKS
    if (lowerText === 'stock' || lowerText === 'stocks' || lowerText === 'inventory') {
      try {
        const items = await db.select().from(inventory).where(sql`${inventory.stock} > 0`);
        
        if (items.length === 0) {
          addMessage('📦 The Vault is completely empty. Add some items!', 'bot');
          return;
        }

        let stockList = '📦 CURRENT VAULT STOCKS:\n\n';
        items.slice(0, 10).forEach(item => {
          stockList += `• ${item.name} (${item.category}) - ${item.stock} left (₱${item.price})\n`;
        });

        if (items.length > 10) {
          stockList += `\n...and ${items.length - 10} more items.`;
        }

        addMessage(stockList, 'bot');
      } catch (error) {
        addMessage('❌ Failed to fetch stocks.', 'bot');
      }
      return;
    }

    // DEFAULT FALLBACK
    addMessage("🤔 I didn't quite catch that command.\n\nTry:\n💨 'add [category] [name] [qty] [price]'\n💨 'delete [name]'\n💨 'stocks'", 'bot');
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    
    const userMessage = inputText.trim();
    addMessage(userMessage, 'user');
    setInputText('');
    
    setTimeout(() => {
      processCommand(userMessage);
    }, 400);
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 70} 
      >
        
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.overlineText}>ASSISTANT</Text>
            <Text style={styles.greetingText}>Chatbot AI ⚡</Text>
          </View>
          <View style={styles.mascotContainer}>
            <Image 
              source={require('../../assets/images/mascot.png')}
              style={styles.mascotImage}
              resizeMode="contain"
            />
          </View>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={styles.chatContainer} 
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled" 
        >
          {messages.map((msg) => (
            <View 
              key={msg.id} 
              style={[
                styles.messageWrapper, 
                msg.sender === 'user' ? styles.messageWrapperUser : styles.messageWrapperBot
              ]}
            >
              {msg.sender === 'bot' && (
                <View style={styles.botAvatar}>
                  <Image 
                    source={require('../../assets/images/mascot.png')}
                    style={styles.botAvatarImage}
                    resizeMode="contain"
                  />
                </View>
              )}
              
              <View style={[
                styles.bubble, 
                msg.sender === 'user' ? styles.bubbleUser : styles.bubbleBot
              ]}>
                <Text style={[
                  styles.messageText,
                  msg.sender === 'user' ? styles.messageTextUser : styles.messageTextBot
                ]}>
                  {msg.text}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="add juice Mango 10 300..."
            placeholderTextColor="#52525b"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            onFocus={scrollToBottom}
          />
          <TouchableOpacity 
            style={[styles.sendButton, !inputText.trim() && { opacity: 0.5 }]} 
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={20} color="#000000" />
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1F22',
    backgroundColor: '#0A0A0C',
  },
  headerTextContainer: { flex: 1 },
  overlineText: {
    color: '#10b981', 
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  greetingText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  mascotContainer: {
    height: 60, 
    aspectRatio: 572 / 641, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotImage: { width: '100%', height: '100%' },

  chatContainer: { flex: 1 },
  chatContent: { paddingHorizontal: 24, paddingVertical: 24, paddingBottom: 40 },
  
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  messageWrapperUser: {
    justifyContent: 'flex-end',
  },
  messageWrapperBot: {
    justifyContent: 'flex-start',
  },
  
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#111113',
    borderWidth: 1,
    borderColor: '#1F1F22',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingTop: 4, 
  },
  botAvatarImage: { width: '120%', height: '120%' }, 

  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  bubbleUser: {
    backgroundColor: '#10b981', 
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: '#0A0A0C',
    borderWidth: 1,
    borderColor: '#1F1F22',
    borderBottomLeftRadius: 4,
  },
  messageText: { fontSize: 15, lineHeight: 22 },
  messageTextUser: { color: '#000000', fontWeight: '600' },
  messageTextBot: { color: '#e4e4e7', fontWeight: '500' },

  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: '#0A0A0C',
    borderTopWidth: 1,
    borderTopColor: '#1F1F22',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#111113',
    color: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1F1F22',
    fontSize: 15,
    marginRight: 12,
  },
  sendButton: {
    width: 48,
    height: 48,
    backgroundColor: '#10b981',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  }
});