import React, { useState } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView, Platform, TextInput, Alert, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
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

  const handleSaveName = () => {
    if (newName.trim().length === 0) {
      Alert.alert('请输入昵称');
      return;
    }
    setNickname(newName.trim());
    setShowEditName(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const daysSinceCreation = Math.floor(
    (new Date().getTime() - new Date(state.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Text style={styles.headerTitle}>我的</Text>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={36} color={Colors.primary} />
            </View>
            <View style={styles.levelRing}>
              <Text style={styles.levelRingText}>{state.level}</Text>
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Pressable style={styles.nameRow} onPress={() => setShowEditName(true)}>
              <Text style={styles.profileName}>{state.nickname}</Text>
              <Feather name="edit-2" size={14} color={Colors.textMuted} />
            </Pressable>
            <Text style={styles.profileSub}>岛龄 {daysSinceCreation} 天</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.expCard}>
          <View style={styles.expHeader}>
            <Text style={styles.expLabel}>经验进度</Text>
            <Text style={styles.expValue}>Lv.{state.level}</Text>
          </View>
          <View style={styles.expBarOuter}>
            <View style={[styles.expBarInner, { width: `${expProgress * 100}%` }]} />
          </View>
          <Text style={styles.expText}>{state.exp} / {expNeeded}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Ionicons name="diamond" size={24} color={Colors.diamond} />
            <Text style={styles.statValue}>{state.diamonds}</Text>
            <Text style={styles.statLabel}>砖石</Text>
          </View>
          <View style={styles.statBox}>
            <Feather name="clock" size={24} color={Colors.primary} />
            <Text style={styles.statValue}>{state.totalFocusMinutes}</Text>
            <Text style={styles.statLabel}>总专注(分钟)</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="home" size={24} color={Colors.building.house} />
            <Text style={styles.statValue}>{state.buildings.length}</Text>
            <Text style={styles.statLabel}>建筑数</Text>
          </View>
          <View style={styles.statBox}>
            <Feather name="activity" size={24} color={Colors.gold} />
            <Text style={styles.statValue}>{state.focusHistory.length}</Text>
            <Text style={styles.statLabel}>专注次数</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(400)} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>岛屿概览</Text>
          {state.buildings.length === 0 ? (
            <Text style={styles.emptyText}>还没有建筑</Text>
          ) : (
            <>
              {(Object.keys(BUILDING_NAMES) as BuildingType[]).map(type => {
                const count = state.buildings.filter(b => b.type === type).length;
                if (count === 0) return null;
                const maxLevel = Math.max(...state.buildings.filter(b => b.type === type).map(b => b.level));
                return (
                  <View key={type} style={styles.islandRow}>
                    <Text style={styles.islandRowName}>{BUILDING_NAMES[type]}</Text>
                    <Text style={styles.islandRowCount}>{count} 座</Text>
                    <Text style={styles.islandRowLevel}>最高 Lv.{maxLevel}</Text>
                  </View>
                );
              })}
            </>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(500)} style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>等级奖励</Text>
          {[5, 10, 15, 20, 30].map(lvl => (
            <View key={lvl} style={styles.rewardRow}>
              <View style={[
                styles.rewardLevelBadge,
                state.level >= lvl && { backgroundColor: Colors.primary },
              ]}>
                <Text style={[styles.rewardLevelText, state.level >= lvl && { color: '#fff' }]}>
                  {lvl}
                </Text>
              </View>
              <Text style={styles.rewardText}>
                {lvl === 5 ? '解锁风车建筑' :
                 lvl === 10 ? '解锁灯塔建筑' :
                 lvl === 15 ? '砖石产出+20%' :
                 lvl === 20 ? '解锁新岛屿区域' :
                 '大师称号'}
              </Text>
              {state.level >= lvl && <Ionicons name="checkmark-circle" size={18} color={Colors.success} />}
            </View>
          ))}
        </Animated.View>

        <View style={{ height: Platform.OS === 'web' ? 94 : 100 }} />
      </ScrollView>

      <Modal visible={showEditName} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowEditName(false)}>
          <Pressable style={styles.editNameContainer} onPress={() => {}}>
            <Text style={styles.editNameTitle}>修改昵称</Text>
            <TextInput
              style={styles.editNameInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="输入新昵称"
              maxLength={12}
              autoFocus
            />
            <View style={styles.editNameActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setShowEditName(false)}>
                <Text style={styles.cancelBtnText}>取消</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleSaveName}>
                <Text style={styles.saveBtnText}>保存</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 28, color: Colors.text },
  scrollContent: { paddingHorizontal: 20 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: Colors.surface, borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: Colors.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  levelRing: {
    position: 'absolute', bottom: -4, right: -4,
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.surface,
  },
  levelRingText: { fontFamily: 'Nunito_700Bold', fontSize: 11, color: '#fff' },
  profileInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileName: { fontFamily: 'Nunito_800ExtraBold', fontSize: 22, color: Colors.text },
  profileSub: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  expCard: {
    backgroundColor: Colors.surface, borderRadius: 18, padding: 18, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  expHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  expLabel: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: Colors.textSecondary },
  expValue: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: Colors.primary },
  expBarOuter: { height: 8, backgroundColor: Colors.border, borderRadius: 4 },
  expBarInner: { height: 8, backgroundColor: Colors.exp, borderRadius: 4 },
  expText: { fontFamily: 'RobotoMono_400Regular', fontSize: 12, color: Colors.textMuted, marginTop: 6, textAlign: 'right' },
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16,
  },
  statBox: {
    width: '48%', flexGrow: 1, flexBasis: '45%',
    backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.border,
  },
  statValue: { fontFamily: 'RobotoMono_700Bold', fontSize: 20, color: Colors.text },
  statLabel: { fontFamily: 'Nunito_400Regular', fontSize: 11, color: Colors.textSecondary },
  sectionCard: {
    backgroundColor: Colors.surface, borderRadius: 18, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  sectionTitle: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: Colors.text, marginBottom: 14 },
  emptyText: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: Colors.textMuted },
  islandRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  islandRowName: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: Colors.text, flex: 1 },
  islandRowCount: { fontFamily: 'RobotoMono_400Regular', fontSize: 13, color: Colors.textSecondary, marginRight: 16 },
  islandRowLevel: { fontFamily: 'RobotoMono_400Regular', fontSize: 13, color: Colors.primary },
  rewardRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  rewardLevelBadge: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  rewardLevelText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: Colors.textMuted },
  rewardText: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: Colors.text, flex: 1 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center',
  },
  editNameContainer: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 24, width: 300,
  },
  editNameTitle: { fontFamily: 'Nunito_700Bold', fontSize: 18, color: Colors.text, marginBottom: 16, textAlign: 'center' },
  editNameInput: {
    fontFamily: 'Nunito_400Regular', fontSize: 16, color: Colors.text,
    backgroundColor: Colors.background, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 16,
  },
  editNameActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.border, alignItems: 'center',
  },
  cancelBtnText: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: Colors.textSecondary },
  saveBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center',
  },
  saveBtnText: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: Colors.textOnPrimary },
});
