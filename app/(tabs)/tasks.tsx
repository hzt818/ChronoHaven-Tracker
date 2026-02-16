import React, { useState } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useGame } from '@/lib/game-state';

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const { state, claimTask } = useGame();
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const tasks = state.tasks.filter(t => t.type === activeTab);

  const handleClaim = (taskId: string) => {
    claimTask(taskId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Text style={styles.headerTitle}>任务中心</Text>
        <View style={styles.diamondBadge}>
          <Ionicons name="diamond" size={14} color={Colors.diamond} />
          <Text style={styles.diamondText}>{state.diamonds}</Text>
        </View>
      </Animated.View>

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tab, activeTab === 'daily' && styles.tabActive]}
          onPress={() => setActiveTab('daily')}
        >
          <Text style={[styles.tabText, activeTab === 'daily' && styles.tabTextActive]}>每日任务</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'weekly' && styles.tabActive]}
          onPress={() => setActiveTab('weekly')}
        >
          <Text style={[styles.tabText, activeTab === 'weekly' && styles.tabTextActive]}>周常挑战</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="check-circle" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>暂无任务</Text>
          </View>
        ) : (
          tasks.map((task, index) => (
            <Animated.View
              key={task.id}
              entering={FadeInDown.duration(300).delay(index * 80)}
              style={[
                styles.taskCard,
                task.status === 'claimed' && styles.taskCardClaimed,
              ]}
            >
              <View style={styles.taskLeft}>
                <View style={[
                  styles.taskIcon,
                  {
                    backgroundColor: task.status === 'claimed'
                      ? Colors.success + '15'
                      : task.status === 'completed'
                        ? Colors.gold + '20'
                        : Colors.primary + '10',
                  },
                ]}>
                  <Feather
                    name={task.icon as any}
                    size={20}
                    color={task.status === 'claimed' ? Colors.success : task.status === 'completed' ? Colors.goldDark : Colors.primary}
                  />
                </View>
                <View style={styles.taskInfo}>
                  <Text style={[styles.taskName, task.status === 'claimed' && styles.taskNameClaimed]}>
                    {task.name}
                  </Text>
                  <Text style={styles.taskDesc}>{task.description}</Text>
                  <View style={styles.progressBarOuter}>
                    <View
                      style={[
                        styles.progressBarInner,
                        {
                          width: `${Math.min(100, (task.progress / task.target) * 100)}%`,
                          backgroundColor: task.status === 'claimed' ? Colors.success : Colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {task.progress}/{task.target}
                  </Text>
                </View>
              </View>
              <View style={styles.taskRight}>
                <View style={styles.rewardBadge}>
                  <Ionicons name="diamond" size={12} color={Colors.diamond} />
                  <Text style={styles.rewardAmount}>{task.rewardDiamonds}</Text>
                </View>
                {task.status === 'completed' ? (
                  <Pressable
                    style={({ pressed }) => [styles.claimBtn, { transform: [{ scale: pressed ? 0.93 : 1 }] }]}
                    onPress={() => handleClaim(task.id)}
                  >
                    <Text style={styles.claimBtnText}>领取</Text>
                  </Pressable>
                ) : task.status === 'claimed' ? (
                  <View style={styles.claimedBadge}>
                    <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                  </View>
                ) : null}
              </View>
            </Animated.View>
          ))
        )}
        <View style={{ height: Platform.OS === 'web' ? 94 : 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 28, color: Colors.text },
  diamondBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  diamondText: { fontFamily: 'RobotoMono_700Bold', fontSize: 14, color: Colors.text },
  tabRow: {
    flexDirection: 'row', marginHorizontal: 20, gap: 8, marginBottom: 16,
  },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 14,
    backgroundColor: Colors.surface, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  tabActive: {
    backgroundColor: Colors.primary, borderColor: Colors.primary,
  },
  tabText: { fontFamily: 'Nunito_600SemiBold', fontSize: 15, color: Colors.textSecondary },
  tabTextActive: { color: Colors.textOnPrimary },
  listContent: { paddingHorizontal: 20 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontFamily: 'Nunito_400Regular', fontSize: 16, color: Colors.textMuted },
  taskCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 18, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  taskCardClaimed: { opacity: 0.6 },
  taskLeft: { flexDirection: 'row', flex: 1, gap: 12, alignItems: 'flex-start' },
  taskIcon: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  taskInfo: { flex: 1 },
  taskName: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: Colors.text },
  taskNameClaimed: { textDecorationLine: 'line-through', color: Colors.textMuted },
  taskDesc: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  progressBarOuter: {
    height: 4, backgroundColor: Colors.border, borderRadius: 2, marginTop: 8,
  },
  progressBarInner: {
    height: 4, borderRadius: 2,
  },
  progressText: {
    fontFamily: 'RobotoMono_400Regular', fontSize: 11, color: Colors.textMuted, marginTop: 4,
  },
  taskRight: { alignItems: 'flex-end', gap: 8, marginLeft: 12 },
  rewardBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.diamond + '15', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4,
  },
  rewardAmount: { fontFamily: 'RobotoMono_700Bold', fontSize: 12, color: Colors.diamond },
  claimBtn: {
    backgroundColor: Colors.gold, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8,
  },
  claimBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: Colors.textOnGold },
  claimedBadge: { padding: 4 },
});
