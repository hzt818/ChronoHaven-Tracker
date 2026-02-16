import React, { useState, useCallback } from 'react';
import {
  StyleSheet, Text, View, Pressable, ScrollView, Platform, Alert, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, ZoomIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useGame, BuildingType, BUILDING_COSTS, BUILDING_NAMES, Building } from '@/lib/game-state';

const GRID_SIZE = 6;

const BUILDING_ICONS: Record<BuildingType, { family: 'ionicons' | 'material'; name: string }> = {
  house: { family: 'ionicons', name: 'home' },
  windmill: { family: 'material', name: 'wind-turbine' },
  lighthouse: { family: 'material', name: 'lighthouse' },
  tree: { family: 'ionicons', name: 'leaf' },
  road: { family: 'material', name: 'road-variant' },
};

const BUILDING_COLORS: Record<BuildingType, string> = {
  house: '#8D6E63',
  windmill: '#78909C',
  lighthouse: '#FDD835',
  tree: '#43A047',
  road: '#9E9E9E',
};

function GridCell({ x, y, building, onPress, isPlacing, selectedType }: {
  x: number; y: number; building?: Building; onPress: () => void;
  isPlacing: boolean; selectedType: BuildingType | null;
}) {
  const isCenter = x >= 2 && x <= 3 && y >= 2 && y <= 3;
  const hasBuilding = !!building;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cell,
        {
          backgroundColor: hasBuilding
            ? BUILDING_COLORS[building!.type] + '30'
            : isCenter
              ? Colors.island.grass + '60'
              : Colors.island.grass + '30',
          borderColor: isPlacing && !hasBuilding
            ? Colors.gold
            : Colors.island.grass + '50',
          transform: [{ scale: pressed ? 0.92 : 1 }],
        },
      ]}
    >
      {hasBuilding ? (
        <View style={styles.buildingCell}>
          {BUILDING_ICONS[building!.type].family === 'ionicons' ? (
            <Ionicons
              name={BUILDING_ICONS[building!.type].name as any}
              size={20}
              color={BUILDING_COLORS[building!.type]}
            />
          ) : (
            <MaterialCommunityIcons
              name={BUILDING_ICONS[building!.type].name as any}
              size={20}
              color={BUILDING_COLORS[building!.type]}
            />
          )}
          {building!.level > 1 && (
            <Text style={styles.levelBadge}>{building!.level}</Text>
          )}
        </View>
      ) : isPlacing ? (
        <Ionicons name="add" size={16} color={Colors.gold} />
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
      Alert.alert('收获', `收集了 ${income} 砖石!`);
    } else {
      Alert.alert('暂无收益', '建筑每小时产出一次砖石');
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
    Alert.alert(
      '确认拆除',
      `拆除${BUILDING_NAMES[selectedBuilding.type]}将退还50%砖石`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认拆除',
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

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.levelBadgeHeader}>
            <Text style={styles.levelText}>Lv.{state.level}</Text>
          </View>
          <Text style={styles.nicknameText}>{state.nickname}</Text>
        </View>
        <Pressable style={styles.diamondBadge} onPress={handleCollect}>
          <Ionicons name="diamond" size={16} color={Colors.diamond} />
          <Text style={styles.diamondText}>{state.diamonds}</Text>
        </Pressable>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(600).delay(200)} style={styles.islandContainer}>
          <View style={styles.islandShadow} />
          <View style={styles.island}>
            <View style={styles.waterRing} />
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
                        selectedType={selectedType}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </Animated.View>

        {isPlacing && selectedType && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.placingBanner}>
            <Text style={styles.placingText}>
              点击空格子放置{BUILDING_NAMES[selectedType]}
            </Text>
            <Pressable onPress={() => { setIsPlacing(false); setSelectedType(null); }}>
              <Ionicons name="close-circle" size={24} color={Colors.error} />
            </Pressable>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(400).delay(400)} style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{state.buildings.length}</Text>
            <Text style={styles.statLabel}>建筑</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{state.totalFocusMinutes}</Text>
            <Text style={styles.statLabel}>专注分钟</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{state.level}</Text>
            <Text style={styles.statLabel}>等级</Text>
          </View>
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Platform.OS === 'web' ? 94 : 100 }]}>
        <Pressable
          style={({ pressed }) => [styles.buildButton, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => setShowBuildMenu(true)}
        >
          <Ionicons name="hammer" size={22} color={Colors.textOnPrimary} />
          <Text style={styles.buildButtonText}>建造</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.collectButton, { opacity: pressed ? 0.8 : 1 }]}
          onPress={handleCollect}
        >
          <Ionicons name="diamond" size={22} color={Colors.textOnGold} />
          <Text style={styles.collectButtonText}>收集</Text>
        </Pressable>
      </View>

      <Modal visible={showBuildMenu} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowBuildMenu(false)}>
          <Pressable style={styles.buildMenuContainer} onPress={() => {}}>
            <View style={styles.buildMenuHandle} />
            <Text style={styles.buildMenuTitle}>选择建筑</Text>
            <View style={styles.buildingGrid}>
              {(Object.keys(BUILDING_COSTS) as BuildingType[]).map(type => (
                <Pressable
                  key={type}
                  style={({ pressed }) => [
                    styles.buildingOption,
                    { opacity: pressed ? 0.7 : 1, borderColor: state.diamonds >= BUILDING_COSTS[type] ? Colors.primary + '40' : Colors.error + '40' },
                  ]}
                  onPress={() => handleSelectBuildingType(type)}
                >
                  <View style={[styles.buildingIconWrap, { backgroundColor: BUILDING_COLORS[type] + '20' }]}>
                    {BUILDING_ICONS[type].family === 'ionicons' ? (
                      <Ionicons name={BUILDING_ICONS[type].name as any} size={28} color={BUILDING_COLORS[type]} />
                    ) : (
                      <MaterialCommunityIcons name={BUILDING_ICONS[type].name as any} size={28} color={BUILDING_COLORS[type]} />
                    )}
                  </View>
                  <Text style={styles.buildingName}>{BUILDING_NAMES[type]}</Text>
                  <View style={styles.costRow}>
                    <Ionicons name="diamond" size={12} color={Colors.diamond} />
                    <Text style={styles.costText}>{BUILDING_COSTS[type]}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!selectedBuilding} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedBuilding(null)}>
          <Pressable style={styles.buildingDetailContainer} onPress={() => {}}>
            {selectedBuilding && (
              <>
                <View style={[styles.buildingDetailIcon, { backgroundColor: BUILDING_COLORS[selectedBuilding.type] + '20' }]}>
                  {BUILDING_ICONS[selectedBuilding.type].family === 'ionicons' ? (
                    <Ionicons name={BUILDING_ICONS[selectedBuilding.type].name as any} size={40} color={BUILDING_COLORS[selectedBuilding.type]} />
                  ) : (
                    <MaterialCommunityIcons name={BUILDING_ICONS[selectedBuilding.type].name as any} size={40} color={BUILDING_COLORS[selectedBuilding.type]} />
                  )}
                </View>
                <Text style={styles.buildingDetailName}>
                  {BUILDING_NAMES[selectedBuilding.type]} Lv.{selectedBuilding.level}
                </Text>
                <View style={styles.buildingActions}>
                  <Pressable style={[styles.actionBtn, { backgroundColor: Colors.primary }]} onPress={handleUpgrade}>
                    <Ionicons name="arrow-up-circle" size={20} color="#fff" />
                    <Text style={styles.actionBtnText}>升级</Text>
                  </Pressable>
                  <Pressable style={[styles.actionBtn, { backgroundColor: Colors.error }]} onPress={handleRemove}>
                    <Ionicons name="trash" size={20} color="#fff" />
                    <Text style={styles.actionBtnText}>拆除</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelBadgeHeader: {
    backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  levelText: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 13 },
  nicknameText: { fontFamily: 'Nunito_700Bold', fontSize: 18, color: Colors.text },
  diamondBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  diamondText: { fontFamily: 'RobotoMono_700Bold', fontSize: 16, color: Colors.text },
  scrollContent: { alignItems: 'center', paddingHorizontal: 16 },
  islandContainer: { alignItems: 'center', marginTop: 8, marginBottom: 20 },
  islandShadow: {
    position: 'absolute', bottom: -10, width: '90%', height: 20,
    backgroundColor: Colors.island.waterDeep + '20', borderRadius: 100,
  },
  island: {
    backgroundColor: Colors.island.sand + '40', borderRadius: 24, padding: 12,
    borderWidth: 2, borderColor: Colors.island.water + '40',
  },
  waterRing: {
    position: 'absolute', top: -6, left: -6, right: -6, bottom: -6,
    borderRadius: 28, borderWidth: 3, borderColor: Colors.island.water + '30',
  },
  gridContainer: { gap: 3 },
  gridRow: { flexDirection: 'row', gap: 3 },
  cell: {
    width: 48, height: 48, borderRadius: 10, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  buildingCell: { alignItems: 'center', justifyContent: 'center' },
  levelBadge: {
    position: 'absolute', top: -2, right: -2, backgroundColor: Colors.gold,
    borderRadius: 6, width: 14, height: 14, alignItems: 'center', justifyContent: 'center',
  },
  placingBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.gold + '20', borderRadius: 12, padding: 12, marginBottom: 16, width: '100%',
    borderWidth: 1, borderColor: Colors.gold + '40',
  },
  placingText: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: Colors.goldDark },
  statsRow: { flexDirection: 'row', gap: 12, width: '100%' },
  statCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  statValue: { fontFamily: 'RobotoMono_700Bold', fontSize: 22, color: Colors.primary },
  statLabel: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 16, paddingHorizontal: 20,
  },
  buildButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary,
    borderRadius: 24, paddingHorizontal: 24, paddingVertical: 14, elevation: 4,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  buildButtonText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: Colors.textOnPrimary },
  collectButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.gold,
    borderRadius: 24, paddingHorizontal: 24, paddingVertical: 14, elevation: 4,
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  collectButtonText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: Colors.textOnGold },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  buildMenuContainer: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  buildMenuHandle: {
    width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  buildMenuTitle: {
    fontFamily: 'Nunito_700Bold', fontSize: 20, color: Colors.text, marginBottom: 20, textAlign: 'center',
  },
  buildingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  buildingOption: {
    width: 100, backgroundColor: Colors.surfaceElevated, borderRadius: 16,
    padding: 12, alignItems: 'center', borderWidth: 1.5,
  },
  buildingIconWrap: {
    width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  buildingName: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: Colors.text },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  costText: { fontFamily: 'RobotoMono_400Regular', fontSize: 12, color: Colors.textSecondary },
  buildingDetailContainer: {
    backgroundColor: Colors.surface, borderRadius: 24, padding: 32, marginHorizontal: 40,
    alignItems: 'center', alignSelf: 'center', marginTop: 'auto', marginBottom: 'auto',
  },
  buildingDetailIcon: {
    width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  buildingDetailName: { fontFamily: 'Nunito_700Bold', fontSize: 20, color: Colors.text, marginBottom: 20 },
  buildingActions: { flexDirection: 'row', gap: 16 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 16,
  },
  actionBtnText: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: '#fff' },
});
