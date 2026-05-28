import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { inventory } from '../../src/db/schema';

const expoDb = openDatabaseSync('vapeshop.db');
const db = drizzle(expoDb);

const CATEGORIES = ['V1 Device', 'V2 Device', 'V3 Device', 'V1 Pods', 'V2 Pods', 'V3 Pods', 'Juice', 'Misc'];

export default function InventoryScreen() {
  const [items, setItems] = useState<{ id: number; name: string; category: string; stock: number; price: number }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]); 
  const [stock, setStock] = useState('');
  const [price, setPrice] = useState('');

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    const allItems = await db.select().from(inventory);
    setItems(allItems);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchInventory();
    setRefreshing(false);
  }, []);

  const handleAddItem = async () => {
    if (!name || !stock || !price) return;

    await db.insert(inventory).values({
      name, 
      category,
      stock: parseInt(stock),
      price: parseFloat(price),
    });

    setName(''); setStock(''); setPrice(''); 
    setCategory(CATEGORIES[0]);
    setShowForm(false);
    fetchInventory();
  };

  const lowStockItems = items.filter(item => item.stock > 0 && item.stock <= 5);

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          keyboardShouldPersistTaps="handled" 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#10b981" 
              colors={['#10b981']} 
              progressBackgroundColor="#111113" 
            />
          }
        >
          
          {/* Tarsi-Style Hero Banner */}
          <View style={styles.heroBanner}>
            <View style={styles.heroTextContent}>
              <Text style={styles.overlineText}>INVENTORY</Text>
              <Text style={styles.greetingText}>Stock Room 📦</Text>
              <Text style={styles.heroSubtext}>Manage your items and track low stock alerts.</Text>
              
              <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(!showForm)}>
                <Text style={styles.addButtonText}>{showForm ? "Close Form" : "+ Add Item"}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.mascotContainer}>
              <Image 
                source={require('../../assets/images/mascot.png')}
                style={styles.mascotImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {showForm && (
            <View style={styles.bentoCard}>
              <Text style={styles.bentoTitle}>New Inventory Item</Text>
              
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity 
                    key={cat} 
                    style={[styles.chip, category === cat && styles.chipSelected]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.chipText, category === cat && styles.chipTextSelected]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TextInput style={styles.input} placeholder="Item Name (e.g. Oxva Xlim Pro)" placeholderTextColor="#52525b" value={name} onChangeText={setName} />
              
              <View style={styles.rowInputs}>
                <TextInput style={[styles.input, styles.halfInput]} placeholder="Qty" placeholderTextColor="#52525b" keyboardType="numeric" value={stock} onChangeText={setStock} />
                <TextInput style={[styles.input, styles.halfInput]} placeholder="Price (₱)" placeholderTextColor="#52525b" keyboardType="numeric" value={price} onChangeText={setPrice} />
              </View>
              
              <TouchableOpacity style={styles.submitButton} onPress={handleAddItem}>
                <Text style={styles.submitButtonText}>Save Item</Text>
              </TouchableOpacity>
            </View>
          )}

          {lowStockItems.length > 0 && (
            <View style={styles.alertCard}>
              <Text style={styles.alertTitle}>Restock Required</Text>
              {lowStockItems.map(item => (
                <Text key={`alert-${item.id}`} style={styles.alertText}>
                  {item.name} <Text style={{fontWeight: '800'}}>({item.stock} left)</Text>
                </Text>
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>Current Stock</Text>
          <View style={styles.listContainer}>
            {items.length === 0 ? (
              <Text style={styles.emptyText}>No items. Add one to begin.</Text>
            ) : (
              items.map((item, index) => (
                <View key={item.id} style={[styles.itemRow, index === items.length - 1 && styles.noBorder]}>
                  <View style={styles.itemInfoContainer}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemCategory}>{item.category}</Text>
                    <Text style={styles.itemPrice}>₱{item.price.toLocaleString()}</Text>
                  </View>
                  <View style={[styles.stockBadge, item.stock < 5 && styles.stockBadgeLow, item.stock === 0 && styles.stockBadgeOut]}>
                    <Text style={[styles.stockText, item.stock < 5 && styles.stockTextLow, item.stock === 0 && styles.stockTextOut]}>
                      {item.stock === 0 ? 'OUT OF STOCK' : `${item.stock}`}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 70 : 50, paddingBottom: 120 },
  
  // --- TARSI-STYLE HERO BANNER ---
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 185, 129, 0.08)', // Subtle emerald tint card
    borderRadius: 32,
    padding: 24,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)', // Glowing border effect
  },
  heroTextContent: {
    flex: 1,
    paddingRight: 16,
  },
  overlineText: {
    color: '#10b981', // Matches the accent color
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  greetingText: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSubtext: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 20,
    lineHeight: 20,
  },
  addButton: { 
    backgroundColor: '#ffffff', 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 24,
    alignSelf: 'flex-start' // Keeps the button wrapped tight to the text
  },
  addButtonText: { 
    color: '#000000', 
    fontWeight: '800', 
    fontSize: 14 
  },
  mascotContainer: {
    height: 110, // Matching the HomeScreen grand scale
    aspectRatio: 572 / 641, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotImage: {
    width: '100%',
    height: '100%',
  },
  
  // --- BENTO UI ---
  bentoCard: { backgroundColor: '#0A0A0C', padding: 24, borderRadius: 28, borderWidth: 1, borderColor: '#1F1F22', marginBottom: 32 },
  bentoTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800', marginBottom: 20, letterSpacing: -0.5 },
  
  label: { color: '#71717a', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 },
  chipScroll: { flexDirection: 'row', marginBottom: 20 },
  chip: { backgroundColor: '#111113', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#1F1F22' },
  chipSelected: { backgroundColor: '#ffffff', borderColor: '#ffffff' },
  chipText: { color: '#a1a1aa', fontWeight: '700', fontSize: 14 },
  chipTextSelected: { color: '#000000', fontWeight: '800' },

  input: { backgroundColor: '#000000', color: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#1F1F22', fontSize: 16, marginBottom: 12, fontWeight: '500' },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { flex: 0.48 },
  submitButton: { backgroundColor: '#10b981', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  submitButtonText: { color: '#000000', fontWeight: '900', fontSize: 16 },
  
  alertCard: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', padding: 20, borderRadius: 24, marginBottom: 32 },
  alertTitle: { color: '#ef4444', fontWeight: '900', fontSize: 16, marginBottom: 8, letterSpacing: -0.5 },
  alertText: { color: '#fca5a5', fontSize: 15, marginBottom: 4 },
  
  sectionTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800', marginBottom: 16, letterSpacing: -0.5 },
  listContainer: { backgroundColor: '#0A0A0C', borderRadius: 28, borderWidth: 1, borderColor: '#1F1F22', paddingHorizontal: 20 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#1F1F22' },
  noBorder: { borderBottomWidth: 0 },
  
  itemInfoContainer: { flex: 1, paddingRight: 16 },
  itemName: { color: '#ffffff', fontWeight: '700', fontSize: 17, marginBottom: 2 },
  itemCategory: { color: '#71717a', fontSize: 13, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  itemPrice: { color: '#10b981', fontSize: 15, fontWeight: '900' },
  
  stockBadge: { backgroundColor: '#111113', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#1F1F22' },
  stockText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
  stockBadgeLow: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' },
  stockTextLow: { color: '#ef4444' },
  stockBadgeOut: { backgroundColor: '#380f0f', borderColor: '#ef4444' },
  stockTextOut: { color: '#ffffff' },
  emptyText: { color: '#71717a', fontStyle: 'italic', textAlign: 'center', padding: 32 }
});