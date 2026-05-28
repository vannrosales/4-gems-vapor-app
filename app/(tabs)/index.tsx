import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  RefreshControl // 1. Import RefreshControl
  ,




  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { sales } from '../../src/db/schema';

// Initialize Database
const expoDb = openDatabaseSync('vapeshop.db');
const db = drizzle(expoDb);

// Business Settings
const SAVINGS_PERCENTAGE = 0.20; 

// Helpers
const getTodayString = () => new Date().toISOString().split('T')[0];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const formatMonthName = (yyyyMm: string) => {
  if (!yyyyMm) return "";
  const [year, month] = yyyyMm.split('-');
  return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
};

export default function HomeScreen() {
  const [dailyCount, setDailyCount] = useState(0);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [totalSavings, setTotalSavings] = useState(0);
  const [monthlyAnalytics, setMonthlyAnalytics] = useState<{ month: string; total: number }[]>([]);
  
  // 2. Add refreshing state
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const todayStr = getTodayString();

    const dayRecords = await db
      .select()
      .from(sales)
      .where(sql`date(${sales.createdAt}) = ${todayStr}`);
    
    setDailyCount(dayRecords.length);
    setDailyTotal(dayRecords.reduce((sum, record) => sum + record.amount, 0));

    const yearMonth = todayStr.substring(0, 7); 
    const monthResult = await db
      .select({ total: sql<number>`SUM(${sales.amount})` })
      .from(sales)
      .where(sql`strftime('%Y-%m', ${sales.createdAt}) = ${yearMonth}`);
    setMonthlyTotal(monthResult[0]?.total || 0);

    const allTimeResult = await db
      .select({ total: sql<number>`SUM(${sales.amount})` })
      .from(sales);
    const allTimeIncome = allTimeResult[0]?.total || 0;
    setTotalSavings(allTimeIncome * SAVINGS_PERCENTAGE);

    const analyticsResult = await db
      .select({
        month: sql<string>`strftime('%Y-%m', ${sales.createdAt})`,
        total: sql<number>`SUM(${sales.amount})`
      })
      .from(sales)
      .groupBy(sql`strftime('%Y-%m', ${sales.createdAt})`)
      .orderBy(sql`strftime('%Y-%m', ${sales.createdAt}) DESC`);
      
    setMonthlyAnalytics(analyticsResult);
  };

  // 3. Create the onRefresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData(); // Wait for fresh data
    setRefreshing(false); // Stop the spinner
  }, []);

  const maxMonthlyIncome = monthlyAnalytics.length > 0 
    ? Math.max(...monthlyAnalytics.map(a => a.total)) 
    : 1;

  // Format date for the modern header
  const todayDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        // 4. Attach RefreshControl to the ScrollView
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#10b981" // iOS spinner color
            colors={['#10b981']} // Android spinner color
            progressBackgroundColor="#111113" // Android spinner background
          />
        }
      >
        
        {/* Ultra-Minimal Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.dateText}>{todayDateFormatted}</Text>
            <Text style={styles.greetingText}>Magandang araw, Ginoo 👋</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>V</Text>
          </View>
        </View>

        {/* Massive Focus Number (Bryl Lim Style) */}
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>This Month's Revenue</Text>
          <Text style={styles.balanceAmount} numberOfLines={1} adjustsFontSizeToFit>
            ₱{monthlyTotal.toLocaleString()}
          </Text>
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>
              🔥 {dailyCount > 0 ? 'Active Streak' : 'Awaiting first sale'}
            </Text>
          </View>
        </View>

        {/* Bento Grid Stats */}
        <View style={styles.bentoGrid}>
          <View style={[styles.bentoCard, { marginRight: 6 }]}>
            <View style={styles.bentoHeader}>
              <Text style={styles.bentoIcon}>⚡</Text>
            </View>
            <View style={styles.bentoBottom}>
              <Text style={styles.bentoValue}>{dailyCount}</Text>
              <Text style={styles.bentoLabel}>Sales Today</Text>
              <Text style={styles.bentoSubtext}>₱{dailyTotal.toLocaleString()}</Text>
            </View>
          </View>

          <View style={[styles.bentoCard, { marginLeft: 6 }]}>
            <View style={styles.bentoHeader}>
              <Text style={styles.bentoIcon}>🏦</Text>
            </View>
            <View style={styles.bentoBottom}>
              <Text style={styles.bentoValue}>₱{totalSavings.toLocaleString()}</Text>
              <Text style={styles.bentoLabel}>Vault (20%)</Text>
              <Text style={styles.bentoSubtext}>Secured</Text>
            </View>
          </View>
        </View>

        {/* Sleek Analytics */}
        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>Performance</Text>
          <View style={styles.analyticsCard}>
            {monthlyAnalytics.length === 0 ? (
              <Text style={styles.emptyStateText}>Awaiting data...</Text>
            ) : (
              monthlyAnalytics.map((data, index) => {
                const barWidth = `${(data.total / maxMonthlyIncome) * 100}%`;
                return (
                  <View key={index} style={styles.analyticsRow}>
                    <View style={styles.analyticsTextRow}>
                      <Text style={styles.analyticsMonth}>{formatMonthName(data.month)}</Text>
                      <Text style={styles.analyticsAmount}>₱{data.total.toLocaleString()}</Text>
                    </View>
                    <View style={styles.barBackground}>
                      <View style={[styles.barFill, { width: barWidth as any }]} />
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // True OLED Black
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 40,
  },
  
  // --- Header ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  dateText: {
    color: '#71717a',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  greetingText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#111113',
    borderWidth: 1,
    borderColor: '#27272a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#10b981',
    fontWeight: '800',
    fontSize: 18,
  },

  // --- Massive Balance Section ---
  balanceContainer: {
    marginBottom: 40,
  },
  balanceLabel: {
    color: '#a1a1aa',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  balanceAmount: {
    color: '#ffffff',
    fontSize: 56, // Massive typography
    fontWeight: '900',
    letterSpacing: -2, 
    marginBottom: 16,
  },
  streakBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  streakText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '700',
  },

  // --- Bento Grid ---
  bentoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  bentoCard: {
    flex: 1,
    backgroundColor: '#0A0A0C', // Very dark grey
    borderRadius: 28, // Modern squircle
    padding: 20,
    borderWidth: 1,
    borderColor: '#1F1F22', // Barely visible border
    minHeight: 160,
    justifyContent: 'space-between',
  },
  bentoHeader: {
    alignItems: 'flex-start',
  },
  bentoIcon: {
    fontSize: 24,
  },
  bentoBottom: {
    marginTop: 'auto',
  },
  bentoValue: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  bentoLabel: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  bentoSubtext: {
    color: '#10b981', // Accent color
    fontSize: 13,
    fontWeight: '700',
  },

  // --- Analytics ---
  analyticsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  analyticsCard: {
    backgroundColor: '#0A0A0C',
    padding: 24,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#1F1F22',
  },
  analyticsRow: {
    marginBottom: 24,
  },
  analyticsTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  analyticsMonth: {
    color: '#a1a1aa',
    fontWeight: '600',
    fontSize: 15,
  },
  analyticsAmount: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
  barBackground: {
    height: 6, // Ultra thin sleek bars
    backgroundColor: '#1F1F22',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#ffffff', // High contrast white bars
    borderRadius: 4,
  },
  emptyStateText: {
    color: '#71717a',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
});