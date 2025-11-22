require "test_helper"

module MarketData
  class YahooClientTest < ActiveSupport::TestCase
    describe "#daily_candles" do
      it "returns the correct number of candles" do
        VCR.use_cassette("yahoo_client/daily_candles") do
          client = YahooClient.new
          candles = client.daily_candles(symbol: "AAPL", range: "1d")
          assert_equal 1, candles.size
        end
      end

      it "parses the payload correctly" do
        VCR.use_cassette("yahoo_client/daily_candles") do
          client = YahooClient.new
          candle = client.daily_candles(symbol: "AAPL", range: "1d").first

          assert_instance_of Date, candle[:date]
          assert_instance_of Float, candle[:open]
          assert_instance_of Float, candle[:high]
          assert_instance_of Float, candle[:low]
          assert_instance_of Float, candle[:close]
          assert_instance_of Integer, candle[:volume]
          assert_instance_of Float, candle[:adjusted_close]
        end
      end
    end
  end
end
