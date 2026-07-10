import { Dimensions, Text, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';

import type { BedtimeRecord } from '@/db/schema';
import { colors } from '@/lib/theme';
import { formatTime } from '@/lib/time';

const SCREEN_W = Dimensions.get('window').width;

/** Bedtime (scheduled) over time. Y axis is offset so the line isn't squashed near 0. */
export function BedtimeChart({ records }: { records: BedtimeRecord[] }) {
  if (records.length < 2) {
    return (
      <Text className="py-6 text-center text-night-300">
        Not enough data yet — assess a few nights to see the trend.
      </Text>
    );
  }

  const values = records.map((r) => r.scheduledBedtimeMinutes);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const base = Math.floor((dataMin - 15) / 30) * 30;
  const top = Math.ceil((dataMax + 15) / 30) * 30;
  const range = Math.max(60, top - base);
  const noOfSections = 4;
  const step = range / noOfSections;

  const data = records.map((r) => ({
    value: r.scheduledBedtimeMinutes - base,
    label: r.date.slice(8),
    dataPointColor: r.outcome === 'good' ? colors.good : colors.bad,
  }));

  const yLabels = Array.from({ length: noOfSections + 1 }, (_, i) => formatTime(base + i * step));
  const spacing = Math.max(28, Math.min(60, (SCREEN_W - 120) / Math.max(1, data.length - 1)));

  return (
    <View className="mt-2">
      <LineChart
        data={data}
        maxValue={range}
        noOfSections={noOfSections}
        yAxisLabelTexts={yLabels}
        color={colors.moon}
        thickness={3}
        curved
        dataPointsRadius={4}
        spacing={spacing}
        initialSpacing={16}
        yAxisTextStyle={{ color: colors.night300, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: colors.night300, fontSize: 9 }}
        rulesColor="#37359155"
        yAxisColor="transparent"
        xAxisColor="#37359155"
      />
    </View>
  );
}

export function ReasonBars({ data }: { data: { reason: string; count: number }[] }) {
  if (data.length === 0) {
    return (
      <Text className="py-4 text-center text-night-300">No bad-bedtime reasons recorded. 🎉</Text>
    );
  }
  const barData = data.map((d) => ({
    value: d.count,
    label: d.reason.length > 8 ? `${d.reason.slice(0, 7)}…` : d.reason,
    frontColor: colors.bad,
    topLabelComponent: () => (
      <Text style={{ color: colors.night100, fontSize: 10 }}>{d.count}</Text>
    ),
  }));

  return (
    <View className="mt-2">
      <BarChart
        data={barData}
        barWidth={26}
        spacing={18}
        roundedTop
        frontColor={colors.bad}
        yAxisTextStyle={{ color: colors.night300, fontSize: 10 }}
        xAxisLabelTextStyle={{ color: colors.night300, fontSize: 9 }}
        noOfSections={3}
        rulesColor="#37359155"
        yAxisColor="transparent"
        xAxisColor="#37359155"
      />
    </View>
  );
}
