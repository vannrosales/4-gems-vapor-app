import { Ionicons } from '@expo/vector-icons';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { openDatabaseAsync } from 'expo-sqlite';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { inventory, sales } from '../../src/db/schema';

export default function SettingsScreen() {
  const { width: STORY_WIDTH } = useWindowDimensions();
  
  const [db, setDb] = useState<any | null>(null);
  const [availableStocks, setAvailableStocks] = useState<any[]>([]);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  
  const storyRef = useRef<View>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const expoDb = await openDatabaseAsync('vapeshop.db');
        const d = drizzle(expoDb);
        if (mounted) setDb(d);
        
        const stocks = await d.select().from(inventory).where(sql`${inventory.stock} > 0`);
        if (mounted) setAvailableStocks(stocks);
      } catch (e) {
        console.error('Failed to open database', e);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleShareStocksToStory = async () => {
    try {
      if (!db || availableStocks.length === 0) {
        Alert.alert('Out of Stock', 'You have no items available to share right now!');
        return;
      }

      setTimeout(async () => {
        if (storyRef.current) {
          const uri = await captureRef(storyRef, {
            format: 'jpg',
            quality: 0.9,
          });
          
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

  const handleShareMilestone = async () => {
    try {
      if (!db) return;
      
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

  const handleBackupDatabase = async () => {
    try {
      const dbDir = new Directory(Paths.document, 'SQLite');
      const dbFile = new File(dbDir, 'vapeshop.db');
      
      if (!dbFile.exists) {
        Alert.alert('Error', 'Database file not found.');
        return;
      }

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(dbFile.uri, {
          dialogTitle: 'Backup Vape Shop Database',
          mimeType: 'application/x-sqlite3', 
        });
      }
    } catch (error) {
      Alert.alert('Backup Failed', 'Could not export the database.');
      console.error(error);
    }
  };

  const handleExportJson = async () => {
    try {
      if (!db) return;
      
      const inventoryData = await db.select().from(inventory);
      const salesData = await db.select().from(sales);

      const exportObj = {
        app: 'VapeShopPro',
        exportedAt: new Date().toISOString(),
        inventory: inventoryData,
        sales: salesData,
      };

      const jsonString = JSON.stringify(exportObj, null, 2);
      
      const cacheDir = new Directory(Paths.cache);
      const exportFile = new File(cacheDir, 'VapeShop_Data.json');

      
      await exportFile.write(jsonString);

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(exportFile.uri, {
          dialogTitle: 'Export Vape Shop Data',
          mimeType: 'application/json',
        });
      }
    } catch (error) {
      Alert.alert('Export Failed', 'Could not export data to JSON.');
      console.error(error);
    }
  };

  const handleImportJson = async () => {
    try {
      if (!db) return;

      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return; 
      }

      const fileUri = result.assets[0].uri;
      
      // 🔥 MODERN API: Wrap the URI in a File object, then read its text
      const importFile = new File(fileUri);
      const fileContent = await importFile.text();
      
      const parsedData = JSON.parse(fileContent);

      if (parsedData.app !== 'VapeShopPro' && (!parsedData.inventory && !parsedData.sales)) {
        Alert.alert('Invalid File', 'This JSON file does not contain valid Vape Shop data.');
        return;
      }

      Alert.alert(
        'Import Data',
        'How would you like to import this data? Merging will keep your current data and add the new items. Replacing will wipe your current database first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Merge', onPress: () => executeImport(parsedData, false) },
          { text: 'Clear & Replace', style: 'destructive', onPress: () => executeImport(parsedData, true) }
        ]
      );
    } catch (error) {
      Alert.alert('Import Failed', 'Could not read or parse the JSON file.');
      console.error(error);
    }
  };

  const executeImport = async (data: any, shouldClear: boolean) => {
    try {
      if (shouldClear) {
        await db.delete(inventory);
        await db.delete(sales);
      }

      if (data.inventory && data.inventory.length > 0) {
        const inventoryToInsert = data.inventory.map(({ id, ...rest }: any) => rest);
        await db.insert(inventory).values(inventoryToInsert);
      }

      if (data.sales && data.sales.length > 0) {
        const salesToInsert = data.sales.map(({ id, ...rest }: any) => rest);
        await db.insert(sales).values(salesToInsert);
      }

      Alert.alert('Success', 'Data imported successfully!');
      
      const stocks = await db.select().from(inventory).where(sql`${inventory.stock} > 0`);
      setAvailableStocks(stocks);

    } catch (error) {
      Alert.alert('Import Error', 'An error occurred while saving to the database.');
      console.error(error);
    }
  };

  const handleClearSales = () => {
    Alert.alert(
      '⚠️ Clear Sales Data',
      'Are you sure you want to delete all sales history? This action is permanent and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear Data', 
          style: 'destructive', 
          onPress: async () => {
            if (db) {
              await db.delete(sales);
              Alert.alert('Success', 'Sales history has been wiped.');
            }
          }
        }
      ]
    );
  };

  const handleClearInventory = () => {
    Alert.alert(
      '⚠️ Clear Inventory Data',
      'Are you sure you want to delete all inventory items? This action is permanent and cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear Data', 
          style: 'destructive', 
          onPress: async () => {
            if (db) {
              await db.delete(inventory);
              setAvailableStocks([]); 
              Alert.alert('Success', 'Inventory has been wiped.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      
      <View style={[styles.offScreenContainer, { width: STORY_WIDTH }]}>
        <View 
          ref={storyRef} 
          collapsable={false} 
          style={[styles.storyTemplate, { width: STORY_WIDTH }]}
        >
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
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Configuration</Text>
          <View style={styles.bentoCard}>
            <View style={[styles.row, styles.borderBottom]}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Ionicons name="pie-chart" size={18} color="#10b981" />
                </View>
                <Text style={styles.rowText}>Vault Target</Text>
              </View>
              <Text style={styles.rowValue}>20%</Text>
            </View>

            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(234, 179, 8, 0.1)' }]}>
                  <Ionicons name="warning" size={18} color="#eab308" />
                </View>
                <Text style={styles.rowText}>Low Stock Alert</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={() => setLowStockThreshold(Math.max(1, lowStockThreshold - 1))}>
                  <Ionicons name="remove-circle" size={24} color="#52525b" />
                </TouchableOpacity>
                <Text style={styles.rowValue}>{lowStockThreshold}</Text>
                <TouchableOpacity onPress={() => setLowStockThreshold(lowStockThreshold + 1)}>
                  <Ionicons name="add-circle" size={24} color="#10b981" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <View style={styles.bentoCard}>
            
            <TouchableOpacity style={[styles.row, styles.borderBottom]} onPress={handleExportJson}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Ionicons name="document-text" size={18} color="#10b981" />
                </View>
                <Text style={styles.rowText}>Export JSON Data</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#52525b" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.row} onPress={handleImportJson}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(234, 179, 8, 0.1)' }]}>
                  <Ionicons name="download" size={18} color="#eab308" />
                </View>
                <Text style={styles.rowText}>Import JSON Data</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#52525b" />
            </TouchableOpacity>

          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Marketing</Text>
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
            
            <TouchableOpacity style={styles.row} onPress={handleBackupDatabase}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
                  <Ionicons name="cloud-download" size={18} color="#a855f7" />
                </View>
                <Text style={styles.rowText}>Backup Raw Database</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#52525b" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <View style={styles.bentoCard}>
            <TouchableOpacity style={[styles.row, styles.borderBottom]} onPress={handleClearSales}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                  <Ionicons name="trash" size={18} color="#ef4444" />
                </View>
                <Text style={[styles.rowText, { color: '#ef4444' }]}>Clear Sales History</Text>
              </View>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.row} onPress={handleClearInventory}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                  <Ionicons name="trash" size={18} color="#ef4444" />
                </View>
                <Text style={[styles.rowText, { color: '#ef4444' }]}>Clear Inventory</Text>
              </View>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
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

  offScreenContainer: { position: 'absolute', left: -10000 },
  storyTemplate: { backgroundColor: '#0A0A0C', padding: 24, borderWidth: 8, borderColor: '#10b981' },
  storyHeader: { alignItems: 'center', marginTop: 24, marginBottom: 24 },
  storyMascotContainer: { height: 100, width: 100, marginBottom: 16 },
  storyMascotImage: { width: '100%', height: '100%' },
  storyTitle: { color: '#ffffff', fontSize: 28, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  storyTitleHighlight: { color: '#10b981', fontSize: 36, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  storyStockList: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'flex-start' },
  storyItemCard: { width: '48%', backgroundColor: '#111113', padding: 12, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1F1F22', justifyContent: 'space-between' },
  storyItemInfo: { marginBottom: 12 },
  storyItemName: { color: '#ffffff', fontSize: 16, fontWeight: '800', marginBottom: 2 },
  storyItemCategory: { color: '#a1a1aa', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  storyPriceTag: { backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  storyItemPrice: { color: '#10b981', fontSize: 15, fontWeight: '900' },
  storyFooter: { backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  storyFooterText: { color: '#000000', fontSize: 20, fontWeight: '900', letterSpacing: 1 }
});