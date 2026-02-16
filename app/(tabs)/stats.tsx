import React, { useState, useMemo } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useGame, BUILDING_NAMES, BuildingType } from '@/lib/game-state';

type Period = 'day' | 'week' | 'month';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { state } = useGame();
  const [period, setPeriod] = useState<Period>('week');

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const filteredSessions = useMemo(() => {
    const now = new Date();
    return state.focusHistory.filter(s => {
      const d = new Date(s.startTime);
      if (period === 'day') return d.toDateString() === now.toDateString();
      if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return d >= weekAgo;
      }
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return d >= monthAgo;
    });
  }, [state.focusHistory, period]);

  const totalMinutes = filteredSessions.reduce((sum, s) => sum + s.actualDuration, 0);
  const totalDiamonds = filteredSessions.reduce((sum, s) => sum + s.diamondsEarned, 0);
  const totalSessions = filteredSessions.length;
  const avgDuration = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;

  const dailyData = useMemo(() => {
    const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;
    const data: { label: string; value: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toDateString();
      const dayMinutes = state.focusHistory
        .filter(s => new Date(s.startTime).toDateString() === dateStr)
        .reduce((sum, s) => sum + s.actualDuration, 0);

      const label = period === 'day'
        ? '今天'
        : `${date.getMonth() + 1}/${date.getDate()}`;
      data.push({ label, value: dayMinutes });
    }
    return data;
  }, [state.focusHistory, period]);

  const maxValue = Math.max(...dailyData.map(d => d.value), 1);

  const buildingStats = useMemo(() => {
    const counts: Record<string, number> = {};
    state.buildings.forEach(b => {
      counts[b.type] = (counts[b.type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({
      type: type as BuildingType,
      name: BUILDING_NAMES[type as BuildingType],
      count,
    }));
  }, [state.buildings]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Text style={styles.headerTitle}>数据统计</Text>
      </Animated.View>

      <View style={styles.periodRow}>
        {(['day', 'week', 'month'] as Period[]).map(p => (
          <Pressable
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p === 'day' ? '今日' : p === 'week' ? '本周' : '本月'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Feather name="clock" size={20} color={Colors.primary} />
            <Text style={styles.summaryValue}>{totalMinutes}</Text>
            <Text style={styles.summaryLabel}>总分钟</Text>
          </View>
          <View style={styles.summaryCard}>
            <Ionicons name="diamond" size={20} color={Colors.diamond} />
            <Text style={styles.summaryValue}>{totalDiamonds}</Text>
            <Text style={styles.summaryLabel}>获得砖石</Text>
          </View>
          <View style={styles.summaryCard}>
            <Feather name="target" size={20} color={Colors.gold} />
            <Text style={styles.summaryValue}>{avgDuration}</Text>
            <Text style={styles.summaryLabel}>平均时长</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.chartCard}>
          <Text style={styles.chartTitle}>专注趋势</Text>
          <View style={styles.chart}>
            {dailyData.map((d, i) => (
              <View key={i} style={styles.barCol}>
                <View style={styles.barOuter}>
                  <View
                    style={[
                      styles.barInner,
                      {
                        height: `${Math.max(4, (d.value / maxValue) * 100)}%`,
                        backgroundColor: d.value > 0 ? Colors.primary : Colors.border,
                      },
                    ]}
                  />
                </View>
                {(period !== 'month' || i % 5 === 0 || i === dailyData.length - 1) && (
                  <Text style={styles.barLabel}>{d.label}</Text>
                )}
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.buildingStatsCard}>
          <Text style={styles.chartTitle}>建筑统计</Text>
          {buildingStats.length === 0 ? (
            <Text style={styles.emptyText}>暂无建筑</Text>
          ) : (
            buildingStats.map((bs, i) => (
              <View key={bs.type} style={styles.buildingStatRow}>
                <Text style={styles.buildingStatName}>{bs.name}</Text>
                <View style={styles.buildingStatBarOuter}>
                  <View
                    style={[
                      styles.buildingStatBarInner,
                      { width: `${(bs.count / state.buildings.length) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.buildingStatCount}>{bs.count}</Text>
              </View>
            ))
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(400)} style={styles.historyCard}>
          <Text style={styles.chartTitle}>最近记录</Text>
          {filteredSessions.length === 0 ? (
            <Text style={styles.emptyText}>暂无专注记录</Text>
          ) : (
            filteredSessions.slice(0, 10).map((s, i) => (
              <View key={s.id} style={styles.historyRow}>
                <View style={styles.historyLeft}>
                  <Text style={styles.historyDuration}>{s.actualDuration}分钟</Text>
                  <Text style={styles.historyDate}>
                    {new Date(s.startTime).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={styles.historyRight}>
                  <Ionicons name="diamond" size={12} color={Colors.diamond} />
                  <Text style={styles.historyDiamonds}>+{s.diamondsEarned}</Text>
                </View>
              </View>
            ))
          )}
        </Animated.View>

        <View style={{ height: Platform.OS === 'web' ? 94 : 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 28, color: Colors.text },
  periodRow: {
    flexDirection: 'row', marginHorizontal: 20, gap: 8, marginBottom: 16,
  },
  periodBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 12,
    backgroundColor: Colors.surface, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  periodBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  periodText: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: Colors.textSecondary },
  periodTextActive: { color: Colors.textOnPrimary },
  scrollContent: { paddingHorizontal: 20 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: 6,
  },
  summaryValue: { fontFamily: 'RobotoMono_700Bold', fontSize: 22, color: Colors.text },
  summaryLabel: { fontFamily: 'Nunito_400Regular', fontSize: 11, color: Colors.textSecondary },
  chartCard: {
    backgroundColor: Colors.surface, borderRadius: 18, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  chartTitle: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: Colors.text, marginBottom: 16 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 2 },
  barCol: { flex: 1, alignItems: 'center', height: '100%' },
  barOuter: { flex: 1, width: '80%', justifyContent: 'flex-end' },
  barInner: { width: '100%', borderRadius: 4, minHeight: 4 },
  barLabel: { fontFamily: 'Nunito_400Regular', fontSize: 9, color: Colors.textMuted, marginTop: 4 },
  buildingStatsCard: {
    backgroundColor: Colors.surface, borderRadius: 18, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  buildingStatRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
  },
  buildingStatName: {
    fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: Colors.text, width: 50,
  },
  buildingStatBarOuter: {
    flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: 4, marginHorizontal: 10,
  },
  buildingStatBarInner: {
    height: 8, backgroundColor: Colors.primary, borderRadius: 4,
  },
  buildingStatCount: {
    fontFamily: 'RobotoMono_700Bold', fontSize: 14, color: Colors.text, width: 24, textAlign: 'right',
  },
  emptyText: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  historyCard: {
    backgroundColor: Colors.surface, borderRadius: 18, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  historyLeft: {},
  historyDuration: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, color: Colors.text },
  historyDate: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  historyRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyDiamonds: { fontFamily: 'RobotoMono_700Bold', fontSize: 14, color: Colors.diamond },
});
