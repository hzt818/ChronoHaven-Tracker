import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView, Platform, Alert, Modal, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useGame, BuildingType, BUILDING_COSTS, BUILDING_NAMES, BUILDING_DAILY_PRODUCTION, BUILDING_UPGRADE_COSTS, Building } from '@/lib/game-state';

const GRID_SIZE = 6;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CELL_SIZE = Math.min(50, (SCREEN_WIDTH - 80) / GRID_SIZE);

const BUILDING_ICONS: Record<BuildingType, { family: 'ionicons' | 'material'; name: string }> = {
  house: { family: 'ionicons', name: 'home' },
  windmill: { family: 'material', name: 'wind-turbine' },
  lighthouse: { family: 'material', name: 'lighthouse' },
  tree: { family: 'ionicons', name: 'leaf' },
  road: { family: 'material', name: 'road-variant' },
};

const BUILDING_GRADIENT: Record<BuildingType, [string, string]> = {
  house: ['#A1887F', '#8D6E63'],
  windmill: ['#90A4AE', '#607D8B'],
  lighthouse: ['#FFF176', '#FBC02D'],
  tree: ['#81C784', '#388E3C'],
  road: ['#B0BEC5', '#78909C'],
};

function BuildingIcon({ type, size }: { type: BuildingType; size: number }) {
  const icon = BUILDING_ICONS[type];
  const color = BUILDING_GRADIENT[type][1];
  if (icon.family === 'ionicons') {
    return <Ionicons name={icon.name as any} size={size} color={color} />;
  }
  return <MaterialCommunityIcons name={icon.name as any} size={size} color={color} />;
}

function GridCell({ x, y, building, onPress, isPlacing }: {
  x: number; y: number; building?: Building; onPress: () => void;
  isPlacing: boolean;
}) {
  const isEdge = x === 0 || y === 0 || x === GRID_SIZE - 1 || y === GRID_SIZE - 1;
  const hasBuilding = !!building;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cell,
        {
          width: CELL_SIZE,
          height: CELL_SIZE,
          backgroundColor: hasBuilding
            ? BUILDING_GRADIENT[building!.type][0] + '25'
            : isEdge
              ? Colors.island.grassLight
              : Colors.island.grass + '35',
          borderColor: isPlacing && !hasBuilding
            ? Colors.gold + '90'
            : hasBuilding
              ? BUILDING_GRADIENT[building!.type][0] + '40'
              : Colors.island.grass + '30',
          transform: [{ scale: pressed ? 0.88 : 1 }],
        },
      ]}
    >
      {hasBuilding ? (
        <View style={styles.buildingCell}>
          <BuildingIcon type={building!.type} size={CELL_SIZE * 0.42} />
          {building!.level > 1 && (
            <View style={styles.cellLevelBadge}>
              <Text style={styles.cellLevelText}>{building!.level}</Text>
            </View>
          )}
        </View>
      ) : isPlacing ? (
        <View style={styles.placeDot}>
          <Ionicons name="add" size={14} color={Colors.gold} />
        </View>
      ) : null}
    </Pressable>
  );
}

export default function IslandScreen() {
  const insets = useSafeAreaInsets();
  const { state, placeBuilding, upgradeBuilding, removeBuilding, collectBuildingIncome } = useGame();
  const [isPlacing, setIsPlacing] = useState(false);
  const [selectedType, setSelectedType] = useState<BuildingType | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [showBuildMenu, setShowBuildMenu] = useState(false);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const handleCellPress = useCallback((x: number, y: number) => {
    const existing = state.buildings.find(b => b.x === x && b.y === y);
    if (existing) {
      setSelectedBuilding(existing);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    if (isPlacing && selectedType) {
      const success = placeBuilding(selectedType, x, y);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsPlacing(false);
        setSelectedType(null);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('无法建造', '砖石不足或位置已被占用');
      }
    }
  }, [isPlacing, selectedType, state.buildings, placeBuilding]);

  const handleSelectBuildingType = (type: BuildingType) => {
    if (state.diamonds < BUILDING_COSTS[type]) {
      Alert.alert('砖石不足', `建造${BUILDING_NAMES[type]}需要 ${BUILDING_COSTS[type]} 砖石`);
      return;
    }
    setSelectedType(type);
    setIsPlacing(true);
    setShowBuildMenu(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleCollect = () => {
    const income = collectBuildingIncome();
    if (income > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('收获砖石', `收集了 ${income} 砖石!`);
    } else {
      Alert.alert('暂无收益', '建筑每小时产出一次砖石，请稍后再来');
    }
  };

  const handleUpgrade = () => {
    if (!selectedBuilding) return;
    const success = upgradeBuilding(selectedBuilding.id);
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedBuilding(null);
    } else {
      Alert.alert('砖石不足', '升级所需砖石不够');
    }
  };

  const handleRemove = () => {
    if (!selectedBuilding) return;
    const refund = Math.floor(BUILDING_COSTS[selectedBuilding.type] * 0.5);
    Alert.alert(
      '确认拆除',
      `拆除 ${BUILDING_NAMES[selectedBuilding.type]} Lv.${selectedBuilding.level}\n将退还 ${refund} 砖石`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '拆除',
          style: 'destructive',
          onPress: () => {
            removeBuilding(selectedBuilding.id);
            setSelectedBuilding(null);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          },
        },
      ]
    );
  };

  const upgradeCost = selectedBuilding
    ? BUILDING_UPGRADE_COSTS[selectedBuilding.type] * selectedBuilding.level
    : 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E8F5E9', Colors.background, '#F0F4EC']}
        style={[styles.gradientBg, { paddingTop: insets.top + webTopInset }]}
      >
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <View style={styles.headerLeft}>
            <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.levelPill}>
              <Ionicons name="star" size={12} color={Colors.goldLight} />
              <Text style={styles.levelText}>Lv.{state.level}</Text>
            </LinearGradient>
            <Text style={styles.nicknameText}>{state.nickname}的岛</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.diamondPill, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
            onPress={handleCollect}
          >
            <View style={styles.diamondGlow}>
              <Ionicons name="diamond" size={16} color={Colors.diamondGlow} />
            </View>
            <Text style={styles.diamondCount}>{state.diamonds}</Text>
          </Pressable>
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(700).delay(200)} style={styles.islandWrapper}>
            <View style={styles.oceanLayer}>
              <View style={styles.wave1} />
              <View style={styles.wave2} />
            </View>
            <View style={styles.islandBody}>
              <View style={styles.islandInner}>
                <View style={styles.gridContainer}>
                  {Array.from({ length: GRID_SIZE }, (_, y) => (
                    <View key={y} style={styles.gridRow}>
                      {Array.from({ length: GRID_SIZE }, (_, x) => {
                        const building = state.buildings.find(b => b.x === x && b.y === y);
                        return (
                          <GridCell
                            key={`${x}-${y}`}
                            x={x} y={y}
                            building={building}
                            onPress={() => handleCellPress(x, y)}
                            isPlacing={isPlacing}
                          />
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </Animated.View>

          {isPlacing && selectedType && (
            <Animated.View entering={FadeInUp.duration(300)} style={styles.placingBanner}>
              <LinearGradient colors={[Colors.goldSoft, '#FFF3E0']} style={styles.placingGradient}>
                <View style={styles.placingLeft}>
                  <BuildingIcon type={selectedType} size={20} />
                  <Text style={styles.placingText}>
                    点击空格子放置 {BUILDING_NAMES[selectedType]}
                  </Text>
                </View>
                <Pressable
                  onPress={() => { setIsPlacing(false); setSelectedType(null); }}
                  style={styles.placingClose}
                >
                  <Ionicons name="close" size={18} color={Colors.error} />
                </Pressable>
              </LinearGradient>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.duration(400).delay(400)} style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <LinearGradient colors={[Colors.primarySoft, '#E8F5E9']} style={styles.quickStatIcon}>
                <Ionicons name="home" size={18} color={Colors.primary} />
              </LinearGradient>
              <View>
                <Text style={styles.quickStatValue}>{state.buildings.length}</Text>
                <Text style={styles.quickStatLabel}>建筑</Text>
              </View>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <LinearGradient colors={[Colors.accentSoft, '#E3F2FD']} style={styles.quickStatIcon}>
                <Ionicons name="time" size={18} color={Colors.accent} />
              </LinearGradient>
              <View>
                <Text style={styles.quickStatValue}>{state.totalFocusMinutes}</Text>
                <Text style={styles.quickStatLabel}>专注分钟</Text>
              </View>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <LinearGradient colors={[Colors.expSoft, '#F3E5F5']} style={styles.quickStatIcon}>
                <Ionicons name="trending-up" size={18} color={Colors.exp} />
              </LinearGradient>
              <View>
                <Text style={styles.quickStatValue}>Lv.{state.level}</Text>
                <Text style={styles.quickStatLabel}>等级</Text>
              </View>
            </View>
          </Animated.View>

          <View style={{ height: 140 }} />
        </ScrollView>

        <View style={[styles.bottomActions, { paddingBottom: Platform.OS === 'web' ? 94 : 100 }]}>
          <Pressable
            style={({ pressed }) => [styles.fabBuild, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}
            onPress={() => setShowBuildMenu(true)}
          >
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.fabGradient}>
              <Ionicons name="hammer" size={22} color="#fff" />
              <Text style={styles.fabText}>建造</Text>
            </LinearGradient>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.fabCollect, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}
            onPress={handleCollect}
          >
            <LinearGradient colors={[Colors.gold, Colors.goldDark]} style={styles.fabGradient}>
              <Ionicons name="diamond" size={22} color="#fff" />
              <Text style={styles.fabCollectText}>收集</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </LinearGradient>

      <Modal visible={showBuildMenu} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowBuildMenu(false)}>
          <Pressable style={styles.buildSheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>选择建筑</Text>
            <Text style={styles.sheetSubtitle}>点击选择后在岛屿上放置</Text>
            <View style={styles.buildingList}>
              {(Object.keys(BUILDING_COSTS) as BuildingType[]).map((type, i) => {
                const canAfford = state.diamonds >= BUILDING_COSTS[type];
                return (
                  <Animated.View key={type} entering={FadeInDown.duration(300).delay(i * 60)}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.buildingCard,
                        !canAfford && styles.buildingCardDisabled,
                        { transform: [{ scale: pressed ? 0.96 : 1 }] },
                      ]}
                      onPress={() => handleSelectBuildingType(type)}
                      disabled={!canAfford}
                    >
                      <LinearGradient
                        colors={[BUILDING_GRADIENT[type][0] + '18', BUILDING_GRADIENT[type][1] + '08']}
                        style={styles.buildingCardIcon}
                      >
                        <BuildingIcon type={type} size={30} />
                      </LinearGradient>
                      <View style={styles.buildingCardInfo}>
                        <Text style={styles.buildingCardName}>{BUILDING_NAMES[type]}</Text>
                        <Text style={styles.buildingCardDesc}>
                          每小时产出 {BUILDING_DAILY_PRODUCTION[type]} 砖石
                        </Text>
                      </View>
                      <View style={[styles.buildingCostPill, !canAfford && styles.buildingCostInsufficient]}>
                        <Ionicons name="diamond" size={12} color={canAfford ? Colors.diamondGlow : Colors.error} />
                        <Text style={[styles.buildingCostText, !canAfford && { color: Colors.error }]}>
                          {BUILDING_COSTS[type]}
                        </Text>
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!selectedBuilding} transparent animationType="fade">
        <Pressable style={styles.detailOverlay} onPress={() => setSelectedBuilding(null)}>
          <Pressable style={styles.detailSheet} onPress={() => {}}>
            {selectedBuilding && (
              <Animated.View entering={ZoomIn.duration(300)}>
                <LinearGradient
                  colors={[BUILDING_GRADIENT[selectedBuilding.type][0] + '20', '#fff']}
                  style={styles.detailHeader}
                >
                  <View style={styles.detailIconRing}>
                    <BuildingIcon type={selectedBuilding.type} size={40} />
                  </View>
                  <Text style={styles.detailName}>
                    {BUILDING_NAMES[selectedBuilding.type]}
                  </Text>
                  <View style={styles.detailLevelPill}>
                    <Text style={styles.detailLevelText}>Lv.{selectedBuilding.level}</Text>
                  </View>
                </LinearGradient>
                <View style={styles.detailStats}>
                  <View style={styles.detailStatItem}>
                    <Text style={styles.detailStatLabel}>每小时产出</Text>
                    <Text style={styles.detailStatValue}>
                      {BUILDING_DAILY_PRODUCTION[selectedBuilding.type] * selectedBuilding.level} 砖石
                    </Text>
                  </View>
                  <View style={styles.detailStatItem}>
                    <Text style={styles.detailStatLabel}>升级费用</Text>
                    <Text style={styles.detailStatValue}>{upgradeCost} 砖石</Text>
                  </View>
                </View>
                <View style={styles.detailActions}>
                  <Pressable
                    style={({ pressed }) => [styles.detailBtn, styles.upgradeBtn, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
                    onPress={handleUpgrade}
                  >
                    <Ionicons name="arrow-up-circle" size={20} color="#fff" />
                    <Text style={styles.detailBtnText}>升级</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.detailBtn, styles.removeBtn, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
                    onPress={handleRemove}
                  >
                    <Ionicons name="trash-outline" size={20} color={Colors.error} />
                    <Text style={[styles.detailBtnText, { color: Colors.error }]}>拆除</Text>
                  </Pressable>
                </View>
              </Animated.View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradientBg: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5,
  },
  levelText: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 12 },
  nicknameText: { fontFamily: 'Nunito_800ExtraBold', fontSize: 20, color: Colors.text },
  diamondPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 8,
    shadowColor: Colors.diamond, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8,
    elevation: 3, borderWidth: 1, borderColor: Colors.diamondSoft,
  },
  diamondGlow: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.diamondSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  diamondCount: { fontFamily: 'RobotoMono_700Bold', fontSize: 17, color: Colors.text },
  scrollContent: { alignItems: 'center', paddingHorizontal: 16 },
  islandWrapper: { alignItems: 'center', marginVertical: 12, position: 'relative' },
  oceanLayer: {
    position: 'absolute', bottom: -16, left: -20, right: -20, height: 40,
    overflow: 'hidden', borderRadius: 40,
  },
  wave1: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 24,
    backgroundColor: Colors.island.waterSoft, borderRadius: 40, opacity: 0.6,
  },
  wave2: {
    position: 'absolute', bottom: 4, left: 10, right: 10, height: 20,
    backgroundColor: Colors.island.water + '30', borderRadius: 40, opacity: 0.4,
  },
  islandBody: {
    backgroundColor: Colors.island.sandDark + '30',
    borderRadius: 28, padding: 4,
    borderWidth: 2.5, borderColor: Colors.island.water + '35',
    shadowColor: Colors.island.waterDeep, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 5,
  },
  islandInner: {
    backgroundColor: Colors.island.grassLight + '50',
    borderRadius: 24, padding: 10,
  },
  gridContainer: { gap: 3 },
  gridRow: { flexDirection: 'row', gap: 3 },
  cell: {
    borderRadius: 10, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  buildingCell: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  cellLevelBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: Colors.gold, borderRadius: 6, minWidth: 14, height: 14,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2,
    borderWidth: 1, borderColor: '#fff',
  },
  cellLevelText: { fontFamily: 'Nunito_700Bold', fontSize: 8, color: '#fff' },
  placeDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.gold + '20', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.gold + '40',
  },
  placingBanner: { width: '100%', marginBottom: 14 },
  placingGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 16, padding: 14, borderWidth: 1, borderColor: Colors.gold + '30',
  },
  placingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  placingText: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: Colors.goldDark },
  placingClose: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.error + '12',
    alignItems: 'center', justifyContent: 'center',
  },
  quickStats: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 20, padding: 16, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12,
    elevation: 2, borderWidth: 1, borderColor: Colors.border,
  },
  quickStatItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  quickStatIcon: {
    width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  quickStatValue: { fontFamily: 'RobotoMono_700Bold', fontSize: 16, color: Colors.text },
  quickStatLabel: { fontFamily: 'Nunito_400Regular', fontSize: 10, color: Colors.textMuted },
  quickStatDivider: { width: 1, height: 30, backgroundColor: Colors.border, marginHorizontal: 4 },
  bottomActions: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 14, paddingHorizontal: 24,
  },
  fabBuild: { borderRadius: 26, overflow: 'hidden', elevation: 6, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10 },
  fabCollect: { borderRadius: 26, overflow: 'hidden', elevation: 6, shadowColor: Colors.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10 },
  fabGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 26, paddingVertical: 15, borderRadius: 26,
  },
  fabText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#fff' },
  fabCollectText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  buildSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 22, color: Colors.text, textAlign: 'center' },
  sheetSubtitle: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  buildingList: { gap: 10 },
  buildingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 18, padding: 14,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  buildingCardDisabled: { opacity: 0.45 },
  buildingCardIcon: {
    width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
  },
  buildingCardInfo: { flex: 1 },
  buildingCardName: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: Colors.text },
  buildingCardDesc: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  buildingCostPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.diamondSoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6,
  },
  buildingCostInsufficient: { backgroundColor: Colors.error + '10' },
  buildingCostText: { fontFamily: 'RobotoMono_700Bold', fontSize: 14, color: Colors.diamondGlow },
  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  detailSheet: {
    backgroundColor: '#fff', borderRadius: 28, width: 300, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8,
  },
  detailHeader: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, gap: 10 },
  detailIconRing: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  detailName: { fontFamily: 'Nunito_800ExtraBold', fontSize: 22, color: Colors.text },
  detailLevelPill: {
    backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4,
  },
  detailLevelText: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: '#fff' },
  detailStats: {
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  detailStatItem: { flex: 1, alignItems: 'center', gap: 4 },
  detailStatLabel: { fontFamily: 'Nunito_400Regular', fontSize: 11, color: Colors.textMuted },
  detailStatValue: { fontFamily: 'RobotoMono_700Bold', fontSize: 15, color: Colors.text },
  detailActions: { flexDirection: 'row', gap: 12, padding: 20 },
  detailBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 14, borderRadius: 16,
  },
  upgradeBtn: { backgroundColor: Colors.primary },
  removeBtn: { backgroundColor: Colors.error + '10', borderWidth: 1, borderColor: Colors.error + '30' },
  detailBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#fff' },
});
