import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { NavBar } from '@/components/NavBar';
import { Screen } from '@/components/Screen';
import { NumberStepper } from '@/components/TimeStepper';
import {
  addClubPause,
  deleteClubPause,
  getChild,
  isClubMuted,
  listClubPauses,
  listClubs,
} from '@/db/repo';
import { addDays, dateFromKey, dateKey, formatDate, formatTime } from '@/lib/time';
import { useStore } from '@/store/useStore';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Clubs() {
  const refresh = useStore((s) => s.refresh);
  const [, setTick] = useState(0);
  const [holidayDays, setHolidayDays] = useState(7);
  const bump = () => setTick((t) => t + 1);

  useFocusEffect(useCallback(() => bump(), []));

  const clubs = listClubs(false);
  const pauses = listClubPauses();
  const today = dateKey();

  async function addHoliday() {
    addClubPause({
      clubId: null,
      startDate: today,
      endDate: dateKey(addDays(new Date(), holidayDays - 1)),
      note: 'Holiday',
    });
    await refresh();
    bump();
  }

  async function removePause(id: number) {
    deleteClubPause(id);
    await refresh();
    bump();
  }

  return (
    <Screen>
      <NavBar
        title="Clubs & activities"
        subtitle="Weekly reminders with warnings"
        back
        right={[{ icon: 'add', onPress: () => router.push('/clubs/edit') }]}
      />

      {clubs.length === 0 ? (
        <Card className="items-center">
          <Text className="text-4xl">📆</Text>
          <Text className="mt-3 text-center text-white">No clubs yet.</Text>
          <Text className="mt-1 text-center text-night-300">
            Add recurring activities like Beavers or swimming and get a warning beforehand.
          </Text>
          <Button
            className="mt-4"
            label="Add a club"
            icon={<Ionicons name="add" size={18} color="#fff" />}
            onPress={() => router.push('/clubs/edit')}
          />
        </Card>
      ) : (
        clubs.map((club) => {
          const muted = isClubMuted(club.id, today);
          const who = club.childId ? (getChild(club.childId)?.name ?? '') : 'Everyone';
          return (
            <Pressable
              key={club.id}
              onPress={() =>
                router.push({ pathname: '/clubs/edit', params: { id: String(club.id) } })
              }
              className="mb-3 active:opacity-80"
            >
              <Card className={`flex-row items-center gap-3 ${club.active ? '' : 'opacity-50'}`}>
                <View
                  style={{ backgroundColor: club.color }}
                  className="h-12 w-12 items-center justify-center rounded-2xl"
                >
                  <Ionicons name="ribbon" size={22} color="#0B1020" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-white">{club.name}</Text>
                  <Text className="text-xs text-night-300">
                    {WEEKDAYS[club.weekday]} · {formatTime(club.startMinutes)} · {who}
                  </Text>
                </View>
                {muted && (
                  <View className="rounded-full bg-treat px-3 py-1">
                    <Text className="text-xs font-bold text-night-900">Muted</Text>
                  </View>
                )}
                <Ionicons name="chevron-forward" size={18} color="#5B5FE0" />
              </Card>
            </Pressable>
          );
        })
      )}

      <Text className="mb-2 mt-6 text-lg font-bold text-white">Holiday muting</Text>
      <Card className="gap-3">
        <Text className="text-xs text-night-300">
          Mute all club reminders during school holidays. They resume automatically afterwards.
        </Text>
        <NumberStepper
          label="Mute all clubs for"
          value={holidayDays}
          onChange={setHolidayDays}
          min={1}
          max={60}
          step={1}
          unit="days"
        />
        <Button
          label={`Mute for ${holidayDays} days`}
          variant="treat"
          icon={<Ionicons name="volume-mute" size={18} color="#1E1B4B" />}
          onPress={addHoliday}
        />
      </Card>

      {pauses.length > 0 && (
        <View className="mt-3 gap-2">
          {pauses.map((p) => (
            <View
              key={p.id}
              className="flex-row items-center gap-3 rounded-2xl bg-night-800/70 p-3"
            >
              <Ionicons name="volume-mute" size={18} color="#F472B6" />
              <Text className="flex-1 text-white">
                {p.clubId ? 'One club' : 'All clubs'} · {formatDate(dateFromKey(p.startDate))} –{' '}
                {formatDate(dateFromKey(p.endDate))}
              </Text>
              <Pressable onPress={() => removePause(p.id)} className="p-1 active:opacity-70">
                <Ionicons name="trash" size={18} color="#FB7185" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
