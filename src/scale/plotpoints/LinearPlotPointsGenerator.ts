
import * as Enumerable from 'linq';

import { DataPoint, PlotPoint, TimeGap } from '../../util/Types';
import { DateTime } from 'luxon';

const JAN_1 = DateTime.local().startOf('year');

export default class LinearPlotPointsGenerator
{
	public static generate(points: DataPoint[]): PlotPoint[]
	{
		return points.map(point =>
		{
			const x = point.date.diff(JAN_1).as('days');
			const y = point.value;
			return { x, y, date: point.date };
		});
	}

	public static generateAvg7(points: DataPoint[], gaps: TimeGap[]): PlotPoint[]
	{
		return points
			.filter(point => !gaps.find(g =>
				+point.date > +g.from &&
				+point.date < +g.to))
			.map((point, index) =>
			{
				const x = point.date.diff(JAN_1).as('days');
				const previousIndex = Math.max(
					LinearPlotPointsGenerator.getFirstIndex(points, gaps, index),
					index - 7);
				const previousPoint = points[previousIndex];
				const diff = point.value - previousPoint.value;
				const indexDiff = index - previousIndex;
				const y = previousIndex === index ?
					+Infinity :
					diff / indexDiff;
				return { x, y, date: point.date };
			})
			.filter(p => p.y < +Infinity);
	}

	public static generateAvg7Change(points: DataPoint[], gaps: TimeGap[]): PlotPoint[]
	{
		return points
			.filter(point => !gaps.find(gap =>
				+point.date > +gap.from &&
				+point.date < +gap.to))
			.map((point, index) =>
			{
				const x = point.date.diff(JAN_1).as('days');
				const firstIndex = Math.max(
					LinearPlotPointsGenerator.getFirstIndex(points, gaps, index),
					index - 6);
				const valuesToAvg = points
					.slice(firstIndex, index)
					.map(p => p.value);
				const total = valuesToAvg.reduce((a, b) => a + b, 0);
				const y = total / valuesToAvg.length;
				return { x, y, date: point.date };
			})
			.filter(p => p.y < +Infinity);
	}

	private static getFirstIndex(points: DataPoint[], gaps: TimeGap[],
		index: number): number
	{
		const point = points[index];
		const gap = Enumerable
			.from(gaps)
			.where(g => +g.to <= +point.date)
			.orderBy(g => +g.to)
			.lastOrDefault();
		if (!gap)
			return 0;

		return Enumerable
			.from(points)
			.select((p, i) => ({ p, i }))
			.where(x => +x.p.date >= +gap.to)
			.select(x => x.i)
			.first();
	}
}
