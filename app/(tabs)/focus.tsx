import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, Pressable, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withTiming, withRepeat, withSequence, Easing } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Colors from '@/constants/colors';
import { useGame } from '@/lib/game-state';

const PRESETS = [
  { label: '25', sub: '分钟', minutes: 25 },
  { label: '45', sub: '分钟', minutes: 45 },
  { label: '60', sub: '分钟', minutes: 60 },
  { label: '', sub: '自由', minutes: 0, icon: 'infinite' as const },
];

const CIRCLE_SIZE = 260;
const STROKE_WIDTH = 12;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function FocusScreen() {
  const insets = useSafeAreaInsets();
  const { state, addDiamonds, addExp, completeFocus } = useGame();
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<string>('');

  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const plannedMinutes = PRESETS[selectedPreset].minutes;
  const totalSeconds = plannedMinutes * 60;
  const isCountUp = plannedMinutes === 0;

  const progress = isCountUp
    ? Math.min(elapsedSeconds / 3600, 1)
    : Math.min(elapsedSeconds / totalSeconds, 1);

  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  const remainingSeconds = isCountUp ? elapsedSeconds : Math.max(0, totalSeconds - elapsedSeconds);
  const displayTime = `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`;

  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (isRunning && !isPaused) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.04, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ), -1, true
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.2, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ), -1, true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
      glowOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [isRunning, isPaused]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const startTimer = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
    setElapsedSeconds(0);
    startTimeRef.current = new Date().toISOString();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => {
        const next = prev + 1;
        if (!isCountUp && next >= totalSeconds) {
          clearInterval(timerRef.current!);
          finishSession(next);
          return next;
        }
        return next;
      });
    }, 1000);
  }, [isCountUp, totalSeconds]);

  const pauseTimer = useCallback(() => {
    setIsPaused(true);
    if (timerRef.current) clearInterval(timerRef.current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const resumeTimer = useCallback(() => {
    setIsPaused(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => {
        const next = prev + 1;
        if (!isCountUp && next >= totalSeconds) {
          clearInterval(timerRef.current!);
          finishSession(next);
          return next;
        }
        return next;
      });
    }, 1000);
  }, [isCountUp, totalSeconds]);

  const finishSession = useCallback((seconds: number) => {
    const actualMinutes = Math.floor(seconds / 60);
    if (actualMinutes < 1) {
      setIsRunning(false);
      setElapsedSeconds(0);
      return;
    }
    let diamonds = actualMinutes;
    diamonds += Math.floor(actualMinutes / 25) * 10;
    const expEarned = actualMinutes;
    addDiamonds(diamonds);
    addExp(expEarned);
    completeFocus({
      startTime: startTimeRef.current,
      endTime: new Date().toISOString(),
      plannedDuration: plannedMinutes,
      actualDuration: actualMinutes,
      diamondsEarned: diamonds,
      expEarned,
      status: 'completed',
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      '专注完成!',
      `专注 ${actualMinutes} 分钟\n获得 ${diamonds} 砖石 + ${expEarned} 经验`,
      [{ text: '太棒了!' }]
    );
    setIsRunning(false);
    setElapsedSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }, [plannedMinutes, addDiamonds, addExp, completeFocus]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const actualMinutes = Math.floor(elapsedSeconds / 60);
    if (actualMinutes >= 1) {
      Alert.alert('结束专注?', `已专注 ${actualMinutes} 分钟`, [
        { text: '继续', style: 'cancel', onPress: () => resumeTimer() },
        { text: '结束并领取', onPress: () => finishSession(elapsedSeconds) },
        { text: '放弃', style: 'destructive', onPress: () => { setIsRunning(false); setElapsedSeconds(0); } },
      ]);
    } else {
      setIsRunning(false);
      setElapsedSeconds(0);
    }
  }, [elapsedSeconds, resumeTimer, finishSession]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const todayFocus = state.focusHistory
    .filter(s => new Date(s.startTime).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + s.actualDuration, 0);

  const earnedSoFar = Math.floor(elapsedSeconds / 60);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F5F9F0', Colors.background, '#EEF2E8']} style={[styles.bg, { paddingTop: insets.top + webTopInset }]}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Text style={styles.headerTitle}>专注</Text>
          <View style={styles.todayPill}>
            <Ionicons name="flame" size={14} color={Colors.goldDark} />
            <Text style={styles.todayText}>今日 {todayFocus} 分钟</Text>
          </View>
        </Animated.View>

        <View style={styles.timerSection}>
          <Animated.View entering={FadeIn.duration(600).delay(200)} style={[styles.circleOuter]}>
            <Animated.View style={[styles.glowRing, glowStyle]} />
            <Animated.View style={pulseStyle}>
              <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
                <Defs>
                  <SvgGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={Colors.primary} />
                    <Stop offset="1" stopColor={Colors.primaryLight} />
                  </SvgGradient>
                </Defs>
                <Circle
                  cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS}
                  stroke={Colors.border + '60'} strokeWidth={STROKE_WIDTH} fill="none"
                />
                <Circle
                  cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS}
                  stroke="url(#grad)" strokeWidth={STROKE_WIDTH} fill="none"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE} strokeDashoffset={strokeDashoffset}
                  transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
                />
              </Svg>
            </Animated.View>
            <View style={styles.timerCenter}>
              <Text style={styles.timerDisplay}>{displayTime}</Text>
              <Text style={styles.timerLabel}>
                {isRunning
                  ? isPaused ? '已暂停' : isCountUp ? '自由专注中' : '剩余时间'
                  : isCountUp ? '无限模式' : `${plannedMinutes} 分钟`}
              </Text>
              {isRunning && earnedSoFar > 0 && (
                <View style={styles.earningRow}>
                  <Ionicons name="diamond" size={12} color={Colors.diamond} />
                  <Text style={styles.earningText}>+{earnedSoFar}</Text>
                </View>
              )}
            </View>
          </Animated.View>
        </View>

        {!isRunning && (
          <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.presetsRow}>
            {PRESETS.map((p, i) => (
              <Pressable
                key={i}
                onPress={() => { setSelectedPreset(i); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={({ pressed }) => [
                  styles.presetCard,
                  selectedPreset === i && styles.presetCardActive,
                  { transform: [{ scale: pressed ? 0.93 : 1 }] },
                ]}
              >
                {selectedPreset === i ? (
                  <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.presetGradient}>
                    {p.icon ? (
                      <Ionicons name={p.icon} size={20} color="#fff" />
                    ) : (
                      <Text style={styles.presetNumActive}>{p.label}</Text>
                    )}
                    <Text style={styles.presetSubActive}>{p.sub}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.presetInner}>
                    {p.icon ? (
                      <Ionicons name={p.icon} size={20} color={Colors.textMuted} />
                    ) : (
                      <Text style={styles.presetNum}>{p.label}</Text>
                    )}
                    <Text style={styles.presetSub}>{p.sub}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </Animated.View>
        )}

        <View style={styles.controlsSection}>
          {!isRunning ? (
            <Pressable
              style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.92 : 1 }] }]}
              onPress={startTimer}
            >
              <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.startBtn}>
                <Ionicons name="play" size={30} color="#fff" />
              </LinearGradient>
            </Pressable>
          ) : (
            <View style={styles.runControls}>
              {isPaused ? (
                <Pressable onPress={resumeTimer} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.93 : 1 }] }]}>
                  <LinearGradient colors={[Colors.primary, Colors.primaryLight]} style={styles.controlCircle}>
                    <Ionicons name="play" size={24} color="#fff" />
                  </LinearGradient>
                </Pressable>
              ) : (
                <Pressable onPress={pauseTimer} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.93 : 1 }] }]}>
                  <View style={styles.pauseCircle}>
                    <Ionicons name="pause" size={24} color={Colors.primary} />
                  </View>
                </Pressable>
              )}
              <Pressable onPress={stopTimer} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.93 : 1 }] }]}>
                <View style={styles.stopCircle}>
                  <Ionicons name="stop" size={22} color={Colors.error} />
                </View>
              </Pressable>
            </View>
          )}
        </View>

        <Animated.View entering={FadeInDown.duration(400).delay(500)} style={[styles.rewardBar, { marginBottom: Platform.OS === 'web' ? 94 : 100 }]}>
          <View style={styles.rewardItem}>
            <View style={styles.rewardIconWrap}>
              <Ionicons name="diamond" size={16} color={Colors.diamondGlow} />
            </View>
            <Text style={styles.rewardText}>1分钟 = 1砖石</Text>
          </View>
          <View style={styles.rewardDivider} />
          <View style={styles.rewardItem}>
            <View style={[styles.rewardIconWrap, { backgroundColor: Colors.goldSoft }]}>
              <Ionicons name="gift" size={16} color={Colors.goldDark} />
            </View>
            <Text style={styles.rewardText}>每25分钟 +10</Text>
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bg: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  headerTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 28, color: Colors.text },
  todayPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.goldSoft, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.gold + '30',
  },
  todayText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: Colors.goldDark },
  timerSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  circleOuter: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  glowRing: {
    position: 'absolute', width: CIRCLE_SIZE + 40, height: CIRCLE_SIZE + 40, borderRadius: (CIRCLE_SIZE + 40) / 2,
    backgroundColor: Colors.primary + '08', borderWidth: 2, borderColor: Colors.primary + '10',
  },
  timerCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  timerDisplay: { fontFamily: 'RobotoMono_700Bold', fontSize: 52, color: Colors.text, letterSpacing: 2 },
  timerLabel: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  earningRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: Colors.diamondSoft, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  earningText: { fontFamily: 'RobotoMono_700Bold', fontSize: 14, color: Colors.diamondGlow },
  presetsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingHorizontal: 24, marginBottom: 28 },
  presetCard: {
    flex: 1, borderRadius: 18, overflow: 'hidden',
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  presetCardActive: { borderColor: Colors.primary, borderWidth: 0 },
  presetGradient: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 2 },
  presetInner: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 2 },
  presetNum: { fontFamily: 'RobotoMono_700Bold', fontSize: 20, color: Colors.textSecondary },
  presetNumActive: { fontFamily: 'RobotoMono_700Bold', fontSize: 20, color: '#fff' },
  presetSub: { fontFamily: 'Nunito_400Regular', fontSize: 11, color: Colors.textMuted },
  presetSubActive: { fontFamily: 'Nunito_400Regular', fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  controlsSection: { alignItems: 'center', marginBottom: 20 },
  startBtn: {
    width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
  },
  runControls: { flexDirection: 'row', gap: 24, alignItems: 'center' },
  controlCircle: {
    width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  pauseCircle: {
    width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primarySoft, borderWidth: 2, borderColor: Colors.primary + '30',
  },
  stopCircle: {
    width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.error + '10', borderWidth: 2, borderColor: Colors.error + '25',
  },
  rewardBar: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 24,
    backgroundColor: '#fff', borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  rewardItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  rewardIconWrap: {
    width: 30, height: 30, borderRadius: 10, backgroundColor: Colors.diamondSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  rewardText: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: Colors.textSecondary },
  rewardDivider: { width: 1, height: 24, backgroundColor: Colors.border },
});
