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
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../services/api';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

type Message = {
    _id: string;
    content: string;
    sender: { _id: string; name: string; avatar?: string; role?: string };
    receiver?: { _id: string; name: string; avatar?: string; role?: string };
    createdAt: string;
    isRead: boolean;
};

export default function SupportChat() {
    const { token, user: currentUser } = useAuth();
    const navigation = useNavigation();
    const route = useRoute<any>();
    
    // If admin opens this for a specific user
    const targetUserId = route.params?.userId || null;
    const targetUserName = route.params?.userName || 'Support Chat';

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
    }, [token, targetUserId]);

    const fetchMessages = async () => {
        if (!token) return;
        try {
            // Admin can see messages for a specific user if userId is provided
            const res = await auth.getMessages(token);
            if (res.data.success) {
                let msgs = res.data.messages;
                if (targetUserId) {
                    // Filter messages between Admin and this specific user
                    msgs = msgs.filter((m: any) => 
                        m.sender?._id === targetUserId || m.receiver?._id === targetUserId
                    );
                }
                setMessages(msgs);
            }
        } catch (error) {
            // Silent error mostly, but log if needed
            // console.log('Fetch error', error);
        } finally {
            setIsLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!inputText.trim() || !token) return;
        setSending(true);
        try {
            // If admin, send to specific user. If student, send to support (null).
            const res = await auth.sendMessage(token, inputText, targetUserId);
            
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
        if (!item.sender) return null;
        
        // A message is "mine" if I sent it
        const isMe = item.sender._id === userId;
        
        // If I'm a student, a message is from "Support" if the sender is an Admin
        const isSupport = !isMe && item.sender.role === 'Admin';
        
        return (
            <View style={{
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                backgroundColor: isMe ? '#ea580c' : (isSupport ? '#0284c7' : '#f4f4f5'), 
                padding: 12,
                borderRadius: 16,
                borderBottomRightRadius: isMe ? 4 : 16,
                borderBottomLeftRadius: isMe ? 16 : 4,
                maxWidth: '80%',
                marginBottom: 8,
                marginHorizontal: 16
            }}>
                {(targetUserId && !isMe) && (
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: 'rgb(102, 102, 102)', marginBottom: 2 }}>
                        {item.sender.name}
                    </Text>
                )}
                <Text style={{ color: (isMe || isSupport) ? 'white' : '#18181b', fontSize: 15 }}>{item.content}</Text>
                <Text style={{ 
                    fontSize: 10, 
                    color: (isMe || isSupport) ? 'rgba(255,255,255,0.7)' : '#a1a1aa', 
                    marginTop: 4, 
                    alignSelf: 'flex-end' 
                }}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }} edges={['top', 'left', 'right']}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                {/* Header */}
                <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    padding: 16, 
                    borderBottomWidth: 1, 
                    borderBottomColor: '#f4f4f5', 
                    // paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + 10 : 16 // SafeAreaView handles this now
                }}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
                        <Ionicons name="arrow-back" size={24} color="black" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', marginLeft: 12 }}>{targetUserName}</Text>
                </View>
                
                {/* Messages List Area */}
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

                {/* Input Section */}
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
