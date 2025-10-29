require "bigdecimal"

class PriceIngestJob < ApplicationJob
  queue_as :default

  def perform(range: "1y")
    client = MarketData::YahooClient.new

    MarketData::SymbolUniverse.all.each do |symbol|
      upsert_symbol(client, symbol, range: range)
      sleep 0.4
    end
  end

  private

  def upsert_symbol(client, symbol, range:)
    client.daily_candles(symbol: symbol, range: range).each do |bar|
      next unless bar[:close]

      price = Price.find_or_initialize_by(symbol: symbol, date: bar[:date])
      price.open = to_decimal(bar[:open])
      price.high = to_decimal(bar[:high])
      price.low = to_decimal(bar[:low])
      price.close = to_decimal(bar[:close])
      price.volume = to_decimal(bar[:volume])
      price.adjusted_close = to_decimal(bar[:adjusted_close] || bar[:close])
      price.save!
    rescue StandardError => error
      Rails.logger.warn("Price ingest failed for #{symbol} on #{bar[:date]}: #{error.message}")
    end
  rescue StandardError => error
    Rails.logger.warn("Price ingest failed for #{symbol}: #{error.message}")
  end

  def to_decimal(value)
    return if value.nil?

    BigDecimal(value.to_s)
  end
end
