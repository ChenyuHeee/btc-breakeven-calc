# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A single-file, pure-client-side BTC trading tool with an LLM-driven multi-strategy quant competition system (Quant Arena). No framework, no build system, no backend. Everything in `index.html` (~2600 lines). `check.js` is a Node syntax checker that extracts the `<script>` block from index.html and evaluates it with `new Function()`.

## Commands

```bash
# Syntax-check the JS in index.html
node check.js
```

No `npm install` needed — zero dependencies.

## Architecture

Three dashboard columns in `index.html`:

- **翻倍挑战** (left) — Doubling challenge tracker with Binance account sync.
- **买入信号/卖出建议** (middle) — Manual trading: RSI/MACD/Bollinger indicators, buy/sell signals, one-click order execution.
- **Quant Arena** (right) — LLM-driven strategy competition system. All logic runs locally in the browser.

### Quant Arena architecture

The Arena is entirely browser-side. Data persists in `localStorage` under `arena_*` keys.

**PM System** — 5 PMs with distinct investment philosophies (保守派/均值回归, 趋势派/趋势跟踪, 突破派/突破交易, 量价派/量价分析, 宏观派/宏观周期). Each PM has:
- A fixed trading philosophy injected into their DeepSeek system prompt
- A level (1-10) based on cumulative track record
- Strategy slots (level 1=1 strat, level 4=2, level 7=3)
- Elimination if no top-3 strategy for 6 cycles

**Strategy lifecycle**: DeepSeek generates strategies → backtest (2yr daily klines) → paper pool → live (if top-2 and Sharpe>0.5) → eliminated (bottom-2 or drawdown breach)

**Key functions** (all in the `<script>` block):
| Function | Purpose |
|---|---|
| `arenaSMA`, `arenaATR` | Additional indicators (complement existing `calcRSI`, `calcEMA`, `calcMACD`, `calcBoll`) |
| `arenaIndicators(klines)` | Pre-compute all indicators for a dataset |
| `arenaEvalRule`, `arenaChkEntry`, `arenaChkExit` | Strategy rule evaluation |
| `arenaBacktest(strat, klines)` | Walk-forward backtest with 80/20 train/val split |
| `arenaValidate(spec)` | Validate strategy JSON from LLM |
| `arenaScore(metrics)` | Composite score (Sharpe×0.25 + WinRate×0.15 + Return×0.15 + ... ) |
| `arenaMarketCtx(klines)` | Build market context snapshot for LLM prompt |
| `arenaPMPrompt(pm)` | Build PM-specific system prompt with history/track record |
| `arenaCallLLM(pm, klines)` | Call DeepSeek API directly from browser |
| `arenaRunCycle(cb)` | Full cycle: fetch klines → evaluate positions → generate → backtest → rank → eliminate → promote |
| `arenaRender()` | Render Arena UI from localStorage data |

**LLM integration**: Calls `api.deepseek.com/v1/chat/completions` directly from the browser. DeepSeek API key stored in `localStorage` under `arenaDsKey`. Each PM receives a custom system prompt containing their trading philosophy, track record, past failures, and competitor strategies.

**Data flow**: User clicks 「▶ 运转」 → fetches daily klines from Binance (public API, no auth) → evaluates open paper positions → checks each PM's cooldown (>3 days since last generation) and available slots → calls DeepSeek in sequence → backtests new strategies → updates rankings → renders UI

**localStorage keys**: `arena_pms`, `arena_strategies`, `arena_trades`, `arena_klines`, `arena_state`, `arena_config`. Export via 「📤 导出」button.

### Binance API integration (manual trading column)

- **Spot**: `BINANCE_API` → `api.binance.com`, signed requests via `crypto.subtle` HMAC-SHA256
- **Futures**: `FAPI_URL` → `fapi.binance.com`
- **WebSocket**: `wss://stream.binance.com:9443/ws/btcusdt@trade` for live price
- **Proxy**: optional Cloudflare Worker for CORS when signing browser requests

### Known constraints

- `index.html` JS is all global scope — add new logic inline in the `<script>` block.
- Binance signed API calls from browser need a Cloudflare Worker proxy (CORS workaround). Public API calls (klines, ticker) don't need a proxy.
- DeepSeek API key is in `localStorage` (user-managed, not committed to git).
- No test suite — verify by running `node check.js` and loading `index.html` in a browser.
- Arena operates on daily timeframe — no real-time execution needed.
