import { describe, expect, it } from "vitest";

import {
  normalizeFundHoldingCode,
  parseFundHoldingRows,
  resolveHoldingDisplayName,
} from "./market-data";

describe("fund holding parsing", () => {
  it("parses a standard Eastmoney holding row", () => {
    const html = `
      <table><tbody><tr>
        <td>1</td>
        <td><a href="/quote?code=600519">600519</a></td>
        <td><a href="/company/600519">贵州茅台</a></td>
        <td class='tor'>8.52%</td>
        <td class='tol'>1,234.56</td>
      </tr></tbody></table>
    `;

    expect(parseFundHoldingRows(html)).toEqual([
      {
        code: "600519",
        name: "贵州茅台",
        ratio: 8.52,
        shareCount: 1234.56,
      },
    ]);
  });

  it("accepts double quotes, extra whitespace, and a missing share count", () => {
    const html = `
      <tr>
        <td> 2 </td>
        <td> 00700 </td>
        <td><a href='/?stockcode=00700'> 腾讯控股 </a></td>
        <td class="tor"> 5.20 % </td>
        <td class="tol"> -- </td>
      </tr>
    `;

    expect(parseFundHoldingRows(html)).toEqual([
      {
        code: "00700",
        name: "腾讯控股",
        ratio: 5.2,
        shareCount: null,
      },
    ]);
  });

  it("never falls back to rendering the security code as the name", () => {
    expect(resolveHoldingDisplayName("600519", "600519", "")).toBe("证券名称待披露");
    expect(resolveHoldingDisplayName("600519", "600519", "贵州茅台")).toBe("贵州茅台");
  });

  it("removes the market suffix from seven-digit A-share holding codes", () => {
    expect(normalizeFundHoldingCode("3005020")).toBe("300502");
    expect(normalizeFundHoldingCode("6001831")).toBe("600183");
    expect(normalizeFundHoldingCode("00700")).toBe("00700");
  });
});
