require "test_helper"

class PriceIngestJobTest < ActiveJob::TestCase
  setup do
    Price.delete_all
  end

  teardown do
    Price.delete_all
  end

  test "ingests prices for all symbols in universe" do
    VCR.use_cassette("price_ingest_job/ingests_prices_for_all_symbols_in_universe") do
      MarketData::SymbolUniverse.stubs(:all).returns(%w[TSLA AAPL])

      PriceIngestJob.perform_now(range: "1d")

      assert_equal 2, Price.count
      assert_equal 1, Price.where(symbol: "AAPL").count
      assert_equal 1, Price.where(symbol: "TSLA").count
    end
  end

  test "ingests prices for the given range" do
    VCR.use_cassette("price_ingest_job/ingests_prices_for_the_given_range") do
      MarketData::SymbolUniverse.stubs(:all).returns(%w[TSLA])

      PriceIngestJob.perform_now(range: "5d")

      assert_equal 5, Price.where(symbol: "TSLA").count
    end
  end

  test "spaces out requests to avoid rate limiting" do
    VCR.use_cassette("price_ingest_job/spaces_out_requests_to_avoid_rate_limiting") do
      MarketData::SymbolUniverse.stubs(:all).returns(%w[TSLA AAPL])

      start = Time.current
      PriceIngestJob.perform_now(range: "1d")
      end_time = Time.current

      assert_in_delta 0.8, end_time - start, 0.1 # 400ms sleep between requests
    end
  end

  test "updates existing prices" do
    Price.create!(
      symbol: "TSLA",
      date: Date.new(2025, 11, 21),
      open: 100, high: 100, low: 100,
      close: 100, volume: 100,
      adjusted_close: 100
    )

    VCR.use_cassette("price_ingest_job/updates_existing_prices") do
      MarketData::SymbolUniverse.stubs(:all).returns(%w[TSLA])

      PriceIngestJob.perform_now(range: "1d")
    end

    assert_equal 1, Price.where(symbol: "TSLA").count
    assert_not_equal 100, Price.where(symbol: "TSLA").last.close
  end
end
