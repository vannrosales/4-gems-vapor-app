import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { inventory } from '../../src/db/schema';

const expoDb = openDatabaseSync('vapeshop.db');
const db = drizzle(expoDb);

// Define your specific vape shop categories here
const CATEGORIES = ['V1 Device', 'V2 Device', 'V3 Device', 'V1 Pods', 'V2 Pods', 'V3 Pods', 'Juice', 'Misc'];

export default function InventoryScreen() {
  const [items, setItems] = useState<{ id: number; name: string; category: string; stock: number; price: number }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]); // Default to the first category
  const [stock, setStock] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    const allItems = await db.select().from(inventory);
    setItems(allItems);
  };

  const handleAddItem = async () => {
    if (!name || !stock || !price) return;

    await db.insert(inventory).values({
      name, 
      category,
      stock: parseInt(stock),
      price: parseFloat(price),
    });

    setName(''); setStock(''); setPrice(''); 
    setCategory(CATEGORIES[0]); // Reset category
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
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Stock Room</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(!showForm)}>
              <Text style={styles.addButtonText}>{showForm ? "Close" : "+ Add"}</Text>
            </TouchableOpacity>
          </View>

          {showForm && (
            <View style={styles.bentoCard}>
              <Text style={styles.bentoTitle}>New Inventory Item</Text>
              
              {/* Category Selector */}
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
              <Text style={styles.alertTitle}>⚠️ Restock Required</Text>
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
                    {/* Display the Category */}
                    <Text style={styles.itemCategory}>{item.category}</Text>
                    <Text style={styles.itemPrice}>₱{item.price.toLocaleString()}</Text>
                  </View>
                  <View style={[styles.stockBadge, item.stock < 5 && styles.stockBadgeLow, item.stock === 0 && styles.stockBadgeOut]}>
                    <Text style={[styles.stockText, item.stock < 5 && styles.stockTextLow, item.stock === 0 && styles.stockTextOut]}>
                      {item.stock === 0 ? 'OUT' : `${item.stock}`}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  headerTitle: { color: '#ffffff', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  addButton: { backgroundColor: '#ffffff', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24 },
  addButtonText: { color: '#000000', fontWeight: '800', fontSize: 15 },
  
  bentoCard: { backgroundColor: '#0A0A0C', padding: 24, borderRadius: 28, borderWidth: 1, borderColor: '#1F1F22', marginBottom: 32 },
  bentoTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800', marginBottom: 20, letterSpacing: -0.5 },
  
  // Category UI Styles
  label: { color: '#71717a', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 },
  chipScroll: { flexDirection: 'row', marginBottom: 20 },
  chip: { backgroundColor: '#111113', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#1F1F22' },
  chipSelected: { backgroundColor: '#ffffff', borderColor: '#ffffff' },
  chipText: { color: '#a1a1aa', fontWeight: '700', fontSize: 14 },
  chipTextSelected: { color: '#000000', fontWeight: '800' },

  input: { backgroundColor: '#000000', color: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#1F1F22', fontSize: 16, marginBottom: 12, fontWeight: '500' },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { flex: 0.48 },
  submitButton: { backgroundColor: '#ffffff', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 8 },
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
  stockBadgeOut: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  stockTextOut: { color: '#ffffff' },
  emptyText: { color: '#71717a', fontStyle: 'italic', textAlign: 'center', padding: 32 }
});