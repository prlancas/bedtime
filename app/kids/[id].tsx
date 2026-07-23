import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { BedtimeChart, ReasonBars } from '@/components/Charts';
import { Card } from '@/components/Card';
import { NavBar } from '@/components/NavBar';
import { Screen } from '@/components/Screen';
import {
  addAdjustment,
  getChild,
  getSettings,
  listReasons,
  listRecords,
  pendingPromiseCount,
  reasonStats,
  recordsSince,
  revokeGood,
  starBalance,
  streak,
} from '@/db/repo';
import type { BedtimeRecord, Reason } from '@/db/schema';
import { effectiveBedtime } from '@/lib/bedtime';
import { describeLastAction, shouldOfferDoTheSame } from '@/lib/lastAction';
import { addDays, dateKey, formatTime } from '@/lib/time';
import { useStore } from '@/store/useStore';

export default function ChildDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const childId = Number(id);
  const refresh = useStore((s) => s.refresh);
  const recordAction = useStore((s) => s.recordAction);
  const applyLastActionTo = useStore((s) => s.applyLastActionTo);
  const lastAction = useStore((s) => s.lastAction);
  const flags = useStore((s) => s.settings);
  const [, setTick] = useState(0);

  useFocusEffect(useCallback(() => setTick((t) => t + 1), []));

  const child = getChild(childId);
  if (!child) {
    return (
      <Screen>
        <NavBar title="Not found" back />
        <Text className="text-night-300">This child no longer exists.</Text>
      </Screen>
    );
  }

  const settings = getSettings();
  const tonight = effectiveBedtime(child.baseBedtimeMinutes, new Date(), settings);
  const days = streak(childId);
  const records = listRecords(childId, 60);
  const chartRecords = recordsSince(childId, dateKey(addDays(new Date(), -30)));
  const reasons = reasonStats(childId);
  const allReasons = listReasons();
  const reasonById = new Map<number, string>(allReasons.map((r: Reason) => [r.id, r.text]));
  const bank = starBalance(childId).bank;
  const promisesPending = pendingPromiseCount(childId);
  const offerSame = !!flags?.featureDoTheSame && shouldOfferDoTheSame(lastAction, childId);

  async function treat() {
    addAdjustment(childId, 'treat');
    recordAction({ type: 'treat', childId, ts: Date.now() });
    await refresh();
    setTick((t) => t + 1);
    Alert.alert(
      'Treat added ✨',
      `${child!.name}'s bedtime moved later by ${settings.goodDeltaMinutes} min.`,
    );
  }

  async function penalty() {
    addAdjustment(childId, 'penalty');
    recordAction({ type: 'penalty', childId, ts: Date.now() });
    await refresh();
    setTick((t) => t + 1);
    Alert.alert(
      'Penalty added',
      `${child!.name}'s bedtime moved earlier by ${settings.badDeltaMinutes} min.`,
    );
  }

  async function doTheSame() {
    await applyLastActionTo(childId);
    setTick((t) => t + 1);
    Alert.alert('Done ✅', `Applied the same to ${child!.name}.`);
  }

  function confirmRevoke(record: BedtimeRecord) {
    Alert.alert(
      'Revoke good bedtime',
      `Mark ${child!.name}'s ${record.date} as a bad night instead? Bedtime will move earlier.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            revokeGood(record.id);
            await refresh();
            setTick((t) => t + 1);
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <NavBar
        title={child.name}
        back
        right={[{ icon: 'create', onPress: () => router.push(`/kids/edit?id=${childId}`) }]}
      />

      {offerSame && lastAction && (
        <Pressable onPress={doTheSame} className="mb-4 active:opacity-80">
          <Card className="flex-row items-center gap-3 border border-moon/40">
            <Ionicons name="copy" size={22} color="#FDE68A" />
            <View className="flex-1">
              <Text className="text-sm font-bold text-moon">Do the same for {child.name}?</Text>
              <Text className="text-xs text-night-300">{describeLastAction(lastAction)}</Text>
            </View>
            <Ionicons name="arrow-forward-circle" size={24} color="#FDE68A" />
          </Card>
        </Pressable>
      )}

      <Card className="items-center">
        <Avatar name={child.name} photoUri={child.photoUri} color={child.color} size={88} />
        <Text className="mt-3 text-lg font-semibold text-moon">Tonight: {formatTime(tonight)}</Text>
        <Text className="text-sm text-night-300">
          Base {formatTime(child.baseBedtimeMinutes)} · {days} good night{days === 1 ? '' : 's'} in
          a row
        </Text>
        <View className="mt-4 w-full flex-row gap-3">
          <View className="flex-1">
            <Button
              label="Treat (later)"
              variant="treat"
              icon={<Ionicons name="gift" size={18} color="#1E1B4B" />}
              onPress={treat}
            />
          </View>
          <View className="flex-1">
            <Button
              label="Penalty (earlier)"
              variant="bad"
              icon={<Ionicons name="remove-circle" size={18} color="#1E1B4B" />}
              onPress={penalty}
            />
          </View>
        </View>
        <Button
          className="mt-3 w-full"
          label="Review tonight"
          icon={<Ionicons name="checkmark-done" size={18} color="#fff" />}
          onPress={() => router.push(`/assess?childId=${childId}`)}
        />
      </Card>

      <Card className="mt-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-base font-bold text-white">Stars & rewards</Text>
          <Text className={`text-lg font-black ${bank < 0 ? 'text-bad' : 'text-star'}`}>
            {bank}★{bank < 0 ? ' (debt)' : ''}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button
              label="Star"
              variant="good"
              icon={<Ionicons name="star" size={16} color="#1E1B4B" />}
              onPress={() =>
                router.push({
                  pathname: '/star-award',
                  params: { childId: String(childId), kind: 'good' },
                })
              }
            />
          </View>
          <View className="flex-1">
            <Button
              label="Slip-up"
              variant="bad"
              icon={<Ionicons name="cloud" size={16} color="#1E1B4B" />}
              onPress={() =>
                router.push({
                  pathname: '/star-award',
                  params: { childId: String(childId), kind: 'slip' },
                })
              }
            />
          </View>
        </View>
        {flags?.featureShop && (
          <Button
            className="mt-2"
            label="Star shop"
            variant="treat"
            icon={<Ionicons name="cart" size={16} color="#1E1B4B" />}
            onPress={() => router.push({ pathname: '/shop', params: { childId: String(childId) } })}
          />
        )}
        {flags?.featurePinkyPromises && (
          <Button
            className="mt-2"
            label={promisesPending > 0 ? `Pinky promises (${promisesPending})` : 'Pinky promise'}
            variant="ghost"
            icon={<Ionicons name="hand-left" size={16} color="#E0E3FF" />}
            onPress={() =>
              router.push({ pathname: '/promise', params: { childId: String(childId) } })
            }
          />
        )}
      </Card>

      <Text className="mb-2 mt-6 text-lg font-bold text-white">Bedtime over time</Text>
      <Card>
        <BedtimeChart records={chartRecords} />
      </Card>

      <Text className="mb-2 mt-6 text-lg font-bold text-white">Reasons for earlier bedtime</Text>
      <Card>
        <ReasonBars data={reasons} />
      </Card>

      <Text className="mb-2 mt-6 text-lg font-bold text-white">History</Text>
      {records.length === 0 ? (
        <Text className="text-night-300">No nights assessed yet.</Text>
      ) : (
        records.map((r) => (
          <View
            key={r.id}
            className="mb-2 flex-row items-center gap-3 rounded-2xl bg-night-800/70 p-3"
          >
            <Ionicons
              name={
                r.outcome === 'good' ? 'happy' : r.outcome === 'revoked' ? 'close-circle' : 'sad'
              }
              size={22}
              color={r.outcome === 'good' ? '#34D399' : '#FB7185'}
            />
            <View className="flex-1">
              <Text className="font-semibold text-white">
                {r.date} · {formatTime(r.scheduledBedtimeMinutes)}
              </Text>
              <Text className="text-xs text-night-300">
                {r.outcome === 'good'
                  ? 'Good night'
                  : `${r.outcome === 'revoked' ? 'Revoked' : 'Bad'}${
                      r.reasonId ? ` · ${reasonById.get(r.reasonId)}` : ''
                    }`}
                {r.note ? ` · ${r.note}` : ''}
              </Text>
            </View>
            {r.outcome === 'good' && (
              <Pressable
                onPress={() => confirmRevoke(r)}
                className="rounded-xl bg-night-900 px-3 py-2 active:opacity-70"
              >
                <Text className="text-xs font-bold text-bad">Revoke</Text>
              </Pressable>
            )}
          </View>
        ))
      )}
    </Screen>
  );
}
