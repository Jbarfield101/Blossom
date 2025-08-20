use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use async_trait::async_trait;
use futures::future::join_all;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use sqlx::sqlite::SqlitePoolOptions;
use sqlx::{Row, SqlitePool};
use tauri::async_runtime::Mutex;
use tauri::{AppHandle, Runtime};

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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
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
        let resp = reqwest::get(&url).await.map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            return Err(format!(
                "failed to fetch quote for {}: HTTP {}",
                ticker,
                resp.status()
            ));
        }
        let size = resp.content_length().unwrap_or_default();
        let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
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
            error: None,
        })
    }

    async fn fetch_series(&self, ticker: &str, range: &Range) -> Result<Vec<SeriesPoint>, String> {
        let url = format!(
            "https://query1.finance.yahoo.com/v8/finance/chart/{}?range={}&interval=5m",
            ticker,
            range.as_str()
        );
        let start = Instant::now();
        let resp = reqwest::get(&url).await.map_err(|e| e.to_string())?;
        if !resp.status().is_success() {
            return Err(format!(
                "failed to fetch series for {}: HTTP {}",
                ticker,
                resp.status()
            ));
        }
        let size = resp.content_length().unwrap_or_default();
        let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
        let result = json["chart"]["result"].get(0).ok_or("no result")?;
        let timestamps = result
            .get("timestamp")
            .and_then(|v| v.as_array())
            .ok_or("no ts")?;
        let closes = result["indicators"]["quote"]
            .get(0)
            .and_then(|v| v["close"].as_array())
            .ok_or("no close")?;
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
            error: None,
        })
    }

    async fn fetch_series(
        &self,
        _ticker: &str,
        _range: &Range,
    ) -> Result<Vec<SeriesPoint>, String> {
        Ok(vec![SeriesPoint {
            ts: Utc::now().timestamp(),
            close: 100.0,
        }])
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

static QUOTE_LOCKS: Lazy<Mutex<HashMap<String, Arc<Mutex<()>>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));
static SERIES_LOCKS: Lazy<Mutex<HashMap<(String, Range), Arc<Mutex<()>>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

static QUOTE_FETCH_MS: AtomicU64 = AtomicU64::new(0);
static QUOTE_FETCH_COUNT: AtomicU64 = AtomicU64::new(0);
static SERIES_FETCH_MS: AtomicU64 = AtomicU64::new(0);
static SERIES_FETCH_COUNT: AtomicU64 = AtomicU64::new(0);

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

static DB_POOL: Lazy<SqlitePool> = Lazy::new(|| {
    SqlitePoolOptions::new()
        .connect_lazy("sqlite:stocks.db")
        .expect("failed to create sqlite pool")
});

fn get_pool() -> &'static SqlitePool {
    &DB_POOL
}

async fn load_quote_db(pool: &SqlitePool, ticker: &str) -> Option<Quote> {
    let row = sqlx::query("SELECT data, ts FROM stock_quotes WHERE ticker = ?")
        .bind(ticker)
        .fetch_optional(pool)
        .await
        .ok()?;
    let row = row?;
    let data: String = row.get(0);
    let ts: i64 = row.get(1);
    if Utc::now().timestamp() - ts > QUOTE_TTL.as_secs() as i64 {
        None
    } else {
        serde_json::from_str(&data).ok()
    }
}

async fn save_quote_db(pool: &SqlitePool, q: &Quote) -> Result<(), String> {
    let data = serde_json::to_string(q).map_err(|e| e.to_string())?;
    let ts = Utc::now().timestamp();
    sqlx::query("INSERT OR REPLACE INTO stock_quotes (ticker, data, ts) VALUES (?,?,?)")
        .bind(&q.ticker)
        .bind(data)
        .bind(ts)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

async fn load_series_db(
    pool: &SqlitePool,
    ticker: &str,
    range: &Range,
) -> Option<Vec<SeriesPoint>> {
    let row = sqlx::query("SELECT data, ts FROM stock_series WHERE ticker = ? AND range = ?")
        .bind(ticker)
        .bind(range.as_str())
        .fetch_optional(pool)
        .await
        .ok()?;
    let row = row?;
    let data: String = row.get(0);
    let ts: i64 = row.get(1);
    if Utc::now().timestamp() - ts > SERIES_TTL.as_secs() as i64 {
        None
    } else {
        serde_json::from_str(&data).ok()
    }
}

async fn save_series_db(
    pool: &SqlitePool,
    ticker: &str,
    range: &Range,
    points: &[SeriesPoint],
) -> Result<(), String> {
    let data = serde_json::to_string(points).map_err(|e| e.to_string())?;
    let ts = Utc::now().timestamp();
    sqlx::query("INSERT OR REPLACE INTO stock_series (ticker, range, data, ts) VALUES (?,?,?,?)")
        .bind(ticker)
        .bind(range.as_str())
        .bind(data)
        .bind(ts)
        .execute(pool)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ========================
// Market clock
// ========================

fn compute_market_clock() -> MarketClock {
    fn next_trading_day(mut d: chrono::NaiveDate) -> chrono::NaiveDate {
        loop {
            d = d + chrono::Duration::days(1);
            match d.weekday() {
                chrono::Weekday::Sat | chrono::Weekday::Sun => continue,
                _ => break d,
            }
        }
    }

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

    let (phase, next_open, next_close) =
        if weekday == chrono::Weekday::Sat || weekday == chrono::Weekday::Sun {
            let next_day = next_trading_day(date);
            let next_open = New_York
                .from_local_datetime(&next_day.and_hms_opt(9, 30, 0).unwrap())
                .unwrap();
            let next_close = New_York
                .from_local_datetime(&next_day.and_hms_opt(16, 0, 0).unwrap())
                .unwrap();
            (
                MarketPhase::Closed,
                next_open.timestamp(),
                next_close.timestamp(),
            )
        } else if now_ny < pre_start {
            (
                MarketPhase::Closed,
                regular_start.timestamp(),
                regular_end.timestamp(),
            )
        } else if now_ny < regular_start {
            (
                MarketPhase::Pre,
                regular_start.timestamp(),
                regular_end.timestamp(),
            )
        } else if now_ny < regular_end {
            (
                MarketPhase::Open,
                regular_start.timestamp(),
                regular_end.timestamp(),
            )
        } else if now_ny < post_end {
            let next_day = next_trading_day(date);
            let next_open = New_York
                .from_local_datetime(&next_day.and_hms_opt(9, 30, 0).unwrap())
                .unwrap();
            let next_close = New_York
                .from_local_datetime(&next_day.and_hms_opt(16, 0, 0).unwrap())
                .unwrap();
            (
                MarketPhase::Post,
                next_open.timestamp(),
                next_close.timestamp(),
            )
        } else {
            let next_day = next_trading_day(date);
            let next_open = New_York
                .from_local_datetime(&next_day.and_hms_opt(9, 30, 0).unwrap())
                .unwrap();
            let next_close = New_York
                .from_local_datetime(&next_day.and_hms_opt(16, 0, 0).unwrap())
                .unwrap();
            (
                MarketPhase::Closed,
                next_open.timestamp(),
                next_close.timestamp(),
            )
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
    let provider: Arc<dyn Provider> = provider_from_env().into();
    let pool = get_pool().clone();

    let futures: Vec<_> = tickers
        .into_iter()
        .filter_map(|t| {
            let ticker = t.trim().to_uppercase();
            if ticker.is_empty() {
                return None;
            }
            let provider = provider.clone();
            let pool = pool.clone();
            let range = range.clone();
            Some(async move {
                let mut stale = false;

                // Quote
                let quote = {
                    let mut cached = {
                        let cache = QUOTE_CACHE.lock().await;
                        cache.get(&ticker).and_then(|(q, ts)| {
                            if ts.elapsed() < QUOTE_TTL {
                                QUOTE_HIT.fetch_add(1, Ordering::Relaxed);
                                Some(q.clone())
                            } else {
                                None
                            }
                        })
                    };
                    if cached.is_none() {
                        QUOTE_MISS.fetch_add(1, Ordering::Relaxed);
                        let lock = {
                            let mut locks = QUOTE_LOCKS.lock().await;
                            locks
                                .entry(ticker.clone())
                                .or_insert_with(|| Arc::new(Mutex::new(())))
                                .clone()
                        };
                        let _guard = lock.lock().await;
                        if cached.is_none() {
                            {
                                let cache = QUOTE_CACHE.lock().await;
                                if let Some((q, ts)) = cache.get(&ticker) {
                                    if ts.elapsed() < QUOTE_TTL {
                                        QUOTE_HIT.fetch_add(1, Ordering::Relaxed);
                                        cached = Some(q.clone());
                                    }
                                }
                            }
                        }
                        if cached.is_none() {
                            let fetch_start = Instant::now();
                            let fetched = provider.fetch_quote(&ticker).await;
                            let q = match fetched {
                                Ok(q) => {
                                    let _ = save_quote_db(&pool, &q).await;
                                    q
                                }
                                Err(e) => {
                                    stale = true;
                                    let mut q =
                                        load_quote_db(&pool, &ticker).await.unwrap_or(Quote {
                                            ticker: ticker.clone(),
                                            price: 0.0,
                                            change_percent: 0.0,
                                            status: "error".into(),
                                            error: None,
                                        });
                                    q.error = Some(e.clone());
                                    q
                                }
                            };
                            {
                                let mut cache = QUOTE_CACHE.lock().await;
                                cache.insert(ticker.clone(), (q.clone(), Instant::now()));
                            }
                            let ms = fetch_start.elapsed().as_millis() as u64;
                            QUOTE_FETCH_MS.fetch_add(ms, Ordering::Relaxed);
                            QUOTE_FETCH_COUNT.fetch_add(1, Ordering::Relaxed);
                            println!("quote {} total {} ms", ticker, ms);
                            q
                        } else {
                            cached.unwrap()
                        }
                    } else {
                        cached.unwrap()
                    }
                };

                // Series
                let series = {
                    let key = (ticker.clone(), range.clone());
                    let mut cached = {
                        let cache = SERIES_CACHE.lock().await;
                        cache.get(&key).and_then(|(pts, ts)| {
                            if ts.elapsed() < SERIES_TTL {
                                SERIES_HIT.fetch_add(1, Ordering::Relaxed);
                                Some(pts.clone())
                            } else {
                                None
                            }
                        })
                    };
                    let points = if cached.is_some() {
                        cached.unwrap()
                    } else {
                        SERIES_MISS.fetch_add(1, Ordering::Relaxed);
                        let lock = {
                            let mut locks = SERIES_LOCKS.lock().await;
                            locks
                                .entry(key.clone())
                                .or_insert_with(|| Arc::new(Mutex::new(())))
                                .clone()
                        };
                        let _guard = lock.lock().await;
                        if cached.is_none() {
                            {
                                let cache = SERIES_CACHE.lock().await;
                                if let Some((pts, ts)) = cache.get(&key) {
                                    if ts.elapsed() < SERIES_TTL {
                                        SERIES_HIT.fetch_add(1, Ordering::Relaxed);
                                        cached = Some(pts.clone());
                                    }
                                }
                            }
                        }
                        if let Some(p) = cached {
                            p
                        } else {
                            let fetch_start = Instant::now();
                            let res = provider.fetch_series(&ticker, &range).await;
                            let p = match res {
                                Ok(p) => {
                                    let _ = save_series_db(&pool, &ticker, &range, &p).await;
                                    {
                                        let mut cache = SERIES_CACHE.lock().await;
                                        cache.insert(key.clone(), (p.clone(), Instant::now()));
                                    }
                                    p
                                }
                                Err(e) => {
                                    stale = true;
                                    load_series_db(&pool, &ticker, &range).await.unwrap_or_else(
                                        || {
                                            println!("series {} error {}", ticker, e);
                                            Vec::new()
                                        },
                                    )
                                }
                            };
                            let ms = fetch_start.elapsed().as_millis() as u64;
                            SERIES_FETCH_MS.fetch_add(ms, Ordering::Relaxed);
                            SERIES_FETCH_COUNT.fetch_add(1, Ordering::Relaxed);
                            println!("series {} total {} ms", ticker, ms);
                            p
                        }
                    };
                    let status = if points.is_empty() {
                        "error".into()
                    } else {
                        "ok".into()
                    };
                    Series {
                        ticker: ticker.clone(),
                        range: range.clone(),
                        points,
                        status,
                    }
                };

                (quote, series, stale)
            })
        })
        .collect();

    let mut quotes = Vec::new();
    let mut series_vec = Vec::new();
    let mut stale_bundle = false;
    for (quote, series, stale) in join_all(futures).await {
        if stale {
            stale_bundle = true;
        }
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
