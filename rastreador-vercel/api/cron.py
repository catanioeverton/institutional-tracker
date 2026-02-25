from http.server import BaseHTTPRequestHandler
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import pytz
import requests
import json

# ==============================================================================
# CONFIGURAÇÕES
# ==============================================================================
API_URL_FOREX = "https://institutional-tracker-backend.vercel.app/api/update-strength"
API_URL_INDICES = "https://institutional-tracker-backend.vercel.app/api/update-indices"

currencies = ['EUR', 'USD', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD']

assets_indices = {
    'IDX_USD':  'DX-Y.NYB', 'IDX_EUR':  '6E=F', 'IDX_GBP':  '6B=F',
    'IDX_JPY':  '6J=F', 'IDX_CHF':  '6S=F', 'IDX_CAD':  '6C=F',
    'IDX_AUD':  '6A=F', 'IDX_NZD':  '6N=F', 'SP500':    'ES=F',
    'NAS100':   'NQ=F', 'US30':     'YM=F', 'GOLD':     'GC=F',
    'BTC':      'BTC-USD', 'IBOV':     '^BVSP', 'DOLAR_BR': 'BRL=X'
}

TZ_OPERACIONAL = pytz.timezone('Etc/GMT+5') 
last_readings = {"1h": {}, "4h": {}, "daily": {}}

# ==============================================================================
# FUNÇÕES AUXILIARES
# ==============================================================================
def get_trend_arrow(mode, asset, current_val):
    global last_readings
    if mode not in last_readings: last_readings[mode] = {}
    if asset not in last_readings[mode] or last_readings[mode][asset] is None: return "→"
    old_val = last_readings[mode][asset]
    if current_val > old_val + 0.005: return "↑"
    elif current_val < old_val - 0.005: return "↓"
    else: return "→"

def calculate_strength(mode):
    data_results = {}
    PERIOD_OFFSET = 12 if mode == "1h" else 48
    
    for base in currencies:
        for quote in currencies:
            if base != quote:
                symbol = f"{base}{quote}=X"
                try:
                    ticker = yf.Ticker(symbol)
                    hist = ticker.history(period="5d", interval="5m")
                    if hist is None or hist.empty or len(hist) < 50: continue
                    hist.index = hist.index.tz_convert(TZ_OPERACIONAL)
                    current_price = hist['Close'].iloc[-1]
                    
                    if mode == "daily":
                        now = datetime.now(TZ_OPERACIONAL)
                        days_back = 3 if now.weekday() == 0 else 1
                        target_day = now - timedelta(days=days_back)
                        alvo_data = target_day.replace(hour=17, minute=0, second=0, microsecond=0)
                        try: idx = hist.index.get_indexer([alvo_data], method='nearest')[0]
                        except: idx = 0
                        if idx >= len(hist) - 10: idx = 0 
                        price_past = hist['Close'].iloc[idx]
                    else:
                        if len(hist) > PERIOD_OFFSET + 1: price_past = hist['Close'].iloc[-(PERIOD_OFFSET + 1)]
                        else: price_past = hist['Close'].iloc[0]
                    
                    change = ((current_price - price_past) / price_past) * 100
                    data_results[f"{base}{quote}"] = change
                except: continue
    
    strength_map, score_map = {}, {}
    for c in currencies:
        pos = [v for k, v in data_results.items() if k.startswith(c)]
        neg = [v for k, v in data_results.items() if k.endswith(c)]
        if not pos and not neg: strength_map[c] = 0; score_map[c] = 0; continue
        strength_map[c] = round((sum(pos) - sum(neg)) / 7, 3)
        win = sum(1 for v in pos if v > 0) + sum(1 for v in neg if v < 0)
        loss = sum(1 for v in pos if v < 0) + sum(1 for v in neg if v > 0)
        score_map[c] = win - loss
    return pd.Series(strength_map), pd.Series(score_map)

def get_data_change_indices(name, ticker_symbol, mode):
    try:
        ticker = yf.Ticker(ticker_symbol)
        hist = ticker.history(period="5d", interval="1h")
        if hist is None or hist.empty or len(hist) < 5: return 0.0
        hist.index = hist.index.tz_convert(TZ_OPERACIONAL)
        current_price = hist['Close'].iloc[-1]
        
        if mode == "daily":
            ontem = datetime.now(TZ_OPERACIONAL) - timedelta(days=1)
            alvo_data = ontem.replace(hour=17, minute=0, second=0, microsecond=0)
            try:
                idx = hist.index.get_indexer([alvo_data], method='nearest')[0]
                price_past = hist['Close'].iloc[idx]
                return ((current_price - price_past) / price_past) * 100
            except: return 0.0
        else:
            offset = 1 if mode == "1h" else 4
            if len(hist) > offset + 1:
                price_past = hist['Close'].iloc[-(offset + 1)]
                return ((current_price - price_past) / price_past) * 100
            else: return 0.0
    except: return 0.0

# ==============================================================================
# HANDLER DA VERCEL
# ==============================================================================
class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            now = datetime.now(TZ_OPERACIONAL)
            
            # --- 1. CÁLCULO FOREX ---
            s1h, sc1h = calculate_strength("1h")
            s4h, sc4h = calculate_strength("4h")
            sd, scd = calculate_strength("daily")
            
            # --- 2. CÁLCULO ÍNDICES ---
            indices_data = {}
            ordered_keys = [k for k in assets_indices.keys() if 'IDX_' in k] + [k for k in assets_indices.keys() if 'IDX_' not in k]
            
            for name in ordered_keys:
                sym = assets_indices[name]
                v1h = get_data_change_indices(name, sym, "1h")
                v4h = get_data_change_indices(name, sym, "4h")
                vD  = get_data_change_indices(name, sym, "daily")
                indices_data[name] = {"1h": v1h, "4h": v4h, "daily": vD}

            # --- 3. MONTAGEM DOS PAYLOADS ---
            payload_forex = {"data": {
                "h1": s1h.to_dict(), "h4": s4h.to_dict(), "daily": sd.to_dict(),
                "scores_h1": sc1h.to_dict(), "scores_h4": sc4h.to_dict(), "scores_daily": scd.to_dict(),
                "setup_h1": f"{s1h.idxmax()}/{s1h.idxmin()}",
                "setup_h4": f"{s4h.idxmax()}/{s4h.idxmin()}",
                "setup_daily": f"{sd.idxmax()}/{sd.idxmin()}"
            }}
            
            payload_indices = {
                "metadata": {"last_update": now.strftime('%H:%M:%S')},
                "data": indices_data
            }
            
            # --- 4. ENVIO PARA O SITE ---
            req_forex = requests.post(API_URL_FOREX, json=payload_forex)
            req_indices = requests.post(API_URL_INDICES, json=payload_indices)
            
            # Resposta de Sucesso para a Vercel
            self.send_response(200)
            self.send_header('Content-type','text/plain')
            self.end_headers()
            mensagem = f"Sucesso! Forex Status: {req_forex.status_code} | Indices Status: {req_indices.status_code}"
            self.wfile.write(mensagem.encode('utf-8'))
            
        except Exception as e:
            # Resposta de Erro para a Vercel
            self.send_response(500)
            self.send_header('Content-type','text/plain')
            self.end_headers()
            self.wfile.write(f'Erro no rastreamento: {str(e)}'.encode('utf-8'))