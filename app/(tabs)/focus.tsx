import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, Pressable, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withTiming, withRepeat, withSequence, Easing } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import Colors from '@/constants/colors';
import { useGame } from '@/lib/game-state';

const PRESETS = [
  { label: '25分钟', minutes: 25 },
  { label: '45分钟', minutes: 45 },
  { label: '60分钟', minutes: 60 },
  { label: '自由', minutes: 0 },
];

const CIRCLE_SIZE = 240;
const STROKE_WIDTH = 10;
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

  const displayMinutes = Math.floor(elapsedSeconds / 60);
  const displaySeconds = elapsedSeconds % 60;
  const timeString = `${String(displayMinutes).padStart(2, '0')}:${String(displaySeconds).padStart(2, '0')}`;

  const remainingMinutes = isCountUp ? 0 : Math.max(0, Math.ceil((totalSeconds - elapsedSeconds) / 60));
  const remainingSeconds = isCountUp ? 0 : Math.max(0, totalSeconds - elapsedSeconds);
  const remainingTimeString = isCountUp
    ? timeString
    : `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`;

  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (isRunning && !isPaused) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulseOpacity.value = withTiming(1, { duration: 300 });
    }
  }, [isRunning, isPaused]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
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
    const bonusBlocks = Math.floor(actualMinutes / 25);
    diamonds += bonusBlocks * 10;

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
      `专注 ${actualMinutes} 分钟\n获得 ${diamonds} 砖石\n获得 ${expEarned} 经验`,
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
      Alert.alert(
        '结束专注?',
        `已专注 ${actualMinutes} 分钟`,
        [
          { text: '继续', style: 'cancel', onPress: () => resumeTimer() },
          { text: '结束并获取奖励', onPress: () => finishSession(elapsedSeconds) },
          { text: '放弃', style: 'destructive', onPress: () => {
            setIsRunning(false);
            setElapsedSeconds(0);
          }},
        ]
      );
    } else {
      setIsRunning(false);
      setElapsedSeconds(0);
    }
  }, [elapsedSeconds, resumeTimer, finishSession]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const todayFocus = state.focusHistory
    .filter(s => {
      const d = new Date(s.startTime);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    })
    .reduce((sum, s) => sum + s.actualDuration, 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <Text style={styles.headerTitle}>专注</Text>
        <View style={styles.todayBadge}>
          <Ionicons name="time-outline" size={14} color={Colors.primary} />
          <Text style={styles.todayText}>今日 {todayFocus} 分钟</Text>
        </View>
      </Animated.View>

      <View style={styles.timerContainer}>
        <Animated.View entering={FadeIn.duration(600).delay(200)} style={styles.circleWrap}>
          <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
            <Circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke={Colors.border}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            <Circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke={Colors.primary}
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
            />
          </Svg>
          <View style={styles.timerInner}>
            <Animated.Text style={[styles.timerText, isRunning && pulseStyle]}>
              {isCountUp ? timeString : remainingTimeString}
            </Animated.Text>
            <Text style={styles.timerSubtext}>
              {isRunning ? (isCountUp ? '自由专注中' : '剩余时间') : (isCountUp ? '自由模式' : `${plannedMinutes} 分钟`)}
            </Text>
          </View>
        </Animated.View>
      </View>

      {!isRunning && (
        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.presetsRow}>
          {PRESETS.map((p, i) => (
            <Pressable
              key={i}
              style={[
                styles.presetBtn,
                selectedPreset === i && styles.presetBtnActive,
              ]}
              onPress={() => {
                setSelectedPreset(i);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.presetText, selectedPreset === i && styles.presetTextActive]}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </Animated.View>
      )}

      <View style={styles.controlsRow}>
        {!isRunning ? (
          <Pressable
            style={({ pressed }) => [styles.startBtn, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
            onPress={startTimer}
          >
            <Ionicons name="play" size={28} color={Colors.textOnPrimary} />
          </Pressable>
        ) : (
          <View style={styles.runningControls}>
            {isPaused ? (
              <Pressable
                style={({ pressed }) => [styles.controlBtn, styles.resumeBtn, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
                onPress={resumeTimer}
              >
                <Ionicons name="play" size={24} color={Colors.textOnPrimary} />
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.controlBtn, styles.pauseBtn, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
                onPress={pauseTimer}
              >
                <Ionicons name="pause" size={24} color={Colors.gold} />
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.controlBtn, styles.stopBtn, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}
              onPress={stopTimer}
            >
              <Ionicons name="stop" size={24} color={Colors.error} />
            </Pressable>
          </View>
        )}
      </View>

      <Animated.View entering={FadeInDown.duration(400).delay(500)} style={styles.rewardInfo}>
        <View style={styles.rewardCard}>
          <Ionicons name="diamond" size={18} color={Colors.diamond} />
          <Text style={styles.rewardLabel}>1分钟 = 1砖石</Text>
        </View>
        <View style={styles.rewardCard}>
          <Ionicons name="gift" size={18} color={Colors.gold} />
          <Text style={styles.rewardLabel}>每25分钟额外+10</Text>
        </View>
      </Animated.View>
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
  todayBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary + '10', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  todayText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: Colors.primary },
  timerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  circleWrap: { alignItems: 'center', justifyContent: 'center' },
  timerInner: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
  },
  timerText: { fontFamily: 'RobotoMono_700Bold', fontSize: 48, color: Colors.text },
  timerSubtext: { fontFamily: 'Nunito_400Regular', fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  presetsRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 10, paddingHorizontal: 20, marginBottom: 24,
  },
  presetBtn: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
  },
  presetBtnActive: {
    backgroundColor: Colors.primary, borderColor: Colors.primary,
  },
  presetText: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: Colors.textSecondary },
  presetTextActive: { color: Colors.textOnPrimary },
  controlsRow: { alignItems: 'center', marginBottom: 24 },
  startBtn: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12,
    elevation: 8,
  },
  runningControls: { flexDirection: 'row', gap: 20 },
  controlBtn: {
    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    elevation: 4,
  },
  pauseBtn: { backgroundColor: Colors.gold + '20', borderWidth: 2, borderColor: Colors.gold },
  resumeBtn: { backgroundColor: Colors.primary },
  stopBtn: { backgroundColor: Colors.error + '15', borderWidth: 2, borderColor: Colors.error },
  rewardInfo: {
    flexDirection: 'row', justifyContent: 'center', gap: 16,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'web' ? 94 : 100,
  },
  rewardCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  rewardLabel: { fontFamily: 'Nunito_400Regular', fontSize: 13, color: Colors.textSecondary },
});
