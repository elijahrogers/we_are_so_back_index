module Metrics
  class SnapshotBuilder
    VIX_LOOKBACK = 252

    attr_reader :as_of

    def initialize(as_of: Date.current)
      @as_of = as_of
    end

    def call
      {
        date: as_of,
        ndx_change_30d: percent_change("^NDX", 1.month),
        btc_change_30d: percent_change("BTC-USD", 1.month),
        vix_percentile: vix_percentile_rank,
        bottom_half_advancers: bottom_half_advancers_count
      }
    end

    private

    def percent_change(symbol, offset)
      series = Price.where(symbol: symbol, date: (as_of - offset)..as_of).order(date: :asc)

      starting = series.first.adjusted_close
      ending = series.last.adjusted_close
      return unless starting.to_f.positive?

      ((ending - starting) / starting).round(6)
    end

    def vix_percentile_rank
      series = Price.where(symbol: "^VIX", date: (as_of - 1.year)..as_of).order(date: :asc)
      closes = series.last(VIX_LOOKBACK).map(&:adjusted_close).compact
      return if closes.empty?

      latest = closes.last
      sorted = closes.sort
      return 100.0 if sorted.length <= 1

      less_or_equal = sorted.count { |value| value <= latest }
      percentile = (less_or_equal.to_f / sorted.length) * 100.0
      percentile.round(2)
    end

    def bottom_half_advancers_count
      bottom_half = bottom_half_advancers

      bottom_symbols = bottom_half.map(&:first)
      latest_rows = Price.where(symbol: bottom_symbols, date: (as_of - 2)..as_of).order(date: :desc)
      latest_grouped = latest_rows.group_by(&:symbol)

      bottom_symbols.count do |symbol|
        entries = latest_grouped[symbol]&.sort_by(&:date)&.last(2)
        next false unless entries&.size == 2

        entries.last.close.to_f > entries.first.close.to_f
      end
    end

    def bottom_half_advancers
      tickers = MarketData::SymbolUniverse.sp500_constituents
      data = Price.where(symbol: tickers, date: (as_of - 1.year)..as_of).order(date: :asc)
      grouped = data.group_by(&:symbol)

      returns = grouped.map do |symbol, prices|
        sorted = prices.sort_by(&:date)
        next unless sorted.first&.adjusted_close.to_f.positive?

        first = sorted.first
        last = sorted.last
        next unless last&.adjusted_close

        [ symbol, ((last.adjusted_close - first.adjusted_close) / first.adjusted_close).round(6) ]
      end.compact

      return 0 if returns.empty?

      returns.sort_by { |(_, value)| value }.first(returns.length / 2)
    end
  end
end
