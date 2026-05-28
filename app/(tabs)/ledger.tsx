import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    RefreshControl // 1. Import RefreshControl
    ,


    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { inventory, sales } from '../../src/db/schema';

const expoDb = openDatabaseSync('vapeshop.db');
const db = drizzle(expoDb);
const getTodayString = () => new Date().toISOString().split('T')[0];

export default function LedgerScreen() {
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [dailySales, setDailySales] = useState<{ id: number; amount: number; note: string | null }[]>([]);
  const [dailyTotal, setDailyTotal] = useState(0);
  
  const [stockItems, setStockItems] = useState<{ id: number; name: string; category: string; stock: number; price: number }[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('1');

  // 2. Add refreshing state
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDataForDate(selectedDate);
    fetchStockItems();
  }, [selectedDate]);

  const fetchDataForDate = async (dateStr: string) => {
    const dayRecords = await db.select().from(sales).where(sql`date(${sales.createdAt}) = ${dateStr}`);
    setDailySales(dayRecords);
    setDailyTotal(dayRecords.reduce((sum, record) => sum + record.amount, 0));
  };

  const fetchStockItems = async () => {
    const items = await db.select().from(inventory).where(sql`${inventory.stock} > 0`);
    setStockItems(items);
  };

  // 3. Create the onRefresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Fetch both stock and sales for the currently selected date concurrently
    await Promise.all([
      fetchDataForDate(selectedDate),
      fetchStockItems()
    ]);
    setRefreshing(false);
  }, [selectedDate]); // Re-create the function if the selected date changes

  const handleSaveSale = async () => {
    if (!selectedItemId || !quantity) return;
    
    const qtyInt = parseInt(quantity);
    if (qtyInt <= 0) return;

    const selectedItem = stockItems.find(item => item.id === selectedItemId);
    if (!selectedItem) return;

    if (qtyInt > selectedItem.stock) {
      Alert.alert("Stock Error", `You only have ${selectedItem.stock}x ${selectedItem.name} left.`);
      return;
    }

    const totalAmount = selectedItem.price * qtyInt;
    const saleNote = `${qtyInt}x ${selectedItem.name}`;
    const datetimeStr = `${selectedDate}T${new Date().toISOString().split('T')[1]}`;

    await db.update(inventory)
      .set({ stock: selectedItem.stock - qtyInt })
      .where(eq(inventory.id, selectedItemId));

    await db.insert(sales).values({
      amount: totalAmount,
      note: saleNote,
      createdAt: datetimeStr,
    });

    setSelectedItemId(null);
    setQuantity('1');
    fetchDataForDate(selectedDate);
    fetchStockItems(); 
  };

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
          // 4. Attach RefreshControl to the ScrollView
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
          
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Ledger</Text>
          </View>
          
          <View style={styles.calendarContainer}>
            <Calendar
              current={selectedDate}
              onDayPress={(day: any) => setSelectedDate(day.dateString)}
              markedDates={{ [selectedDate]: { selected: true, selectedColor: '#ffffff', selectedTextColor: '#000000' } }}
              theme={{
                calendarBackground: 'transparent',
                textSectionTitleColor: '#71717a',
                dayTextColor: '#e4e4e7',
                todayTextColor: '#10b981',
                monthTextColor: '#ffffff',
                arrowColor: '#ffffff',
                textDayFontWeight: '600',
                textMonthFontWeight: '800',
              }}
            />
          </View>

          {/* Ultra-Minimal POS Form */}
          <View style={styles.bentoCard}>
            <Text style={styles.bentoTitle}>New Point of Sale</Text>
            
            <Text style={styles.label}>Select Item</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {stockItems.length === 0 ? (
                <Text style={styles.emptyStockText}>No stock available.</Text>
              ) : (
                stockItems.map(item => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={[styles.chip, selectedItemId === item.id && styles.chipSelected]}
                    onPress={() => setSelectedItemId(item.id)}
                  >
                    <Text style={[styles.chipText, selectedItemId === item.id && styles.chipTextSelected]}>
                      {item.name} {item.category} (₱{item.price})
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {selectedItemId && (
              <View style={styles.qtyContainer}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="1" 
                  placeholderTextColor="#52525b" 
                  keyboardType="numeric" 
                  value={quantity} 
                  onChangeText={setQuantity} 
                />
                <Text style={styles.autoCalculateText}>
                  Total: ₱{((stockItems.find(i => i.id === selectedItemId)?.price || 0) * (parseInt(quantity) || 0)).toLocaleString()}
                </Text>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.submitButton, (!selectedItemId || !quantity) && { opacity: 0.5 }]} 
              onPress={handleSaveSale}
              disabled={!selectedItemId || !quantity}
            >
              <Text style={styles.submitButtonText}>Process Sale</Text>
            </TouchableOpacity>
          </View>

          {/* Sleek Transactions */}
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Transactions</Text>
            <Text style={styles.dailyTotal}>₱{dailyTotal.toLocaleString()}</Text>
          </View>

          <View style={styles.transactionsContainer}>
            {dailySales.length === 0 ? (
              <Text style={styles.emptyText}>No transactions logged for this date.</Text>
            ) : (
              dailySales.map((item, index) => (
                <View key={item.id} style={[styles.transactionRow, index === dailySales.length - 1 && styles.noBorder]}>
                  <Text style={styles.transactionNote}>{item.note}</Text>
                  <Text style={styles.transactionAmount}>₱{item.amount.toLocaleString()}</Text>
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
  header: { marginBottom: 32 },
  headerTitle: { color: '#ffffff', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  
  calendarContainer: { backgroundColor: '#0A0A0C', borderRadius: 28, padding: 12, borderWidth: 1, borderColor: '#1F1F22', marginBottom: 32 },
  
  bentoCard: { backgroundColor: '#0A0A0C', padding: 24, borderRadius: 28, borderWidth: 1, borderColor: '#1F1F22', marginBottom: 40 },
  bentoTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800', marginBottom: 20, letterSpacing: -0.5 },
  label: { color: '#71717a', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 0.5 },
  
  chipScroll: { flexDirection: 'row', marginBottom: 24 },
  emptyStockText: { color: '#ef4444', fontStyle: 'italic', fontSize: 14 },
  chip: { backgroundColor: '#111113', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, marginRight: 12, borderWidth: 1, borderColor: '#1F1F22' },
  chipSelected: { backgroundColor: '#ffffff', borderColor: '#ffffff' },
  chipText: { color: '#a1a1aa', fontWeight: '700' },
  chipTextSelected: { color: '#000000', fontWeight: '800' },
  
  qtyContainer: { marginBottom: 24 },
  input: { backgroundColor: '#000000', color: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#1F1F22', fontSize: 18, fontWeight: '600' },
  autoCalculateText: { color: '#10b981', fontWeight: '800', fontSize: 18, marginTop: 12, textAlign: 'right' },
  
  submitButton: { backgroundColor: '#10b981', padding: 18, borderRadius: 16, alignItems: 'center' },
  submitButtonText: { color: '#000000', fontWeight: '900', fontSize: 16 },
  
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  listTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  dailyTotal: { color: '#10b981', fontSize: 20, fontWeight: '900' },
  
  transactionsContainer: { backgroundColor: '#0A0A0C', borderRadius: 28, borderWidth: 1, borderColor: '#1F1F22', paddingHorizontal: 20 },
  transactionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#1F1F22' },
  noBorder: { borderBottomWidth: 0 },
  transactionNote: { color: '#e4e4e7', fontSize: 16, fontWeight: '500', flex: 1 },
  transactionAmount: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
  emptyText: { color: '#71717a', textAlign: 'center', padding: 32, fontStyle: 'italic' },
});