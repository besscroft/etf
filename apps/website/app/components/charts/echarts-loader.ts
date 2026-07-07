import type * as EChartsCore from "echarts/core";

let echartsPromise: Promise<typeof EChartsCore> | null = null;

export async function loadECharts() {
  if (!echartsPromise) {
    echartsPromise = Promise.all([
      import("echarts/core"),
      import("echarts/charts"),
      import("echarts/components"),
      import("echarts/renderers"),
      import("echarts/features"),
    ]).then(([echarts, charts, components, renderers, features]) => {
      echarts.use([
        charts.LineChart,
        charts.BarChart,
        charts.CandlestickChart,
        charts.PieChart,
        components.AriaComponent,
        components.DatasetComponent,
        components.DataZoomComponent,
        components.GridComponent,
        components.LegendComponent,
        components.TooltipComponent,
        renderers.CanvasRenderer,
        features.LabelLayout,
        features.UniversalTransition,
      ]);

      return echarts;
    });
  }

  return echartsPromise;
}
