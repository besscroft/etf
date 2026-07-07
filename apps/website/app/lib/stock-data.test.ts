import { describe, expect, it } from "vitest";

import { domesticSecurityDetailPath, otcFundDetailPath } from "./detail-links";
import {
  detectDomesticSecurity,
  formatMinuteTimeLabel,
  isAShareSuggestItem,
  isExchangeETFCode,
  parseKLinePoint,
  parseMinutePoint,
} from "./stock-data";

describe("stock-data market helpers", () => {
  it("classifies A shares and exchange ETFs", () => {
    expect(detectDomesticSecurity("600519")).toMatchObject({
      kind: "stock",
      prefix: "SH",
      secid: 1,
    });
    expect(detectDomesticSecurity("510300")).toMatchObject({
      kind: "etf",
      prefix: "SH",
      secid: 1,
    });
    expect(detectDomesticSecurity("159915")).toMatchObject({
      kind: "etf",
      prefix: "SZ",
      secid: 0,
    });
    expect(isExchangeETFCode("510300")).toBe(true);
  });

  it("classifies Beijing Stock Exchange 920 codes with secid 0", () => {
    expect(detectDomesticSecurity("920527")).toMatchObject({
      kind: "stock",
      prefix: "BJ",
      secid: 0,
    });
  });

  it("filters suggest results to supported A-share stocks only", () => {
    expect(
      isAShareSuggestItem({
        Code: "600519",
        Name: "贵州茅台",
        Classify: "AStock",
        SecurityTypeName: "沪A",
      }),
    ).toBe(true);
    expect(
      isAShareSuggestItem({
        Code: "688001",
        Name: "华兴源创",
        Classify: "23",
        SecurityTypeName: "科创板",
      }),
    ).toBe(true);
    expect(
      isAShareSuggestItem({
        Code: "920527",
        Name: "夜光明",
        Classify: "NEEQ",
        SecurityTypeName: "京A",
      }),
    ).toBe(true);
    expect(
      isAShareSuggestItem({
        Code: "512410",
        Name: "银行ETF广发",
        Classify: "Fund",
        SecurityTypeName: "ETF",
      }),
    ).toBe(false);
    expect(
      isAShareSuggestItem({
        Code: "02318",
        Name: "中国平安",
        Classify: "HK",
        SecurityTypeName: "港股",
      }),
    ).toBe(false);
  });

  it("parses Eastmoney minute rows with close price and trailing average price", () => {
    const row = parseMinutePoint(
      "2026-07-07 15:00,1189.19,1188.80,1189.19,1188.80,326,38740614.00,1193.118",
    );

    expect(row.time).toBe("2026-07-07 15:00");
    expect(row.price).toBeCloseTo(1188.8);
    expect(row.avgPrice).toBeCloseTo(1193.118);
    expect(row.volume).toBe(326);
    expect(row.turnover).toBe(38_740_614);
    expect(formatMinuteTimeLabel(row.time)).toBe("15:00");
  });

  it("parses kline rows into OHLC and volume fields", () => {
    const row = parseKLinePoint(
      "2026-07-07,1200.00,1188.80,1202.00,1188.11,27365,3264967794.00,1.15,-1.50,-18.11,0.22",
    );

    expect(row.open).toBe(1200);
    expect(row.close).toBeCloseTo(1188.8);
    expect(row.high).toBe(1202);
    expect(row.low).toBeCloseTo(1188.11);
    expect(row.volume).toBe(27_365);
    expect(row.turnover).toBe(3_264_967_794);
  });

  it("generates canonical detail links by business type", () => {
    expect(domesticSecurityDetailPath("600519")).toBe("/stock/600519");
    expect(domesticSecurityDetailPath("510300")).toBe("/etf/510300");
    expect(domesticSecurityDetailPath("159915")).toBe("/etf/159915");
    expect(otcFundDetailPath("005827")).toBe("/otc-fund?code=005827");
  });
});
