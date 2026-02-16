import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export type BuildingType = 'house' | 'windmill' | 'lighthouse' | 'tree' | 'road';

export interface Building {
  id: string;
  type: BuildingType;
  level: number;
  x: number;
  y: number;
  placedAt: string;
  lastCollectedAt: string;
}

export interface FocusSession {
  id: string;
  startTime: string;
  endTime: string;
  plannedDuration: number;
  actualDuration: number;
  diamondsEarned: number;
  expEarned: number;
  status: 'completed' | 'aborted';
}

export interface DailyTask {
  id: string;
  name: string;
  description: string;
  progress: number;
  target: number;
  rewardDiamonds: number;
  rewardExp: number;
  status: 'active' | 'completed' | 'claimed';
  type: 'daily' | 'weekly';
  icon: string;
}

export interface GameState {
  nickname: string;
  diamonds: number;
  level: number;
  exp: number;
  totalFocusMinutes: number;
  buildings: Building[];
  focusHistory: FocusSession[];
  tasks: DailyTask[];
  lastTaskReset: string;
  lastWeeklyReset: string;
  createdAt: string;
}

export const BUILDING_COSTS: Record<BuildingType, number> = {
  house: 50,
  windmill: 80,
  lighthouse: 120,
  tree: 30,
  road: 20,
};

export const BUILDING_NAMES: Record<BuildingType, string> = {
  house: '木屋',
  windmill: '风车',
  lighthouse: '灯塔',
  tree: '树木',
  road: '石头路',
};

export const BUILDING_UPGRADE_COSTS: Record<BuildingType, number> = {
  house: 30,
  windmill: 50,
  lighthouse: 70,
  tree: 20,
  road: 15,
};

export const BUILDING_DAILY_PRODUCTION: Record<BuildingType, number> = {
  house: 3,
  windmill: 5,
  lighthouse: 8,
  tree: 2,
  road: 1,
};

export function expForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

function getDefaultTasks(): DailyTask[] {
  return [
    { id: 'daily_login', name: '每日登录', description: '打开应用', progress: 1, target: 1, rewardDiamonds: 10, rewardExp: 5, status: 'completed', type: 'daily', icon: 'log-in' },
    { id: 'daily_focus_30', name: '专注30分钟', description: '累计专注30分钟', progress: 0, target: 30, rewardDiamonds: 30, rewardExp: 15, status: 'active', type: 'daily', icon: 'clock' },
    { id: 'daily_build', name: '建造1个建筑', description: '在岛屿上放置建筑', progress: 0, target: 1, rewardDiamonds: 20, rewardExp: 10, status: 'active', type: 'daily', icon: 'home' },
    { id: 'weekly_focus_300', name: '专注300分钟', description: '本周累计专注300分钟', progress: 0, target: 300, rewardDiamonds: 100, rewardExp: 50, status: 'active', type: 'weekly', icon: 'trending-up' },
    { id: 'weekly_build_5', name: '建造5个建筑', description: '本周建造5个建筑', progress: 0, target: 5, rewardDiamonds: 80, rewardExp: 40, status: 'active', type: 'weekly', icon: 'grid' },
  ];
}

function getInitialState(): GameState {
  const now = new Date().toISOString();
  return {
    nickname: '岛主',
    diamonds: 100,
    level: 1,
    exp: 0,
    totalFocusMinutes: 0,
    buildings: [
      { id: Crypto.randomUUID(), type: 'house', level: 1, x: 2, y: 2, placedAt: now, lastCollectedAt: now },
    ],
    focusHistory: [],
    tasks: getDefaultTasks(),
    lastTaskReset: now,
    lastWeeklyReset: now,
    createdAt: now,
  };
}

interface GameContextValue {
  state: GameState;
  addDiamonds: (amount: number) => void;
  spendDiamonds: (amount: number) => boolean;
  addExp: (amount: number) => void;
  placeBuilding: (type: BuildingType, x: number, y: number) => boolean;
  upgradeBuilding: (id: string) => boolean;
  removeBuilding: (id: string) => void;
  completeFocus: (session: Omit<FocusSession, 'id'>) => void;
  claimTask: (taskId: string) => void;
  updateTaskProgress: (taskId: string, increment: number) => void;
  collectBuildingIncome: () => number;
  setNickname: (name: string) => void;
  isLoading: boolean;
}

const GameContext = createContext<GameContextValue | null>(null);

const STORAGE_KEY = '@chronohaven_game_state';

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(getInitialState());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadState();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      saveState(state);
    }
  }, [state, isLoading]);

  const loadState = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as GameState;
        const now = new Date();
        const lastReset = new Date(parsed.lastTaskReset);
        const lastWeekly = new Date(parsed.lastWeeklyReset);

        if (now.toDateString() !== lastReset.toDateString()) {
          const dailyTasks = getDefaultTasks().filter(t => t.type === 'daily');
          parsed.tasks = [
            ...dailyTasks,
            ...parsed.tasks.filter(t => t.type === 'weekly'),
          ];
          parsed.lastTaskReset = now.toISOString();
        }

        const daysSinceWeeklyReset = (now.getTime() - lastWeekly.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceWeeklyReset >= 7) {
          const weeklyTasks = getDefaultTasks().filter(t => t.type === 'weekly');
          parsed.tasks = [
            ...parsed.tasks.filter(t => t.type === 'daily'),
            ...weeklyTasks,
          ];
          parsed.lastWeeklyReset = now.toISOString();
        }

        setState(parsed);
      }
    } catch (e) {
      console.error('Failed to load game state:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveState = async (s: GameState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch (e) {
      console.error('Failed to save game state:', e);
    }
  };

  const addDiamonds = useCallback((amount: number) => {
    setState(prev => ({ ...prev, diamonds: prev.diamonds + amount }));
  }, []);

  const spendDiamonds = useCallback((amount: number): boolean => {
    let success = false;
    setState(prev => {
      if (prev.diamonds >= amount) {
        success = true;
        return { ...prev, diamonds: prev.diamonds - amount };
      }
      return prev;
    });
    return success;
  }, []);

  const addExp = useCallback((amount: number) => {
    setState(prev => {
      let newExp = prev.exp + amount;
      let newLevel = prev.level;
      let needed = expForLevel(newLevel);
      while (newExp >= needed) {
        newExp -= needed;
        newLevel++;
        needed = expForLevel(newLevel);
      }
      return { ...prev, exp: newExp, level: newLevel };
    });
  }, []);

  const placeBuilding = useCallback((type: BuildingType, x: number, y: number): boolean => {
    let success = false;
    setState(prev => {
      const cost = BUILDING_COSTS[type];
      if (prev.diamonds < cost) return prev;
      const occupied = prev.buildings.some(b => b.x === x && b.y === y);
      if (occupied) return prev;
      success = true;
      const now = new Date().toISOString();
      const newBuilding: Building = {
        id: Crypto.randomUUID(),
        type,
        level: 1,
        x,
        y,
        placedAt: now,
        lastCollectedAt: now,
      };
      const newTasks = prev.tasks.map(t => {
        if ((t.id === 'daily_build' || t.id === 'weekly_build_5') && t.status === 'active') {
          const newProgress = t.progress + 1;
          return {
            ...t,
            progress: newProgress,
            status: newProgress >= t.target ? 'completed' as const : 'active' as const,
          };
        }
        return t;
      });
      return {
        ...prev,
        diamonds: prev.diamonds - cost,
        buildings: [...prev.buildings, newBuilding],
        tasks: newTasks,
      };
    });
    return success;
  }, []);

  const upgradeBuilding = useCallback((id: string): boolean => {
    let success = false;
    setState(prev => {
      const building = prev.buildings.find(b => b.id === id);
      if (!building) return prev;
      const cost = BUILDING_UPGRADE_COSTS[building.type] * building.level;
      if (prev.diamonds < cost) return prev;
      success = true;
      return {
        ...prev,
        diamonds: prev.diamonds - cost,
        buildings: prev.buildings.map(b =>
          b.id === id ? { ...b, level: b.level + 1 } : b
        ),
      };
    });
    return success;
  }, []);

  const removeBuilding = useCallback((id: string) => {
    setState(prev => {
      const building = prev.buildings.find(b => b.id === id);
      if (!building) return prev;
      const refund = Math.floor(BUILDING_COSTS[building.type] * 0.5);
      return {
        ...prev,
        diamonds: prev.diamonds + refund,
        buildings: prev.buildings.filter(b => b.id !== id),
      };
    });
  }, []);

  const completeFocus = useCallback((session: Omit<FocusSession, 'id'>) => {
    setState(prev => {
      const newSession: FocusSession = { ...session, id: Crypto.randomUUID() };
      const newTasks = prev.tasks.map(t => {
        if ((t.id === 'daily_focus_30' || t.id === 'weekly_focus_300') && t.status === 'active') {
          const newProgress = Math.min(t.progress + session.actualDuration, t.target);
          return {
            ...t,
            progress: newProgress,
            status: newProgress >= t.target ? 'completed' as const : 'active' as const,
          };
        }
        return t;
      });
      return {
        ...prev,
        totalFocusMinutes: prev.totalFocusMinutes + session.actualDuration,
        focusHistory: [newSession, ...prev.focusHistory],
        tasks: newTasks,
      };
    });
  }, []);

  const claimTask = useCallback((taskId: string) => {
    setState(prev => {
      const task = prev.tasks.find(t => t.id === taskId);
      if (!task || task.status !== 'completed') return prev;
      let newExp = prev.exp + task.rewardExp;
      let newLevel = prev.level;
      let needed = expForLevel(newLevel);
      while (newExp >= needed) {
        newExp -= needed;
        newLevel++;
        needed = expForLevel(newLevel);
      }
      return {
        ...prev,
        diamonds: prev.diamonds + task.rewardDiamonds,
        exp: newExp,
        level: newLevel,
        tasks: prev.tasks.map(t =>
          t.id === taskId ? { ...t, status: 'claimed' as const } : t
        ),
      };
    });
  }, []);

  const updateTaskProgress = useCallback((taskId: string, increment: number) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(t => {
        if (t.id === taskId && t.status === 'active') {
          const newProgress = Math.min(t.progress + increment, t.target);
          return {
            ...t,
            progress: newProgress,
            status: newProgress >= t.target ? 'completed' as const : 'active' as const,
          };
        }
        return t;
      }),
    }));
  }, []);

  const collectBuildingIncome = useCallback((): number => {
    const now = new Date();
    let totalIncome = 0;
    setState(prev => {
      const updatedBuildings = prev.buildings.map(b => {
        const lastCollected = new Date(b.lastCollectedAt);
        const hoursSince = (now.getTime() - lastCollected.getTime()) / (1000 * 60 * 60);
        if (hoursSince >= 1) {
          const periods = Math.floor(hoursSince);
          const income = BUILDING_DAILY_PRODUCTION[b.type] * b.level * periods;
          totalIncome += income;
          return { ...b, lastCollectedAt: now.toISOString() };
        }
        return b;
      });
      return {
        ...prev,
        diamonds: prev.diamonds + totalIncome,
        buildings: updatedBuildings,
      };
    });
    return totalIncome;
  }, []);

  const setNickname = useCallback((name: string) => {
    setState(prev => ({ ...prev, nickname: name }));
  }, []);

  const value = useMemo(() => ({
    state,
    addDiamonds,
    spendDiamonds,
    addExp,
    placeBuilding,
    upgradeBuilding,
    removeBuilding,
    completeFocus,
    claimTask,
    updateTaskProgress,
    collectBuildingIncome,
    setNickname,
    isLoading,
  }), [state, isLoading, addDiamonds, spendDiamonds, addExp, placeBuilding, upgradeBuilding, removeBuilding, completeFocus, claimTask, updateTaskProgress, collectBuildingIncome, setNickname]);

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
}
