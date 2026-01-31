import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator, 
  Alert,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

type Message = {
    _id: string;
    content: string;
    sender: { _id: string; name: string; avatar?: string };
    createdAt: string;
    isRead: boolean;
};

export default function SupportChat() {
    const { token, user: currentUser } = useAuth();
    const navigation = useNavigation();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [userId, setUserId] = useState<string | null>(currentUser?.id || null);
    const flatListRef = useRef<FlatList>(null);

    useEffect(() => {
        if (token) {
            fetchMessages();
            const interval = setInterval(fetchMessages, 5000);
            return () => clearInterval(interval);
        }
    }, [token]);

    const fetchMessages = async () => {
        if (!token) return;
        try {
            const res = await auth.getMessages(token);
            if (res.data.success) {
                setMessages(res.data.messages);
            }
        } catch (error) {
            console.log('Fetch error', error);
        } finally {
            setIsLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!inputText.trim() || !token) return;
        setSending(true);
        try {
            const res = await auth.sendMessage(token, inputText);
            
            if (res.data.success) {
                setInputText('');
                fetchMessages(); 
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to send message');
        } finally {
            setSending(false);
        }
    };

    const renderItem = ({ item }: { item: Message }) => {
        if (!item.sender) return null; // Safe check
        const isMe = item.sender._id === userId;
        return (
            <View style={{
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                backgroundColor: isMe ? '#ea580c' : '#f4f4f5', 
                padding: 12,
                borderRadius: 16,
                borderBottomRightRadius: isMe ? 4 : 16,
                borderBottomLeftRadius: isMe ? 16 : 4,
                maxWidth: '80%',
                marginBottom: 8,
                marginHorizontal: 16
            }}>
                <Text style={{ color: isMe ? 'white' : '#18181b', fontSize: 15 }}>{item.content}</Text>
                <Text style={{ 
                    fontSize: 10, 
                    color: isMe ? 'rgba(255,255,255,0.7)' : '#a1a1aa', 
                    marginTop: 4, 
                    alignSelf: 'flex-end' 
                }}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
            <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                padding: 16, 
                borderBottomWidth: 1, 
                borderBottomColor: '#f4f4f5', 
                paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 10 : 16 
            }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginLeft: 12 }}>Support Chat</Text>
            </View>
            
            <View style={{ flex: 1 }}>
                {isLoading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#ea580c" />
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={item => item._id || Math.random().toString()}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingVertical: 16 }}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        ListEmptyComponent={() => (
                            <View style={{ padding: 32, alignItems: 'center', paddingTop: 100 }}>
                                <Ionicons name="chatbubbles-outline" size={64} color="#e4e4e7" />
                                <Text style={{ color: '#a1a1aa', marginTop: 16, textAlign: 'center' }}>
                                    Need help?{'\n'}Send a message to support.
                                </Text>
                            </View>
                        )}
                    />
                )}
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={{ 
                    flexDirection: 'row', 
                    padding: 12, 
                    borderTopWidth: 1, 
                    borderTopColor: '#f4f4f5',
                    alignItems: 'center',
                    backgroundColor: 'white'
                }}>
                    <TextInput
                        value={inputText}
                        onChangeText={setInputText}
                        placeholder="Type a message..."
                        style={{
                            flex: 1,
                            backgroundColor: '#f4f4f5',
                            borderRadius: 24,
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            marginRight: 12,
                            fontSize: 15,
                            maxHeight: 100
                        }}
                        multiline
                    />
                    <TouchableOpacity 
                        onPress={sendMessage}
                        disabled={!inputText.trim() || sending}
                        style={{
                            backgroundColor: '#ea580c',
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: (!inputText.trim() || sending) ? 0.5 : 1
                        }}
                    >
                        {sending ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <Ionicons name="send" size={20} color="white" style={{ marginLeft: 2 }} />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
