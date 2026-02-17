import React, { useState, useMemo } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useGame, BUILDING_NAMES, BuildingType } from '@/lib/game-state';

type Period = 'day' | 'week' | 'month';

const BUILDING_ICON_MAP: Record<BuildingType, { family: 'ionicons' | 'feather'; name: string }> = {
  house: { family: 'ionicons', name: 'home' },
  windmill: { family: 'feather', name: 'wind' },
  lighthouse: { family: 'feather', name: 'sunrise' },
  tree: { family: 'ionicons', name: 'leaf' },
  road: { family: 'feather', name: 'map' },
};

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
      if (period === 'week') return d >= new Date(now.getTime() - 7 * 86400000);
      return d >= new Date(now.getTime() - 30 * 86400000);
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
      const date = new Date(now.getTime() - i * 86400000);
      const dateStr = date.toDateString();
      const dayMins = state.focusHistory
        .filter(s => new Date(s.startTime).toDateString() === dateStr)
        .reduce((sum, s) => sum + s.actualDuration, 0);
      data.push({
        label: period === 'day' ? '今天' : `${date.getMonth() + 1}/${date.getDate()}`,
        value: dayMins,
      });
    }
    return data;
  }, [state.focusHistory, period]);

  const maxVal = Math.max(...dailyData.map(d => d.value), 1);

  const buildingStats = useMemo(() => {
    const counts: Record<string, number> = {};
    state.buildings.forEach(b => { counts[b.type] = (counts[b.type] || 0) + 1; });
    return Object.entries(counts).map(([type, count]) => ({
      type: type as BuildingType, name: BUILDING_NAMES[type as BuildingType], count,
    }));
  }, [state.buildings]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F5F9F0', Colors.background]} style={[styles.bg, { paddingTop: insets.top + webTopInset }]}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Text style={styles.headerTitle}>数据统计</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.periodRow}>
          {(['day', 'week', 'month'] as Period[]).map(p => (
            <Pressable key={p} style={[styles.periodBtn, period === p && styles.periodActive]} onPress={() => setPeriod(p)}>
              {period === p ? (
                <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.periodGrad}>
                  <Text style={styles.periodTextActive}>
                    {p === 'day' ? '今日' : p === 'week' ? '本周' : '本月'}
                  </Text>
                </LinearGradient>
              ) : (
                <Text style={styles.periodText}>
                  {p === 'day' ? '今日' : p === 'week' ? '本周' : '本月'}
                </Text>
              )}
            </Pressable>
          ))}
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          <Animated.View entering={FadeInDown.duration(400).delay(150)} style={styles.summaryCards}>
            {[
              { icon: 'clock', iconColor: Colors.primary, bg: Colors.primarySoft, value: `${totalMinutes}`, label: '总分钟', family: 'feather' },
              { icon: 'diamond', iconColor: Colors.diamondGlow, bg: Colors.diamondSoft, value: `${totalDiamonds}`, label: '获得砖石', family: 'ionicons' },
              { icon: 'bar-chart-2', iconColor: Colors.goldDark, bg: Colors.goldSoft, value: `${avgDuration}`, label: '平均时长', family: 'feather' },
            ].map((item, i) => (
              <View key={i} style={styles.summaryItem}>
                <View style={[styles.summaryIconWrap, { backgroundColor: item.bg }]}>
                  {item.family === 'feather'
                    ? <Feather name={item.icon as any} size={18} color={item.iconColor} />
                    : <Ionicons name={item.icon as any} size={18} color={item.iconColor} />
                  }
                </View>
                <Text style={styles.summaryVal}>{item.value}</Text>
                <Text style={styles.summaryLbl}>{item.label}</Text>
              </View>
            ))}
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(250)} style={styles.chartBox}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>专注趋势</Text>
              <Text style={styles.chartSub}>{totalSessions} 次专注</Text>
            </View>
            <View style={styles.chart}>
              {dailyData.map((d, i) => {
                const h = Math.max(6, (d.value / maxVal) * 100);
                return (
                  <View key={i} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      {d.value > 0 ? (
                        <LinearGradient
                          colors={[Colors.primaryLight, Colors.primary]}
                          style={[styles.barFill, { height: `${h}%` }]}
                        />
                      ) : (
                        <View style={[styles.barFill, { height: `${h}%`, backgroundColor: Colors.border }]} />
                      )}
                    </View>
                    {(period !== 'month' || i % 5 === 0 || i === dailyData.length - 1) && (
                      <Text style={styles.barLbl}>{d.label}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(350)} style={styles.chartBox}>
            <Text style={styles.chartTitle}>建筑分布</Text>
            {buildingStats.length === 0 ? (
              <View style={styles.emptyRow}>
                <Feather name="inbox" size={24} color={Colors.textMuted} />
                <Text style={styles.emptyText}>暂无建筑</Text>
              </View>
            ) : (
              buildingStats.map(bs => {
                const icon = BUILDING_ICON_MAP[bs.type];
                return (
                  <View key={bs.type} style={styles.bldgRow}>
                    <View style={styles.bldgIcon}>
                      {icon.family === 'ionicons'
                        ? <Ionicons name={icon.name as any} size={16} color={Colors.primary} />
                        : <Feather name={icon.name as any} size={16} color={Colors.primary} />
                      }
                    </View>
                    <Text style={styles.bldgName}>{bs.name}</Text>
                    <View style={styles.bldgBarOuter}>
                      <LinearGradient
                        colors={[Colors.primaryLight, Colors.primary]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={[styles.bldgBarInner, { width: `${(bs.count / state.buildings.length) * 100}%` }]}
                      />
                    </View>
                    <Text style={styles.bldgCount}>{bs.count}</Text>
                  </View>
                );
              })
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(450)} style={styles.chartBox}>
            <Text style={styles.chartTitle}>最近记录</Text>
            {filteredSessions.length === 0 ? (
              <View style={styles.emptyRow}>
                <Feather name="clock" size={24} color={Colors.textMuted} />
                <Text style={styles.emptyText}>暂无专注记录</Text>
              </View>
            ) : (
              filteredSessions.slice(0, 8).map((s, i) => (
                <View key={s.id} style={[styles.histRow, i === 0 && { borderTopWidth: 0 }]}>
                  <View style={styles.histDot} />
                  <View style={styles.histInfo}>
                    <Text style={styles.histDur}>{s.actualDuration} 分钟</Text>
                    <Text style={styles.histDate}>
                      {new Date(s.startTime).toLocaleDateString('zh-CN', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <View style={styles.histReward}>
                    <Ionicons name="diamond" size={12} color={Colors.diamondGlow} />
                    <Text style={styles.histDiam}>+{s.diamondsEarned}</Text>
                  </View>
                </View>
              ))
            )}
          </Animated.View>

          <View style={{ height: Platform.OS === 'web' ? 94 : 100 }} />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 28, color: Colors.text },
  periodRow: { flexDirection: 'row', marginHorizontal: 20, gap: 8, marginBottom: 16 },
  periodBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  periodActive: {},
  periodGrad: { alignItems: 'center', paddingVertical: 10, borderRadius: 14 },
  periodText: {
    fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: Colors.textMuted, textAlign: 'center',
    paddingVertical: 10, backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border,
  },
  periodTextActive: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: '#fff' },
  scroll: { paddingHorizontal: 20 },
  summaryCards: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryItem: {
    flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 14, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  summaryIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  summaryVal: { fontFamily: 'RobotoMono_700Bold', fontSize: 20, color: Colors.text },
  summaryLbl: { fontFamily: 'Nunito_400Regular', fontSize: 10, color: Colors.textMuted },
  chartBox: {
    backgroundColor: '#fff', borderRadius: 22, padding: 20, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  chartTitle: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: Colors.text },
  chartSub: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: Colors.textMuted },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 3 },
  barCol: { flex: 1, alignItems: 'center', height: '100%' },
  barTrack: { flex: 1, width: '75%', justifyContent: 'flex-end', borderRadius: 4, overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 4, minHeight: 6 },
  barLbl: { fontFamily: 'Nunito_400Regular', fontSize: 9, color: Colors.textMuted, marginTop: 6 },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', paddingVertical: 24 },
  emptyText: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: Colors.textMuted },
  bldgRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  bldgIcon: {
    width: 30, height: 30, borderRadius: 10, backgroundColor: Colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  bldgName: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: Colors.text, width: 44 },
  bldgBarOuter: { flex: 1, height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  bldgBarInner: { height: 8, borderRadius: 4 },
  bldgCount: { fontFamily: 'RobotoMono_700Bold', fontSize: 14, color: Colors.text, width: 24, textAlign: 'right' },
  histRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  histDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
  histInfo: { flex: 1 },
  histDur: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, color: Colors.text },
  histDate: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  histReward: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.diamondSoft, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
  },
  histDiam: { fontFamily: 'RobotoMono_700Bold', fontSize: 13, color: Colors.diamondGlow },
});
