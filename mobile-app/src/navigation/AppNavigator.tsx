import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors } from '../theme';

// Screens
import HomeScreen from '../screens/listings/HomeScreen';
import SearchScreen from '../screens/listings/SearchScreen';
import ListingDetailScreen from '../screens/listings/ListingDetailScreen';
import CreateListingScreen from '../screens/listings/CreateListingScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';
import ChatScreen from '../screens/messages/ChatScreen';
import DealsScreen from '../screens/deals/DealsScreen';
import DealDetailScreen from '../screens/deals/DealDetailScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';

// Leistungstausch Screens
import ServiceExploreScreen from '../screens/leistungstausch/ServiceExploreScreen';
import ServiceDetailScreen from '../screens/leistungstausch/ServiceDetailScreen';
import ServiceCreateScreen from '../screens/leistungstausch/ServiceCreateScreen';
import ServiceProposalScreen from '../screens/leistungstausch/ServiceProposalScreen';
import ServiceDealsScreen from '../screens/leistungstausch/ServiceDealsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Stack Navigators ──

function HomeStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="HomeMain" component={HomeScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
            <Stack.Screen name="CreateListing" component={CreateListingScreen} />
        </Stack.Navigator>
    );
}

function MessagesStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MessagesList" component={MessagesScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
        </Stack.Navigator>
    );
}

function DealsStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="DealsList" component={DealsScreen} />
            <Stack.Screen name="DealDetail" component={DealDetailScreen} />
        </Stack.Navigator>
    );
}

function LeistungstauschStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ServiceExplore" component={ServiceExploreScreen} />
            <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
            <Stack.Screen name="ServiceCreate" component={ServiceCreateScreen} />
            <Stack.Screen name="ServiceProposal" component={ServiceProposalScreen} />
            <Stack.Screen name="ServiceDeals" component={ServiceDealsScreen} />
        </Stack.Navigator>
    );
}

function ProfileStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ProfileMain" component={ProfileScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
        </Stack.Navigator>
    );
}

function AuthStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
    );
}

// ── Main Tab Navigator ──

function MainTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarStyle: {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    paddingBottom: 6,
                    paddingTop: 6,
                    height: 60,
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
                tabBarIcon: ({ color, size }) => {
                    const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
                        Home: 'home-outline',
                        Tausch: 'swap-vertical-outline',
                        Nachrichten: 'chatbubble-outline',
                        Deals: 'shield-checkmark-outline',
                        Profil: 'person-outline',
                    };
                    return <Ionicons name={icons[route.name] || 'ellipse-outline'} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeStack} />
            <Tab.Screen name="Tausch" component={LeistungstauschStack} options={{ tabBarActiveTintColor: colors.teal }} />
            <Tab.Screen name="Nachrichten" component={MessagesStack} />
            <Tab.Screen name="Deals" component={DealsStack} />
            <Tab.Screen name="Profil" component={ProfileStack} />
        </Tab.Navigator>
    );
}

// ── Root Navigator ──

export default function AppNavigator() {
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

    useEffect(() => {
        AsyncStorage.getItem('session_cookie').then(cookie => {
            setIsLoggedIn(!!cookie);
        });
    }, []);

    if (isLoggedIn === null) return null; // Loading

    return (
        <NavigationContainer>
            {isLoggedIn ? <MainTabs /> : <AuthStack />}
        </NavigationContainer>
    );
}
