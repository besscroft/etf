import { isExchangeETFCode } from "./stock-data";

export function domesticSecurityDetailPath(code: string): string {
  return isExchangeETFCode(code) ? `/etf/${code}` : `/stock/${code}`;
}

export function otcFundDetailPath(code: string): string {
  return `/otc-fund?code=${encodeURIComponent(code)}`;
}
