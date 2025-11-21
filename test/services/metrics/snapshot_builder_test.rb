require "test_helper"

module Metrics
  class SnapshotBuilderTest < ActiveSupport::TestCase
    describe "#call" do
      before do
        default_data = { open: 0, high: 0, low: 0, close: 0, volume: 0 }
        365.times do |i|
          Price.create!(symbol: "^NDX", date: Date.current - i.days, **default_data, adjusted_close: rand(1000..10000))
          Price.create!(symbol: "BTC-USD", date: Date.current - i.days, **default_data, adjusted_close: rand(10000..100000))
          Price.create!(symbol: "^VIX", date: Date.current - i.days, **default_data, adjusted_close: rand(10..100))
          Price.create!(symbol: "TSLA", date: Date.current - i.days, **default_data, adjusted_close: rand(100..1000))
        end
        MarketData::SymbolUniverse.stubs(:sp500_constituents).returns([ "TSLA" ])
      end

      after do
        MarketData::SymbolUniverse.unstub(:sp500_constituents)
        Price.delete_all
      end

      it "verifies stubbed S&P constituents" do
        assert_equal [ "TSLA" ], MarketData::SymbolUniverse.sp500_constituents
      end

      it "builds a snapshot for the current date by default" do
        snapshot = Metrics::SnapshotBuilder.new.call
        assert_equal snapshot[:date], Date.current
      end

      it "builds a snapshot for a specific date" do
        specific_date = Date.current - 100.days
        snapshot = Metrics::SnapshotBuilder.new(as_of: specific_date).call
        assert_equal snapshot[:date], specific_date
      end
    end

    describe "#percent_change" do
      before do
        Price.create!(symbol: "^NDX", date: Date.current - 1.month, open: 100, high: 100, low: 100, close: 100, volume: 100, adjusted_close: 100)
        Price.create!(symbol: "^NDX", date: Date.current, open: 110, high: 110, low: 110, close: 110, volume: 100, adjusted_close: 110)
      end

      it "calculates the correct percent change" do
        assert_equal 0.1, Metrics::SnapshotBuilder.new.percent_change("^NDX", 1.month)
      end
    end

    describe "#vix_percentile_rank" do
      before do
        1.upto(99) do |i|
          Price.create!(symbol: "^VIX", date: Date.current - i.days, open: rand(10..100), high: rand(10..100), low: rand(10..100), close: rand(10..100), volume: rand(10..100), adjusted_close: i)
        end

        Price.create!(symbol: "^VIX", date: Date.current, open: 100, high: 100, low: 100, close: 100, volume: 100, adjusted_close: 100)
      end

      after do
        Price.delete_all
      end

      it "calculates the correct vix percentile rank" do
        assert_equal 100, Metrics::SnapshotBuilder.new.vix_percentile_rank
      end
    end

    describe "#bottom_half_advancers_count" do
      before do
        default_data = { open: 0, high: 0, low: 0, close: 0, volume: 0 }

        %w[TSLA AAPL MSFT GOOG].each do |symbol|
          Price.create!(symbol: symbol, date: Date.current - 1.year, **default_data, adjusted_close: 100)
          Price.create!(symbol: symbol, date: Date.current - 1.day, **default_data, adjusted_close: 200)
          Price.create!(symbol: symbol, date: Date.current, **default_data, adjusted_close: 205)
        end

        %w[CVNA UAL].each do |symbol|
          Price.create!(symbol: symbol, date: Date.current - 1.year, **default_data, adjusted_close: 100)
          Price.create!(symbol: symbol, date: Date.current - 1.day, **default_data, adjusted_close: 50)
          Price.create!(symbol: symbol, date: Date.current, **default_data, adjusted_close: 40)
        end

        %w[PYPL INTC].each do |symbol|
          Price.create!(symbol: symbol, date: Date.current - 1.year, **default_data, adjusted_close: 100)
          Price.create!(symbol: symbol, date: Date.current - 1.day, **default_data, adjusted_close: 50)
          Price.create!(symbol: symbol, date: Date.current, **default_data, adjusted_close: 75)
        end

        MarketData::SymbolUniverse.stubs(:sp500_constituents).returns(%w[TSLA AAPL MSFT GOOG CVNA UAL PYPL INTC])
      end

      after do
        MarketData::SymbolUniverse.unstub(:sp500_constituents)
        Price.destroy_all
      end

      it "calculates the correct bottom half advancers count" do
        assert_equal 2, Metrics::SnapshotBuilder.new.bottom_half_advancers_count
      end
    end

    describe "#bottom_half_advancers" do
      before do
        default_data = { open: 0, high: 0, low: 0, close: 0, volume: 0 }

        %w[TSLA AAPL MSFT GOOG].each do |symbol|
          Price.create!(symbol: symbol, date: Date.current - 1.year, **default_data, adjusted_close: 100)
          Price.create!(symbol: symbol, date: Date.current - 1.day, **default_data, adjusted_close: 200)
          Price.create!(symbol: symbol, date: Date.current, **default_data, adjusted_close: 205)
        end

        %w[CVNA UAL].each do |symbol|
          Price.create!(symbol: symbol, date: Date.current - 1.year, **default_data, adjusted_close: 100)
          Price.create!(symbol: symbol, date: Date.current - 1.day, **default_data, adjusted_close: 50)
          Price.create!(symbol: symbol, date: Date.current, **default_data, adjusted_close: 40)
        end

        %w[PYPL INTC].each do |symbol|
          Price.create!(symbol: symbol, date: Date.current - 1.year, **default_data, adjusted_close: 100)
          Price.create!(symbol: symbol, date: Date.current - 1.day, **default_data, adjusted_close: 50)
          Price.create!(symbol: symbol, date: Date.current, **default_data, adjusted_close: 75)
        end

        MarketData::SymbolUniverse.stubs(:sp500_constituents).returns(%w[TSLA AAPL MSFT GOOG CVNA UAL PYPL INTC])
      end

      after do
        MarketData::SymbolUniverse.unstub(:sp500_constituents)
        Price.destroy_all
      end

      it "returns the correct bottom half advancers" do
        assert_equal %w[CVNA INTC PYPL UAL], Metrics::SnapshotBuilder.new.bottom_half_advancers.map(&:first).sort
      end
    end
  end
end
