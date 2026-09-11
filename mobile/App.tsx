import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import type { ComponentType } from 'react';
import { Home, Store, Search, Scale, MessageCircle, ShoppingCart, User } from 'lucide-react-native';

import { useAuthStore } from './src/stores/authStore';
import { useNotificationsStore } from './src/stores/notificationsStore';
import { registerPushToken, clearPushToken } from './src/services/notifications';
import { ThemeProvider, useAppTheme } from './src/theme/ThemeContext';

import HomeScreen from './src/screens/HomeScreen';
import ProductsScreen from './src/screens/ProductsScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import CartScreen from './src/screens/CartScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import AuctionsScreen from './src/screens/AuctionsScreen';
import AuctionDetailScreen from './src/screens/AuctionDetailScreen';
import ChatScreen from './src/screens/ChatScreen';
import ChatThreadScreen from './src/screens/ChatThreadScreen';
import WishlistScreen from './src/screens/WishlistScreen';
import AddressesScreen from './src/screens/AddressesScreen';
import SellerScreen from './src/screens/SellerScreen';
import SellerDashboardScreen from './src/screens/SellerDashboardScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import EditStoreScreen from './src/screens/EditStoreScreen';
import SellerProductsScreen from './src/screens/SellerProductsScreen';
import SellerProductFormScreen from './src/screens/SellerProductFormScreen';
import SellerTeamScreen from './src/screens/SellerTeamScreen';
import SellerCouponsScreen from './src/screens/SellerCouponsScreen';
import SellerPromotionsScreen from './src/screens/SellerPromotionsScreen';
import AdminSellersScreen from './src/screens/AdminSellersScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import OrdersScreen from './src/screens/OrdersScreen';
import OrderDetailScreen from './src/screens/OrderDetailScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import SellerBulkProductsScreen from './src/screens/SellerBulkProductsScreen';
import SellerPayoutsScreen from './src/screens/SellerPayoutsScreen';
import AdminVerificationScreen from './src/screens/AdminVerificationScreen';
import ForumModerationScreen from './src/screens/ForumModerationScreen';
import ForumFeedScreen from './src/screens/forum/ForumFeedScreen';
import ForumPostScreen from './src/screens/forum/ForumPostScreen';
import ForumCategoriesScreen from './src/screens/forum/ForumCategoriesScreen';
import ForumProfileScreen from './src/screens/forum/ForumProfileScreen';
import ForumKarmaScreen from './src/screens/forum/ForumKarmaScreen';
import NewPostScreen from './src/screens/forum/NewPostScreen';
import ForumGeoConfigScreen from './src/screens/forum/ForumGeoConfigScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const ForumStackNav = createNativeStackNavigator();

type TabIconProps = { color: string; size: number };
type IconComponent = ComponentType<TabIconProps>;

const iconMap: Record<string, IconComponent> = {
  Home: Store,
  Products: Search,
  Auctions: Scale,
  Chat: MessageCircle,
  Cart: ShoppingCart,
  Profile: User,
  Forum: Home,
};

function ForumStack() {
  return (
    <ForumStackNav.Navigator>
      <ForumStackNav.Screen name="ForumFeed" component={ForumFeedScreen} options={{ title: 'LaCASE' }} />
      <ForumStackNav.Screen name="ForumPost" component={ForumPostScreen} options={{ title: 'Pregunta' }} />
      <ForumStackNav.Screen name="ForumCategories" component={ForumCategoriesScreen} options={{ title: 'Categorías' }} />
      <ForumStackNav.Screen name="ForumProfile" component={ForumProfileScreen} options={{ title: 'Perfil' }} />
      <ForumStackNav.Screen name="ForumKarma" component={ForumKarmaScreen} options={{ title: 'Mi karma' }} />
      <ForumStackNav.Screen name="NewPost" component={NewPostScreen} options={{ presentation: 'modal', title: 'Hacer una pregunta' }} />
      <ForumStackNav.Screen name="ForumGeoConfig" component={ForumGeoConfigScreen} options={{ headerShown: true, title: 'Tu zona' }} />
    </ForumStackNav.Navigator>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const TabIcon = iconMap[route.name];
          return TabIcon ? <TabIcon color={color} size={size} /> : null;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, height: 60 + insets.bottom, paddingBottom: insets.bottom },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Inicio' }} />
      <Tab.Screen name="Products" component={ProductsScreen} options={{ tabBarLabel: 'Productos' }} />
      <Tab.Screen name="Auctions" component={AuctionsScreen} options={{ tabBarLabel: 'Subastas' }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ tabBarLabel: 'Mensajes' }} />
      <Tab.Screen name="Cart" component={CartScreen} options={{ tabBarLabel: 'Carrito' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Perfil' }} />
      <Tab.Screen name="Forum" component={ForumStack} options={{ tabBarLabel: 'Foro' }} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const user = useAuthStore((s) => s.user);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: true, title: 'Producto' }} />
            <Stack.Screen name="AuctionDetail" component={AuctionDetailScreen} options={{ headerShown: true, title: 'Subasta' }} />
            <Stack.Screen name="ChatThread" component={ChatThreadScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Wishlist" component={WishlistScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Addresses" component={AddressesScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Seller" component={SellerScreen} options={{ headerShown: true, title: 'Tienda' }} />
            <Stack.Screen name="SellerDashboard" component={SellerDashboardScreen} options={{ headerShown: true, title: 'Panel de vendedor' }} />
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ headerShown: true, title: 'Panel admin' }} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: true, title: 'Editar perfil' }} />
            <Stack.Screen name="EditStore" component={EditStoreScreen} options={{ headerShown: true, title: 'Editar tienda' }} />
            <Stack.Screen name="SellerProducts" component={SellerProductsScreen} options={{ headerShown: true, title: 'Mis productos' }} />
            <Stack.Screen name="SellerProductForm" component={SellerProductFormScreen} options={{ headerShown: true, title: 'Producto' }} />
            <Stack.Screen name="SellerTeam" component={SellerTeamScreen} options={{ headerShown: true, title: 'Equipo de tienda' }} />
            <Stack.Screen name="SellerCoupons" component={SellerCouponsScreen} options={{ headerShown: true, title: 'Mis cupones' }} />
            <Stack.Screen name="SellerPromotions" component={SellerPromotionsScreen} options={{ headerShown: true, title: 'Mis promociones' }} />
            <Stack.Screen name="AdminSellers" component={AdminSellersScreen} options={{ headerShown: true, title: 'Vendedores' }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Orders" component={OrdersScreen} options={{ headerShown: true, title: 'Mis pedidos' }} />
            <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ headerShown: true, title: 'Detalle del pedido' }} />
            <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ headerShown: true, title: 'Finalizar compra' }} />
            <Stack.Screen name="SellerBulkProducts" component={SellerBulkProductsScreen} options={{ headerShown: true, title: 'Carga masiva' }} />
            <Stack.Screen name="SellerPayouts" component={SellerPayoutsScreen} options={{ headerShown: true, title: 'Mis pagos' }} />
            <Stack.Screen name="AdminVerification" component={AdminVerificationScreen} options={{ headerShown: true, title: 'Verificación de tiendas' }} />
            <Stack.Screen name="ForumModeration" component={ForumModerationScreen} options={{ headerShown: true, title: 'Moderación del foro' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const init = useAuthStore((s) => s.init);
  const loading = useAuthStore((s) => s.loading);
  const user = useAuthStore((s) => s.user);
  const hadUser = useRef(false);
  const notifConnect = useNotificationsStore((s) => s.connect);
  const notifDisconnect = useNotificationsStore((s) => s.disconnect);
  const notifReset = useNotificationsStore((s) => s.reset);
  const theme = useAppTheme();

  useEffect(() => {
    init();
  }, []);

  // Registra el token de push al iniciar sesión y lo limpia al cerrar sesión.
  useEffect(() => {
    if (user) {
      hadUser.current = true;
      registerPushToken();
      notifConnect();
    } else if (hadUser.current) {
      clearPushToken();
      notifReset();
    }
  }, [user]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
