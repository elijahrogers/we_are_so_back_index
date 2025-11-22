require "cgi"
require "net/http"
require "json"

module MarketData
  class YahooClient
    BASE_URL = URI("https://query1.finance.yahoo.com/v8/finance/chart")

    def daily_candles(symbol:, range: "1y", interval: "1d")
      response = perform_request(symbol, range, interval)

      parse_payload(response.body)
    end

    private

    def perform_request(symbol, range, interval)
      uri = build_uri(symbol, range, interval)
      request = Net::HTTP::Get.new(uri)
      request["User-Agent"] = "Mozilla/5.0 (compatible; PriceIngestor/1.0; +https://github.com)"
      request["Accept"] = "application/json"

      Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") do |http|
        http.request(request)
      end
    end

    def build_uri(symbol, range, interval)
      uri = BASE_URL.dup
      uri.path = "#{BASE_URL.path}/#{CGI.escape(symbol)}"
      uri.query = URI.encode_www_form(range:, interval:, includeAdjustedClose: true)
      uri
    end

    def parse_payload(body)
      json = JSON.parse(body)
      result = json.dig("chart", "result")&.first
      return [] unless result

      timestamps = result["timestamp"] || []
      indicators = result.dig("indicators", "quote")&.first || {}
      adj_close = result.dig("indicators", "adjclose", 0, "adjclose") || []

      timestamps.each_with_index.map do |timestamp, index|
        next unless indicators["close"]&.fetch(index)

        {
          date: Time.at(timestamp).utc.to_date,
          open: indicators["open"]&.fetch(index),
          high: indicators["high"]&.fetch(index),
          low: indicators["low"]&.fetch(index),
          close: indicators["close"]&.fetch(index),
          volume: indicators["volume"]&.fetch(index),
          adjusted_close: adj_close[index]
        }
      end.compact
    rescue JSON::ParserError
      []
    end
  end
end
