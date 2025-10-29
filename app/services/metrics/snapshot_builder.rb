module Metrics
  class SnapshotBuilder
    DAYS_30 = 30
    DAYS_365 = 365
    VIX_LOOKBACK = 252

    def initialize(as_of: Date.current)
      @as_of = as_of
    end

    def call
      {
        ndx_change_30d: percent_change("^NDX", DAYS_30),
        btc_change_30d: percent_change("BTC-USD", DAYS_30),
        vix_percentile: vix_percentile_rank,
        bottom_half_advancers: bottom_half_advancers_count
      }
    end

    private

    attr_reader :as_of

    def percent_change(symbol, days)
      series = Price.where(symbol: symbol, date: (as_of - days)..as_of).order(date: :asc)
      return unless series.size > days

      starting = series[-(days + 1)].close
      ending = series.last.close
      return unless starting.to_f.positive?

      ((ending - starting) / starting).round(6)
    end

    def vix_percentile_rank
      series = Price.where(symbol: "^VIX", date: (as_of - DAYS_365)..as_of).order(date: :asc)
      return unless series.size >= VIX_LOOKBACK

      closes = series.last(VIX_LOOKBACK).map(&:close).compact
      return if closes.empty?

      latest = closes.last
      sorted = closes.sort
      return 100.0 if sorted.length <= 1

      less_or_equal = sorted.count { |value| value <= latest }
      percentile = (less_or_equal.to_f / sorted.length) * 100.0
      percentile.round(2)
    end

    def bottom_half_advancers_count
      tickers = MarketData::SymbolUniverse.sp500_constituents
      return 0 if tickers.empty?

      data = Price.where(symbol: tickers, date: (as_of - DAYS_365)..as_of).order(date: :asc)
      grouped = data.group_by(&:symbol)

      returns = grouped.map do |symbol, prices|
        sorted = prices.sort_by(&:date)
        next unless sorted.first&.close.to_f.positive?

        first = sorted.first
        last = sorted.last
        next unless last&.close

        [ symbol, ((last.close - first.close) / first.close).round(6) ]
      end.compact

      return 0 if returns.empty?

      bottom_half = returns.sort_by { |(_, value)| value }.first(returns.length / 2)

      bottom_symbols = bottom_half.map(&:first)
      latest_rows = Price.where(symbol: bottom_symbols, date: (as_of - 1)..as_of).order(date: :desc)
      latest_grouped = latest_rows.group_by(&:symbol)

      bottom_symbols.count do |symbol|
        entries = latest_grouped[symbol]&.sort_by(&:date)&.last(2)
        next false unless entries&.size == 2

        entries.last.close.to_f > entries.first.close.to_f
      end
    end
  end
end
