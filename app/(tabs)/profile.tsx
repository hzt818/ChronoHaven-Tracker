import React, { useState } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView, Platform, TextInput, Alert, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useGame, expForLevel, BUILDING_NAMES, BuildingType } from '@/lib/game-state';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { state, setNickname } = useGame();
  const [showEditName, setShowEditName] = useState(false);
  const [newName, setNewName] = useState(state.nickname);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const expNeeded = expForLevel(state.level);
  const expProgress = expNeeded > 0 ? state.exp / expNeeded : 0;
  const daysSinceCreation = Math.floor(
    (Date.now() - new Date(state.createdAt).getTime()) / 86400000
  );

  const handleSaveName = () => {
    if (newName.trim().length === 0) { Alert.alert('请输入昵称'); return; }
    setNickname(newName.trim());
    setShowEditName(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const milestones = [
    { lvl: 5, reward: '解锁风车建筑', icon: 'wind' },
    { lvl: 10, reward: '解锁灯塔建筑', icon: 'sunrise' },
    { lvl: 15, reward: '砖石产出 +20%', icon: 'trending-up' },
    { lvl: 20, reward: '解锁新岛屿区域', icon: 'map' },
    { lvl: 30, reward: '大师称号', icon: 'award' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#E8F5E9', Colors.background]} style={[styles.bg, { paddingTop: insets.top + webTopInset }]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          <Animated.View entering={FadeInDown.duration(500)}>
            <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.profileHero}>
              <View style={styles.avatarRing}>
                <View style={styles.avatar}>
                  <Ionicons name="person" size={40} color={Colors.primary} />
                </View>
                <View style={styles.levelCircle}>
                  <Text style={styles.levelCircleText}>{state.level}</Text>
                </View>
              </View>
              <Pressable style={styles.nameRow} onPress={() => { setNewName(state.nickname); setShowEditName(true); }}>
                <Text style={styles.heroName}>{state.nickname}</Text>
                <Feather name="edit-2" size={14} color="rgba(255,255,255,0.7)" />
              </Pressable>
              <Text style={styles.heroSub}>岛龄 {daysSinceCreation} 天</Text>
              <View style={styles.expContainer}>
                <View style={styles.expRow}>
                  <Text style={styles.expLabel}>EXP</Text>
                  <Text style={styles.expNums}>{state.exp} / {expNeeded}</Text>
                </View>
                <View style={styles.expBarOuter}>
                  <View style={[styles.expBarInner, { width: `${expProgress * 100}%` }]} />
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(150)} style={styles.statsRow}>
            {[
              { icon: 'diamond', color: Colors.diamondGlow, bg: Colors.diamondSoft, value: state.diamonds, label: '砖石', family: 'ionicons' },
              { icon: 'clock', color: Colors.primary, bg: Colors.primarySoft, value: state.totalFocusMinutes, label: '专注(分)', family: 'feather' },
              { icon: 'home', color: Colors.building.house, bg: '#EFEBE9', value: state.buildings.length, label: '建筑', family: 'ionicons' },
              { icon: 'activity', color: Colors.goldDark, bg: Colors.goldSoft, value: state.focusHistory.length, label: '次数', family: 'feather' },
            ].map((item, i) => (
              <View key={i} style={styles.statBox}>
                <View style={[styles.statIcon, { backgroundColor: item.bg }]}>
                  {item.family === 'feather'
                    ? <Feather name={item.icon as any} size={18} color={item.color} />
                    : <Ionicons name={item.icon as any} size={18} color={item.color} />
                  }
                </View>
                <Text style={styles.statVal}>{item.value}</Text>
                <Text style={styles.statLbl}>{item.label}</Text>
              </View>
            ))}
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(250)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="map" size={16} color={Colors.primary} />
              <Text style={styles.sectionTitle}>岛屿概览</Text>
            </View>
            {state.buildings.length === 0 ? (
              <View style={styles.emptyRow}>
                <Feather name="inbox" size={22} color={Colors.textMuted} />
                <Text style={styles.emptyText}>还没有建筑，去建造吧</Text>
              </View>
            ) : (
              (Object.keys(BUILDING_NAMES) as BuildingType[]).map(type => {
                const bs = state.buildings.filter(b => b.type === type);
                if (bs.length === 0) return null;
                const maxLvl = Math.max(...bs.map(b => b.level));
                return (
                  <View key={type} style={styles.islandRow}>
                    <Text style={styles.islandName}>{BUILDING_NAMES[type]}</Text>
                    <View style={styles.islandBadges}>
                      <View style={styles.islandBadge}>
                        <Text style={styles.islandBadgeText}>{bs.length} 座</Text>
                      </View>
                      <View style={[styles.islandBadge, { backgroundColor: Colors.primarySoft }]}>
                        <Text style={[styles.islandBadgeText, { color: Colors.primary }]}>Lv.{maxLvl}</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(350)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="award" size={16} color={Colors.goldDark} />
              <Text style={styles.sectionTitle}>等级里程碑</Text>
            </View>
            {milestones.map((m, i) => {
              const unlocked = state.level >= m.lvl;
              return (
                <View key={i} style={styles.milestoneRow}>
                  <View style={[styles.milestoneBadge, unlocked && styles.milestoneBadgeUnlocked]}>
                    {unlocked ? (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    ) : (
                      <Text style={styles.milestoneNum}>{m.lvl}</Text>
                    )}
                  </View>
                  <View style={styles.milestoneLine} />
                  <View style={styles.milestoneInfo}>
                    <View style={[styles.milestoneIconWrap, unlocked && { backgroundColor: Colors.primarySoft }]}>
                      <Feather name={m.icon as any} size={16} color={unlocked ? Colors.primary : Colors.textMuted} />
                    </View>
                    <Text style={[styles.milestoneText, unlocked && styles.milestoneTextUnlocked]}>
                      {m.reward}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Animated.View>

          <View style={{ height: Platform.OS === 'web' ? 94 : 100 }} />
        </ScrollView>
      </LinearGradient>

      <Modal visible={showEditName} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setShowEditName(false)}>
          <Pressable style={styles.editSheet} onPress={() => {}}>
            <Text style={styles.editTitle}>修改昵称</Text>
            <TextInput
              style={styles.editInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="输入新昵称"
              placeholderTextColor={Colors.textMuted}
              maxLength={12}
              autoFocus
            />
            <View style={styles.editActions}>
              <Pressable style={styles.editCancel} onPress={() => setShowEditName(false)}>
                <Text style={styles.editCancelText}>取消</Text>
              </Pressable>
              <Pressable onPress={handleSaveName} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
                <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.editSave}>
                  <Text style={styles.editSaveText}>保存</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { flex: 1 },
  scroll: { paddingBottom: 20 },
  profileHero: {
    alignItems: 'center', paddingTop: 30, paddingBottom: 28, paddingHorizontal: 24,
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
    marginBottom: 16,
  },
  avatarRing: { position: 'relative', marginBottom: 14 },
  avatar: {
    width: 84, height: 84, borderRadius: 28, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 4,
  },
  levelCircle: {
    position: 'absolute', bottom: -6, right: -6,
    width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.gold,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.primary,
  },
  levelCircleText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 13, color: '#fff' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  heroName: { fontFamily: 'Nunito_800ExtraBold', fontSize: 24, color: '#fff' },
  heroSub: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 18 },
  expContainer: { width: '100%', maxWidth: 280 },
  expRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  expLabel: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  expNums: { fontFamily: 'RobotoMono_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  expBarOuter: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4 },
  expBarInner: { height: 8, backgroundColor: Colors.goldLight, borderRadius: 4 },
  statsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, marginBottom: 16,
  },
  statBox: {
    width: '47%', flexGrow: 1, flexBasis: '44%',
    backgroundColor: '#fff', borderRadius: 18, padding: 16, alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  statIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statVal: { fontFamily: 'RobotoMono_700Bold', fontSize: 20, color: Colors.text },
  statLbl: { fontFamily: 'Nunito_400Regular', fontSize: 11, color: Colors.textMuted },
  section: {
    backgroundColor: '#fff', borderRadius: 22, padding: 20, marginHorizontal: 20, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  sectionTitle: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: Colors.text },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', paddingVertical: 20 },
  emptyText: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: Colors.textMuted },
  islandRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  islandName: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: Colors.text },
  islandBadges: { flexDirection: 'row', gap: 6 },
  islandBadge: {
    backgroundColor: Colors.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  islandBadgeText: { fontFamily: 'RobotoMono_400Regular', fontSize: 11, color: Colors.textSecondary },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  milestoneBadge: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  milestoneBadgeUnlocked: { backgroundColor: Colors.success },
  milestoneNum: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: Colors.textMuted },
  milestoneLine: { width: 1, height: 20, backgroundColor: Colors.border, position: 'absolute', left: 15, top: 30, zIndex: -1 },
  milestoneInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  milestoneIconWrap: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.border + '50',
    alignItems: 'center', justifyContent: 'center',
  },
  milestoneText: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: Colors.textMuted },
  milestoneTextUnlocked: { color: Colors.text, fontFamily: 'Nunito_600SemiBold' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  editSheet: {
    backgroundColor: '#fff', borderRadius: 24, padding: 28, width: 300,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8,
  },
  editTitle: { fontFamily: 'Nunito_700Bold', fontSize: 20, color: Colors.text, marginBottom: 20, textAlign: 'center' },
  editInput: {
    fontFamily: 'Nunito_400Regular', fontSize: 16, color: Colors.text,
    backgroundColor: Colors.background, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 20,
  },
  editActions: { flexDirection: 'row', gap: 12 },
  editCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.border, alignItems: 'center',
  },
  editCancelText: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: Colors.textSecondary },
  editSave: {
    flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', minWidth: 120,
  },
  editSaveText: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: '#fff' },
});
