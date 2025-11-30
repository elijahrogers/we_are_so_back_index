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
        ndx_change_30d: change("^NDX", 1.month),
        btc_change_30d: change("BTC-USD", 1.month),
        vix_percentile: vix_percentile_rank,
        bottom_half_advancers: bottom_half_advancers_count
      }
    end

    def change(symbol, offset)
      series = Price.where(symbol: symbol, date: (as_of - offset)..as_of).order(date: :asc)

      percent_change(series)
    end

    def vix_percentile_rank
      latest = vix_prices.last
      sorted = vix_prices.sort

      return 100.0 if sorted.length <= 1

      less_or_equal = sorted.count { |value| value <= latest }
      percentile = (less_or_equal.to_f / sorted.length) * 100.0
      percentile.round(2)
    end

    def vix_prices
      @vix_prices ||= begin
        series = Price.where(symbol: "^VIX", date: (as_of - 1.year)..as_of).order(date: :asc)
        series.last(VIX_LOOKBACK).map(&:adjusted_close).compact
      end
    end

    def bottom_half_advancers_count
      latest_rows = Price.where(symbol: bottom_half_performers, date: (as_of - 2.days)..as_of).order(date: :desc)
      latest_grouped = latest_rows.group_by(&:symbol)

      bottom_half_performers.count do |symbol|
        entries = latest_grouped[symbol]&.sort_by(&:date)&.last(2)
        next false unless entries&.size == 2

        entries.last.adjusted_close.to_f > entries.first.adjusted_close.to_f
      end
    end

    def bottom_half_performers
      @bottom_half_performers ||= begin
        data = Price.where(symbol: sp500_constituents, date: (as_of - 1.year)..as_of).order(date: :asc)
        grouped = data.group_by(&:symbol)
        returns = grouped.map { |symbol, prices| [ symbol, percent_change(prices) ] }.compact

        return 0 if returns.empty?

        returns.sort_by { |(_, value)| value }.first(returns.length / 2).to_h.keys
      end
    end

    def percent_change(price_series)
      sorted = price_series.sort_by(&:date)
      starting = sorted.first.adjusted_close
      ending = sorted.last.adjusted_close
      return unless starting.to_f.positive?

      ((ending - starting) / starting).round(6)
    end

    def sp500_constituents
      MarketData::SymbolUniverse.sp500_constituents
    end
  end
end
