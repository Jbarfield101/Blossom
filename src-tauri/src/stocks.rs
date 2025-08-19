use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{Duration, Instant};

use async_trait::async_trait;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime};
use tauri::async_runtime::Mutex;
use sqlx::{Row, SqlitePool};

use chrono::{Datelike, TimeZone, Utc};
use chrono_tz::America::New_York;

// ========================
// Data contract
// ========================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Quote {
    pub ticker: String,
    pub price: f64,
    pub change_percent: f64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SeriesPoint {
    pub ts: i64,
    pub close: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Series {
    pub ticker: String,
    pub range: Range,
    pub points: Vec<SeriesPoint>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketClock {
    pub phase: MarketPhase,
    pub next_open_ts: i64,
    pub next_close_ts: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MarketPhase {
    Pre,
    Open,
    Post,
    Closed,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum Range {
    #[serde(rename = "1D")]
    OneDay,
    #[serde(rename = "5D")]
    FiveDay,
    #[serde(rename = "1M")]
    OneMonth,
}

impl Range {
    fn as_str(&self) -> &'static str {
        match self {
            Range::OneDay => "1d",
            Range::FiveDay => "5d",
            Range::OneMonth => "1mo",
        }
    }

    fn parse(s: &str) -> Option<Self> {
        match s {
            "1d" | "1D" => Some(Range::OneDay),
            "5d" | "5D" => Some(Range::FiveDay),
            "1m" | "1M" | "1mo" | "1MO" => Some(Range::OneMonth),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StockBundle {
    pub quotes: Vec<Quote>,
    pub series: Vec<Series>,
    pub market: MarketClock,
    pub stale: bool,
}

// ========================
// Provider abstraction
// ========================

#[async_trait]
trait Provider: Send + Sync {
    async fn fetch_quote(&self, ticker: &str) -> Result<Quote, String>;
    async fn fetch_series(&self, ticker: &str, range: &Range) -> Result<Vec<SeriesPoint>, String>;
}

struct YahooProvider;

#[async_trait]
impl Provider for YahooProvider {
    async fn fetch_quote(&self, ticker: &str) -> Result<Quote, String> {
        let url = format!(
            "https://query1.finance.yahoo.com/v7/finance/quote?symbols={}",
            ticker
        );
        let start = Instant::now();
        let resp = ureq::get(&url).call().map_err(|e| e.to_string())?;
        let size = resp
            .header("content-length")
            .and_then(|v| v.parse::<u64>().ok())
            .unwrap_or_default();
        let json: serde_json::Value = resp.into_json().map_err(|e| e.to_string())?;
        let result = json["quoteResponse"]["result"].get(0).ok_or("no result")?;
        let price = result
            .get("regularMarketPrice")
            .and_then(|v| v.as_f64())
            .ok_or("no price")?;
        let change_percent = result
            .get("regularMarketChangePercent")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0);
        let status = result
            .get("marketState")
            .and_then(|v| v.as_str())
            .unwrap_or("UNKNOWN")
            .to_string();
        println!(
            "quote {} fetched in {} ms ({} bytes)",
            ticker,
            start.elapsed().as_millis(),
            size
        );
        Ok(Quote {
            ticker: ticker.to_string(),
            price,
            change_percent,
            status,
        })
    }

    async fn fetch_series(&self, ticker: &str, range: &Range) -> Result<Vec<SeriesPoint>, String> {
        let url = format!(
            "https://query1.finance.yahoo.com/v8/finance/chart/{}?range={}&interval=5m",
            ticker,
            range.as_str()
        );
        let start = Instant::now();
        let resp = ureq::get(&url).call().map_err(|e| e.to_string())?;
        let size = resp
            .header("content-length")
            .and_then(|v| v.parse::<u64>().ok())
            .unwrap_or_default();
        let json: serde_json::Value = resp.into_json().map_err(|e| e.to_string())?;
        let result = json["chart"]["result"].get(0).ok_or("no result")?;
        let timestamps = result
            .get("timestamp")
            .and_then(|v| v.as_array())
            .ok_or("no ts")?;
        let closes = result["indicators"]["quote"].get(0).and_then(|v| v["close"].as_array()).ok_or("no close")?;
        let mut points = Vec::new();
        for (ts, close) in timestamps.iter().zip(closes.iter()) {
            if let (Some(ts), Some(close)) = (ts.as_i64(), close.as_f64()) {
                points.push(SeriesPoint { ts, close });
            }
        }
        println!(
            "series {} {} points fetched in {} ms ({} bytes)",
            ticker,
            points.len(),
            start.elapsed().as_millis(),
            size
        );
        Ok(points)
    }
}

struct StubProvider;

#[async_trait]
impl Provider for StubProvider {
    async fn fetch_quote(&self, ticker: &str) -> Result<Quote, String> {
        Ok(Quote {
            ticker: ticker.to_string(),
            price: 100.0,
            change_percent: 0.0,
            status: "STUB".into(),
        })
    }

    async fn fetch_series(&self, _ticker: &str, _range: &Range) -> Result<Vec<SeriesPoint>, String> {
        Ok(vec![SeriesPoint { ts: Utc::now().timestamp(), close: 100.0 }])
    }
}

fn provider_from_env() -> Box<dyn Provider> {
    if std::env::var("STOCKS_PROVIDER").unwrap_or_default() == "stub" {
        Box::new(StubProvider)
    } else {
        Box::new(YahooProvider)
    }
}

// ========================
// In-memory cache
// ========================

static QUOTE_CACHE: Lazy<Mutex<HashMap<String, (Quote, Instant)>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));
static SERIES_CACHE: Lazy<Mutex<HashMap<(String, Range), (Vec<SeriesPoint>, Instant)>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));
static LAST_SWEEP: Lazy<Mutex<Instant>> = Lazy::new(|| Mutex::new(Instant::now()));

static QUOTE_HIT: AtomicU64 = AtomicU64::new(0);
static QUOTE_MISS: AtomicU64 = AtomicU64::new(0);
static SERIES_HIT: AtomicU64 = AtomicU64::new(0);
static SERIES_MISS: AtomicU64 = AtomicU64::new(0);

const QUOTE_TTL: Duration = Duration::from_secs(20);
const SERIES_TTL: Duration = Duration::from_secs(300);

async fn sweep_cache() {
    let mut last = LAST_SWEEP.lock().await;
    if last.elapsed() < Duration::from_secs(60) {
        return;
    }
    *last = Instant::now();
    {
        let mut qc = QUOTE_CACHE.lock().await;
        qc.retain(|_, (_, ts)| ts.elapsed() < QUOTE_TTL);
    }
    {
        let mut sc = SERIES_CACHE.lock().await;
        sc.retain(|_, (_, ts)| ts.elapsed() < SERIES_TTL);
    }
}

// ========================
// SQLite helpers
// ========================

async fn get_pool() -> Result<SqlitePool, sqlx::Error> {
    SqlitePool::connect("sqlite:stocks.db").await
}

async fn load_quote_db(ticker: &str) -> Option<Quote> {
    let pool = get_pool().await.ok()?;
    let row = sqlx::query("SELECT data FROM stock_quotes WHERE ticker = ?")
        .bind(ticker)
        .fetch_optional(&pool)
        .await
        .ok()?;
    let data: String = row?.get(0);
    serde_json::from_str(&data).ok()
}

async fn save_quote_db(q: &Quote) -> Result<(), String> {
    let pool = get_pool().await.map_err(|e| e.to_string())?;
    let data = serde_json::to_string(q).map_err(|e| e.to_string())?;
    let ts = Utc::now().timestamp();
    sqlx::query("INSERT OR REPLACE INTO stock_quotes (ticker, data, ts) VALUES (?,?,?)")
        .bind(&q.ticker)
        .bind(data)
        .bind(ts)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

async fn load_series_db(ticker: &str, range: &Range) -> Option<Vec<SeriesPoint>> {
    let pool = get_pool().await.ok()?;
    let row = sqlx::query("SELECT data FROM stock_series WHERE ticker = ? AND range = ?")
        .bind(ticker)
        .bind(range.as_str())
        .fetch_optional(&pool)
        .await
        .ok()?;
    let data: String = row?.get(0);
    serde_json::from_str(&data).ok()
}

async fn save_series_db(ticker: &str, range: &Range, points: &[SeriesPoint]) -> Result<(), String> {
    let pool = get_pool().await.map_err(|e| e.to_string())?;
    let data = serde_json::to_string(points).map_err(|e| e.to_string())?;
    let ts = Utc::now().timestamp();
    sqlx::query("INSERT OR REPLACE INTO stock_series (ticker, range, data, ts) VALUES (?,?,?,?)")
        .bind(ticker)
        .bind(range.as_str())
        .bind(data)
        .bind(ts)
        .execute(&pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ========================
// Market clock
// ========================

fn compute_market_clock() -> MarketClock {
    let now_ny = Utc::now().with_timezone(&New_York);
    let weekday = now_ny.weekday();
    let date = now_ny.date_naive();
    let pre_start = New_York
        .from_local_datetime(&date.and_hms_opt(4, 0, 0).unwrap())
        .unwrap();
    let regular_start = New_York
        .from_local_datetime(&date.and_hms_opt(9, 30, 0).unwrap())
        .unwrap();
    let regular_end = New_York
        .from_local_datetime(&date.and_hms_opt(16, 0, 0).unwrap())
        .unwrap();
    let post_end = New_York
        .from_local_datetime(&date.and_hms_opt(20, 0, 0).unwrap())
        .unwrap();

    let (phase, next_open, next_close) = if weekday == chrono::Weekday::Sat
        || weekday == chrono::Weekday::Sun
    {
        // weekend: next open Monday 9:30
        let days_ahead = (7 - weekday.num_days_from_monday() as i64) % 7;
        let next_day = date + chrono::Duration::days(days_ahead as i64);
        let next_open = New_York
            .from_local_datetime(&next_day.and_hms_opt(9, 30, 0).unwrap())
            .unwrap();
        (MarketPhase::Closed, next_open.timestamp(), regular_end.timestamp())
    } else if now_ny < pre_start {
        (MarketPhase::Closed, regular_start.timestamp(), pre_start.timestamp())
    } else if now_ny < regular_start {
        (MarketPhase::Pre, regular_start.timestamp(), regular_start.timestamp())
    } else if now_ny < regular_end {
        (MarketPhase::Open, regular_end.timestamp(), regular_end.timestamp())
    } else if now_ny < post_end {
        (MarketPhase::Post, regular_start.timestamp() + 24 * 3600, post_end.timestamp())
    } else {
        let next_day = date + chrono::Duration::days(1);
        let next_open = New_York
            .from_local_datetime(&next_day.and_hms_opt(9, 30, 0).unwrap())
            .unwrap();
        (MarketPhase::Closed, next_open.timestamp(), post_end.timestamp())
    };

    MarketClock {
        phase,
        next_open_ts: next_open,
        next_close_ts: next_close,
    }
}

// ========================
// Public command
// ========================

pub async fn stocks_fetch<R: Runtime>(
    _app: AppHandle<R>,
    tickers: Vec<String>,
    range: String,
) -> Result<StockBundle, String> {
    if tickers.is_empty() {
        return Err("ticker list empty".into());
    }
    let range = Range::parse(&range).ok_or_else(|| "bad range".to_string())?;

    sweep_cache().await;
    let provider = provider_from_env();

    let mut quotes = Vec::new();
    let mut series_vec = Vec::new();
    let mut stale_bundle = false;

    for t in tickers {
        let ticker = t.trim().to_uppercase();
        if ticker.is_empty() {
            continue;
        }
        // Quote
        let quote = {
            let now = Instant::now();
            let mut cached = None;
            {
                let cache = QUOTE_CACHE.lock().await;
                if let Some((q, ts)) = cache.get(&ticker) {
                    if ts.elapsed() < QUOTE_TTL {
                        QUOTE_HIT.fetch_add(1, Ordering::Relaxed);
                        cached = Some(q.clone());
                    }
                }
            }
            if let Some(q) = cached {
                q
            } else {
                QUOTE_MISS.fetch_add(1, Ordering::Relaxed);
                let fetched = provider.fetch_quote(&ticker).await;
                let q = match fetched {
                    Ok(q) => {
                        let _ = save_quote_db(&q).await;
                        q
                    }
                    Err(e) => {
                        stale_bundle = true;
                        load_quote_db(&ticker).await.unwrap_or(Quote {
                            ticker: ticker.clone(),
                            price: 0.0,
                            change_percent: 0.0,
                            status: e.clone(),
                        })
                    }
                };
                {
                    let mut cache = QUOTE_CACHE.lock().await;
                    cache.insert(ticker.clone(), (q.clone(), Instant::now()));
                }
                println!("quote {} total {} ms", ticker, now.elapsed().as_millis());
                q
            }
        };

        // Series
        let series = {
            let now = Instant::now();
            let key = (ticker.clone(), range.clone());
            let mut cached = None;
            {
                let cache = SERIES_CACHE.lock().await;
                if let Some((pts, ts)) = cache.get(&key) {
                    if ts.elapsed() < SERIES_TTL {
                        SERIES_HIT.fetch_add(1, Ordering::Relaxed);
                        cached = Some(pts.clone());
                    }
                }
            }
            let points = if let Some(p) = cached {
                p
            } else {
                SERIES_MISS.fetch_add(1, Ordering::Relaxed);
                let res = provider.fetch_series(&ticker, &range).await;
                match res {
                    Ok(p) => {
                        let _ = save_series_db(&ticker, &range, &p).await;
                        {
                            let mut cache = SERIES_CACHE.lock().await;
                            cache.insert(key.clone(), (p.clone(), Instant::now()));
                        }
                        p
                    }
                    Err(e) => {
                        stale_bundle = true;
                        load_series_db(&ticker, &range).await.unwrap_or_else(|| {
                            println!("series {} error {}", ticker, e);
                            Vec::new()
                        })
                    }
                }
            };
            let status = if points.is_empty() {
                "error".into()
            } else {
                "ok".into()
            };
            println!("series {} total {} ms", ticker, now.elapsed().as_millis());
            Series {
                ticker: ticker.clone(),
                range: range.clone(),
                points,
                status,
            }
        };

        quotes.push(quote);
        series_vec.push(series);
    }

    let market = compute_market_clock();
    Ok(StockBundle {
        quotes,
        series: series_vec,
        market,
        stale: stale_bundle,
    })
}

