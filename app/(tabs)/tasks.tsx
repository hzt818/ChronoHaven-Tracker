import React, { useState } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useGame } from '@/lib/game-state';

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { state, claimTask } = useGame();
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const tasks = state.tasks.filter(t => t.type === activeTab);
  const completedCount = tasks.filter(t => t.status === 'claimed').length;

  const handleClaim = (taskId: string) => {
    claimTask(taskId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F5F9F0', Colors.background]} style={[styles.bg, { paddingTop: insets.top + webTopInset }]}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>任务中心</Text>
            <Text style={styles.headerSub}>完成任务获取砖石和经验</Text>
          </View>
          <View style={styles.diamondPill}>
            <View style={styles.diamondGlow}>
              <Ionicons name="diamond" size={14} color={Colors.diamondGlow} />
            </View>
            <Text style={styles.diamondText}>{state.diamonds}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.tabContainer}>
          <Pressable
            style={[styles.tabBtn, activeTab === 'daily' && styles.tabBtnActive]}
            onPress={() => setActiveTab('daily')}
          >
            {activeTab === 'daily' ? (
              <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.tabGradient}>
                <Ionicons name="today" size={16} color="#fff" />
                <Text style={styles.tabTextActive}>每日任务</Text>
              </LinearGradient>
            ) : (
              <View style={styles.tabInner}>
                <Ionicons name="today-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.tabText}>每日任务</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={[styles.tabBtn, activeTab === 'weekly' && styles.tabBtnActive]}
            onPress={() => setActiveTab('weekly')}
          >
            {activeTab === 'weekly' ? (
              <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.tabGradient}>
                <Ionicons name="calendar" size={16} color="#fff" />
                <Text style={styles.tabTextActive}>周常挑战</Text>
              </LinearGradient>
            ) : (
              <View style={styles.tabInner}>
                <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.tabText}>周常挑战</Text>
              </View>
            )}
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(150)} style={styles.progressSummary}>
          <View style={styles.progressLeft}>
            <Text style={styles.progressLabel}>完成进度</Text>
            <Text style={styles.progressCount}>{completedCount}/{tasks.length}</Text>
          </View>
          <View style={styles.progressBarOuter}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryLight]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.progressBarInner, { width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%` }]}
            />
          </View>
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          {tasks.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="check-circle" size={40} color={Colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>暂无任务</Text>
              <Text style={styles.emptyDesc}>请稍后再来查看</Text>
            </View>
          ) : (
            tasks.map((task, index) => {
              const progressPct = Math.min(100, (task.progress / task.target) * 100);
              return (
                <Animated.View
                  key={task.id}
                  entering={FadeInDown.duration(350).delay(200 + index * 70)}
                >
                  <View style={[styles.taskCard, task.status === 'claimed' && styles.taskCardDone]}>
                    <View style={styles.taskTop}>
                      <View style={[
                        styles.taskIconBox,
                        {
                          backgroundColor: task.status === 'claimed'
                            ? Colors.success + '12'
                            : task.status === 'completed'
                              ? Colors.goldSoft
                              : Colors.primarySoft,
                        },
                      ]}>
                        <Feather
                          name={task.icon as any}
                          size={20}
                          color={
                            task.status === 'claimed' ? Colors.success
                            : task.status === 'completed' ? Colors.goldDark
                            : Colors.primary
                          }
                        />
                      </View>
                      <View style={styles.taskMeta}>
                        <Text style={[styles.taskName, task.status === 'claimed' && styles.taskNameDone]}>
                          {task.name}
                        </Text>
                        <Text style={styles.taskDesc}>{task.description}</Text>
                      </View>
                      <View style={styles.taskReward}>
                        <View style={styles.rewardRow}>
                          <Ionicons name="diamond" size={11} color={Colors.diamondGlow} />
                          <Text style={styles.rewardNum}>{task.rewardDiamonds}</Text>
                        </View>
                        <View style={styles.rewardRow}>
                          <Ionicons name="star" size={11} color={Colors.exp} />
                          <Text style={[styles.rewardNum, { color: Colors.exp }]}>{task.rewardExp}</Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.taskBottom}>
                      <View style={styles.taskProgressOuter}>
                        <View style={[
                          styles.taskProgressInner,
                          {
                            width: `${progressPct}%`,
                            backgroundColor: task.status === 'claimed'
                              ? Colors.success
                              : task.status === 'completed'
                                ? Colors.gold
                                : Colors.primary,
                          },
                        ]} />
                      </View>
                      <Text style={styles.taskProgressText}>
                        {task.progress}/{task.target}
                      </Text>
                      {task.status === 'completed' && (
                        <Pressable
                          onPress={() => handleClaim(task.id)}
                          style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.9 : 1 }] }]}
                        >
                          <LinearGradient colors={[Colors.gold, Colors.goldDark]} style={styles.claimPill}>
                            <Text style={styles.claimText}>领取</Text>
                          </LinearGradient>
                        </Pressable>
                      )}
                      {task.status === 'claimed' && (
                        <Animated.View entering={ZoomIn.duration(300)}>
                          <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                        </Animated.View>
                      )}
                    </View>
                  </View>
                </Animated.View>
              );
            })
          )}
          <View style={{ height: Platform.OS === 'web' ? 94 : 100 }} />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 28, color: Colors.text },
  headerSub: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  diamondPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.diamondSoft,
    shadowColor: Colors.diamond, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 2,
  },
  diamondGlow: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.diamondSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  diamondText: { fontFamily: 'RobotoMono_700Bold', fontSize: 15, color: Colors.text },
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, gap: 10, marginBottom: 14 },
  tabBtn: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  tabBtnActive: {},
  tabGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 16,
  },
  tabInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  tabText: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: Colors.textMuted },
  tabTextActive: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: '#fff' },
  progressSummary: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 16, gap: 12,
  },
  progressLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  progressLabel: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: Colors.textMuted },
  progressCount: { fontFamily: 'RobotoMono_700Bold', fontSize: 13, color: Colors.primary },
  progressBarOuter: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  progressBarInner: { height: 6, borderRadius: 3 },
  listContent: { paddingHorizontal: 20 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: Colors.border + '40',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyTitle: { fontFamily: 'Nunito_700Bold', fontSize: 18, color: Colors.textSecondary },
  emptyDesc: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: Colors.textMuted },
  taskCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  taskCardDone: { opacity: 0.55 },
  taskTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  taskIconBox: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  taskMeta: { flex: 1 },
  taskName: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: Colors.text },
  taskNameDone: { textDecorationLine: 'line-through', color: Colors.textMuted },
  taskDesc: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  taskReward: { gap: 4 },
  rewardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.diamondSoft, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3,
  },
  rewardNum: { fontFamily: 'RobotoMono_700Bold', fontSize: 11, color: Colors.diamondGlow },
  taskBottom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskProgressOuter: { flex: 1, height: 5, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  taskProgressInner: { height: 5, borderRadius: 3 },
  taskProgressText: { fontFamily: 'RobotoMono_400Regular', fontSize: 11, color: Colors.textMuted, width: 45, textAlign: 'right' },
  claimPill: {
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 7,
  },
  claimText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#fff' },
});
