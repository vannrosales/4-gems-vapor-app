import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { LineChart } from 'react-native-chart-kit'; // <-- 1. Import LineChart
import { sales } from '../../src/db/schema';

// Initialize Database
const expoDb = openDatabaseSync('vapeshop.db');
const db = drizzle(expoDb);

// Business Settings
const SAVINGS_PERCENTAGE = 0.20; 
const screenWidth = Dimensions.get("window").width;

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
  
  // NEW: States for all-time stats
  const [allTimeIncome, setAllTimeIncome] = useState(0);
  const [allTimeSales, setAllTimeSales] = useState(0);

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

    // UPDATED: Fetching both sum (income) and count (total sales)
    const allTimeResult = await db
      .select({ 
        total: sql<number>`SUM(${sales.amount})`,
        count: sql<number>`COUNT(${sales.id})`
      })
      .from(sales);
      
    const totalInc = allTimeResult[0]?.total || 0;
    const totalSls = allTimeResult[0]?.count || 0;
    
    setAllTimeIncome(totalInc);
    setAllTimeSales(totalSls);
    setTotalSavings(totalInc * SAVINGS_PERCENTAGE);

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData(); 
    setRefreshing(false); 
  }, []);

  const todayDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  // Reverse data for the chart so it reads left-to-right (oldest to newest)
  const chartData = [...monthlyAnalytics].reverse();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView 
        showsVerticalScrollIndicator={false} 
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
        
        {/* Tarsi-Style Hero Banner with Mascot */}
        <View style={styles.heroBanner}>
          <View style={styles.heroTextContent}>
            <Text style={styles.dateText}>{todayDateFormatted}</Text>
            <Text style={styles.greetingText}>Magandang araw, Vann 👋</Text>
            <Text style={styles.heroSubtext}>Ready to crush today's goals?</Text>
          </View>
          
          <View style={styles.mascotContainer}>
            <Image 
              source={require('../../assets/images/mascot.png')}
              style={styles.mascotImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Massive Focus Number */}
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

        {/* Sales Today & Vault */}
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

        {/* NEW: All-Time Overview */}
        <Text style={styles.sectionTitle}>All-Time Overview</Text>
        <View style={styles.bentoGrid}>
          <View style={[styles.bentoCard, { marginRight: 6, minHeight: 120 }]}>
            <View style={styles.bentoBottom}>
              <Text style={styles.bentoValue}>₱{allTimeIncome.toLocaleString()}</Text>
              <Text style={styles.bentoLabel}>Total Income</Text>
            </View>
          </View>

          <View style={[styles.bentoCard, { marginLeft: 6, minHeight: 120 }]}>
            <View style={styles.bentoBottom}>
              <Text style={styles.bentoValue}>{allTimeSales.toLocaleString()}</Text>
              <Text style={styles.bentoLabel}>Total Items Sold</Text>
            </View>
          </View>
        </View>

        {/* Sleek Line Chart Analytics */}
        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>Revenue Trend</Text>
          <View style={styles.chartCard}>
            {chartData.length === 0 ? (
              <Text style={styles.emptyStateText}>Awaiting data...</Text>
            ) : (
              <LineChart
                data={{
                  labels: chartData.map(d => formatMonthName(d.month).split(' ')[0]), // Extracts just the month name e.g., "May"
                  datasets: [{ data: chartData.map(d => d.total) }]
                }}
                width={screenWidth - 48} // 24 padding on left and right
                height={220}
                yAxisLabel="₱"
                yAxisSuffix=""
                yAxisInterval={1} 
                chartConfig={{
                  backgroundColor: '#0A0A0C',
                  backgroundGradientFrom: '#0A0A0C',
                  backgroundGradientTo: '#0A0A0C',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Emerald green line
                  labelColor: (opacity = 1) => `rgba(161, 161, 170, ${opacity})`, // Zinc-400 text
                  style: { borderRadius: 16 },
                  propsForDots: {
                    r: "5",
                    strokeWidth: "2",
                    stroke: "#000000"
                  }
                }}
                bezier // Makes the line curved and smooth
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                  marginLeft: -10, // Adjusts offset so the chart fits nicely
                }}
              />
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
    backgroundColor: '#000000', 
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 70 : 50,
    paddingBottom: 40,
  },
  
  // --- TARSI-STYLE HERO BANNER ---
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 185, 129, 0.08)', 
    borderRadius: 32,
    padding: 24,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)', 
  },
  heroTextContent: {
    flex: 1,
    paddingRight: 16,
  },
  dateText: {
    color: '#10b981', 
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  greetingText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSubtext: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: '500',
  },
  mascotContainer: {
    height: 110, 
    aspectRatio: 572 / 641, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotImage: {
    width: '100%',
    height: '100%',
  },

  // --- BALANCE & BENTO SECTION ---
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
    fontSize: 56, 
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

  bentoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  bentoCard: {
    flex: 1,
    backgroundColor: '#0A0A0C', 
    borderRadius: 28, 
    padding: 20,
    borderWidth: 1,
    borderColor: '#1F1F22', 
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
    color: '#10b981', 
    fontSize: 13,
    fontWeight: '700',
  },

  analyticsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  chartCard: {
    backgroundColor: '#0A0A0C',
    paddingVertical: 16,
    paddingRight: 16,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: '#1F1F22',
    overflow: 'hidden',
  },
  emptyStateText: {
    color: '#71717a',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 32,
  },
});