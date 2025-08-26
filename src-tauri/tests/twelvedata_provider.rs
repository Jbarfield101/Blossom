use blossom_lib::stocks::{provider_from_env, Range, StockProvider};
use blossom_lib::commands::stock_forecast;
use httpmock::prelude::*;
use tauri::test::mock_app;

#[tokio::test]
async fn twelvedata_quote_and_series() {
    let server = MockServer::start();
    std::env::set_var("STOCKS_PROVIDER", "twelvedata");
    std::env::set_var("TWELVEDATA_API_KEY", "test");
    std::env::set_var("TWELVEDATA_BASE_URL", server.base_url());

    // price endpoint
    let _price = server.mock(|when, then| {
        when.method(GET)
            .path("/price")
            .query_param("symbol", "AAPL")
            .query_param("apikey", "test");
        then.status(200)
            .header("content-type", "application/json")
            .body("{\"price\":\"100\"}");
    });

    // time_series for quote change
    let _ts_quote = server.mock(|when, then| {
        when.method(GET)
            .path("/time_series")
            .query_param("symbol", "AAPL")
            .query_param("interval", "1day")
            .query_param("outputsize", "2")
            .query_param("apikey", "test");
        then.status(200)
            .header("content-type", "application/json")
            .body("{\"values\":[{\"datetime\":\"2024-03-01\",\"close\":\"100\",\"volume\":\"1000\"},{\"datetime\":\"2024-02-29\",\"close\":\"90\"}],\"status\":\"ok\"}");
    });

    // time_series for series call
    let _ts_series = server.mock(|when, then| {
        when.method(GET)
            .path("/time_series")
            .query_param("symbol", "AAPL")
            .query_param("interval", "1day")
            .query_param("outputsize", "30")
            .query_param("apikey", "test");
        then.status(200)
            .header("content-type", "application/json")
            .body("{\"values\":[{\"datetime\":\"2024-03-01\",\"close\":\"100\"}],\"status\":\"ok\"}");
    });

    let provider = provider_from_env();
    let q = provider.fetch_quote("AAPL").await.unwrap();
    assert_eq!(q.price, 100.0);
    assert!((q.change_percent - 11.111).abs() < 0.001);
    assert_eq!(q.volume, Some(1000));

    let pts = provider.fetch_series("AAPL", &Range::OneMonth).await.unwrap();
    assert_eq!(pts.len(), 1);
    assert_eq!(pts[0].close, 100.0);
}

#[tokio::test]
async fn twelvedata_forecast_uses_provider() {
    let server = MockServer::start();
    std::env::set_var("STOCKS_PROVIDER", "twelvedata");
    std::env::set_var("TWELVEDATA_API_KEY", "test");
    std::env::set_var("TWELVEDATA_BASE_URL", server.base_url());

    let _daily = server.mock(|when, then| {
        when.method(GET)
            .path("/time_series")
            .query_param("symbol", "AAPL")
            .query_param("interval", "1day")
            .query_param("outputsize", "5")
            .query_param("apikey", "test");
        then.status(200)
            .header("content-type", "application/json")
            .body("{\"values\":[{\"datetime\":\"2024-03-01\",\"close\":\"100\"}],\"status\":\"ok\"}");
    });

    let _weekly = server.mock(|when, then| {
        when.method(GET)
            .path("/time_series")
            .query_param("symbol", "AAPL")
            .query_param("interval", "1week")
            .query_param("outputsize", "26")
            .query_param("apikey", "test");
        then.status(200)
            .header("content-type", "application/json")
            .body("{\"values\":[{\"datetime\":\"2024-03-01\",\"close\":\"100\"}],\"status\":\"ok\"}");
    });

    let app = mock_app();
    let forecast = stock_forecast(app.app_handle(), "AAPL".into())
        .await
        .unwrap();
    assert_eq!(forecast.short_term, "up");
    assert_eq!(forecast.long_term, "down");
}
