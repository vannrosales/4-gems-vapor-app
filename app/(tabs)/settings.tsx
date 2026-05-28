import { Ionicons } from '@expo/vector-icons';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as Sharing from 'expo-sharing';
import { openDatabaseAsync } from 'expo-sqlite';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Image, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { inventory, sales } from '../../src/db/schema';

const { width } = Dimensions.get('window');
const STORY_WIDTH = width; // Keeps the width perfect for phones

export default function SettingsScreen() {
  const [db, setDb] = useState<any | null>(null);
  const [availableStocks, setAvailableStocks] = useState<any[]>([]);
  const storyRef = useRef<ViewShot>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const expoDb = await openDatabaseAsync('vapeshop.db');
        const d = drizzle(expoDb);
        if (mounted) setDb(d);
        
        // Pre-fetch stocks so the off-screen template is ready to be captured
        const stocks = await d.select().from(inventory).where(sql`${inventory.stock} > 0`);
        if (mounted) setAvailableStocks(stocks);
      } catch (e) {
        console.error('Failed to open database', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // --- 1. Share Available Stocks (IMAGE EXPORT) ---
  const handleShareStocksToStory = async () => {
    try {
      if (!db || availableStocks.length === 0) {
        Alert.alert('Out of Stock', 'You have no items available to share right now!');
        return;
      }

      // Briefly wait to ensure the ViewShot is fully rendered with all items
      setTimeout(async () => {
        if (storyRef.current && storyRef.current.capture) {
          const uri = await storyRef.current.capture();
          
          const isSharingAvailable = await Sharing.isAvailableAsync();
          if (isSharingAvailable) {
            await Sharing.shareAsync(uri, {
              dialogTitle: 'Share your stock list!',
              mimeType: 'image/jpeg',
            });
          } else {
            Alert.alert('Error', 'Sharing is not available on this device');
          }
        }
      }, 300);

    } catch (error) {
      Alert.alert('Share Failed', 'Could not prepare the image.');
      console.error(error);
    }
  };

  // --- 2. Share to Social Media Milestone Logic (TEXT EXPORT) ---
  const handleShareMilestone = async () => {
    try {
      if (!db) {
        Alert.alert('Please wait', 'Database is still initializing. Try again in a moment.');
        return;
      }
      
      const currentYearMonth = new Date().toISOString().substring(0, 7);
      const monthResult = await db
        .select({ total: sql<number>`SUM(${sales.amount})` })
        .from(sales)
        .where(sql`strftime('%Y-%m', ${sales.createdAt}) = ${currentYearMonth}`);
      
      const monthlyTotal = monthResult[0]?.total || 0;

      const allTimeResult = await db.select({ total: sql<number>`SUM(${sales.amount})` }).from(sales);
      const allTimeTotal = allTimeResult[0]?.total || 0;

      if (allTimeTotal === 0) {
        Alert.alert('No Sales Yet', 'Make some sales before flexing on social media! 💨');
        return;
      }

      const shareMessage = `🔥 Vape Shop Update! 🔥\n\nWe just hit ₱${monthlyTotal.toLocaleString()} in revenue this month!\nAll-time revenue: ₱${allTimeTotal.toLocaleString()} 💨\n\nThanks for the immense support! 💯`;

      await Share.share({
        message: shareMessage,
        title: 'Vape Shop Milestone'
      });
    } catch (error) {
      Alert.alert('Share Failed', 'Could not prepare the milestone data.');
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      
      {/* 
        OFF-SCREEN STORY TEMPLATE 
        Changed to a standard View. It will automatically scale its height 
        based entirely on how many items are in the array.
      */}
      <View style={styles.offScreenContainer}>
        <ViewShot ref={storyRef} options={{ format: 'jpg', quality: 0.9 }} style={styles.storyTemplate}>
          
          <View style={styles.storyHeader}>
            <View style={styles.storyMascotContainer}>
              <Image 
                source={require('../../assets/images/mascot.png')}
                style={styles.storyMascotImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.storyTitle}>FRESH DROPS &</Text>
            <Text style={styles.storyTitleHighlight}>AVAILABLE STOCKS</Text>
          </View>

          {/* DYNAMIC 2-COLUMN GRID TO FIT ALL STOCKS */}
          <View style={styles.storyStockList}>
            {availableStocks.map((item, index) => (
              <View key={index} style={styles.storyItemCard}>
                <View style={styles.storyItemInfo}>
                  <Text style={styles.storyItemName} numberOfLines={1} adjustsFontSizeToFit>{item.name}</Text>
                  <Text style={styles.storyItemCategory}>{item.category}</Text>
                </View>
                <View style={styles.storyPriceTag}>
                  <Text style={styles.storyItemPrice}>₱{item.price.toLocaleString()}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.storyFooter}>
            <Text style={styles.storyFooterText}>DM TO SECURE YOURS 💨</Text>
          </View>
        </ViewShot>
      </View>

      {/* VISIBLE SETTINGS UI */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Configuration</Text>
          <View style={styles.bentoCard}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Ionicons name="pie-chart" size={18} color="#10b981" />
                </View>
                <Text style={styles.rowText}>Vault Target</Text>
              </View>
              <Text style={styles.rowValue}>20%</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social Media & Marketing</Text>
          <View style={styles.bentoCard}>
            
            <TouchableOpacity style={[styles.row, styles.borderBottom]} onPress={handleShareStocksToStory}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <Ionicons name="images" size={18} color="#3b82f6" />
                </View>
                <Text style={styles.rowText}>Export Stock Image</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#52525b" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.row, styles.borderBottom]} onPress={handleShareMilestone}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(244, 63, 94, 0.1)' }]}>
                  <Ionicons name="share-social" size={18} color="#f43f5e" />
                </View>
                <Text style={styles.rowText}>Share Milestone (Text)</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#52525b" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
                  <Ionicons name="cloud-upload" size={18} color="#a855f7" />
                </View>
                <Text style={styles.rowText}>Backup Database</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#52525b" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System</Text>
          <View style={styles.bentoCard}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: '#1F1F22' }]}>
                  <Ionicons name="information-circle" size={18} color="#a1a1aa" />
                </View>
                <Text style={styles.rowText}>App Version</Text>
              </View>
              <Text style={styles.rowValue}>v1.0.0 (Pro)</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 70 : 50, paddingBottom: 60 },
  header: { marginBottom: 32 },
  headerTitle: { color: '#ffffff', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  
  section: { marginBottom: 32 },
  sectionTitle: { color: '#71717a', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, marginLeft: 16, letterSpacing: 0.5 },
  
  bentoCard: { backgroundColor: '#0A0A0C', borderRadius: 28, borderWidth: 1, borderColor: '#1F1F22', overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#1F1F22' },
  
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  rowText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  rowValue: { color: '#a1a1aa', fontSize: 16, fontWeight: '700' },

  // --- OFF-SCREEN STORY TEMPLATE STYLES ---
  offScreenContainer: {
    position: 'absolute',
    left: -10000, 
    width: STORY_WIDTH,
  },
  storyTemplate: {
    width: STORY_WIDTH,
    // NO fixed height or minHeight. It stretches dynamically based on content.
    backgroundColor: '#0A0A0C', 
    padding: 24,
    borderWidth: 8,
    borderColor: '#10b981', 
  },
  storyHeader: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  storyMascotContainer: {
    height: 100,
    width: 100,
    marginBottom: 16,
  },
  storyMascotImage: {
    width: '100%',
    height: '100%',
  },
  storyTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
  storyTitleHighlight: {
    color: '#10b981',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  storyStockList: {
    flexDirection: 'row',
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    alignContent: 'flex-start',
  },
  storyItemCard: {
    width: '48%', 
    backgroundColor: '#111113',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F1F22',
    justifyContent: 'space-between',
  },
  storyItemInfo: {
    marginBottom: 12,
  },
  storyItemName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  storyItemCategory: {
    color: '#a1a1aa',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  storyPriceTag: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  storyItemPrice: {
    color: '#10b981',
    fontSize: 15,
    fontWeight: '900',
  },
  storyFooter: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  storyFooterText: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  }
});